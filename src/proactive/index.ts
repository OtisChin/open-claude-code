let active = false
let paused = false
let contextBlocked = false
let nextTickAt: number | null = null

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function isProactiveActive(): boolean {
  return active
}

export function activateProactive(_source?: string): void {
  active = true
  paused = false
  nextTickAt = Date.now() + 60_000
  emit()
}

export function pauseProactive(): void {
  paused = true
  emit()
}

export function resumeProactive(): void {
  paused = false
  emit()
}

export function isProactivePaused(): boolean {
  return paused
}

export function setContextBlocked(value: boolean): void {
  contextBlocked = value
  emit()
}

export function isContextBlocked(): boolean {
  return contextBlocked
}

export function getNextTickAt(): number | null {
  return nextTickAt
}

export function subscribeToProactiveChanges(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
