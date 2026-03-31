export async function withServerLock<T>(fn?: () => Promise<T>): Promise<T | undefined> {
  return fn ? fn() : undefined
}