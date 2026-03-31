export type MessageOrigin = 'user' | 'assistant' | 'system' | 'attachment' | string

export type SystemMessageLevel = 'info' | 'warn' | 'error' | 'success' | string

export type CompactMetadata = {
  direction?: PartialCompactDirection
  [key: string]: unknown
}

export type PartialCompactDirection = 'forward' | 'backward' | 'replace' | string

export type BaseMessage = {
  uuid: string
  type: MessageOrigin
  createdAt?: number
  updatedAt?: number
  text?: string
  content?: unknown
  meta?: Record<string, unknown>
  [key: string]: unknown
}

export type UserMessage = BaseMessage & {
  type: 'user'
}

export type NormalizedUserMessage = UserMessage & {
  content: unknown[]
}

export type AssistantMessage = BaseMessage & {
  type: 'assistant'
}

export type NormalizedAssistantMessage = AssistantMessage & {
  content: unknown[]
}

export type AttachmentMessage = BaseMessage & {
  type: 'attachment'
}

export type SystemMessage = BaseMessage & {
  type: 'system'
  level?: SystemMessageLevel
}

export type ProgressMessage<T = unknown> = BaseMessage & {
  type: 'progress'
  data?: T
}

export type HookResultMessage = SystemMessage & {
  hookName?: string
}

export type ToolUseSummaryMessage = SystemMessage & {
  toolUseIds?: string[]
}

export type GroupedToolUseMessage = SystemMessage & {
  children?: NormalizedUserMessage[]
}

export type CollapsedReadSearchGroup = SystemMessage & {
  children?: RenderableMessage[]
}

export type TombstoneMessage = SystemMessage & {
  tombstoned?: boolean
}

export type StopHookInfo = {
  hookEventName?: string
  [key: string]: unknown
}

export type RequestStartEvent = {
  startedAt?: number
  [key: string]: unknown
}

export type StreamEvent = {
  type: string
  [key: string]: unknown
}

export type SystemLocalCommandMessage = SystemMessage
export type SystemThinkingMessage = SystemMessage
export type SystemCompactBoundaryMessage = SystemMessage
export type SystemMicrocompactBoundaryMessage = SystemMessage
export type SystemPermissionRetryMessage = SystemMessage
export type SystemAwaySummaryMessage = SystemMessage
export type SystemBridgeStatusMessage = SystemMessage
export type SystemFileSnapshotMessage = SystemMessage
export type SystemInformationalMessage = SystemMessage
export type SystemMemorySavedMessage = SystemMessage
export type SystemScheduledTaskFireMessage = SystemMessage
export type SystemStopHookSummaryMessage = SystemMessage
export type SystemTurnDurationMessage = SystemMessage
export type SystemApiMetricsMessage = SystemMessage
export type SystemAPIErrorMessage = SystemMessage
export type SystemAgentsKilledMessage = SystemMessage

export type CollapsibleMessage =
  | GroupedToolUseMessage
  | CollapsedReadSearchGroup

export type RenderableMessage =
  | NormalizedUserMessage
  | AssistantMessage
  | AttachmentMessage
  | SystemMessage
  | GroupedToolUseMessage
  | CollapsedReadSearchGroup
  | TombstoneMessage

export type NormalizedMessage =
  | NormalizedUserMessage
  | NormalizedAssistantMessage
  | SystemMessage
  | AttachmentMessage

export type Message =
  | UserMessage
  | NormalizedUserMessage
  | AssistantMessage
  | NormalizedAssistantMessage
  | AttachmentMessage
  | SystemMessage
  | ProgressMessage
  | GroupedToolUseMessage
  | CollapsedReadSearchGroup
  | TombstoneMessage
