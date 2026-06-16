<script lang="ts">
  export let className: string = ''
  export let text: string
  export let url: string
  export let icon: string = ''
  export let target = ''
</script>

<div class="relative inline-flex group">
  <div
    class="absolute transition-all duration-1000 opacity-70 -inset-px rounded-xl group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt"
  ></div>

  <a
    href={url}
    class={`relative ${className} inline-flex gap-4 items-center bg-primary justify-center px-8 py-3 text-md font-medium hover:bg-light !text-white transition-all duration-200 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900`}
    {target}
    role="button"
  >
    {text}
    {#if icon}
      <wa-icon name={icon}></wa-icon>
    {/if}
  </a>
</div>
