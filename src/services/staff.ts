import auth from './auth'

const API_BASE = (import.meta as any).env.VITE_API_BASE || ''

async function request(path: string, opts: any = {}) {
  const headers: any = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const token = auth.getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(API_BASE + path, { ...opts, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || 'Request failed')
  return body
}

export async function listUsers(q?: string, page = 1, limit = 50) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  params.set('page', String(page))
  params.set('limit', String(limit))
  return request(`/api/staff/users?${params.toString()}`)
}

export async function getUser(id: string) {
  return request(`/api/staff/user/${encodeURIComponent(id)}`)
}

export async function updateUser(id: string, data: any) {
  return request(`/api/staff/user/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function resetUser(id: string) {
  return request(`/api/staff/user/${encodeURIComponent(id)}/reset`, { method: 'POST' })
}

export default { listUsers, getUser, updateUser, resetUser }
