import auth from './auth'
import progressService from './progress'

const API_BASE = (import.meta as any).env.VITE_API_BASE || ''

export type AchievementDef = {
  id: string
  title: string
  description: string
}

// Define a small set of achievements. Add more as needed.
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_click', title: 'First Click', description: 'Click for the first time.' },
  { id: 'evolution_5', title: 'Evolve 5', description: 'Reach Evolution 5.' },
  { id: 'evolution_10', title: 'Evolve 10', description: 'Reach Evolution 10.' },
  { id: 'evolution_15', title: 'Evolve 15', description: 'Reach Evolution 15 (Space bar unlocks!).' },
  { id: 'clicks_100', title: 'Clickstorm', description: 'Accumulate 100 total clicks.' }
]

export type AchState = {
  [id: string]: { unlockedAt: number }
}

const LOCAL_KEY = 'tusk_achievements'

export async function loadAchievements(): Promise<AchState> {
  // attempt to load from progress (server) for authenticated users
  const token = auth.getToken()
  if (!token) {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : {}
  }

  // Try to read achievements from progress object
  try {
    const p = await progressService.loadProgress()
    return (p && p.achievements) ? p.achievements : {}
  } catch (err) {
    return {}
  }
}

export async function saveAchievements(state: AchState) {
  const token = auth.getToken()
  if (!token) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state))
    return
  }

  // Save into progress so server persists alongside other progress keys
  await progressService.saveProgress({ achievements: state })
}

export function getDef(id: string) {
  return ACHIEVEMENTS.find(a => a.id === id) || null
}

export async function isUnlocked(id: string) {
  const s = await loadAchievements()
  return !!s[id]
}

// Evaluate a simple set of rules based on the provided game progress.
// progress may be any object; App will pass count/evolution/totalClicks/hasClickedOnce etc.
export async function checkAndUnlock(progress: any, onUnlock?: (id: string, name: string) => void) {
  const state = await loadAchievements()
  // ensure we have a mutable copy
  const next: AchState = Object.assign({}, state)
  // Helper to unlock
  const doUnlock = async (id: string) => {
    if (next[id]) return
    next[id] = { unlockedAt: Date.now() }
    try { await saveAchievements(next) } catch (e) { /* ignore */ }
    if (typeof onUnlock === 'function') onUnlock(id, getDef(id)?.title || '')
  }

  // first click
  if (progress.hasClickedOnce) await doUnlock('first_click')

  // evolutions
  if (typeof progress.evolution === 'number') {
    if (progress.evolution >= 5) await doUnlock('evolution_5')
    if (progress.evolution >= 10) await doUnlock('evolution_10')
    if (progress.evolution >= 15) await doUnlock('evolution_15')
  }

  // total clicks: track in progress.totalClicks if present, otherwise best-effort using count + previous total
  const totalClicks = (progress.totalClicks as number) || 0
  if (totalClicks >= 100) await doUnlock('clicks_100')

  return next
}

// List achievements with unlocked state and optional stats
export async function listAchievements(options?: { includeStats?: boolean }) {
  const state = await loadAchievements()

  const items = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: !!state[a.id],
    unlockedAt: state[a.id] ? state[a.id].unlockedAt : null,
    percent: null as number | null
  }))

  // unlocked first
  items.sort((x, y) => (x.unlocked === y.unlocked) ? x.id.localeCompare(y.id) : (x.unlocked ? -1 : 1))

  if (options?.includeStats && auth.getToken()) {
    try {
      const q = items.map(i => i.id).join(',')
      const res = await fetch(API_BASE + `/api/achievements/stats?ids=${encodeURIComponent(q)}`)
      if (res.ok) {
        const body = await res.json()
        const total = body.total || 0
        const counts = body.counts || {}
        items.forEach(p => {
          const c = counts[p.id] || 0
          p.percent = total > 0 ? Math.round((c / total) * 10000) / 100 : 0
        })
      }
    } catch (err) { /* ignore stats failures */ }
  }

  return { total: items.length, items }
}

export default { loadAchievements, saveAchievements, checkAndUnlock, listAchievements, isUnlocked, getDef }
