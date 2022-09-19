export function assertExists<TType>(
  v: unknown,
  message = `Value does not exist`
): asserts v is NonNullable<TType> {
  if (typeof v === 'undefined') {
    throw new Error(message)
  }
}
