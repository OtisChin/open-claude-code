import type { Command } from '../commands.js'

const proactive = {
  type: 'local',
  name: 'proactive',
  description: 'Proactive command',
  load: async () => ({})
} satisfies Command

export default proactive