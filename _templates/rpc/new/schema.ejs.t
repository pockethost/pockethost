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

/*
Write an async command here.

To return an error, simply throw an exception. That will propagate back 
up through the RPC stack and return an error to the client.
*/
registerCommand<${NameName}Payload, ${NameName}Result>(
  RpcCommands.${NameName},
  ${NameName}PayloadSchema,
  async (job) => {
    const { payload } = job
    const { instanceId, items } = payload

    await client.updateInstance(instanceId, { 
      /* Whatever fields you want to update */ 
    })

    // Return anything you'd like here, it must be compatible with the ${NameName}Result type.
    return { } 
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

/*
This result can stay empty, it is intended only to hold the result of a successful RPC
*/
export type <%=NameName%>Result = {
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



