export type Settings = {
  festiveEnabled: boolean // user's preference for enabling festive features
  festiveOverride: boolean // advanced: force-show festive even outside December
}

const STORAGE_KEY = 'tusk_settings_v1'

export const defaultSettings: Settings = {
  festiveEnabled: true,
  festiveOverride: false,
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
  } catch (e) {
    console.error('Failed to save settings to localStorage', e)
  }
}

export default {
  loadSettings,
  saveSettings,
  defaultSettings,
}
