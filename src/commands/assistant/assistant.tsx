import React from 'react'

export async function computeDefaultInstallDir(): Promise<string> {
  return ''
}

export function NewInstallWizard(props: {
  defaultDir: string
  onInstalled: (dir: string) => void
  onCancel: () => void
  onError: (message: string) => void
}): React.ReactNode {
  void props.defaultDir
  void props.onInstalled
  void props.onError
  props.onCancel()
  return null
}
