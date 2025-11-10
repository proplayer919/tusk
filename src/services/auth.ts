const API_BASE = (import.meta as any).env.VITE_API_BASE || ''

export function setToken(token: string | null) {
  if (token) localStorage.setItem('tusk_token', token)
  else localStorage.removeItem('tusk_token')
}

export function getToken(): string | null {
  return localStorage.getItem('tusk_token')
}

async function request(path: string, opts: any = {}) {
  const headers: any = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(API_BASE + path, { ...opts, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || 'Request failed')
  return body
}

export async function register(username: string, password: string) {
  return request('/api/register', { method: 'POST', body: JSON.stringify({ username, password }) })
}

export async function login(username: string, password: string) {
  return request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) })
}

export async function getCurrentUser() {
  return request('/api/user')
}

export default { setToken, getToken, register, login, getCurrentUser }
