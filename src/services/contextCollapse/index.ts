type CollapseStats = {
  collapsedSpans: number
  collapsedMessages: number
  stagedSpans: number
  health: {
    totalErrors: number
    totalEmptySpawns: number
    emptySpawnWarningEmitted: boolean
  }
}

const stats: CollapseStats = {
  collapsedSpans: 0,
  collapsedMessages: 0,
  stagedSpans: 0,
  health: {
    totalErrors: 0,
    totalEmptySpawns: 0,
    emptySpawnWarningEmitted: false,
  },
}

const listeners = new Set<() => void>()

export function initContextCollapse(): void {}

export function isContextCollapseEnabled(): boolean {
  return false
}

export function getStats(): CollapseStats {
  return stats
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function applyCollapsesIfNeeded<T>(
  messages: T[],
): Promise<{ messages: T[] }> {
  return { messages }
}

export function isWithheldPromptTooLong(): boolean {
  return false
}

export function recoverFromOverflow<T>(messages: T[]): T[] {
  return messages
}

export function resetContextCollapse(): void {
  for (const listener of listeners) listener()
}
