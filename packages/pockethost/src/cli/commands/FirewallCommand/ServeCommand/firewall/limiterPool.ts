import { RateLimiterMemory } from 'rate-limiter-flexible'

const WEIGHT_DEN = 10

export { WEIGHT_DEN }

export const mkLimiterPool = () => {
  const limiters = new Map<string, RateLimiterMemory>()

  return {
    get(points: number, duration: number) {
      const key = `${points}:${duration}`
      let limiter = limiters.get(key)
      if (!limiter) {
        limiter = new RateLimiterMemory({
          points: points * WEIGHT_DEN,
          duration,
        })
        limiters.set(key, limiter)
      }
      return limiter
    },
  }
}
