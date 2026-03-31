export type SSHSessionManager = {
  disconnect?: () => void
  cancelRequest?: () => void
}