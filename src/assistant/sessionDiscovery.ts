export type AssistantSession = {
  id: string
  title?: string
  [key: string]: unknown
}

export async function discoverAssistantSessions(): Promise<AssistantSession[]> {
  return []
}
