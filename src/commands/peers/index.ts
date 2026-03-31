import type { Command } from '../../commands.js'

const peers = {
  type: 'local',
  name: 'peers',
  description: 'Peers command',
  load: async () => ({})
} satisfies Command

export default peers