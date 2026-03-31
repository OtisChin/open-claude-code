export type ViewState =
  | string
  | {
      type: string
      [key: string]: unknown
    }

export type PluginSettingsProps = {
  [key: string]: unknown
}