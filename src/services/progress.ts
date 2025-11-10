import auth from './auth'

const API_BASE = (import.meta as any).env.VITE_API_BASE || ''
const LOCAL_KEY = 'tusk_progress'

export async function loadProgress() {
  const token = auth.getToken()
  if (!token) {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : null
  }

  const res = await fetch(API_BASE + '/api/progress', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!res.ok) return null
  const body = await res.json()
  return body.progress
}

export async function saveProgress(progress: any) {
  const token = auth.getToken()
  if (!token) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(progress))
    return
  }

  await fetch(API_BASE + '/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ progress })
  })
}

function mergeProgress(local: any, server: any) {
  if (!local) return server || null
  if (!server) return local || null

  // prefer higher evolution; if equal prefer higher count
  const evoA = typeof local.evolution === 'number' ? local.evolution : 0
  const evoB = typeof server.evolution === 'number' ? server.evolution : 0

  if (evoA > evoB) return { ...local, hasClickedOnce: !!local.hasClickedOnce || !!server.hasClickedOnce }
  if (evoB > evoA) return { ...server, hasClickedOnce: !!local.hasClickedOnce || !!server.hasClickedOnce }

  // same evolution -> pick higher count
  const cntA = typeof local.count === 'number' ? local.count : 0
  const cntB = typeof server.count === 'number' ? server.count : 0

  const chosen = cntA >= cntB ? local : server
  return { ...chosen, hasClickedOnce: !!local.hasClickedOnce || !!server.hasClickedOnce }
}

// Merge localStorage progress with server progress and sync the better one to both places.
export async function mergeAndSyncLocalWithServer() {
  const token = auth.getToken()
  if (!token) return null

  // fetch server progress
  let serverProgress: any = null
  try {
    const res = await fetch(API_BASE + '/api/progress', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const body = await res.json()
      serverProgress = body.progress || null
    }
  } catch (err) {
    // ignore fetch errors
  }

  const localRaw = localStorage.getItem(LOCAL_KEY)
  const localProgress = localRaw ? JSON.parse(localRaw) : null

  const merged = mergeProgress(localProgress, serverProgress)
  if (merged) {
    // save to server and localStorage
    await saveProgress(merged)
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(merged)) } catch (e) { /* ignore */ }
  }

  return merged
}

export default { loadProgress, saveProgress, mergeAndSyncLocalWithServer }
