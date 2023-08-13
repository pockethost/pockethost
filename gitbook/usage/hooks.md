# Pocketbase Hooks

The prebuilt PocketBase v0.17+ executable comes with embedded ES5 JavaScript engine (goja) which enables you to write custom server-side code using plain JavaScript.

Every Pockethost instance comes with a `pb_hooks` directory which is mounted into the PocketBase instance at `/pb_hooks`. This directory is where you can place your custom server-side code.

For more information on PocketBase hooks, see the [PocketBase documentation](https://pocketbase.io/docs/js-overview/).

## Quickstart

You can start by creating `*.pb.js` file(s) inside the `pb_hooks` directory. The `*.pb.js` files are automatically loaded and executed by PocketBase.

## Code Samples

These are only a few simple and limited examples of what you can do with PocketBase hooks. There is lot more available to you. For more information, see the [PocketBase documentation](https://pocketbase.io/docs/js-overview/).

**Listen to the `onAfterBootstrap` event and log a message to the console. This sample also shows how you can import utils or configs from another file.**
```
// pb_hooks/main.pb.js

// This runs when the PocketBase instance is first bootstrapped
onAfterBootstrap((e) => {
  // You can load config or util files for your app
  const config = require(`${__hooks}/config/config.js`);
  const name = 'Hooks!'
  const fxTest = config.hello(name);

  console.log("App initialized!");
  console.log(`fxTest: ${fxTest}`);
  console.log(`App name: ${JSON.stringify(config)}`);
});
```

```
// pb_hooks/config/config.js

module.exports = {
  appName: "pockethost-test",
  appVersion: "0.0.1",
  hello: (name) => {
    return "Hello " + name
  }
};
```

**Register a new route that you can interface with using the SDK**
```
// pb_hooks/somefile.pb.js
routerAdd("POST", "/test/:testId", (c) => {
  const testId = c.pathParam("testId");

  return c.json(200, {
    testId
  });
});
```

You can now interface with this route using the PocketBase SDK. Here's a JS SDK example:
```
const pb = new PocketBase('http://127.0.0.1:8090');

const response = await pb.send("/test/theTestId", {
  method: "POST"
});

// response returns { testId: "theTestId" }
```
