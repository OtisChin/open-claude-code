import type { LocalCommandCall } from '../../types/command.js'
import {
  companionUserId,
  getCompanion,
  roll,
} from '../../buddy/companion.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'

const NAME_PREFIXES = [
  'Byte',
  'Mochi',
  'Nova',
  'Pebble',
  'Pixel',
  'Comet',
  'Nori',
  'Echo',
] as const

const NAME_SUFFIXES = [
  'bean',
  'tail',
  'puff',
  'spark',
  'patch',
  'dot',
  'bug',
  'loop',
] as const

const PERSONALITIES = [
  'curious and quietly supportive',
  'playful and a little dramatic',
  'patient, cozy, and always nearby',
  'tiny, brave, and observant',
  'chaotic in a charming way',
  'soft-spoken but weirdly insightful',
] as const

const PET_REACTIONS = [
  'chirps happily.',
  'wiggles with delight.',
  'leans in for more.',
  'does a proud little bounce.',
  'looks extremely pleased.',
] as const

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function pick<T>(seed: number, values: readonly T[], offset = 0): T {
  return values[(seed + offset) % values.length]!
}

function createStoredCompanion() {
  const seed = hashString(companionUserId())
  return {
    name: `${pick(seed, NAME_PREFIXES)}${pick(seed, NAME_SUFFIXES, 3)}`,
    personality: pick(seed, PERSONALITIES, 7),
    hatchedAt: Date.now(),
  }
}

function describeCompanion(): string {
  const companion = getCompanion()
  if (!companion) {
    return 'No companion hatched yet. Run /buddy to hatch one.'
  }

  const status = getGlobalConfig().companionMuted ? 'muted' : 'active'
  return [
    `${companion.name} the ${companion.species}`,
    `${companion.rarity} rarity`,
    status,
    companion.personality,
  ].join('\n')
}

export const call: LocalCommandCall = async (args, context) => {
  const action = args.trim().toLowerCase()

  if (action === 'status' || action === 'info') {
    return { type: 'text', value: describeCompanion() }
  }

  if (action === 'mute') {
    saveGlobalConfig(current =>
      current.companionMuted ? current : { ...current, companionMuted: true },
    )
    return { type: 'text', value: 'Companion muted.' }
  }

  if (action === 'unmute') {
    saveGlobalConfig(current =>
      current.companionMuted
        ? { ...current, companionMuted: false }
        : current,
    )
    return { type: 'text', value: 'Companion unmuted.' }
  }

  if (action === 'rehatch' || action === 'reset') {
    const stored = createStoredCompanion()
    saveGlobalConfig(current => ({
      ...current,
      companion: stored,
      companionMuted: false,
    }))
    const companion = getCompanion()
    context.setAppState(prev => ({
      ...prev,
      companionReaction: companion ? `${companion.name} hatched!` : undefined,
      companionPetAt: Date.now(),
    }))
    return {
      type: 'text',
      value: companion
        ? `Rehatched ${companion.name} the ${companion.species}.`
        : 'Companion rehatched.',
    }
  }

  let companion = getCompanion()
  if (!companion) {
    const stored = createStoredCompanion()
    saveGlobalConfig(current => ({
      ...current,
      companion: stored,
      companionMuted: false,
    }))
    companion = getCompanion()
    context.setAppState(prev => ({
      ...prev,
      companionReaction: companion ? `${companion.name} hatched!` : undefined,
      companionPetAt: Date.now(),
    }))

    if (!companion) {
      return { type: 'text', value: 'Failed to hatch companion.' }
    }

    const { bones } = roll(companionUserId())
    return {
      type: 'text',
      value: [
        `${companion.name} hatched.`,
        `${bones.species} · ${bones.rarity} rarity`,
        companion.personality,
      ].join('\n'),
    }
  }

  if (action && action !== 'pet') {
    return {
      type: 'text',
      value:
        'Unknown /buddy action. Try /buddy, /buddy status, /buddy mute, /buddy unmute, or /buddy rehatch.',
    }
  }

  const reactionSeed = hashString(`${companion.name}:${Date.now() >> 10}`)
  const reaction = `${companion.name} ${pick(reactionSeed, PET_REACTIONS)}`
  context.setAppState(prev => ({
    ...prev,
    companionPetAt: Date.now(),
    companionReaction: reaction,
  }))

  return {
    type: 'text',
    value: `${companion.name} enjoyed that.`,
  }
}
