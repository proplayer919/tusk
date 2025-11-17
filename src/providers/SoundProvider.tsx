import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'
import settingsService from '../services/settings'

type SoundName = 'click' | 'evolve'

type SoundContextValue = {
  play: (name: SoundName) => void
  setVolume: (v: number) => void
  getVolume: () => number
}

const SoundContext = createContext<SoundContextValue>({ play: () => { }, setVolume: () => { }, getVolume: () => 1 })

const SOUND_MAP: Record<SoundName, string> = {
  click: '/sfx/click.mp3',
  evolve: '/sfx/evolve.mp3',
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const settings = settingsService.loadSettings()
  const [volume, setVolumeState] = useState<number>(settings.sfxVolume ?? 0.8)

  useEffect(() => {
    function onSettings(e: Event) {
      try {
        // @ts-ignore
        const s = (e as CustomEvent).detail
        if (s && typeof s.sfxVolume === 'number') setVolumeState(s.sfxVolume)
      } catch (err) { }
    }
    window.addEventListener('tusk_settings_changed', onSettings as EventListener)
    return () => window.removeEventListener('tusk_settings_changed', onSettings as EventListener)
  }, [])

  const play = useCallback((name: SoundName) => {
    const src = SOUND_MAP[name]
    if (!src) return
    try {
      const a = new Audio(src)
      try { a.muted = false } catch (e) { }
      a.volume = Math.max(0, Math.min(1, volume))
      a.play().catch(() => { })
    } catch (err) { }
  }, [volume])

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)))
  }, [])

  const getVolume = useCallback(() => volume, [volume])

  return (
    <SoundContext.Provider value={{ play, setVolume, getVolume }}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  return useContext(SoundContext)
}

export default SoundProvider
