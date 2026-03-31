export type OptionWithDescription = {
  label: string
  description?: string
}

export function option(label: string, description?: string): OptionWithDescription {
  return { label, description }
}