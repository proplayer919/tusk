import React from 'react'
import './SettingsPanel.css'
import Checkbox from './Checkbox'
import type { Settings } from '../services/settings'
import { IconSettings, IconMusic, IconUserCircle, IconTools } from '@tabler/icons-react'

interface Props {
  settings: Settings
  onChange: (s: Settings) => void
}

const SettingsPanel: React.FC<Props> = ({ settings, onChange }) => {
  const setFestive = (v: boolean) => onChange({ ...settings, festiveEnabled: v })
  const setOverride = (v: boolean) => onChange({ ...settings, festiveOverride: v })

  // local UI state for current section (sidebar)
  const [section, setSection] = React.useState<'general' | 'sounds' | 'account' | 'advanced'>('general')

  return (
    <div className="settings-root">
      <aside className="settings-sidebar" role="tablist" aria-orientation="vertical">
        <button
          className={`settings-tab ${section === 'general' ? 'active' : ''}`}
          onClick={() => setSection('general')}
          aria-pressed={section === 'general'}
        >
          <IconSettings size={20} className="tab-icon" />
          <span>General</span>
        </button>

        <button
          className={`settings-tab ${section === 'sounds' ? 'active' : ''}`}
          onClick={() => setSection('sounds')}
          aria-pressed={section === 'sounds'}
        >
          <IconMusic size={20} className="tab-icon" />
          <span>Sounds</span>
        </button>

        <button
          className={`settings-tab ${section === 'account' ? 'active' : ''}`}
          onClick={() => setSection('account')}
          aria-pressed={section === 'account'}
        >
          <IconUserCircle size={20} className="tab-icon" />
          <span>Account</span>
        </button>

        <button
          className={`settings-tab ${section === 'advanced' ? 'active' : ''}`}
          onClick={() => setSection('advanced')}
          aria-pressed={section === 'advanced'}
        >
          <IconTools size={20} className="tab-icon" />
          <span>Advanced</span>
        </button>
      </aside>

      <div className="settings-content">
        {section === 'general' && (
          <div>
            <h3>General</h3>
            <p>Toggles for general UI features.</p>
            <div style={{ marginTop: '1rem' }}>
              <Checkbox checked={settings.festiveEnabled} onChange={setFestive} label="Enable festive features" />
              <div className="settings-hint">When enabled, the site will use a festive logo during December.</div>
            </div>
          </div>
        )}

        {section === 'sounds' && (
          <div>
            <h3>Sounds</h3>
            <p>No sound settings yet.</p>
          </div>
        )}

        {section === 'account' && (
          <div>
            <h3>Account</h3>
            <p>Account-related preferences will appear here.</p>
          </div>
        )}

        {section === 'advanced' && (
          <div>
            <h3>Advanced</h3>
            <p>Developer/override options.</p>
            <div style={{ marginTop: '1rem' }}>
              <Checkbox checked={settings.festiveOverride} onChange={setOverride} label="Force festive features (override date)" />
              <div className="settings-hint">When enabled, festive features will show even if it's not December.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPanel
