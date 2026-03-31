import type { Command } from '../../commands.js'

const fork = {
  type: 'local',
  name: 'fork',
  description: 'Fork command',
  load: async () => ({})
} satisfies Command

export default fork