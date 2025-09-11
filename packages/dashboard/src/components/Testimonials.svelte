<script lang="ts">
  import { faStar } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  const testimonials = [
    {
      name: 'Riddge Mussington',
      title: '',
      quote:
        "I use pockethost for a couple projects and I think you would be hard pressed to find a better hosted provider for pocketbase projects. It is very easy to use and setup and secure by default because it uses pocketbase under the hood, it's also very fast at shipping pocketbase updates and maintaining uptime and fixing issues, it's truly a god chosen database, I'm currently building my next side hustle with it so I can't wait for it to grow larger",
    },
    {
      name: 'H.Mohamed',
      title: '',
      quote: 'Great BaaS option.',
    },
    {
      name: 'Damian Kennedy',
      title: 'Building AIAutomations',
      quote: `Brilliant convenient for rapid serverless data store in combo with Vercel. Don't need the costly Postgres or upstash setup`,
    },
    {
      name: 'Olivier Mills',
      title: 'Web developer, idea maker',
      quote: 'Amazing tool for fast deploy!',
    },
    {
      name: 'Stephane Roux',
      title: 'Altar JS founder',
      quote: 'Absolutely amazing. Building web applications just got better.',
    },
    {
      name: 'Giovanni Cruz',
      title: 'Software developer',
      quote: 'Been inlove with this from the first moment I used it. Excellent offering.',
    },
    {
      name: 'Anele Mbanga',
      title: 'Software Engineer, Explorer, Inventor',
      quote: 'Very simple, effective, and generous!',
    },
    {
      name: 'Saif-Alislam Dekna',
      title: 'A Dreamer, young pilot, and entrepreneur',
      quote: '',
    },
  ]
</script>

<div class="flex flex-col items-center gap-12 mb-20 px-4 py-12 ">
  <h2 class="text-4xl font-bold text-center text-gray-900 dark:text-white tracking-tight">
    What Our Users Say
  </h2>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
    {#each testimonials as testimonial}
      <div class=" dark:text-gray-100 rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-white/10 dark:border-gray-700">
        <div class="flex items-center gap-1 mb-4">
          {#each Array(5) as _}
            <Fa icon={faStar} class="text-yellow-400 w-5 h-5" />
          {/each}
        </div>
        {#if testimonial.quote}
          <p class="text-sm mb-4 italic text-gray-600 dark:text-gray-300 leading-relaxed">"{testimonial.quote}"</p>
        {/if}
        <div>
          <p class="font-semibold text-lg">{testimonial.name}</p>
          {#if testimonial.title}
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{testimonial.title}</p>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .grid > div {
    min-height: 160px; /* Ensures consistent card height */
  }
</style>