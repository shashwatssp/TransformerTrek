/**
 * Theme store: dark (default aesthetic) and light mode, toggled by the user.
 * Persists to localStorage; first visit follows prefers-color-scheme.
 * Applies/removes the `light` class on <html> so all Tailwind token
 * utilities flip via the CSS-variable overrides in global.css.
 */
import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

const KEY = 'transformertrek-theme'

let current: Theme = init()
const listeners = new Set<() => void>()

function init(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    /* storage unavailable — fall through to system preference */
  }
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function apply(t: Theme) {
  document.documentElement.classList.toggle('light', t === 'light')
}

// Apply before first paint (module import happens before render in main.tsx)
apply(current)

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getTheme(): Theme {
  return current
}

export function setTheme(t: Theme) {
  current = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* private mode — theme just won't persist */
  }
  apply(t)
  for (const l of listeners) l()
}

export function toggleTheme() {
  setTheme(current === 'dark' ? 'light' : 'dark')
}

/** Reactive current theme for components. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme)
}
