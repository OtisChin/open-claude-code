import type { Command } from '../commands.js'

const forceSnip = {
  type: 'local',
  name: 'force-snip',
  description: 'Force snip command',
  load: async () => ({})
} satisfies Command

export default forceSnip