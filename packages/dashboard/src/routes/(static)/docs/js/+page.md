# Extending PocketBase via JavaScript

PocketBase can be [extended via JavaScript](https://pocketbase.io/docs/js-overview/) using server-side scripts that allow you to customize and enhance the functionality of your application. These scripts are executed within the PocketBase server using a JavaScript Virtual Machine (JSVM) powered by [Goja](https://github.com/dop251/goja), a JavaScript interpreter written in Go.

However, it's important to understand that the PocketBase JSVM environment differs from typical JavaScript environments like the Browser API or Node.js. This guide will help you understand these differences and how to work effectively within the PocketBase JSVM environment.

<!-- @import "[TOC]" {cmd="toc" depthFrom=2 depthTo=2 orderedList=false} -->

<!-- code_chunk_output -->

- [Differences from Browser and Node.js APIs](#differences-from-browser-and-nodejs-apis)
- [Missing Browser APIs](#missing-browser-apis)
- [Process Object and Environment Variables](#process-object-and-environment-variables)
- [No Promises or Asynchronous Code](#no-promises-or-asynchronous-code)
- [CommonJS Modules Supported](#commonjs-modules-supported)
- [Supported ECMAScript Features](#supported-ecmascript-features)
- [Limitations in Feature Support](#limitations-in-feature-support)
- [Handling Absence of Node.js Standard Modules](#handling-absence-of-nodejs-standard-modules)

<!-- /code_chunk_output -->

---

## Differences from Browser and Node.js APIs

The PocketBase JSVM environment does not include the full set of Browser APIs or Node.js APIs. Many global objects and functions that you might expect in those environments are not available.

## Missing Browser APIs

- **`window` and `document` Objects**: Since the scripts run on the server, there is no Document Object Model (DOM) to interact with.
- **Web APIs**: Functions like `fetch`, `alert`, `setTimeout`, and `setInterval` are not available.
- **Event Listeners**: DOM event handling methods are absent.
- **`require()` Support**: The `require()` function is supported in the PocketBase JSVM for loading modules. However, Node.js’s built-in modules (e.g., `fs`, `http`, `path`) are not available.
- **No Node.js Standard Modules**: Code relying on core Node.js modules like `fs`, `http`, or `path` will not work in the PocketBase environment.

  **Example of Unsupported Code:**

  ```javascript
  // This will NOT work in PocketBase
  const fs = require('fs') // Node.js module not available
  ```

  There is an ongoing project, [pocketbase-node](https://www.npmjs.com/package/pocketbase-node), which aims to create a compatible subset of Node.js standard modules, making it easier to port Node.js code to the PocketBase JSVM.

- **Custom Modules**: You can use `require()` to load your own modules within the PocketBase environment. All modules you want to use must be explicitly provided by your codebase.

  **Example of Supported Code:**

  ```javascript
  // This works if you provide your own 'utils.js' file
  const utils = require('./utils')
  ```

## Process Object and Environment Variables

- **`process.env` Shim**: While the full `process` module is not available, PocketBase provides a shim for `process.env`. You can use `process.env` to access environment variables, similar to how you would in Node.js.

  **Example:**

  ```javascript
  const dbHost = process.env.DB_HOST || 'localhost'
  ```

  However, the rest of the `process` object is not supported.

## No Promises or Asynchronous Code

Goja, the JavaScript engine used by PocketBase, does not support Promises or asynchronous code. All code executed within the JSVM is synchronous.

### Implications:

- **No `Promise` Objects**: You cannot create or handle Promises.
- **No `async`/`await` Syntax**: Asynchronous functions and the `await` keyword are not recognized.
- **Synchronous Operations Only**: All operations must be handled synchronously.

**Example of Unsupported Code:**

```javascript
// This will NOT work in PocketBase JSVM
async function fetchData() {
  const response = await fetch('https://api.example.com/data')
  return response.json()
}
```

## CommonJS Modules Supported

PocketBase's Goja environment **does support CommonJS modules** via `require()`. This means you can organize your code into separate files and load them with `require()`. However, as mentioned earlier, Node.js’s built-in modules are not available, and all custom modules must be provided by you.

### Example of CommonJS Support:

```javascript
// utils.js
function greet(name) {
  return `Hello, ${name}`
}

module.exports = { greet }
```

```javascript
// main.js
const utils = require('./utils')
console.log(utils.greet('PocketBase'))
```

## Supported ECMAScript Features

Goja provides support for most of ECMAScript 2020 (ES11) and ES6 features, meaning you can use many modern JavaScript syntactic elements and functionalities.

### Supported Features Include:

- **Arrow Functions**:

  ```javascript
  const add = (a, b) => a + b
  ```

- **Classes and Inheritance**:

  ```javascript
  class Person {
    constructor(name) {
      this.name = name
    }
  }

  class Employee extends Person {
    constructor(name, id) {
      super(name)
      this.id = id
    }
  }
  ```

- **Template Literals**:

  ```javascript
  const greeting = `Hello, ${name}!`
  ```

- **Destructuring Assignment**:

  ```javascript
  const { x, y } = point
  const [first, second] = array
  ```

- **Default Parameters**:

  ```javascript
  function multiply(a, b = 1) {
    return a * b
  }
  ```

- **Spread and Rest Operators**:

  ```javascript
  const arr1 = [1, 2]
  const arr2 = [...arr1, 3, 4] // Spread operator

  function sum(...numbers) {
    // Rest operator
    return numbers.reduce((a, b) => a + b, 0)
  }
  ```

- **Let and Const Declarations**:

  ```javascript
  let count = 0
  const PI = 3.1416
  ```

- **Maps and Sets**:

  ```javascript
  const map = new Map()
  map.set('key', 'value')

  const set = new Set()
  set.add(1)
  ```

- **Symbol Type**:

  ```javascript
  const sym = Symbol('description')
  ```

- **Optional Chaining**:

  ```javascript
  const street = user?.address?.street
  ```

- **Nullish Coalescing Operator**:

  ```javascript
  const value = input ?? defaultValue
  ```

## Limitations in Feature Support

While Goja supports many ECMAScript features, there may be some limitations:

- **No BigInt Support**: The `BigInt` type is not supported.
- **No Intl Object**: Internationalization features are unavailable.
- **Limited Regular Expressions**: Some advanced regex features may not be fully supported.

## Handling Absence of Node.js Standard Modules

Since Node.js core modules are not available, you need to ensure that your code does not rely on them. If you need functionality provided by those modules, consider looking at [pocketbase-node](https://www.npmjs.com/package/pocketbase-node), which aims to provide a subset of Node.js modules compatible with PocketBase’s JSVM environment.
