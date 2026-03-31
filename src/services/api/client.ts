import Anthropic, { type ClientOptions } from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import type { GoogleAuth } from 'google-auth-library'
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getAnthropicApiKey,
  getApiKeyFromApiKeyHelper,
  getClaudeAIOAuthTokens,
  isClaudeAISubscriber,
  refreshAndGetAwsCredentials,
  refreshGcpCredentialsIfNeeded,
} from 'src/utils/auth.js'
import { getUserAgent } from 'src/utils/http.js'
import { getSmallFastModel } from 'src/utils/model/model.js'
import {
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl,
} from 'src/utils/model/providers.js'
import { getProxyFetchOptions } from 'src/utils/proxy.js'
import {
  getIsNonInteractiveSession,
  getSessionId,
} from '../../bootstrap/state.js'
import { getOauthConfig } from '../../constants/oauth.js'
import { isDebugToStdErr, logForDebugging } from '../../utils/debug.js'
import {
  getAWSRegion,
  getVertexRegionForModel,
  isEnvTruthy,
} from '../../utils/envUtils.js'

/**
 * Environment variables for different client types:
 *
 * Direct API:
 * - ANTHROPIC_API_KEY: Required for direct API access
 *
 * AWS Bedrock:
 * - AWS credentials configured via aws-sdk defaults
 * - AWS_REGION or AWS_DEFAULT_REGION: Sets the AWS region for all models (default: us-east-1)
 * - ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION: Optional. Override AWS region specifically for the small fast model (Haiku)
 *
 * Foundry (Azure):
 * - ANTHROPIC_FOUNDRY_RESOURCE: Your Azure resource name (e.g., 'my-resource')
 *   For the full endpoint: https://{resource}.services.ai.azure.com/anthropic/v1/messages
 * - ANTHROPIC_FOUNDRY_BASE_URL: Optional. Alternative to resource - provide full base URL directly
 *   (e.g., 'https://my-resource.services.ai.azure.com')
 *
 * Authentication (one of the following):
 * - ANTHROPIC_FOUNDRY_API_KEY: Your Microsoft Foundry API key (if using API key auth)
 * - Azure AD authentication: If no API key is provided, uses DefaultAzureCredential
 *   which supports multiple auth methods (environment variables, managed identity,
 *   Azure CLI, etc.). See: https://docs.microsoft.com/en-us/javascript/api/@azure/identity
 *
 * Vertex AI:
 * - Model-specific region variables (highest priority):
 *   - VERTEX_REGION_CLAUDE_3_5_HAIKU: Region for Claude 3.5 Haiku model
 *   - VERTEX_REGION_CLAUDE_HAIKU_4_5: Region for Claude Haiku 4.5 model
 *   - VERTEX_REGION_CLAUDE_3_5_SONNET: Region for Claude 3.5 Sonnet model
 *   - VERTEX_REGION_CLAUDE_3_7_SONNET: Region for Claude 3.7 Sonnet model
 * - CLOUD_ML_REGION: Optional. The default GCP region to use for all models
 *   If specific model region not specified above
 * - ANTHROPIC_VERTEX_PROJECT_ID: Required. Your GCP project ID
 * - Standard GCP credentials configured via google-auth-library
 *
 * Priority for determining region:
 * 1. Hardcoded model-specific environment variables
 * 2. Global CLOUD_ML_REGION variable
 * 3. Default region from config
 * 4. Fallback region (us-east5)
 */

function createStderrLogger(): ClientOptions['logger'] {
  return {
    error: (msg, ...args) =>
      // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
      console.error('[Anthropic SDK ERROR]', msg, ...args),
    // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
    warn: (msg, ...args) => console.error('[Anthropic SDK WARN]', msg, ...args),
    // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
    info: (msg, ...args) => console.error('[Anthropic SDK INFO]', msg, ...args),
    debug: (msg, ...args) =>
      // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
      console.error('[Anthropic SDK DEBUG]', msg, ...args),
  }
}

export async function getAnthropicClient({
  apiKey,
  maxRetries,
  model,
  fetchOverride,
  source,
}: {
  apiKey?: string
  maxRetries: number
  model?: string
  fetchOverride?: ClientOptions['fetch']
  source?: string
}): Promise<Anthropic> {
  const containerId = process.env.CLAUDE_CODE_CONTAINER_ID
  const remoteSessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID
  const clientApp = process.env.CLAUDE_AGENT_SDK_CLIENT_APP
  const customHeaders = getCustomHeaders()
  const defaultHeaders: { [key: string]: string } = {
    'x-app': 'cli',
    'User-Agent': getUserAgent(),
    'X-Claude-Code-Session-Id': getSessionId(),
    ...customHeaders,
    ...(containerId ? { 'x-claude-remote-container-id': containerId } : {}),
    ...(remoteSessionId
      ? { 'x-claude-remote-session-id': remoteSessionId }
      : {}),
    // SDK consumers can identify their app/library for backend analytics
    ...(clientApp ? { 'x-client-app': clientApp } : {}),
  }

  // Log API client configuration for HFI debugging
  logForDebugging(
    `[API:request] Creating client, ANTHROPIC_CUSTOM_HEADERS present: ${!!process.env.ANTHROPIC_CUSTOM_HEADERS}, has Authorization header: ${!!customHeaders['Authorization']}`,
  )

  // Add additional protection header if enabled via env var
  const additionalProtectionEnabled = isEnvTruthy(
    process.env.CLAUDE_CODE_ADDITIONAL_PROTECTION,
  )
  if (additionalProtectionEnabled) {
    defaultHeaders['x-anthropic-additional-protection'] = 'true'
  }

  logForDebugging('[API:auth] OAuth token check starting')
  await checkAndRefreshOAuthTokenIfNeeded()
  logForDebugging('[API:auth] OAuth token check complete')

  if (!isClaudeAISubscriber()) {
    await configureApiKeyHeaders(defaultHeaders, getIsNonInteractiveSession())
  }

  const resolvedFetch = buildFetch(fetchOverride, source)

  const ARGS = {
    defaultHeaders,
    maxRetries,
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,
    fetchOptions: getProxyFetchOptions({
      forAnthropicAPI: true,
    }) as ClientOptions['fetchOptions'],
    ...(resolvedFetch && {
      fetch: resolvedFetch,
    }),
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)) {
    const { AnthropicBedrock } = await import('@anthropic-ai/bedrock-sdk')
    // Use region override for small fast model if specified
    const awsRegion =
      model === getSmallFastModel() &&
      process.env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION
        ? process.env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION
        : getAWSRegion()

    const bedrockArgs: ConstructorParameters<typeof AnthropicBedrock>[0] = {
      ...ARGS,
      awsRegion,
      ...(isEnvTruthy(process.env.CLAUDE_CODE_SKIP_BEDROCK_AUTH) && {
        skipAuth: true,
      }),
      ...(isDebugToStdErr() && { logger: createStderrLogger() }),
    }

    // Add API key authentication if available
    if (process.env.AWS_BEARER_TOKEN_BEDROCK) {
      bedrockArgs.skipAuth = true
      // Add the Bearer token for Bedrock API key authentication
      bedrockArgs.defaultHeaders = {
        ...bedrockArgs.defaultHeaders,
        Authorization: `Bearer ${process.env.AWS_BEARER_TOKEN_BEDROCK}`,
      }
    } else if (!isEnvTruthy(process.env.CLAUDE_CODE_SKIP_BEDROCK_AUTH)) {
      // Refresh auth and get credentials with cache clearing
      const cachedCredentials = await refreshAndGetAwsCredentials()
      if (cachedCredentials) {
        bedrockArgs.awsAccessKey = cachedCredentials.accessKeyId
        bedrockArgs.awsSecretKey = cachedCredentials.secretAccessKey
        bedrockArgs.awsSessionToken = cachedCredentials.sessionToken
      }
    }
    // we have always been lying about the return type - this doesn't support batching or models
    return new AnthropicBedrock(bedrockArgs) as unknown as Anthropic
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)) {
    const { AnthropicFoundry } = await import('@anthropic-ai/foundry-sdk')
    // Determine Azure AD token provider based on configuration
    // SDK reads ANTHROPIC_FOUNDRY_API_KEY by default
    let azureADTokenProvider: (() => Promise<string>) | undefined
    if (!process.env.ANTHROPIC_FOUNDRY_API_KEY) {
      if (isEnvTruthy(process.env.CLAUDE_CODE_SKIP_FOUNDRY_AUTH)) {
        // Mock token provider for testing/proxy scenarios (similar to Vertex mock GoogleAuth)
        azureADTokenProvider = () => Promise.resolve('')
      } else {
        // Use real Azure AD authentication with DefaultAzureCredential
        const {
          DefaultAzureCredential: AzureCredential,
          getBearerTokenProvider,
        } = await import('@azure/identity')
        azureADTokenProvider = getBearerTokenProvider(
          new AzureCredential(),
          'https://cognitiveservices.azure.com/.default',
        )
      }
    }

    const foundryArgs: ConstructorParameters<typeof AnthropicFoundry>[0] = {
      ...ARGS,
      ...(azureADTokenProvider && { azureADTokenProvider }),
      ...(isDebugToStdErr() && { logger: createStderrLogger() }),
    }
    // we have always been lying about the return type - this doesn't support batching or models
    return new AnthropicFoundry(foundryArgs) as unknown as Anthropic
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)) {
    // Refresh GCP credentials if gcpAuthRefresh is configured and credentials are expired
    // This is similar to how we handle AWS credential refresh for Bedrock
    if (!isEnvTruthy(process.env.CLAUDE_CODE_SKIP_VERTEX_AUTH)) {
      await refreshGcpCredentialsIfNeeded()
    }

    const [{ AnthropicVertex }, { GoogleAuth }] = await Promise.all([
      import('@anthropic-ai/vertex-sdk'),
      import('google-auth-library'),
    ])
    // TODO: Cache either GoogleAuth instance or AuthClient to improve performance
    // Currently we create a new GoogleAuth instance for every getAnthropicClient() call
    // This could cause repeated authentication flows and metadata server checks
    // However, caching needs careful handling of:
    // - Credential refresh/expiration
    // - Environment variable changes (GOOGLE_APPLICATION_CREDENTIALS, project vars)
    // - Cross-request auth state management
    // See: https://github.com/googleapis/google-auth-library-nodejs/issues/390 for caching challenges

    // Prevent metadata server timeout by providing projectId as fallback
    // google-auth-library checks project ID in this order:
    // 1. Environment variables (GCLOUD_PROJECT, GOOGLE_CLOUD_PROJECT, etc.)
    // 2. Credential files (service account JSON, ADC file)
    // 3. gcloud config
    // 4. GCE metadata server (causes 12s timeout outside GCP)
    //
    // We only set projectId if user hasn't configured other discovery methods
    // to avoid interfering with their existing auth setup

    // Check project environment variables in same order as google-auth-library
    // See: https://github.com/googleapis/google-auth-library-nodejs/blob/main/src/auth/googleauth.ts
    const hasProjectEnvVar =
      process.env['GCLOUD_PROJECT'] ||
      process.env['GOOGLE_CLOUD_PROJECT'] ||
      process.env['gcloud_project'] ||
      process.env['google_cloud_project']

    // Check for credential file paths (service account or ADC)
    // Note: We're checking both standard and lowercase variants to be safe,
    // though we should verify what google-auth-library actually checks
    const hasKeyFile =
      process.env['GOOGLE_APPLICATION_CREDENTIALS'] ||
      process.env['google_application_credentials']

    const googleAuth = isEnvTruthy(process.env.CLAUDE_CODE_SKIP_VERTEX_AUTH)
      ? ({
          // Mock GoogleAuth for testing/proxy scenarios
          getClient: () => ({
            getRequestHeaders: () => ({}),
          }),
        } as unknown as GoogleAuth)
      : new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
          // Only use ANTHROPIC_VERTEX_PROJECT_ID as last resort fallback
          // This prevents the 12-second metadata server timeout when:
          // - No project env vars are set AND
          // - No credential keyfile is specified AND
          // - ADC file exists but lacks project_id field
          //
          // Risk: If auth project != API target project, this could cause billing/audit issues
          // Mitigation: Users can set GOOGLE_CLOUD_PROJECT to override
          ...(hasProjectEnvVar || hasKeyFile
            ? {}
            : {
                projectId: process.env.ANTHROPIC_VERTEX_PROJECT_ID,
              }),
        })

    const vertexArgs: ConstructorParameters<typeof AnthropicVertex>[0] = {
      ...ARGS,
      region: getVertexRegionForModel(model),
      googleAuth,
      ...(isDebugToStdErr() && { logger: createStderrLogger() }),
    }
    // we have always been lying about the return type - this doesn't support batching or models
    return new AnthropicVertex(vertexArgs) as unknown as Anthropic
  }

  // Determine authentication method based on available tokens
  const clientConfig: ConstructorParameters<typeof Anthropic>[0] = {
    apiKey: isClaudeAISubscriber() ? null : apiKey || getAnthropicApiKey(),
    authToken: isClaudeAISubscriber()
      ? getClaudeAIOAuthTokens()?.accessToken
      : undefined,
    // Set baseURL from OAuth config when using staging OAuth
    ...(process.env.USER_TYPE === 'ant' &&
    isEnvTruthy(process.env.USE_STAGING_OAUTH)
      ? { baseURL: getOauthConfig().BASE_API_URL }
      : {}),
    ...ARGS,
    ...(isDebugToStdErr() && { logger: createStderrLogger() }),
  }

  return new Anthropic(clientConfig)
}

async function configureApiKeyHeaders(
  headers: Record<string, string>,
  isNonInteractiveSession: boolean,
): Promise<void> {
  const token =
    process.env.ANTHROPIC_AUTH_TOKEN ||
    (await getApiKeyFromApiKeyHelper(isNonInteractiveSession))
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
}

function getCustomHeaders(): Record<string, string> {
  const customHeaders: Record<string, string> = {}
  const customHeadersEnv = process.env.ANTHROPIC_CUSTOM_HEADERS

  if (!customHeadersEnv) return customHeaders

  // Split by newlines to support multiple headers
  const headerStrings = customHeadersEnv.split(/\n|\r\n/)

  for (const headerString of headerStrings) {
    if (!headerString.trim()) continue

    // Parse header in format "Name: Value" (curl style). Split on first `:`
    // then trim — avoids regex backtracking on malformed long header lines.
    const colonIdx = headerString.indexOf(':')
    if (colonIdx === -1) continue
    const name = headerString.slice(0, colonIdx).trim()
    const value = headerString.slice(colonIdx + 1).trim()
    if (name) {
      customHeaders[name] = value
    }
  }

  return customHeaders
}

export const CLIENT_REQUEST_ID_HEADER = 'x-client-request-id'

type OpenAICompatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

type OpenAICompatRequest = {
  model: string
  messages: OpenAICompatMessage[]
  max_tokens?: number
  temperature?: number
  stop?: string[]
  stream?: boolean
  tools?: Array<{
    type: 'function'
    function: {
      name: string
      description?: string
      parameters?: unknown
    }
  }>
  tool_choice?:
    | 'auto'
    | 'none'
    | 'required'
    | {
        type: 'function'
        function: {
          name: string
        }
      }
}

type OpenAICompatResponse = {
  id?: string
  model?: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  choices?: Array<{
    finish_reason?: string | null
    message?: {
      content?: string | null
      tool_calls?: Array<{
        id?: string
        type?: string
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
  }>
}

function shouldUseOpenAICompatAdapter(url: URL): boolean {
  if (getAPIProvider() !== 'firstParty') {
    return false
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI_COMPAT)) {
    return true
  }
  if (isFirstPartyAnthropicBaseUrl()) {
    return false
  }
  return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
}

async function readRequestBodyText(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<string | undefined> {
  if (typeof init?.body === 'string') {
    return init.body
  }
  if (init?.body instanceof URLSearchParams) {
    return init.body.toString()
  }
  if (init?.body instanceof Uint8Array) {
    return new TextDecoder().decode(init.body)
  }
  if (input instanceof Request) {
    return await input.clone().text()
  }
  return undefined
}

function getTextFromAnthropicBlock(block: unknown): string {
  if (typeof block === 'string') {
    return block
  }
  if (
    block !== null &&
    typeof block === 'object' &&
    'type' in block &&
    (block as { type: unknown }).type === 'text' &&
    'text' in block &&
    typeof (block as { text: unknown }).text === 'string'
  ) {
    return (block as { text: string }).text
  }
  return ''
}

function stringifyAnthropicToolResultContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (!Array.isArray(content)) {
    return JSON.stringify(content ?? '')
  }
  const parts = content.map(block => {
    const text = getTextFromAnthropicBlock(block)
    if (text) {
      return text
    }
    return JSON.stringify(block)
  })
  return parts.join('\n')
}

function appendOpenAIMessage(
  messages: OpenAICompatMessage[],
  message: OpenAICompatMessage,
): void {
  if (
    message.role !== 'tool' &&
    typeof message.content === 'string' &&
    message.content.trim().length === 0 &&
    (!message.tool_calls || message.tool_calls.length === 0)
  ) {
    return
  }
  if (
    message.role === 'tool' &&
    (!message.tool_call_id || typeof message.content !== 'string')
  ) {
    return
  }
  messages.push(message)
}

function collectAnthropicSystemText(system: unknown): string {
  if (typeof system === 'string') {
    return system
  }
  if (!Array.isArray(system)) {
    return ''
  }
  return system
    .map(block => getTextFromAnthropicBlock(block))
    .filter(Boolean)
    .join('\n')
}

function translateAnthropicMessagesToOpenAI(
  body: Record<string, unknown>,
): OpenAICompatMessage[] {
  const result: OpenAICompatMessage[] = []
  const systemText = collectAnthropicSystemText(body.system)
  if (systemText) {
    result.push({ role: 'system', content: systemText })
  }

  const sourceMessages = Array.isArray(body.messages) ? body.messages : []
  for (const rawMessage of sourceMessages) {
    if (rawMessage === null || typeof rawMessage !== 'object') {
      continue
    }
    const message = rawMessage as Record<string, unknown>
    const role =
      message.role === 'assistant' || message.role === 'user'
        ? message.role
        : null
    if (!role) {
      continue
    }

    if (typeof message.content === 'string') {
      appendOpenAIMessage(result, {
        role,
        content: message.content,
      })
      continue
    }

    const blocks = Array.isArray(message.content) ? message.content : []
    if (role === 'assistant') {
      let textParts: string[] = []
      const toolCalls: NonNullable<OpenAICompatMessage['tool_calls']> = []
      for (const rawBlock of blocks) {
        if (rawBlock === null || typeof rawBlock !== 'object') {
          continue
        }
        const block = rawBlock as Record<string, unknown>
        switch (block.type) {
          case 'text':
            if (typeof block.text === 'string') {
              textParts.push(block.text)
            }
            break
          case 'tool_use': {
            const id =
              typeof block.id === 'string' && block.id.length > 0
                ? block.id
                : `toolu_${randomUUID()}`
            const name =
              typeof block.name === 'string' && block.name.length > 0
                ? block.name
                : 'tool'
            toolCalls.push({
              id,
              type: 'function',
              function: {
                name,
                arguments: JSON.stringify(block.input ?? {}),
              },
            })
            break
          }
          default:
            break
        }
      }
      appendOpenAIMessage(result, {
        role: 'assistant',
        content: textParts.length > 0 ? textParts.join('\n') : null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      })
      continue
    }

    let userTextParts: string[] = []
    for (const rawBlock of blocks) {
      if (rawBlock === null || typeof rawBlock !== 'object') {
        continue
      }
      const block = rawBlock as Record<string, unknown>
      switch (block.type) {
        case 'text':
          if (typeof block.text === 'string') {
            userTextParts.push(block.text)
          }
          break
        case 'tool_result': {
          if (userTextParts.length > 0) {
            appendOpenAIMessage(result, {
              role: 'user',
              content: userTextParts.join('\n'),
            })
            userTextParts = []
          }
          appendOpenAIMessage(result, {
            role: 'tool',
            tool_call_id:
              typeof block.tool_use_id === 'string' ? block.tool_use_id : '',
            content: stringifyAnthropicToolResultContent(block.content),
          })
          break
        }
        default:
          break
      }
    }
    if (userTextParts.length > 0) {
      appendOpenAIMessage(result, {
        role: 'user',
        content: userTextParts.join('\n'),
      })
    }
  }

  return result
}

function translateAnthropicToolsToOpenAI(
  tools: unknown,
): OpenAICompatRequest['tools'] {
  if (!Array.isArray(tools) || tools.length === 0) {
    return undefined
  }
  const translated = tools
    .filter(tool => tool !== null && typeof tool === 'object')
    .map(tool => {
      const value = tool as Record<string, unknown>
      return {
        type: 'function' as const,
        function: {
          name:
            typeof value.name === 'string' && value.name.length > 0
              ? value.name
              : 'tool',
          ...(typeof value.description === 'string'
            ? { description: value.description }
            : {}),
          ...(value.input_schema !== undefined
            ? { parameters: value.input_schema }
            : {}),
        },
      }
    })
  return translated.length > 0 ? translated : undefined
}

function translateAnthropicToolChoiceToOpenAI(
  toolChoice: unknown,
): OpenAICompatRequest['tool_choice'] {
  if (toolChoice === null || typeof toolChoice !== 'object') {
    return undefined
  }
  const value = toolChoice as Record<string, unknown>
  switch (value.type) {
    case 'auto':
      return 'auto'
    case 'any':
      return 'required'
    case 'none':
      return 'none'
    case 'tool':
      return typeof value.name === 'string'
        ? {
            type: 'function',
            function: { name: value.name },
          }
        : undefined
    default:
      return undefined
  }
}

function buildOpenAICompatRequest(
  anthropicBody: Record<string, unknown>,
): OpenAICompatRequest {
  return {
    model:
      typeof anthropicBody.model === 'string'
        ? anthropicBody.model
        : process.env.ANTHROPIC_MODEL || 'gpt-5.4',
    messages: translateAnthropicMessagesToOpenAI(anthropicBody),
    ...(typeof anthropicBody.max_tokens === 'number'
      ? { max_tokens: anthropicBody.max_tokens }
      : {}),
    ...(typeof anthropicBody.temperature === 'number'
      ? { temperature: anthropicBody.temperature }
      : {}),
    ...(Array.isArray(anthropicBody.stop_sequences)
      ? { stop: anthropicBody.stop_sequences as string[] }
      : {}),
    ...(translateAnthropicToolsToOpenAI(anthropicBody.tools)
      ? { tools: translateAnthropicToolsToOpenAI(anthropicBody.tools) }
      : {}),
    ...(translateAnthropicToolChoiceToOpenAI(anthropicBody.tool_choice)
      ? {
          tool_choice: translateAnthropicToolChoiceToOpenAI(
            anthropicBody.tool_choice,
          ),
        }
      : {}),
    stream: false,
  }
}

function parseToolCallArguments(argumentsText: string | undefined): unknown {
  if (!argumentsText) {
    return {}
  }
  try {
    return JSON.parse(argumentsText)
  } catch {
    return { raw: argumentsText }
  }
}

function mapFinishReasonToAnthropic(
  finishReason: string | null | undefined,
  hasToolCalls: boolean,
): string | null {
  if (hasToolCalls) {
    return 'tool_use'
  }
  switch (finishReason) {
    case 'length':
      return 'max_tokens'
    case 'stop':
    case 'content_filter':
      return 'end_turn'
    default:
      return null
  }
}

function buildAnthropicMessageFromOpenAI(
  anthropicBody: Record<string, unknown>,
  openAIResponse: OpenAICompatResponse,
): Record<string, unknown> {
  const choice = openAIResponse.choices?.[0]
  const message = choice?.message
  const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : []
  const content: Array<Record<string, unknown>> = []

  if (typeof message?.content === 'string' && message.content.length > 0) {
    content.push({
      type: 'text',
      text: message.content,
    })
  }

  for (const toolCall of toolCalls) {
    const name = toolCall.function?.name || 'tool'
    const id = toolCall.id || `toolu_${randomUUID()}`
    content.push({
      type: 'tool_use',
      id,
      name,
      input: parseToolCallArguments(toolCall.function?.arguments),
    })
  }

  const usage = openAIResponse.usage ?? {}
  return {
    id: `msg_${openAIResponse.id || randomUUID()}`,
    type: 'message',
    role: 'assistant',
    model:
      openAIResponse.model ||
      (typeof anthropicBody.model === 'string'
        ? anthropicBody.model
        : process.env.ANTHROPIC_MODEL || 'gpt-5.4'),
    content,
    stop_reason: mapFinishReasonToAnthropic(choice?.finish_reason, toolCalls.length > 0),
    stop_sequence: null,
    usage: {
      input_tokens: usage.prompt_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  }
}

function buildCompatHeaders(requestId?: string): Headers {
  return new Headers({
    'content-type': 'application/json',
    ...(requestId ? { 'request-id': requestId, 'x-request-id': requestId } : {}),
  })
}

function buildCompatErrorResponse(status: number, message: string): Response {
  const requestId = randomUUID()
  return new Response(
    JSON.stringify({
      type: 'error',
      error: {
        type: status === 404 ? 'not_found_error' : 'invalid_request_error',
        message,
      },
    }),
    {
      status,
      headers: buildCompatHeaders(requestId),
    },
  )
}

function roughCompatTokenCount(body: Record<string, unknown>): number {
  const request = buildOpenAICompatRequest(body)
  const serialized = JSON.stringify(request.messages)
  return Math.max(1, Math.ceil(serialized.length / 4))
}

function buildFetch(
  fetchOverride: ClientOptions['fetch'],
  source: string | undefined,
): ClientOptions['fetch'] {
  // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
  const inner = fetchOverride ?? globalThis.fetch
  // Only send to the first-party API — Bedrock/Vertex/Foundry don't log it
  // and unknown headers risk rejection by strict proxies (inc-4029 class).
  const injectClientRequestId =
    getAPIProvider() === 'firstParty' && isFirstPartyAnthropicBaseUrl()
  return async (input, init) => {
    // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
    const headers = new Headers(init?.headers)
    // Generate a client-side request ID so timeouts (which return no server
    // request ID) can still be correlated with server logs by the API team.
    // Callers that want to track the ID themselves can pre-set the header.
    if (injectClientRequestId && !headers.has(CLIENT_REQUEST_ID_HEADER)) {
      headers.set(CLIENT_REQUEST_ID_HEADER, randomUUID())
    }
    try {
      // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
      const url = input instanceof Request ? input.url : String(input)
      const id = headers.get(CLIENT_REQUEST_ID_HEADER)
      logForDebugging(
        `[API REQUEST] ${new URL(url).pathname}${id ? ` ${CLIENT_REQUEST_ID_HEADER}=${id}` : ''} source=${source ?? 'unknown'}`,
      )
    } catch {
      // never let logging crash the fetch
    }
    try {
      const rawUrl = input instanceof Request ? input.url : String(input)
      const url = new URL(rawUrl)
      if (shouldUseOpenAICompatAdapter(url)) {
        if (url.pathname.endsWith('/messages/count_tokens')) {
          const requestText = await readRequestBodyText(input, init)
          const body =
            requestText && requestText.length > 0
              ? (JSON.parse(requestText) as Record<string, unknown>)
              : {}
          return new Response(
            JSON.stringify({
              input_tokens: roughCompatTokenCount(body),
            }),
            {
              status: 200,
              headers: buildCompatHeaders(randomUUID()),
            },
          )
        }

        if (url.pathname.endsWith('/v1/messages')) {
          const requestText = await readRequestBodyText(input, init)
          const body =
            requestText && requestText.length > 0
              ? (JSON.parse(requestText) as Record<string, unknown>)
              : {}

          if (body.stream === true) {
            return buildCompatErrorResponse(
              404,
              'Streaming is handled via Claude Code non-streaming fallback in OpenAI compatibility mode.',
            )
          }

          const compatRequest = buildOpenAICompatRequest(body)
          const compatHeaders = new Headers()
          compatHeaders.set('content-type', 'application/json')
          compatHeaders.set('authorization', `Bearer ${getAnthropicApiKey()}`)
          const requestId = headers.get(CLIENT_REQUEST_ID_HEADER) || randomUUID()

          const compatUrl = new URL(url)
          compatUrl.pathname = compatUrl.pathname.replace(
            /\/v1\/messages$/,
            '/chat/completions',
          )
          compatUrl.pathname = compatUrl.pathname.replace(/\/v1\/v1\//, '/v1/')
          compatUrl.search = ''

          logForDebugging(
            `[API REQUEST] OpenAI compat ${compatUrl.pathname} source=${source ?? 'unknown'}`,
          )

          const compatResponse = await inner(compatUrl.toString(), {
            method: 'POST',
            headers: compatHeaders,
            body: JSON.stringify(compatRequest),
            signal: init?.signal,
          })

          if (!compatResponse.ok) {
            const errorText = await compatResponse.text()
            return buildCompatErrorResponse(
              compatResponse.status,
              errorText || `OpenAI-compatible backend returned ${compatResponse.status}.`,
            )
          }

          const openAIResponse = (await compatResponse.json()) as OpenAICompatResponse
          const anthropicResponse = buildAnthropicMessageFromOpenAI(
            body,
            openAIResponse,
          )
          return new Response(JSON.stringify(anthropicResponse), {
            status: 200,
            headers: buildCompatHeaders(requestId),
          })
        }
      }
    } catch (error) {
      logForDebugging(
        `[API REQUEST] OpenAI compat adapter error: ${error instanceof Error ? error.message : String(error)}`,
        { level: 'warn' },
      )
      return buildCompatErrorResponse(
        400,
        error instanceof Error ? error.message : String(error),
      )
    }

    return inner(input, { ...init, headers })
  }
}
