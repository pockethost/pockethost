export function assertExists<TType>(
  v: TType,
  message = `Value does not exist`
): asserts v is NonNullable<TType> {
  if (typeof v === 'undefined') {
    throw new Error(message)
  }
}
