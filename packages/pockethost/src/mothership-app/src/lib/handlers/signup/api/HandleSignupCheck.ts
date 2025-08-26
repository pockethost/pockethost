import { error } from '../error'
import { isAvailable } from '../isAvailable'
import { generate } from '../random-words'

export const HandleSignupCheck = (c: core.RequestEvent) => {
  const instanceName = (() => {
    const name = c.request?.url?.query().get('name').trim()
    if (name) {
      if (name.match(/^[a-z][a-z0-9-]{2,39}$/) === null) {
        throw error(
          `instanceName`,
          `invalid`,
          `Instance name must begin with a letter, be between 3-40 characters, and can only contain a-z, 0-9, and hyphen (-).`
        )
      }
      if (isAvailable(name)) {
        return name
      }
      throw error(`instanceName`, `exists`, `Instance name ${name} is not available.`)
    } else {
      let i = 0
      while (true) {
        i++
        if (i > 100) {
          return +new Date()
        }
        const slug = generate(2).join(`-`)
        if (isAvailable(slug)) return slug
      }
    }
  })()
  return c.json(200, { instanceName })
}
