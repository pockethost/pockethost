<script>
  import BlurBg from '$components/BlurBg.svelte'
  import AuthStateGuard from '$components/guards/AuthStateGuard.svelte'
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'
  import MainFeatureBlock from './MainFeatureBlock.svelte'
  import PrimaryButton from './PrimaryButton.svelte'
  import SubFeatureBlock from './SubFeatureBlock.svelte'
  import {
    faShield,
    faCloud,
    faServer,
    faEnvelope,
    faTruck,
    faLaptopCode,
    faDragon,
    faArrowRight,
  } from '@fortawesome/free-solid-svg-icons'
</script>

<BlurBg className="top-[25%]"/>
<div class="relative min-h-screen px-8 md:px-16">
  <div class="relative w-full text-white p-8 lg:px-16 flex flex-col h-[85vh] md:h-[70vh] items-center justify-center">
      
      <div class="flex flex-col items-center gap-10 z-10 relative">
      <h1 class="text-5xl md:text-6xl font-extrabold text-center">Fast af PocketBase Hosting</h1>

      <p class="text-xl w-2/3 md:w-1/2 text-center font-normal">
        Spend <b class="text-primary dark:text-secondary">less time</b> on configuring your backend, and more time
        building
        <b class="text-primary dark:text-secondary">new features</b> for your web app.
      </p>

      <AuthStateGuard>
        <div slot="loading">
          <PrimaryButton text="Get Started" url="/get-started" className="wiggle" icon={faArrowRight} />
        </div>
        <UserLoggedIn>
          <PrimaryButton text="Dashboard" url="/dashboard" icon={faArrowRight} />
        </UserLoggedIn>
        <UserLoggedOut>
          <PrimaryButton text="Get Started" url="/get-started" icon={faArrowRight} />
        </UserLoggedOut>
      </AuthStateGuard>
    </div>


  </div>


 <!-- <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    
    <div class="bg-[#161b22] rounded-xl p-6 shadow border border-[#30363d]">
      <h2 class="text-lg font-semibold mb-1">Actions</h2>
      <p class="text-sm text-[#8b949e]">Set up CI/CD and script your entire workflow.</p>
      <pre class="bg-[#0d1117] text-[#58a6ff] text-xs mt-4 p-3 rounded-md overflow-x-auto">
.github/workflows/aws.yml
on:
  push:
    branches:
      - master</pre>
    </div>

    <div class="bg-[#161b22] rounded-xl p-6 shadow border border-[#30363d]">
      <h2 class="text-lg font-semibold mb-1">Packages</h2>
      <p class="text-sm text-[#8b949e]">Publish and consume packages. And containers, too.</p>
      <pre class="bg-[#0d1117] text-[#58a6ff] text-sm mt-4 p-3 rounded-md overflow-x-auto">~/my_project npm install</pre>
    </div>

    <div class="bg-[#161b22] rounded-xl p-6 shadow border border-[#30363d]">
      <h2 class="text-lg font-semibold mb-1">Code Review</h2>
      <p class="text-sm text-[#8b949e]">Testing built into every pull request.</p>
      
      <div class="mt-4 space-y-1 text-sm">
        <div class="text-[#3fb950]">✅ All checks have passed</div>
        <div class="text-green-400">🟢 2 approvals</div>

        <div class="mt-3 text-[#3fb950]">✅ All checks have passed</div>
        <div class="text-[#58a6ff]">🟡 Build Successful in 2m</div>
        <div class="text-[#58a6ff]">🟡 Test Successful in 5m</div>
        <div class="text-[#58a6ff]">🟡 Code scanning / CodeQL Successful in 30s</div>

        <div class="mt-3 text-[#3fb950]">✅ This branch has no conflicts with the base branch</div>
      </div>

      <button class="mt-4 bg-[#238636] text-white font-semibold px-4 py-2 rounded-md">➕ Merge pull request</button>
    </div>

    <div class="bg-[#161b22] rounded-xl p-6 shadow border border-[#30363d] relative col-span-1 md:col-span-2 lg:col-span-1">
      <div class="absolute top-6 right-6 text-lg">🛡️</div>
      <h2 class="text-lg font-semibold mb-1">Advanced Security</h2>
      <p class="text-sm text-[#8b949e]">Application security where found means fixed</p>

      <pre class="bg-[#0d1117] text-xs text-red-500 mt-4 p-3 rounded-md overflow-x-auto">
.env
+ class CloudClient
- TOKEN = "13103C5C22701F9D038B7FD69EFE7"</pre>

      <div class="bg-[#da3633] text-white text-xs mt-3 p-3 rounded-md">
        ⚠️ OAuth token found<br>
        We've noticed a valid OAuth token was committed in your repository. We've revoked the OAuth token.
      </div>
    </div>
    </div>

 <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-gray-900 text-white">
  <div class="bg-gray-800 p-4 rounded-lg shadow-lg col-span-full">
    <h3 class="text-lg font-semibold mb-2">Create a New Instance</h3>
    <p class="text-sm text-gray-300">
      Launch your PocketBase instance in seconds! With our intuitive interface, you can set up a fully hosted instance with just a few clicks, no complex setup required.
    </p>
  </div>

  <div class="bg-gray-800 p-4 rounded-lg shadow-lg">
    <h3 class="text-lg font-semibold mb-2">Custom Domains</h3>
    <p class="text-sm text-gray-300">
      Assign your own custom domain to your instance for a personalized and professional touch.
    </p>
  </div>

  <div class="bg-gray-800 p-4 rounded-lg shadow-lg">
    <h3 class="text-lg font-semibold mb-2">FTP Access</h3>
    <p class="text-sm text-gray-300">
      Gain full FTP access to manage your instance files with ease and flexibility.
    </p>
  </div>

  <div class="bg-gray-800 p-4 rounded-lg shadow-lg">
    <h3 class="text-lg font-semibold mb-2">Cloud Functions</h3>
    <p class="text-sm text-gray-300">
      Run custom server-side logic with our powerful cloud functions, tailored to your needs.
    </p>
  </div>

  <div class="bg-gray-800 p-4 rounded-lg shadow-lg">
    <h3 class="text-lg font-semibold mb-2">Webhooks</h3>
    <p class="text-sm text-gray-300">
      Set up webhooks to integrate your instance with other services and automate workflows.
    </p>
  </div>
</div> -->

  <div
    class="container mt-8 mx-auto md:bg-gradient-to-r z-10 md:from-zinc-900 md:to-zinc-800 bg-zinc-800 border-zinc-700 border-2 rounded-[75px] flex flex-wrap mb-12 shadow-xl overflow-hidden"
  >
    <div class="bg-zinc-900 md:w-1/2">
      <MainFeatureBlock
        icon={faLaptopCode}
        title="Up in 30 seconds"
        tagline="Work Smarter, Not Harder"
        content="A backend for your next app is as fast as signing up. No provisioning servers, no Docker fiddling, just B(ad)aaS productivity. Pick a unique project name and connect with our JS Client."
        linkText="Create Your New Backend"
        linkURL="/get-started"
      />
    </div>

    <div class="bg-zinc-800 md:w-1/2">
      <MainFeatureBlock
        icon={faDragon}
        title="Zero Config"
        tagline="Move Fast, Build Fast"
        content="With PocketHost, batteries are included. You get a database, outgoing email, SSL, authentication, cloud functions, and high concurrency all in one stop."
        linkText="Read the Documentation"
        linkURL="/docs"
      />
    </div>

    <div class="w-full">
      <div class="bg-zinc-900 p-[75px] border-zinc-700 border-t-2 rounded-[75px] flex flex-wrap justify-center">
        <SubFeatureBlock
          icon={faServer}
          title="Database"
          content="Your PocketHost instance is powered by its own internal SQLite instance. SQLite is more performant than mySQL or Postgres and is perfect for powering your next app."
        />

        <SubFeatureBlock
          icon={faShield}
          title="Auth"
          content="Email and oAuth authentication options work out of the box. Send transactional email to your users from our verified domain and your custom address."
        />

        <SubFeatureBlock
          icon={faCloud}
          title="Cloud Functions"
          content="Run your own custom code on PocketHost with our cloud functions. Use the JS Client to call your functions from your frontend."
        />

        <SubFeatureBlock
          icon={faEnvelope}
          title="Email"
          content="Send transactional email to your users from our verified domain and your custom address."
        />

        <SubFeatureBlock
          icon={faTruck}
          title="Self-host"
          content="When you're ready to take your project in-house, we have you covered. You can export your entire PocketHost environment along with a Dockerfile to run it."
        />
      </div>
    </div>
  </div>

</div>
