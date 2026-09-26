/** Reading progress persisted in localStorage. Zero dependencies. */
const KEY = 'transformertrek-progress'

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function write(data: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* private mode — progress simply won't persist */
  }
}

export function isCompleted(moduleId: string): boolean {
  return moduleId in read()
}

export function completedCount(): number {
  return Object.keys(read()).length
}

export function markCompleted(moduleId: string) {
  const data = read()
  data[moduleId] = Date.now()
  write(data)
}

export function toggleCompleted(moduleId: string): boolean {
  const data = read()
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
