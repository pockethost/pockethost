# Creating RPC Calls

For security, PocketHost does not allow modification of records by the frontend PocketBase client. Instead, the frontend must send an rpc request which the backend will securely process. This allows for many security vulnerabilities to be addressed which PocketBase admin security rules cannot. In particular, PocketBase admin security rules fall short in these scenarios:

- When the incoming data cannot be validated declaratively
- When multiple records and/or tables must be updated as a transaction
- When side-effects (ie, other mutations) are required under specific conditions

Therefore, PocketHost uses an RPC pattern instead.

## Creating a new RPC Call

1. Create a new RPC call in `./packages/common/schema/Rpc`
2. Add frontend support in `./packages/pockethost.io/src/pocketbase/PocketbaseClient.ts` using the `mkRpc` command
3. Add backend support in (for example) `./packages/daemon/src/services/InstanceService/InstanceService.ts` using `registerCommand`

## Getting the result from an RPC call

RPC results are currently not supported. RPC commands are run asynchronously.
