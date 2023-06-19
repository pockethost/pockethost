---
to: packages/common/src/schema/<%= name %>.ts
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
h.replace('./packages/common/src/schema/index.ts', /\/\/ gen:export/, `export * from './${NameName}'\n  // gen:export`);

%>
import { BaseFields, RecordId } from './types'

export const <%=NAME_NAME> = '<%=dashName%>'

export type <%=NameName%>Id = string

export type <%=NameName%>Collection = {
  [name: <%=NameName%>Id]: <%=NameName%>Fields
}

export type <%=NameName%>Fields = BaseFields & {
  userCount: number
  instanceCount: number
}

export type <%=NameName%>Fields_Create = Omit<<%=NameName%>Fields, keyof BaseFields>

export type <%=NameName%>ById = { [_: RecordId]: <%=NameName%>Fields }
