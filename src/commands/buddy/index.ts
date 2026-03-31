import type { Command } from '../../commands.js'

const buddy = {
  type: 'local',
  name: 'buddy',
  description: 'Buddy command',
  load: async () => ({})
} satisfies Command

export default buddy