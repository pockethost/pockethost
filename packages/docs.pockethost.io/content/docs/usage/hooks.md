---
title: PocketBase Hooks
category: usage
---

The prebuilt PocketBase v0.17+ executable comes with an embedded ES5 JavaScript engine (goja) which enables you to write custom server-side code using plain JavaScript.

Every PocketHost instance comes with a `pb_hooks` directory which is mounted into the PocketBase instance at `/pb_hooks`. This directory is where you can place your custom server-side code.

For examples and more information about PocketBase hooks, see the [PocketBase JS hooks documentation](https://pocketbase.io/docs/js-overview/).

## Quickstart

You can start by creating `*.pb.js` file(s) inside the `pb_hooks` directory. The `*.pb.js` files are automatically loaded and executed by PocketBase.

## Important Notes

- Altering the `pb_hooks` directory will cause your PocketHost instance to be restarted so changes are picked up automatically.
- If code in `pb_hooks` causes your `pocketbase` instance to exit unexpectedly, your instance will be placed in [Maintenance Mode](./maintenance.md) until you can correct the problem and manually move your instance out of Maintenance Mode.

## Code Samples

### Listen to the `onAfterBootstrap`

This example creates a hook handler and logs a message to the console. It also demonstrates how to use CommonJS `require` statements to import other modules.

```js
// pb_hooks/main.pb.js

// This runs when the PocketBase instance is first bootstrapped
onAfterBootstrap((e) => {
  // You can load config or util files for your app
  const config = require(`${__hooks}/config/config.js`)
  const name = 'Hooks!'
  const fxTest = config.hello(name)

  console.log('App initialized!')
  console.log(`fxTest: ${fxTest}`)
  console.log(`App name: ${JSON.stringify(config)}`)
})
```

```js
// pb_hooks/config/config.js

module.exports = {
  appName: 'pockethost-test',
  appVersion: '0.0.1',
  hello: (name) => {
    return 'Hello ' + name
  },
}
```

### Register a new HTTP route

```js
// pb_hooks/somefile.pb.js
routerAdd('POST', '/test/:testId', (c) => {
  const testId = c.pathParam('testId')

  return c.json(200, {
    testId,
  })
})
```

You can now access this HTTP endpoint from a client-side HTTP request:

```ts
const instanceRoot = `https://<subdomain>.pockethost.io`
const pb = new PocketBase('http://127.0.0.1:8090')

const response = await pb.send('/test/theTestId', {
  method: 'POST',
})

// response returns { testId: "theTestId" }
```

### Update a record

```js
// pb_hooks/posts.update.pb.js
routerAdd('PATCH', '/posts/:postId', (c) => {
  const postId = c.pathParam('postId')

  // Get body data
  const body = $apis.requestInfo(c).data
  const status = body.status

  // Find a record by ID on the "posts" collection
  const record = $app.dao().findRecordById('posts', postId)

  // If the record doesn't exist, return a 404
  // Perhaps you can return a 40X if the user doesn't have permission to update the record etc
  if (!record) {
    return c.json(404, {
      error: 'Record not found',
    })
  }

  // Update the record with the new status
  record.set('status', status)

  // Save the record
  $app.dao().saveRecord(record)

  // Expand record before we return it
  $app.dao().expandRecord(record, ['user', 'comments'], null)

  // Return the record
  return c.json(200, {
    record,
  })
})
```

### Create a record

```js
// pb_hooks/posts.create.pb.js
routerAdd('POST', '/posts', (c) => {
  // Get body data
  const body = $apis.requestInfo(c).data

  // Get values from body
  const { postTitle, postDescription } = body

  // Find the collection by name
  const postsCollection = $app.dao().findCollectionByNameOrId('posts')

  // Create a new post record
  const record = new Record(postsCollection, {
    title: postTitle,
    description: postDescription,
  })

  // Save the record
  $app.dao().saveRecord(record)

  // Return the record
  return c.json(200, {
    record,
  })
})
```

### Listen for record changes on a collection

In this example, a new Stripe customer is created when a new PocketBase user is created.

```js
// pb_hooks/users.onRegister.pb.js

onRecordAfterCreateRequest((e) => {
  // Get the record
  const record = e.record

  try {
    // Invoke Stripe API to create a new customer
    const response = $http.send({
      url: 'https://api.stripe.com/v1/customers', // Stripe API URL
      method: 'POST',
      body: {
        email: record.email,
      },
      headers: {
        // Provide Stripe API key or whatever else they require
      },
    })

    if (response) {
      console.log('Stripe customer created!', response.newCustomerId)
    }
  } catch (err) {
    console.log(err)
  }
}, 'users') // This runs when a record is created on the "users" collection
```
