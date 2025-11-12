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

export default { loadProgress, saveProgress }
