# Creating RPC Calls

For security, PocketHost does not allow modification of records by the frontend PocketBase client. Instead, the frontend must send an rpc request which the backend will securely process. This allows for many security vulnerabilities to be addressed which PocketBase admin security rules cannot. In particular, PocketBase admin security rules fall short in these scenarios:

- When the incoming data cannot be validated declaratively
- When multiple records and/or tables must be updated as a transaction
- When side-effects (ie, other mutations) are required under specific conditions

Therefore, PocketHost uses an RPC pattern instead.

## Creating a new RPC Call

1. From the command line, run `npx hygen rpc new <FunctionName>`. This will generate all necessary files for both frontend and backend support of your RPC call.
2. Edit `./packages/common/src/schema/Rpc/<FunctionName>.ts` to suit the schema you want.
3. Edit `./packages/daemon/services/RpcService/commands.ts` to respond to the RPC command

## Getting the result from an RPC call

RPC results are currently not supported. RPC commands are run asynchronously.
