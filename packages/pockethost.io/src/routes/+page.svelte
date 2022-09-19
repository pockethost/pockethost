<script lang="ts">
  import Button from '$components/Button/Button.svelte'
  import { ButtonSizes } from '$components/Button/types'
  import Caption from '$components/Caption/Caption.svelte'
  import { CaptionSize } from '$components/Caption/types'
  import Feature from '$components/Feature.svelte'
  import Gap from '$components/Gap.svelte'
</script>

<main>
  <Caption size={CaptionSize.Hero}>Firebase and Supabase...<br />ljbf</Caption>

  <div style="max-width: 400px; margin-left: auto; margin-right: auto">
    <Button href="/signup" size={ButtonSizes.Wide}>Get Started Free</Button>
  </div>
  <Gap />
  <div>
    <Feature title={`Up in 30 seconds`}>
      <p>
        A backend for your next app is as fast as signing up. No provisioning servers, no Docker
        fiddling, just B(ad)aaS productivity.
      </p>
      <ul>
        <li>Sign up</li>
        <li>Pick a unique project name</li>
        <li>Connect with our JS client</li>
      </ul>
    </Feature>
    <Feature title={'Zero Config'}
      >With PocketHost, batteries are included. You get a database, outgoing email, SSL,
      authentication, cloud functions, and high concurrency all in one stop.</Feature
    >
    <Feature title={'Database'}>
      Your PocketHost instance is powered by its own internal SQLite instance. SQLite is <a
        href="https://pocketbase.io/faq/"
        target="_blank">more performant than mySQL or Postgres</a
      >
      and is
      <a href="https://www.sqlite.org/whentouse.html" target="_blank"
        >perfect for powering your next app</a
      >.
    </Feature>
    <Feature title={'Auth'}
      >Email and oAuth authentication options work out of the box. Send transactional email to your
      users from our verified domain and your custom address, <code>yoursubdomin@pockethost.io</code
      >.</Feature
    >
    <Feature title={'Storage'}
      >PocketHost securely stores your files on Amazon S3, or you can use your own key to manage
      your own storage.</Feature
    >
    <Feature title={'Room to Grow'}
      >PocketHost is perfect for hobbist, low, and medium volume sites and apps.
      <p>
        PocketHost, and the underlying PocketBase, can scale to well over 10,000 simultaneous
        connections.
      </p></Feature
    >
    <Feature title={`Self-host`}>
      When you're ready to take your project in-house, we have you covered. You can export your
      entire PocketHost environment along with a Dockerfile to run it.
    </Feature>
    <Feature title={'Open Source Stack'}
      >PocketHost is powered by Svelte, Vite, Typescript, PocketBase, and SQLite. Because the entire
      stack is open source, you'll never be locked into the whims of a vendor.</Feature
    >
    <Feature title={'Coming Soon'}>
      <ul>
        <li>JS/TS cloud functions</li>
        <li>Deploy to Fly.io</li>
        <li>Lightstream</li>
      </ul>
    </Feature>
  </div>
</main>

<style type="text/scss">
  main {
    text-align: center;
    padding: 1em;
    margin-left: auto;
    margin-right: auto;
  }
</style>
