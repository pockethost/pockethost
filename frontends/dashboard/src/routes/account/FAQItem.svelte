<script>
  export let question = ''
</script>

<div class="pt-8 lg:grid lg:grid-cols-12 lg:gap-8">
  <dt class="text-base font-semibold leading-7 lg:col-span-5">{question}</dt>

  <dd class="mt-4 lg:col-span-7 lg:mt-0">
    <slot />
  </dd>
</div>
