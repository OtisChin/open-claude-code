export type DeepImmutable<T> = T extends (...args: any[]) => any
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepImmutable<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepImmutable<T[K]> }
      : T

export type Permutations<T> = T extends any ? T : never
