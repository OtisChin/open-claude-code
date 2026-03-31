import React from 'react'

export function SnapshotUpdateDialog(props: {
  agentType: string
  scope: string
  snapshotTimestamp: string
  onComplete: (value: 'merge' | 'keep' | 'replace') => void
  onCancel: () => void
}): React.ReactNode {
  void props.agentType
  void props.scope
  void props.snapshotTimestamp
  void props.onCancel
  props.onComplete('keep')
  return null
}
