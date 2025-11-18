import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import settingsService from '../services/settings'
import { useToast } from './ToastProvider'

type MusicContextValue = {
  playing: boolean
  current?: { name: string; src: string }
  play: () => void
  pause: () => void
  setVolume: (v: number) => void
  getVolume: () => number
}

const MusicContext = createContext<MusicContextValue>({ playing: false, play: () => { }, pause: () => { }, setVolume: () => { }, getVolume: () => 1 })

// Default playlist - user should add real files to public/music or update this list
const DEFAULT_PLAYLIST: Array<{ name: string; src: string }> = [
  { name: 'proplayer919 - borealis', src: '/music/borealis.wav' },
  { name: 'proplayer919 - galaxies', src: '/music/galaxies.wav' },
  { name: 'proplayer919 - meadows', src: '/music/meadows.wav' },
  { name: 'Ferretosan - an opening to the vastness of space', src: '/music/actual1.wav' },
  { name: 'Ferretosan - reminders of an older time', src: '/music/actual2.wav' },
  { name: 'Ferretosan - reminders of an older time (remix)', src: '/music/actual2-remix.wav' },
]

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }

export function MusicProvider({ children, playlist = DEFAULT_PLAYLIST }: { children: React.ReactNode; playlist?: Array<{ name: string; src: string }> }) {
  const toast = useToast()
  const settings = settingsService.loadSettings()
  const [volume, setVolumeState] = useState<number>(settings.musicVolume ?? 0.6)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState<{ name: string; src: string } | undefined>(undefined)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const startedRef = useRef<boolean>(false)

  useEffect(() => {
    function onSettings(e: Event) {
      try {
        // @ts-ignore
        const s = (e as CustomEvent).detail
        if (s) {
          if (typeof s.musicVolume === 'number') {
            setVolumeState(s.musicVolume)
            try { if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, s.musicVolume)) } catch (e) { }
          }
        }
      } catch (err) { }
    }
    window.addEventListener('tusk_settings_changed', onSettings as EventListener)
    return () => window.removeEventListener('tusk_settings_changed', onSettings as EventListener)
  }, [])

  useEffect(() => {
    // start autoplay on mount (guard against double-invoke in StrictMode)
    if (!startedRef.current) {
      startedRef.current = true
      playNext(true)
    }
    return () => {
      if (audioRef.current) {
        try { audioRef.current.pause() } catch (e) { }
      }
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])



  const pickNextIndex = useCallback((lastIndex: number | null) => {
    if (!playlist || playlist.length === 0) return -1
    if (playlist.length === 1) return 0
    let idx = Math.floor(Math.random() * playlist.length)
    if (lastIndex !== null) {
      // avoid repeating the same track
      let attempts = 0
      while (idx === lastIndex && attempts < 10) {
        idx = Math.floor(Math.random() * playlist.length)
        attempts++
      }
    }
    return idx
  }, [playlist])

  const playTrackAt = useCallback((idx: number) => {
    if (idx < 0 || idx >= playlist.length) return
    const track = playlist[idx]
    if (!track) return
    if (audioRef.current) {
      try {
        audioRef.current.pause()
      } catch (e) { }
    }
    const a = new Audio(track.src)
    // ensure element is unmuted and has the expected volume
    try { a.muted = false } catch (e) { }
    a.volume = Math.max(0, Math.min(1, volume))
    a.onended = () => {
      // wait random 3-15 seconds
      const delay = randInt(3, 15) * 1000
      timeoutRef.current = window.setTimeout(() => playNext(false, idx), delay)
    }
    a.onplay = () => {
      setPlaying(true)
      setCurrent(track)
      // optionally show toast
      const s = settingsService.loadSettings()
      if (s.showNowPlayingToasts) {
        try {
          toast.show({ message: `Now playing: ${track.name}`, duration: 3500 })
        } catch (e) { }
      }
    }
    a.onpause = () => setPlaying(false)
    a.onerror = () => setPlaying(false)
    // set the ref before calling play so handlers and external callers see the element
    audioRef.current = a
    a.play().catch(() => { /* ignore */ })
  }, [playlist, toast, volume])

  const playNext = useCallback((immediate = false, lastIndex: number | null = null) => {
    const prevIndex = lastIndex === null && current ? playlist.findIndex(p => p.src === current.src) : lastIndex
    const next = pickNextIndex(prevIndex === -1 ? null : prevIndex)
    if (next === -1) return
    if (immediate) {
      playTrackAt(next)
    } else {
      // if there's currently a track, it will schedule itself onended; but we can also start immediately
      playTrackAt(next)
    }
  }, [current, pickNextIndex, playlist, playTrackAt])

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => { })
      setPlaying(true)
      return
    }
    playNext(true)
  }, [playNext])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setPlaying(false)
    }
  }, [])

  const setVolume = useCallback((v: number) => {
    const vv = Math.max(0, Math.min(1, v))
    setVolumeState(vv)
    if (audioRef.current) try { audioRef.current.volume = vv } catch (e) { }
  }, [])

  const getVolume = useCallback(() => volume, [volume])

  // Some browsers block autoplay until a user gesture. If playback didn't start,
  // attempt to resume on first user interaction.
  useEffect(() => {
    function tryResume() {
      try {
        if (audioRef.current) {
          // try to play the already-created audio element
          audioRef.current.play().then(() => {
            setPlaying(true)
            removeListeners()
          }).catch(() => {
            // still blocked; don't spam
          })
        } else {
          // no audio element yet - start the next track
          playNext(true)
          removeListeners()
        }
      } catch (e) {
        // ignore
      }
    }

    function removeListeners() {
      window.removeEventListener('pointerdown', tryResume)
      window.removeEventListener('touchstart', tryResume)
      window.removeEventListener('keydown', tryResume)
      window.removeEventListener('click', tryResume)
    }

    // if already playing, nothing to do
    if (playing) return

    window.addEventListener('pointerdown', tryResume, { once: true })
    window.addEventListener('touchstart', tryResume, { once: true })
    window.addEventListener('keydown', tryResume, { once: true })
    window.addEventListener('click', tryResume, { once: true })

    return () => removeListeners()
  }, [playing, playNext])

  return (
    <MusicContext.Provider value={{ playing, current, play, pause, setVolume, getVolume }}>
      {children}
    </MusicContext.Provider>
  )
}

export function useMusic() {
  return useContext(MusicContext)
}

export default MusicProvider
