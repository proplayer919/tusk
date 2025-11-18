import { useEffect, useState } from 'react'
import Card from './Card'
import achievementsService from '../services/achievements'
import './Achievements.css'
import { IconAward } from '@tabler/icons-react'

export default function Achievements() {
  const [items, setItems] = useState<any[]>([])

  async function load() {
    const res = await achievementsService.listAchievements({ includeStats: true })
    setItems(res.items)
  }

  useEffect(() => { load() }, [])

  return (
    <Card>
      <div style={{ padding: '1rem' }}>
        <h3>Achievements</h3>
        <div className="achievements-grid">
          {items.map(it => (
            <div key={it.id} className={`achievement-card ${it.unlocked ? 'unlocked' : 'locked'}`}>
              <div className="achievement-icon"><IconAward size={28} /></div>
              <div className="achievement-meta">
                <div className="achievement-title">{it.title}</div>
                <div className="achievement-desc">{it.description}</div>
                <div className="achievement-footer">
                  {it.unlocked ? <span className="achievement-unlocked">Unlocked</span> : <span className="achievement-locked">Locked</span>}
                  {typeof it.percent === 'number' && (
                    <span className="achievement-percent">{it.percent}% of people</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
