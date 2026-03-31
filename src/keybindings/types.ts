export type KeybindingContextName = string

export type ParsedKeystroke = {
  key?: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  [key: string]: unknown
}

export type KeyboardEvent = ParsedKeystroke

export type KeybindingAction =
  | string
  | {
      id: string
      [key: string]: unknown
    }

export type Keybinding = {
  id: string
  keys: string[]
  action: KeybindingAction
  [key: string]: unknown
}

export type KeybindingsMap = Record<string, Keybinding>
