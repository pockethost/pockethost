export function die(msg: string): never {
  console.error(msg)
  process.exit(1)
}
