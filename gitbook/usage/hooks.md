# PocketBase Hooks

The prebuilt PocketBase v0.17+ executable comes with embedded ES5 JavaScript engine (goja) which enables you to write custom server-side code using plain JavaScript.

Every Pockethost instance comes with a `pb_hooks` directory which is mounted into the PocketBase instance at `/pb_hooks`. This directory is where you can place your custom server-side code.

For more information on PocketBase hooks, see the [PocketBase documentation](https://pocketbase.io/docs/js-overview/).

## Quickstart

You can start by creating `*.pb.js` file(s) inside the `pb_hooks` directory. The `*.pb.js` files are automatically loaded and executed by PocketBase.

## Code Samples

These are only a few simple and limited examples of what you can do with PocketBase hooks. There is lot more available to you. For more information, see the [PocketBase documentation](https://pocketbase.io/docs/js-overview/).

**Listen to the `onAfterBootstrap` hook handler and log a message to the console. This sample also shows how you can import utils or configs from another file.**
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

**Find a record and update it**
```
// pb_hooks/posts.update.pb.js
routerAdd("PATCH", "/posts/:postId", (c) => {
  const postId = c.pathParam("postId");

  // Get body data
  const body = $apis.requestInfo(c).data;
  const status = body.status;

  // Find a record by ID on the "posts" collection
  const record = $app.dao().findRecordById("posts", postId);

  // If the record doesn't exist, return a 404
  // Perhaps you can return a 40X if the user doesn't have permission to update the record etc
  if (!record) {
    return c.json(404, {
      error: "Record not found"
    });
  }

  // Update the record with the new status
  record.set("status", status);

  // Save the record
  $app.dao().saveRecord(record);

  // Expand record before we return it
  $app.dao().expandRecord(record, ["user", "comments"], null);

  // Return the record
  return c.json(200, {
    record
  });
});
```

**Find a collection and create a new record**
```
// pb_hooks/posts.create.pb.js
routerAdd("POST", "/posts", (c) => {
  // Get body data
  const body = $apis.requestInfo(c).data;

  // Get values from body
  const { postTitle, postDescription } = body;

  // Find the collection by name
  const postsCollection = $app.dao().findCollectionByNameOrId("posts");

  // Create a new post record
  const record = new Record(postsCollection, {
    title: postTitle,
    description: postDescription
  });

  // Save the record
  $app.dao().saveRecord(record);

  // Return the record
  return c.json(200, {
    record
  });
});
```

**Listen to record changes on a collection**
In this sample, we react to a user being registered and we create a new customer record in Stripe.
This is not tested, and is a fictional scenario. But the concept behind it is what we're trying to show.
```
// pb_hooks/users.onRegister.pb.js

onRecordAfterCreateRequest((e) => {
  // Get the record
  const record = e.record;

  try {
    // Invoke Stripe API to create a new customer
    const response = $http.send({
      url: "https://api.stripe.com/v1/customers", // Stripe API URL
      method: "POST",
      body: {
        email: record.email
      },
      headers: {
        // Provide Stripe API key or whatever else they require
      }
    })

    if (response) {
      console.log("Stripe customer created!", response.newCustomerId);
    }
  } catch (err) {
    console.log(err)
  }
}, "users") // This runs when a record is created on the "users" collection
```