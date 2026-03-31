import type { Command } from '../../commands.js'

const workflows = {
  type: 'local',
  name: 'workflows',
  description: 'Workflows command',
  load: async () => ({})
} satisfies Command

export default workflows