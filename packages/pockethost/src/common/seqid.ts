let base = Date.now()
let modifier = 0
export const seqid = () => {
  const now = Date.now()
  if (now !== base) {
    base = now
    modifier = 0
  }
  return `${base}-${modifier++}`
}
