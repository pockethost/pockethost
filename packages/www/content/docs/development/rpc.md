---
title: Creating RPC Calls
category: development
description: Learn how to secure data modifications with PocketHost by creating
  Remote Procedure Calls (RPC). Our guide comprehensively covers how to produce
  new RPC calls, adjust the schema, and handle commands. Currently, only
  asynchronous executions are supported, with returns from RPC calls
  unavailable. Ideal for nodejs programmers seeking robust security measures.

---

# Overview

We all are quite aware of the security challenge one could face allowing direct modification of record by the frontend PocketBase client. That's where Remote Procedure Calls (RPCs) in PocketHost swing into action, coming to the rescue to ensure the vulnerable frontiers are secure. It gives you an opportunity to deal with mutable data safely by sending frontend RPC requests to the backend to process securely. The advantage of this? You're catering to imperfections in PocketBase admin security rules, and handling record update scenarios involving transactions, data validation, or specific condition requirements.

So, how do we add an RPC call to your PocketHost? It's simple - from your command line, execute `npx hygen rpc new <FunctionName>`, which effectively prepares the necessary files for your RPC call. Of course, you may need to tune the schema in `./packages/common/src/schema/Rpc/<FunctionName>.ts` to match your specifications. Follow it up by adjusting `./packages/daemon/services/RpcService/commands.ts` to receive the RPC command.

Now let's talk about the RPC results. Currently, you must be aware that we don't support RPC results, as they basically operate on an asynchronous basis. Essentially, you have managed to enhance your backend security layer by adding the robust RPC feature to your PocketHost.


For security, PocketHost does not allow modification of records by the frontend PocketBase client. Instead, the frontend must send an RPC request which the backend will securely process. This allows for many security vulnerabilities to be addressed which PocketBase admin security rules cannot. In particular, PocketBase admin security rules fall short in these scenarios:

- When the incoming data cannot be validated declaratively
- When multiple records and/or tables must be updated as a transaction
- When side effects (ie, other mutations) are required under specific conditions

Therefore, PocketHost uses an RPC pattern instead.

## Creating a new RPC Call

1. From the command line, run `npx hygen rpc new <FunctionName>`. This will generate all necessary files for both frontend and backend support of your RPC call.
2. Edit `./packages/common/src/schema/Rpc/<FunctionName>.ts` to suit the schema you want.
3. Edit `./packages/daemon/services/RpcService/commands.ts` to respond to the RPC command

## Getting the result from an RPC call

RPC results are currently not supported. RPC commands are run asynchronously.
