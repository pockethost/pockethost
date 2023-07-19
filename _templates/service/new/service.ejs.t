---
to: packages/daemon/src/services/<%= name %>Service.ts
---
<%
const { changeCase, inflection } = h
const { dasherize } = inflection
const { upper, camel, pascal, snake, lower } = changeCase
const nameName = camel(name)
const NameName = pascal(name)
const NAME_NAME = upper(snake(NameName))
const name_name = lower(NAME_NAME)
const dashName = dasherize(name_name)
h.replace('./packages/daemon/src/server.ts', /\/\/ gen:import/, `import { ${nameName}Service } from './services/${NameName}Service'\n  // gen:import`);
h.replace('./packages/daemon/src/server.ts', /\/\/ gen:service/, `await ${nameName}Service({ logger })\n  // gen:service`);

%>
import { mkSingleton, SingletonBaseConfig } from '@pockethost/common'

export type <%=NameName%>ServiceConfig = SingletonBaseConfig & {}

export const <%=nameName%>Service = mkSingleton(
  async (config: <%=NameName%>ServiceConfig) => {
    const { logger } = config
    const _serviceLogger = logger.create('<%=NameName%>Service')
    const { dbg, error, warn, abort } = _serviceLogger

    dbg(`Initializing <%=NameName%>Service`)

    return {
      shutdown: async () => {},
    }
  }
)
