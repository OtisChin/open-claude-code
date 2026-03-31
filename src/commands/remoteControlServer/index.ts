import type { Command } from '../../commands.js'

const remoteControlServer = {
  type: 'local',
  name: 'remote-control-server',
  description: 'Remote control server command',
  load: async () => ({})
} satisfies Command

export default remoteControlServer