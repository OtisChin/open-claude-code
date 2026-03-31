type SkillResult = Record<string, unknown>[]

type CachedFetcher = ((client: unknown) => Promise<SkillResult>) & {
  cache: Map<string, SkillResult>
}

export const fetchMcpSkillsForClient: CachedFetcher = Object.assign(
  async (_client: unknown) => [],
  { cache: new Map<string, SkillResult>() },
)
