export type Settings = {
  festiveEnabled: boolean // user's preference for enabling festive features
  festiveOverride: boolean // advanced: force-show festive even outside December
  // volume levels are 0..1
  musicVolume: number
  sfxVolume: number
  // whether to show toasts when a new song starts
  showNowPlayingToasts: boolean
}

const STORAGE_KEY = 'tusk_settings_v2'

export const defaultSettings: Settings = {
  festiveEnabled: true,
  festiveOverride: false,
  musicVolume: 0.6,
  sfxVolume: 0.5,
  showNowPlayingToasts: true,
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultSettings }
    const parsed = JSON.parse(raw)
    return { ...defaultSettings, ...parsed }
  } catch (e) {
    console.error('Failed to load settings from localStorage', e)
    return { ...defaultSettings }
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    try {
      // dispatch a global event so runtime parts (providers) can react to changes
      window.dispatchEvent(new CustomEvent('tusk_settings_changed', { detail: settings }))
    } catch (e) {
      // ignore
    }
  } catch (e) {
    console.error('Failed to save settings to localStorage', e)
  }
}

export default {
  loadSettings,
  saveSettings,
  defaultSettings,
}
