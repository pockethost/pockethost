<script lang="ts">
  import AuthStateGuard from '$components/guards/AuthStateGuard.svelte'
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'
  import { PUBLIC_MOTHERSHIP_URL } from '$lib/appEnv'
  import { onMount } from 'svelte'
  import PrimaryButton from './PrimaryButton.svelte'
  import { tweened } from 'svelte/motion'
  import { cubicOut } from 'svelte/easing'

  const features = [
    {
      icon: 'database',
      title: 'Database',
      description:
        'Your PocketHost instance is powered by its own internal SQLite instance. SQLite is more performant than mySQL or Postgres and is perfect for powering your next app.',
    },
    {
      icon: 'lock',
      title: 'Auth',
      description: 'Email and oAuth authentication options work out of the box for your app users.',
    },
    {
      icon: 'cloud',
      title: 'Cloud Functions',
      description:
        'Run your own custom code on PocketHost with our cloud functions. Use the JS Client to call your functions from your frontend.',
    },
    {
      icon: 'link',
      title: 'Custom Domain',
      description:
        'Point your own domain at your PocketHost instance. SSL provisioning and verification are handled automatically.',
    },
    {
      icon: 'download',
      title: 'Self-host',
      description:
        "When you're ready to take your project in-house, download your full instance via SFTP and run PocketBase on your own hardware.",
    },
    {
      icon: 'bolt',
      title: 'Zero Config',
      description:
        'With PocketHost, batteries are included. You get a database, SSL, authentication, cloud functions, SFTP access, and high concurrency all in one stop.',
    },
  ]

  const stars = tweened(0, { duration: 1500, easing: cubicOut })
  const uptime = tweened(99.964, { duration: 1500, easing: cubicOut })
  const developers = tweened(10_000, { duration: 1500, easing: cubicOut })
  const instances = tweened(5_000, { duration: 1500, easing: cubicOut })
  const formatter = new Intl.NumberFormat()

  const formatCompact = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
    return formatter.format(value)
  }

  const fetchStars = async () => {
    const res = await fetch('https://api.github.com/repos/pockethost/pockethost')
    if (!res.ok) throw new Error('Failed to fetch GitHub stars')
    const data = await res.json()
    if (typeof data.stargazers_count === 'number' && Number.isFinite(data.stargazers_count)) {
      stars.set(data.stargazers_count)
    }
  }

  const fetchUptime = async () => {
    const res = await fetch('https://status.pockethost.io/index.json')
    if (!res.ok) throw new Error('Failed to fetch status page')
    const data = await res.json()
    const availabilities = (data.included ?? [])
      .filter((item: { type: string }) => item.type === 'status_page_resource')
      .map((item: { attributes?: { availability?: number } }) => item.attributes?.availability)
      .filter((value: unknown): value is number => typeof value === 'number' && value > 0)

    if (availabilities.length === 0) return

    uptime.set(Math.min(...availabilities) * 100)
  }

  const fetchStats = async () => {
    const res = await fetch(`${PUBLIC_MOTHERSHIP_URL}/stats.json`)
    if (!res.ok) throw new Error('Failed to fetch platform stats')
    const data = await res.json()
    if (typeof data.developers === 'number' && Number.isFinite(data.developers)) {
      developers.set(data.developers)
    }
    if (typeof data.instances === 'number' && Number.isFinite(data.instances)) {
      instances.set(data.instances)
    }
  }

  onMount(async () => {
    await Promise.allSettled([fetchStars(), fetchUptime(), fetchStats()])
  })
</script>

<div class="relative min-h-screen px-8 md:px-16 z-50">
  <div class="relative w-full text-white p-8 lg:px-16 flex flex-col h-[85vh] md:h-[70vh] items-center justify-center">
    <div class="flex flex-col items-center z-10 relative">
      <h1 class="text-5xl max-w-4xl md:text-6xl text-center fade-up">
        PocketBase Hosting, <span class="font-bold">Simplified</span>
      </h1>

      <p class="text-xl w-2/3 md:w-1/2 text-center font-light mb-10 mt-4 text-white/60 fade-up animation-delay-250">
        No server configs. No downtime. Just build.
      </p>

      <AuthStateGuard>
        <div slot="loading">
          <PrimaryButton
            text="Get Started"
            url="/get-started"
            className="wiggle opacity-0 fade-up animation-delay-500"
            icon="arrow-right"
          />
        </div>
        <UserLoggedIn>
          <PrimaryButton
            text="Dashboard"
            url="/dashboard"
            icon="arrow-right"
            className="opacity-0 fade-up animation-delay-500"
          />
        </UserLoggedIn>
        <UserLoggedOut>
          <PrimaryButton text="Get Started" url="/get-started" icon="arrow-right" className="wiggle" />
        </UserLoggedOut>
      </AuthStateGuard>
    </div>
  </div>

  <section class="lg:px-8">
    <div class="max-w-6xl mx-auto">
      <div class="bg-[#111111]/50 border border-white/20 rounded-2xl p-12 backdrop-blur-xl fade-in text-white">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 text-center">
          <div>
            <div class="text-3xl md:text-4xl font-light mb-2 text-white">30s</div>
            <div class="text-white/60 text-sm font-light">Setup Time</div>
          </div>
          <div>
            <div class="text-3xl md:text-4xl font-light mb-2 text-white">{$uptime.toFixed(3)}%</div>
            <div class="text-white/60 text-sm font-light">Uptime</div>
          </div>
          <div>
            <div class="text-3xl md:text-4xl font-light mb-2 text-white">{formatCompact($developers)}</div>
            <div class="text-white/60 text-sm font-light">Developers</div>
          </div>
          <div>
            <div class="text-3xl md:text-4xl font-light mb-2 text-white">{formatCompact($instances)}</div>
            <div class="text-white/60 text-sm font-light">Instances</div>
          </div>
          <div>
            <div class="text-3xl md:text-4xl font-light mb-2 flex items-center justify-center gap-2 text-white">
              {formatter.format(Number($stars.toFixed(0)))}
              <wa-icon name="star" class="w-5 h-5 text-yellow-400"></wa-icon>
            </div>
            <div class="text-white/60 text-sm font-light">On Github</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="py-24 lg:px-8 text-white">
    <div class="text-center mb-10 md:mb-20">
      <h2 class="text-4xl md:text-5xl font-light mb-6 tracking-tight text-white">
        Everything you need to <span class="font-medium">build</span>
      </h2>
    </div>
    <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
      {#each features as feature}
        <div class="group h-full">
          <div
            class="h-full bg-white/5 border border-white/10 rounded-xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-500"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-primary/50 transition-all duration-500"
              >
                <wa-icon name={feature.icon} class="w-5 h-5 text-white"></wa-icon>
              </div>
              <h3 class="text-lg font-medium text-white">{feature.title}</h3>
            </div>
            <p class="text-white/60 leading-relaxed font-light text-sm">{feature.description}</p>
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>
