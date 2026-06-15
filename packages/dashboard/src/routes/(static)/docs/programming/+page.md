---
title: Extending PocketBase with JSVM
description: Learn how to extend PocketBase with JSVM, plugins, and server-side rendering using PocketPages
---
# Programming and Extending PocketBase with JSVM

PocketBase is not just a simple backend solution—it offers powerful capabilities for extending its functionality through JavaScript, specifically using the **Goja engine** and its **JSVM** (JavaScript Virtual Machine). This allows developers to add custom logic, plugins, and server-side rendering to their applications, making PocketBase a highly versatile platform.

## A Growing Ecosystem

The **PocketBase ecosystem** is expanding rapidly, making it easier to enhance your applications in a modular and scalable way. A key project in this space is **[pocketpages.dev](https://pocketpages.dev)**: a platform for building classic server-side rendered (SSR) pages with PocketBase. By leveraging PocketBase’s **JSVM** and the Goja engine, developers can serve SSR content, delivering a seamless experience for static or dynamic web pages directly from PocketBase.

## Extending PocketBase with JSVM

PocketBase’s **JSVM** makes it possible to run custom JavaScript code directly within your PocketBase instance. This can be used for a wide range of tasks, from extending API functionality to adding business logic that runs server-side. With the JSVM feature, you can write JavaScript code that interacts with PocketBase’s core services, hooks, and events.

### Use Cases for JSVM

- **Custom API Routes**: Use the JSVM to define and execute custom routes that go beyond the default PocketBase APIs. This enables more sophisticated data manipulation, custom validation, and complex business logic.
- **Hooks and Triggers**: Integrate **JavaScript hooks** into your application to trigger actions in response to database changes, such as sending notifications when records are updated or applying complex validation before data is written.

- **Reusable Modules**: Package custom logic as JavaScript modules in `pb_hooks` and share patterns across instances. The JSVM makes it straightforward to build reusable server-side code for PocketBase.

## Hosting Static and SSR Content

**PocketHost** is an excellent choice for hosting both static/SSG (Static Site Generation) and SSR (Server-Side Rendered) content. With **PocketPages.dev** and similar technologies, you can combine the power of PocketBase’s JSVM and server-side rendering to deliver fully dynamic web applications.

- **Static Content**: PocketHost supports static files and SSG, making it ideal for static websites or single-page applications.
- **Server-Side Rendering (SSR)**: By using PocketPages and PocketBase’s JavaScript capabilities, you can serve SSR pages directly from your backend. This provides the advantages of SEO and faster initial page loads for dynamic content.
