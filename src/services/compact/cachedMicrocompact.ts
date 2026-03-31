export type CacheEditsBlock = Record<string, unknown>
export type PinnedCacheEdits = Record<string, unknown>
export type CachedMCState = {
  pinnedCacheEdits: PinnedCacheEdits[]
  edits: CacheEditsBlock[]
}

const state: CachedMCState = {
  pinnedCacheEdits: [],
  edits: [],
}

export function isCachedMicrocompactEnabled(): boolean {
  return false
}

export function isModelSupportedForCacheEditing(_model?: string): boolean {
  return false
}

export function getCachedMCConfig(): { supportedModels: string[] } {
  return { supportedModels: [] }
}

export function getCachedMCState(): CachedMCState {
  return state
}
