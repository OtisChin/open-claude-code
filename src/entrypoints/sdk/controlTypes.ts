export type SDKControlRequest = {
  id?: string
  method?: string
  params?: unknown
  [key: string]: unknown
}

export type SDKControlRequestInner = SDKControlRequest
export type SDKControlInitializeRequest = SDKControlRequest
export type SDKControlPermissionRequest = SDKControlRequest
export type SDKControlCancelRequest = SDKControlRequest

export type SDKControlResponse = {
  id?: string
  result?: unknown
  error?: unknown
  [key: string]: unknown
}

export type SDKControlInitializeResponse = SDKControlResponse
export type SDKControlMcpSetServersResponse = SDKControlResponse
export type SDKControlReloadPluginsResponse = SDKControlResponse

export type RemotePermissionResponse = {
  decision?: string
  [key: string]: unknown
}

export type RemoteMessageContent = {
  type?: string
  text?: string
  [key: string]: unknown
}
