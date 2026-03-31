export type OAuthTokens = {
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  [key: string]: unknown
}

export type AccountInfo = {
  email?: string
  orgId?: string
  [key: string]: unknown
}

export type OAuthProfileResponse = {
  account?: AccountInfo
  [key: string]: unknown
}

export type OAuthService = 'claude-ai' | 'console' | string

export type BillingType = string
export type SubscriptionType = string
export type OverageDisabledReason = string
export type ReferralEligibilityResponse = Record<string, unknown>
export type ReferralRedemptionsResponse = Record<string, unknown>
export type ReferrerRewardInfo = Record<string, unknown>

export const OAUTH_BETA_HEADER = 'x-claude-beta'
export const CLAUDE_AI_PROFILE_SCOPE = 'profile'
