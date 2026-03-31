import React from 'react'

import type { AssistantSession } from './sessionDiscovery.js'

export function AssistantSessionChooser(props: {
  sessions: AssistantSession[]
  onSelect: (id: string) => void
  onCancel: () => void
}): React.ReactNode {
  void props.sessions
  void props.onSelect
  props.onCancel()
  return null
}
