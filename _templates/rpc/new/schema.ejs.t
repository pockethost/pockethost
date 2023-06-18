---
to: packages/common/src/schema/Rpc/<%= name %>.ts
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
h.replace('./packages/common/src/schema/Rpc/index.ts', /\/\/ gen:enum/, `${NameName} = '${dashName}',\n  // gen:enum`);
h.replace('./packages/common/src/schema/Rpc/index.ts', /\/\/ gen:commandlist/, `RpcCommands.${NameName},\n  // gen:commandlist`);
h.replace('./packages/common/src/schema/Rpc/index.ts', /\/\/ gen:export/, `export * from './${NameName}'\n// gen:export`);
h.replace('./packages/pockethost.io/src/pocketbase/PocketbaseClient.ts', /\/\/ gen:import/, `
  ${NameName}PayloadSchema,
  type ${NameName}Payload,
  type ${NameName}Result,
  // gen:import
`);
h.replace('./packages/pockethost.io/src/pocketbase/PocketbaseClient.ts', /\/\/ gen:export/, `
  ${nameName},
  // gen:export
`);
h.replace('./packages/pockethost.io/src/pocketbase/PocketbaseClient.ts', /\/\/ gen:mkRpc/, `
const ${nameName} = mkRpc<${NameName}Payload, ${NameName}Result>(
  RpcCommands.${NameName},
  ${NameName}PayloadSchema
)

// gen:mkRpc`);
h.replace('./packages/daemon/src/services/RpcService/commands.ts', /\/\/ gen:import/, `
  ${NameName}PayloadSchema,
  type ${NameName}Payload,
  type ${NameName}Result,

// gen:import`);

h.replace('./packages/daemon/src/services/RpcService/commands.ts', /\/\/ gen:command/, `
registerCommand<${NameName}Payload, ${NameName}Result>(
  RpcCommands.${NameName},
  ${NameName}PayloadSchema,
  async (job) => {
    const { payload } = job
    const { instanceId, items } = payload
    try {
      await client.updateInstance(instanceId, {  })
      return { status: 'ok' }
    } catch (e) {
      return { status: 'error', message: \`\${e}\` }
    }
  }
)

// gen:command`);

%>
import { JSONSchemaType } from 'ajv'
import { InstanceId } from '../types'

export type <%=NameName%>Payload = {
  instanceId: InstanceId
  items: {
    [_: string]: string
  }
}

export type <%=NameName%>Result = {
  status: 'ok' | 'error'
  message?: string
}

export const <%=NAME_NAME%>_REGEX = /^[A-Z][A-Z0-9_]*$/

export const <%=NameName%>PayloadSchema: JSONSchemaType<<%=NameName%>Payload> = {
  type: 'object',
  properties: {
    instanceId: { type: 'string' },
    items: {
      type: 'object',
      patternProperties: {
        [<%=NAME_NAME%>_REGEX.source]: {
          anyOf: [{ type: 'string' }],
        },
      },
      required: [],
    },
  },
  required: ['instanceId', 'items'],
  additionalProperties: false,
}



