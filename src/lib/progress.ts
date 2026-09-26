/**
 * Reading progress persisted in the browser's localStorage, no accounts, no server.
 * Fully reactive: every consumer updates instantly via useSyncExternalStore,
 * and changes sync across open tabs via the `storage` event.
 */
import { useSyncExternalStore } from 'react'

const KEY = 'transformertrek-progress'

type ProgressData = Record<string, number>

let cache: ProgressData | null = null
const listeners = new Set<() => void>()

function read(): ProgressData {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') as ProgressData
  } catch {
    cache = {}
  }
  return cache
}

function write(data: ProgressData) {
  cache = data
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* private mode / storage full, progress simply won't persist */
  }
  notify()
}

function notify() {
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // Sync when another tab modifies progress
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      cache = null // re-read what the other tab wrote
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

// ── Reactive hooks ─────────────────────────────────────────────

/** Reactive snapshot of the raw progress map (module id -> timestamp). */
export function useProgressMap(): ProgressData {
  return useSyncExternalStore(subscribe, read, () => ({}))
}

/** Live count of modules marked as read. */
export function useCompletedCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => Object.keys(read()).length,
    () => 0,
  )
}

/** Live "did I mark this module read?" for a specific module. */
export function useIsCompleted(moduleId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => moduleId in read(),
    () => false,
  )
}

// ── Mutations ──────────────────────────────────────────────────

export function markCompleted(moduleId: string) {
  const data = { ...read() }
  data[moduleId] = Date.now()
  write(data)
}

export function toggleCompleted(moduleId: string): boolean {
  const data = { ...read() }
  if (moduleId in data) {
    delete data[moduleId]
    write(data)
    return false
  }
  data[moduleId] = Date.now()
  write(data)
  return true
}

export function resetProgress() {
  write({})
}
