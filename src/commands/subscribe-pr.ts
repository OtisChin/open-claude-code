import type { Command } from '../commands.js'

const subscribePr = {
  type: 'local',
  name: 'subscribe-pr',
  description: 'Subscribe PR command',
  load: async () => ({})
} satisfies Command

export default subscribePr