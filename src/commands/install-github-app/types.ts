export type Workflow = {
  id?: string
  name?: string
  [key: string]: unknown
}

export type Warning = {
  message?: string
  [key: string]: unknown
}

export type State = {
  step?: string
  [key: string]: unknown
}