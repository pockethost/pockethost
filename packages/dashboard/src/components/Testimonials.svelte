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
      quote:
        'Been inlove with this from the first moment I used it. Excellent offering.',
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

<div class="flex-1 sm:p-5 flex flex-col">
  <div class="text-3xl text-center pb-5">Testimonials</div>
  <div class="flex flex-wrap justify-center gap-4">
    {#each testimonials as testimonial}
      <div class="card bg-neutral shadow-xl sm:max-w-96 w-full">
        <div class="card-body">
          <div class="flex mb-2">
            <Fa icon={faStar} class="text-warning" />
            <Fa icon={faStar} class="text-warning" />
            <Fa icon={faStar} class="text-warning" />
            <Fa icon={faStar} class="text-warning" />
            <Fa icon={faStar} class="text-warning" />
          </div>
          <p class="mb-4">{testimonial.quote}</p>
          <div class="card-actions">
            <div>
              <p class="font-bold">{testimonial.name}</p>
              {#if testimonial.title}
                <p class="text-sm opacity-75">{testimonial.title}</p>
              {/if}
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>
