export type WizardContextValue = {
  currentStep?: number
  [key: string]: unknown
}

export type WizardProviderProps = {
  children?: unknown
}