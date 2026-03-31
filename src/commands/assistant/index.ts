import type { Command } from '../../commands.js'

const assistant = {
  type: 'local',
  name: 'assistant',
  description: 'Assistant mode',
  load: async () => ({})
} satisfies Command

export default assistant