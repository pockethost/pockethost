# PocketHost Client Conventions

## Import from `pockethost/common`

The SDK is re-exported from a single entry point:

```ts
// packages/pockethost/src/common/pocketbase.ts
import PocketBase, { BaseAuthStore, ClientResponseError, type AuthModel } from 'pocketbase'
export { AuthModel, BaseAuthStore, ClientResponseError, PocketBase, UnsubscribeFunc }
```

Always import from `pockethost/common` in this monorepo.

## Factory pattern

Prefer factory functions that return an API object (project convention):

```ts
export const createPocketbaseClient = (config: { url: string }) => {
  const client = new PocketBase(config.url)
  const { authStore } = client

  const authViaEmail = async (email: string, password: string) =>
    client.collection('users').authWithPassword(email, password)

  return { client, authViaEmail, /* ... */ }
}
```

Reference: `packages/dashboard/src/pocketbase-client/PocketbaseClient.ts`

Dashboard singleton: `packages/dashboard/src/pocketbase-client/index.ts`

## Typed custom REST via `createRestHelper`

Mothership exposes custom `/api/*` routes from JS hooks. Use `createRestHelper` for validated calls:

```ts
import { createRestHelper, RestCommands, RestMethods, CreateInstancePayloadSchema } from 'pockethost/common'

const { mkRest } = createRestHelper({ client })

const createInstance = mkRest(
  RestCommands.Instance,
  RestMethods.Post,
  CreateInstancePayloadSchema
)

await createInstance({ subdomain: 'my-app', version: '0.22.0' })
```

Reference: `packages/pockethost/src/common/pocketbase-client-helpers/RestHelper.ts`

## Mothership vs instance URLs

| Client target | URL |
|---------------|-----|
| PocketHost dashboard (accounts, billing) | Mothership URL (`PUBLIC_MOTHERSHIP_URL`) |
| User's PocketBase app | `https://<subdomain>.pockethost.io` |

Do not point dashboard auth at a user instance URL or vice versa.

## Internal services

CLI and backend services also use `new PocketBase(MOTHERSHIP_URL())` for admin operations — e.g. `createAdminPbClient.ts`, FTP service, edge commands. These are legitimate server-side SDK uses (not user-facing app antipattern).

## Connection snippet for users

The dashboard generates this for instance overview:

```ts
import PocketBase from 'pocketbase'

const url = 'https://<subdomain>.pockethost.io'
const client = new PocketBase(url)
```
