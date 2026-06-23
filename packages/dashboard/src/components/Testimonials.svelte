<script lang="ts">
  const testimonials = [
    {
      name: 'Damian Kennedy',
      title: 'Building AIAutomations',
      quote:
        'Brilliant and convenient for rapid serverless data store in combo with Vercel. Skip the costly Postgres or Upstash setup.',
    },
    {
      name: 'Olivier Mills',
      title: 'Web developer',
      quote: 'Amazing tool for fast deploy.',
    },
    {
      name: 'Stephane Roux',
      title: 'Altar JS founder',
      quote: 'Absolutely amazing. Building web applications just got better.',
    },
  ]
</script>

<div class="pricing-testimonials">
  {#each testimonials as testimonial}
    <blockquote class="pricing-testimonial">
      <p class="pricing-testimonial-quote">"{testimonial.quote}"</p>
      <footer class="pricing-testimonial-author">
        <span class="pricing-testimonial-name">{testimonial.name}</span>
        {#if testimonial.title}
          <span class="pricing-testimonial-role">{testimonial.title}</span>
        {/if}
      </footer>
    </blockquote>
  {/each}
</div>
