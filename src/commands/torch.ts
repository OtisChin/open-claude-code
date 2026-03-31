import type { Command } from '../commands.js'

const torch = {
  type: 'local',
  name: 'torch',
  description: 'Torch command',
  load: async () => ({})
} satisfies Command

export default torch