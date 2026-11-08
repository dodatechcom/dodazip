import { Bookmark } from '../types'

const KEYS = {
  lastDir: 'dodazip_last_dir',
  compression: 'dodazip_compression',
  theme: 'dodazip_theme',
  bookmarks: 'dodazip_bookmarks',
  tabs: 'dodazip_saved_tabs',
} as const

type Theme = 'light' | 'dark' | 'auto'

export const preferences = {
  get lastDir(): string {
    return localStorage.getItem(KEYS.lastDir) || ''
  },
  set lastDir(v: string) {
    localStorage.setItem(KEYS.lastDir, v)
  },

  get compression(): string {
    return localStorage.getItem(KEYS.compression) || 'balanced'
  },
  set compression(v: string) {
    localStorage.setItem(KEYS.compression, v)
  },

  get theme(): Theme {
    return (localStorage.getItem(KEYS.theme) as Theme) || 'auto'
  },
  set theme(v: Theme) {
    localStorage.setItem(KEYS.theme, v)
  },

  get bookmarks(): Bookmark[] {
    try {
      return JSON.parse(localStorage.getItem(KEYS.bookmarks) || '[]')
    } catch { return [] }
  },
  set bookmarks(v: Bookmark[]) {
    localStorage.setItem(KEYS.bookmarks, JSON.stringify(v))
  },

  get savedTabs(): Array<{ id: string; path: string; label: string }> {
    try {
      return JSON.parse(localStorage.getItem(KEYS.tabs) || '[]')
    } catch { return [] }
  },
  set savedTabs(v: Array<{ id: string; path: string; label: string }>) {
    localStorage.setItem(KEYS.tabs, JSON.stringify(v))
  },
}

export function resolveTheme(pref: Theme): 'light' | 'dark' {
  if (pref === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return pref
}
