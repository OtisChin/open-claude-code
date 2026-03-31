export interface Transport {
  connect?(): Promise<void>
  disconnect?(): Promise<void>
  send?(message: unknown): Promise<void>
  close?(): Promise<void>
}
