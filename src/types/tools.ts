export type ToolProgressData = Record<string, unknown>

export type ShellProgress = ToolProgressData & {
  output?: string
  fullOutput?: string
  elapsedTimeSeconds?: number
  totalLines?: number
  totalBytes?: number
  timeoutMs?: number
  taskId?: string
}

export type BashProgress = ShellProgress
export type PowerShellProgress = ShellProgress

export type AgentToolProgress = ToolProgressData & {
  message?: {
    type?: string
    [key: string]: unknown
  }
}

export type MCPProgress = ToolProgressData
export type REPLToolProgress = ToolProgressData
export type SkillToolProgress = ToolProgressData
export type TaskOutputProgress = ToolProgressData
export type WebSearchProgress = ToolProgressData
export type SdkWorkflowProgress = ToolProgressData
