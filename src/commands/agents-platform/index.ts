import type { Command } from '../../commands.js'

const agentsPlatform = {
  type: 'local',
  name: 'agents-platform',
  description: 'Agents platform command',
  load: async () => ({})
} satisfies Command

export default agentsPlatform