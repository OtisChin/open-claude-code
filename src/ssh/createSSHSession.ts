export type SSHSessionManager = {
  disconnect?: () => void
  cancelRequest?: () => void
}

export type SSHSession = {
  createManager: (options?: Record<string, unknown>) => SSHSessionManager
}

export function createSSHSession(): SSHSession {
  return {
    createManager: () => ({})
  }
}