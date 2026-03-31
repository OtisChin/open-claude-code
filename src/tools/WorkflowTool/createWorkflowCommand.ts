import type { Command } from '../../commands.js'

export function createWorkflowCommand(): Command {
  return {
    type: 'local',
    name: 'workflow',
    description: 'Workflow command',
    load: async () => ({})
  }
}