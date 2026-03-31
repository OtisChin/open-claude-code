declare module 'bun:bundle' {
  export function feature(name: string): boolean
}

declare module 'bun:ffi' {
  export const dlopen: any
  export const FFIType: any
  export const suffix: any
  export const ptr: any
  export const CString: any
  const rest: any
  export default rest
}

declare const MACRO: {
  VERSION: string
  [key: string]: string | number | boolean
}
