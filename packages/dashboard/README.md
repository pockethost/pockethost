# PocketHost UI

## Built with SvelteKit and Typescript

Description about PocketHost goes here!

## Developing Locally

To run this project, navigate to the `/packages/pockethost.io` folder and run `vite dev`.

It will start up the server here: [http://127.0.0.1:5173/](http://127.0.0.1:5173/) and now you're ready to code!

## Routing

There is a file called `public-routes.json` that controls which URLs are accessible to non-authenticated users. Any public facing page needs to have its URL added to this list. Otherwise, the authentication system will kick in and send them to the homepage.

## User Management

This app uses [Svelte Stores](https://svelte.dev/docs#run-time-svelte-store) to track the user's information. At the top is the `globalUserData` store. This contains everything about the user that comes from Pocketbase, including their JWT Token.

### Derived User Values

There are additional derived values that are useful for showing and hiding components across the site. The first one is `isUserLoggedIn`. This one will return a true or false depending on the state of the logged in user. It is dependent on the `email` property in the Pocketbase response.

The second derived value is `isUserVerified`. This will return a true or false boolean depending on if their Pocketbase account has been verified via the email they got when they initially registered.

An example of showing or hiding components can be found with the `<VerifyAccountBar>` component, that prompts the user to make sure to verify their account before continuing. The code looks roughly like this:

```svelte
<script>
  import { isUserLoggedIn, isUserVerified } from '$util/stores'
</script>

{#if $isUserLoggedIn && !$isUserVerified}
  <YourComponentHere />
{/if}
```

This particular example will only render the component if the user is logged in, and their account **has not** been verified. Notice the `$` symbol as well, this is required for [Svelte Stores](https://svelte.dev/docs#run-time-svelte-store) when using Store values in the UI.

If you need to use these values in a normal javascript/typescript file instead, you can utilize [Svelte's `get()` method](https://svelte.dev/docs#run-time-svelte-store-get) instead.
