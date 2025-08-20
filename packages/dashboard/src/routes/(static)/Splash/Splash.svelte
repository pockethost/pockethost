<script lang="ts">
  import BlurBg from '$components/BlurBg.svelte'
  import AuthStateGuard from '$components/guards/AuthStateGuard.svelte'
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'
  import { onMount } from 'svelte'
  import MainFeatureBlock from './MainFeatureBlock.svelte'
  import PrimaryButton from './PrimaryButton.svelte'
  import SubFeatureBlock from './SubFeatureBlock.svelte'
  import {
    faShield,
    faTruck,
    faLaptopCode,
    faDragon,
    faBolt,
    faServer,
    faStar,
    faArrowRight,
    faDatabase,
    faCloud,
    faEnvelope,
    faDownload,
    faLock,
    
  } from '@fortawesome/free-solid-svg-icons'
  import { Fa } from 'svelte-fa'
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';


  const features = [
    {
      icon: faDatabase,
      title: 'Database',
      description:
        'Your PocketHost instance is powered by its own internal SQLite instance. SQLite is more performant than mySQL or Postgres and is perfect for powering your next app.',
    },
    {
      icon: faLock,
      title: 'Auth',
      description:
        'Email and oAuth authentication options work out of the box. Send transactional email to your users from our verified domain and your custom address.',
    },
    {
      icon: faCloud,
      title: 'Cloud Functions',
      description:
        'Run your own custom code on PocketHost with our cloud functions. Use the JS Client to call your functions from your frontend.',
    },
    {
      icon: faEnvelope,
      title: 'Email',
      description: 'Send transactional email to your users from our verified domain and your custom address.',
    },
    {
      icon: faDownload,
      title: 'Self-host',
      description:
        "When you're ready to take your project in-house, we have you covered. You can export your entire PocketHost environment along with a Dockerfile to run it.",
    },
    {
      icon: faBolt,
      title: 'Zero Config',
      description:
        'With PocketHost, batteries are included. You get a database, outgoing email, SSL, authentication, cloud functions, and high concurrency all in one stop.',
    },
  ]

  const parseStars = (value:string) => {
    if (typeof value === "string") {
      value = value.toLowerCase().replace(",", ""); // remove commas
      if (value.endsWith("k")) {
        return Math.round(parseFloat(value) * 1000);
      }
      if (value.endsWith("m")) {
        return Math.round(parseFloat(value) * 1_000_000);
      }
      return parseInt(value, 10);
    }
    return value;
  }


  const stars = tweened(0, { duration: 1500, easing: cubicOut });
  const formatter = new Intl.NumberFormat(); // formats numbers with commas

  onMount(async () => {
  try {
    const res = await fetch('https://img.shields.io/github/stars/pockethost/pockethost.json');
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();

    const starCount = parseStars(data.value);
    stars.set(starCount);
  } catch (error) {
    console.error(error);
  }
});


  
</script>

<BlurBg className="top-[25%]" />
<div class="relative min-h-screen px-8 md:px-16 z-50">
  <div class="relative w-full text-white p-8 lg:px-16 flex flex-col h-[85vh] md:h-[70vh] items-center justify-center">
    <div class="flex flex-col items-center z-10 relative">
      <h1 class="text-5xl max-w-4xl md:text-6xl text-center fade-up">
        PocketBase Hosting, <span class="font-bold">Simplified</span>
      </h1>

      <p class="text-xl w-2/3 md:w-1/2 text-center font-light mb-10 mt-4 text-white/60 fade-up animation-delay-250">
        <!-- Spend <b class="text-primary dark:text-secondary">less time</b> on configuring your backend, and more time
        building
        <b class="text-primary dark:text-secondary">new features</b> for your web app. -->
        No server configs. No downtime. Just build.
      </p>

      <AuthStateGuard>
        <div slot="loading">
          <PrimaryButton text="Get Started" url="/get-started" className="wiggle opacity-0 fade-up animation-delay-500" icon={faArrowRight} />
        </div>
        <UserLoggedIn>
          <PrimaryButton text="Dashboard" url="/dashboard" icon={faArrowRight} className="opacity-0 fade-up animation-delay-500" />
        </UserLoggedIn>
        <UserLoggedOut>
          <PrimaryButton text="Get Started" url="/get-started" icon={faArrowRight} className="wiggle" />
        </UserLoggedOut>
      </AuthStateGuard>
    </div>
  </div>

  <section class="lg:px-8">
        <div class="max-w-6xl mx-auto">
          <div class="bg-[#111111]/50 border border-white/20 rounded-2xl p-12 backdrop-blur-xl fade-in">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div class="text-3xl md:text-4xl font-light mb-2">30s</div>
                <div class="text-white/60 text-sm font-light">Setup Time</div>
              </div>
              <div>
                <div class="text-3xl md:text-4xl font-light mb-2">99.964%</div>
                <div class="text-white/60 text-sm font-light">Uptime</div>
              </div>
              <div>
                <div class="text-3xl md:text-4xl font-light mb-2">10K+</div>
                <div class="text-white/60 text-sm font-light">Developers</div>
              </div>
              <div>
                <div class="text-3xl md:text-4xl font-light mb-2 flex items-center justify-center gap-2">{formatter.format(Number($stars.toFixed(0)))} <Fa icon={faStar} class="w-5 h-5 text-yellow-400"/></div>
                <div class="text-white/60 text-sm font-light">On Github</div>
              </div>
            </div>
          </div>
        </div>
      </section>

  <section class="py-24 lg:px-8">
    <div class="text-center mb-10 md:mb-20">
      <h2 class="text-4xl md:text-5xl font-light mb-6 tracking-tight">
        Everything you need to <span class="font-medium">build</span>
      </h2>
    </div>
    <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each features as feature}
        <div class="group">
          <div
            class="bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-500"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-10 h-10 bg-white/10  rounded-lg flex items-center justify-center group-hover:bg-primary/50 transition-all duration-500"
              >
                <Fa icon={feature.icon} class="w-5 h-5" />
              </div>
              <h3 class="text-lg font-medium">{feature.title}</h3>
            </div>
            <p class="text-white/60 leading-relaxed font-light text-sm">{feature.description}</p>
          </div>
        </div>
      {/each}
    </div>
  </section>
  <!-- <div
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
  </div> -->
</div>
