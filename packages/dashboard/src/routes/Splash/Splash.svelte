<script>
  import MainFeatureBlock from './MainFeatureBlock.svelte'
  import PrimaryButton from './PrimaryButton.svelte'
  import SubFeatureBlock from './SubFeatureBlock.svelte'
</script>

<div class="container mx-auto text-white flex items-center">
  <div class="p-8 lg:w-1/2">
    <h1 class="text-6xl font-bold mb-8">Amazingly Simple PocketBase Hosting</h1>

    <p class="text-2xl mb-12">
      Spend <b class="text-green-600 dark:text-green-400">less time</b> on
      configuring your backend, and more time building
      <b class="text-green-600 dark:text-green-400">new features</b> for your web
      app.
    </p>

    <PrimaryButton
      text="Get Started"
      url="/get-started"
      icon="fa-solid fa-arrow-right"
    />
  </div>

  <div class="w-full p-8 lg:w-1/2 lg:block hidden">
    <img
      src="/images/futuristic-server-room.png"
      alt="A series of tubes moving the data around to represent PocketHost"
      class="rounded-[250px] mix-blend-lighten animated-hero-banner"
    />
  </div>
</div>

<div
  class="container mx-auto md:bg-gradient-to-r md:from-zinc-900 md:to-zinc-800 bg-zinc-800 border-zinc-700 border-2 rounded-[75px] flex flex-wrap mb-12 shadow-xl overflow-hidden"
>
  <div class="bg-zinc-900 md:w-1/2">
    <MainFeatureBlock
      icon="fa-laptop-code"
      title="Up in 30 seconds"
      tagline="Work Smarter, Not Harder"
      content="A backend for your next app is as fast as signing up. No provisioning servers, no Docker fiddling, just B(ad)aaS productivity. Pick a unique project name and connect with our JS Client."
      linkText="Create Your New Backend"
      linkURL="/get-started"
    />
  </div>

  <div class="bg-zinc-800 md:w-1/2">
    <MainFeatureBlock
      icon="fa-webhook"
      title="Zero Config"
      tagline="Move Fast, Build Fast"
      content="With PocketHost, batteries are included. You get a database, outgoing email, SSL, authentication, cloud functions, and high concurrency all in one stop."
      linkText="Read the Documentation"
      linkURL="/docs"
    />
  </div>

  <div class="w-full">
    <div
      class="bg-zinc-900 p-[75px] border-zinc-700 border-t-2 rounded-[75px] flex flex-wrap justify-center"
    >
      <SubFeatureBlock
        icon="fa-server"
        title="Database"
        content="Your PocketHost instance is powered by its own internal SQLite instance. SQLite is more performant than mySQL or Postgres and is perfect for powering your next app."
      />

      <SubFeatureBlock
        icon="fa-shield-keyhole"
        title="Auth"
        content="Email and oAuth authentication options work out of the box. Send transactional email to your users from our verified domain and your custom address."
      />

      <SubFeatureBlock
        icon="fa-cloud"
        title="Cloud Functions"
        content="Run your own custom code on PocketHost with our cloud functions. Use the JS Client to call your functions from your frontend."
      />

      <SubFeatureBlock
        icon="fa-envelope"
        title="Email"
        content="Send transactional email to your users from our verified domain and your custom address."
      />

      <SubFeatureBlock
        icon="fa-transporter-3"
        title="Self-host"
        content="When you're ready to take your project in-house, we have you covered. You can export your entire PocketHost environment along with a Dockerfile to run it."
      />
    </div>
  </div>
</div>

<style>
  .animated-hero-banner {
    animation-name: heroAnimation;
    animation-duration: 2s;
    animation-iteration-count: infinite;
    animation-direction: alternate-reverse;
  }

  @keyframes heroAnimation {
    0% {
      transform: translateY(-10px);
    }
    100% {
      transform: translateY(10px);
    }
  }
</style>
