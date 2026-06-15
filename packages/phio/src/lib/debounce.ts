export const debounce = <T extends (...args: never[]) => void>(
  fn: T,
  ms: number
) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
