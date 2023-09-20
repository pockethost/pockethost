export function assert<T>(
  v: T | undefined | void | null,
  msg?: string,
): asserts v is T {
  if (!v) {
    throw new Error(msg || `Assertion failure`)
  }
}
