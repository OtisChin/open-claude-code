let onEnqueue: ((message: unknown) => void) | null = null

export async function startUdsMessaging(
  _socketPath: string,
  _options?: Record<string, unknown>,
): Promise<void> {}

export function getDefaultUdsSocketPath(): string {
  return ''
}

export function getUdsMessagingSocketPath(): string {
  return ''
}

export function setOnEnqueue(handler: ((message: unknown) => void) | null): void {
  onEnqueue = handler
}

export function enqueueUdsMessage(message: unknown): void {
  onEnqueue?.(message)
}
