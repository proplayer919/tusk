import React, { useEffect, useState } from 'react'
import Modal from './Modal'
import Input from './Input'
import Button from './Button'
import './StaffPanel.css'
import Checkbox from './Checkbox'
import staffService from '../services/staff'

interface UserSummary {
  id: string
  username: string
  staff: boolean
  progress: any
}

interface StaffPanelProps {
  isOpen: boolean
  onClose: () => void
}

const StaffPanel: React.FC<StaffPanelProps> = ({ isOpen, onClose }) => {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [selected, setSelected] = useState<UserSummary | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, string>>({})

  // split list vs detail loading to avoid re-rendering/shaking the list when
  // fetching single user details
  const [listLoading, setListLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'progress'>('details')

  useEffect(() => {
    if (!isOpen) return
    setPage(1)
    load()
  }, [isOpen])

  async function load() {
    setListLoading(true)
    setError(null)
    try {
      const res = await staffService.listUsers(q || undefined, page, 50)
      setUsers(res.users || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load users')
    } finally {
      setListLoading(false)
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    setPage(1)
    await load()
  }

  async function selectUser(id: string) {
    // if already selected, no need to reload the list or refetch unless you
    // want to refresh details. Avoid reselect causing the left list to show
    // loading indicator which produces the "shaking" effect.
    if (selected && selected.id === id) return

    setDetailLoading(true)
    setError(null)
    try {
      const u = await staffService.getUser(id)
      setSelected(u)
      // initialize progress map from user's progress (top-level keys)
      try {
        const p = typeof u.progress === 'string' ? JSON.parse(u.progress || '{}') : u.progress || {}
        const map: Record<string, string> = {}
        Object.entries(p).forEach(([k, v]) => {
          if (typeof v === 'string') map[k] = v
          else map[k] = JSON.stringify(v)
        })
        setProgressMap(map)
      } catch (e) {
        setProgressMap({})
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load user')
    } finally {
      setDetailLoading(false)
    }
  }

  async function saveUser() {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      // build progress object from progressMap
      const progress: Record<string, any> = {}
      Object.entries(progressMap).forEach(([k, v]) => {
        // attempt to parse JSON for objects/arrays/primitives
        const trimmed = typeof v === 'string' ? v.trim() : v
        if (trimmed === '') {
          progress[k] = null
          return
        }
        try {
          progress[k] = JSON.parse(trimmed)
        } catch (e) {
          // fallback to raw string
          progress[k] = v
        }
      })

      const payload = { username: selected.username, progress, staff: selected.staff }
      const res = await staffService.updateUser(selected.id, payload)
      setSelected(res)
      // refresh list
      await load()
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function doReset() {
    if (!selected) return
    if (!confirm(`Reset user ${selected.username} to defaults? This clears progress.`)) return
    setSaving(true)
    setError(null)
    try {
      const res = await staffService.resetUser(selected.id)
      setSelected(res)
      await load()
    } catch (err: any) {
      setError(err.message || 'Failed to reset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Staff Panel" isOpen={isOpen} onClose={onClose} size="large">
      <div className="staff-panel-root">
        <div className="staff-panel-left">
          <form onSubmit={handleSearch} className="staff-search-form">
            <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search username or uuid" />
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <Button onClick={() => handleSearch()}>Search</Button>
              <Button onClick={() => { setQ(''); setPage(1); load() }}>
                Clear
              </Button>
            </div>
          </form>

          <div className="staff-list">
            {listLoading && <div className="staff-loading">Loading...</div>}
            {error && <div className="staff-error">{error}</div>}
            {!listLoading && users.length === 0 && <div className="staff-empty">No users</div>}
            <ul>
              {users.map(u => (
                <li key={u.id} className={selected && selected.id === u.id ? 'selected' : ''} onClick={() => selectUser(u.id)}>
                  <div className="user-row">
                    <div className="user-name">{u.username}</div>
                    <div className="user-meta">{u.staff ? 'Staff' : 'User'}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="staff-panel-right">
          {detailLoading && <div className="staff-empty-detail">Loading user details...</div>}
          {!detailLoading && !selected && <div className="staff-empty-detail">Select a user to view/edit details</div>}
          {!detailLoading && selected && (
            <div className="staff-detail">
              <div className="staff-detail-top">
                <div className="staff-detail-header">
                  <div>
                    <h3 className="user-title">{selected.username}</h3>
                    <div className="user-sub">{selected.staff ? 'Staff account' : 'Regular user'} • <span className="mono">{selected.id}</span></div>
                  </div>
                  <div className="staff-detail-actions">
                    <Button onClick={saveUser} disabled={saving}>Save</Button>
                    <Button onClick={doReset} variant="danger" disabled={saving}>Reset</Button>
                  </div>
                </div>

                <div className="panel-tabs">
                  <button className={activeTab === 'details' ? 'active' : ''} onClick={() => setActiveTab('details')}>Details</button>
                  <button className={activeTab === 'progress' ? 'active' : ''} onClick={() => setActiveTab('progress')}>Progress</button>
                </div>
              </div>

              {activeTab === 'details' && (
                <div className="staff-detail-body">
                  <div className="staff-detail-row">
                    <label>Username</label>
                    <Input value={selected.username || ''} onChange={(e: any) => setSelected({ ...selected, username: e.target.value })} />
                  </div>

                  <div className="staff-detail-row">
                    <label>Staff</label>
                    <div>
                      <Checkbox checked={!!selected.staff} onChange={(val) => setSelected({ ...selected, staff: val })} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'progress' && (
                <div className="staff-detail-body">
                  <div className="progress-simple">
                    <div className="progress-legend">Edit commonly used progress fields below.</div>

                    <div className="progress-row">
                      <label>Evolution</label>
                      <Input value={progressMap['evolution'] || ''} onChange={(e: any) => setProgressMap({ ...progressMap, evolution: e.target.value })} placeholder="evolution" />
                    </div>

                    <div className="progress-row">
                      <label>Count</label>
                      <Input type="number" value={progressMap['count'] || ''} onChange={(e: any) => setProgressMap({ ...progressMap, count: e.target.value })} placeholder="count" />
                    </div>

                    <div className="progress-row">
                      <label>Clicked once</label>
                      <Checkbox checked={String(progressMap['hasClickedOnce'] || '').toLowerCase() === 'true'} onChange={(val) => setProgressMap({ ...progressMap, hasClickedOnce: val ? 'true' : 'false' })} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1rem', textAlign: 'right' }}>
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

export default StaffPanel
