# TS/JS Cloud Functions for PocketBase

**_Write all your PocketBase server-side logic in TS/JS_**

PBScript allows you to write [PocketBase](https://pocketbase.io) server-side functions in Typescript or Javascript without recompiling.

With PBScript, you can:

- ✅ Write your server-side logic in Typescript or JS
- ✅ Access models, collections, transactions, hooks, and all server-side features of PocketBase
- ✅ Communicate with PocketBase using a streamlined JavaScript-style API
- ✅ Deploy and alter cloud functions without rebuilding _or even restarting_ PocketBase
- ✅ Roll back to previous versions
- ✅ Use the `pbscript` CLI tool for intelligent dev mode, live deployment, and rollback

<h3>Table of Contents</h3>

<!-- @import "[TOC]" {cmd="toc" depthFrom=2 depthTo=6 orderedList=false} -->

<!-- code_chunk_output -->

- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Developing your script](#developing-your-script)
- [Building and deploying your script](#building-and-deploying-your-script)
- [API](#api)
  - [`__go.ping()`](#__goping)
  - [`__go.addRoute()`](#__goaddroute)
  - [`__go.app`](#__goapp)
- [Advanced](#advanced)
  - [Upgrading an Existing Custom PocketBase](#upgrading-an-existing-custom-pocketbase)

<!-- /code_chunk_output -->

## Introduction

PBScript extends PocketBase with an [ES-5.1 (ECMA 262)](https://262.ecma-international.org/5.1/) scripting engine powered by [goja](https://github.com/dop251/goja).

Code executes in a secure sandboxed environment without a [Node.js API](https://nodejs.org/docs/latest/api/) or [Web APIs](https://developer.mozilla.org/en-US/docs/Web/API). Instead, the runtime environment is PocketBase-specific, with full access to PocketBase's [native Go extension API](https://pocketbase.io/docs/use-as-framework/) and includes streamlined functions and helper utilities written in JavaScript (@pbscript/core).

Use `pbscript` command line tool to build and publish cloud functions to any PBScript-enabled PocketBase instance.

## Getting Started

<h3>1. Create a PocketBase instance</h3>

To run JS functions, you need to run a PocketBase instance which has been enhanced with PBScript.

You can do it any way you like, just as long as you end up with an admin login for the next section.

**Option 1 (free): run fully managed on [pockethost.io](https://pockethost.io)**

The absolute easiest way to provision a new PocketBase instance enhanced with PBScript is to use [pockethost.io](https://pockethost.io). You'll be up and running with a PocketBase URL in under 30 seconds. This is as close to a Firebase/Supabase BaaS experience as you can get.

**Option 2 (free): run self-managed on fly.io**

If you'd rather manage your resources yourself, you can follow the instructions in [this thread](https://github.com/pocketbase/pocketbase/discussions/537) to get up and running on fly.io.

This option takes about 30 minutes to set up.

**Option 3 (free): run a custom build locally**

If you just want to run locally or have a special use case, you can create your own build.

Create `pocketbase.go`:

```go
package main

import (
	"log"

	pocketbase "github.com/benallfree/pbscript/modules/pbscript"
)


func main() {
    app := pocketbase.New()

    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}
```

On the command line, run:

```bash
go get github.com/benallfree/pbscript/modules/pbscript
go run pocketbase.go serve

> Server started at: http://127.0.0.1:8090
  - REST API: http://127.0.0.1:8090/api/
  - Admin UI: http://127.0.0.1:8090/_/
```

<h3>2. Create a new JS/TS project</h3>

You can create any type of TS/JS project you want, but here's the `package.json` we recommend. We also have a [sample PBScript project](https://github.com/benallfree/pbscript/tree/master/packages/sample) you can check out.

The important part is that your script gets bundled as ES5:

```json
{
  "name": "sample",
  "version": "0.0.1",
  "dependencies": {
    "@pbscript/core": "^0.0.1"
  },
  "scripts": {
    "build": "parcel build --no-cache",
    "deploy:local": "pbscript deploy --host 'http://127.0.0.1:8090'",
    "dev": "chokidar 'src/**' './node_modules/**' -c 'yarn build && yarn deploy:local' --initial"
  },
  "targets": {
    "iife": {
      "source": "./src/index.ts",
      "context": "browser",
      "outputFormat": "global",
      "sourceMap": {
        "inline": true
      }
    }
  },
  "devDependencies": {
    "chokidar-cli": "^3.0.0",
    "parcel": "^2.7.0"
  }
}
```

<h3>3. Use the `pbscript` CLI tool to log in</h3>

Enter your project directory and log in to your PocketBase instance using the admin account you created in Step #1:

```
npx pbscript login <username> <password> --host <pocketbase URL>
```

This will create a file named `.pbcache`. Add it to `.gitignore`.

## Developing your script

In your command shell, run:

```bash
npx pbscript dev
```

PBScript is designed for a fast development cycle. If you used our `package.json`, this command will watch for changes (in `./dist`) and re-deploy your script on every change.

PBScript updates do not require a PocketBase restart. Old versions of your script are kept in an archive table for easy rollbacks.

## Building and deploying your script

`pbscript` knows how to deploy to any PBScript-enabled PocketBase instance.

**Connect to your live site**

First, connect to your live site. `pbscript` will remember your credentials for future commands.

```bash
npx pbscript login <username> <password> --host https://yourproject.pockethost.io
Saved to .pbcache
```

**Build your `./dist/index.js` bundle**

You can build your script bundle however you want, just make sure you end up with ONE bundle file in `./dist/index.js`. If you use source maps, inline them. `pbscript` only deploys this one file.

**Deploy your latest changes**

You can deploy changes at any time without restarting PocketBase. All realtime connections and users will remain connected.

```bash
pbscript deploy --host <your pocketbase URL>
```

Or, add it to `package.json`:

```json
"scripts": {
  "deploy": "pbscript deploy --host https://yourproject.pockethost.io"
}
```

## API

PBScript runs in a secure sandboxed environment inside PocketBase. A simplified subset of PocketBase's hooks are available. Complete Typescript definitions are included.

You might be accustomed to using the [NodeJS API](https://nodejs.org/docs/latest/api/) or the browser [Web API](https://developer.mozilla.org/en-US/docs/Web/API), but those APIs are not core features of ECMAScript. They are not safe or allowed in the PocketBase execution environment.

Instead, your script runs in the `PocketBaseApi` execution environment. `PocketBaseApi` set of API calls to interact with PocketBase. With it, you can do CRUD, transactions, hook into PocketBase events, new API endpoints, and generally extend PocketBase.

PBScript imports a `__go` variable containing low-level access to the PocketBase native API and other helpers implemented in Go. @pbscript/core uses `__go` internally, but if there is something missing, you may be able to accomplish it yourself by accessing `__go` directly.

### `__go.ping()`

Test function that should return `Hello from Go!`

Example:

```ts
console.log(__go.ping())
```

### `__go.addRoute()`

Add an API route.

Example:

```ts
__go.addRoute({
  method: HttpMethods.Get,
  path: `/api/hello`
  handler: (context)=>{
    context.send(HttpStatus.Ok, `Hello back!`)
  }
})
```

### `__go.app`

Low-level primitive providing direct access to the `PocketBase` app instance. Normally you will not access this directly. The @pbscript/core library is built on top of this.

## Advanced

### Upgrading an Existing Custom PocketBase

The easiest way to get PBScript is to use our custom PocketBase module [github.com/benallfree/pbscript/modules/pocketbase](https://github.com/benallfree/pbscript/modules/pocketbase):

```go
package main

import (
    "log"

    "github.com/benallfree/pbscript/packages/pocketbase" // Notice this is a custom version of the PocketBase module
)

func main() {
    app := pocketbase.New()

    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}
```

If you are already using a custom PocketBase build, just swap out `github.com/pocketbase/pocketbase` with `github.com/benallfree/pbscript/packages/pocketbase` and everything will work as expected.

Or, if you prefer, you can do exactly what our custom module does:

```go
package main

import (
	"github.com/pocketbase/pocketbase"

	"github.com/benallfree/pbscript/packages/pbscript"
)

func main() {
    app := pocketbase.New()
    pbscript.StartPBScript(app) // Magic line to enable PBScript

    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}
```

## Changelog

### 0.0.2

- Transaction support

### 0.0.1

- Initial release
