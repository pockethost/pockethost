<script lang="ts">
  interface Props {
    message?: string
    linkHref?: string
    linkText?: string
  }

  let { message = '', linkHref = '', linkText = 'Learn more' }: Props = $props()

  const trimmedMessage = message.trim()
  const trimmedLink = linkHref.trim()
</script>

{#if trimmedMessage}
  <div class="border-b border-white/10 bg-gradient-to-r from-sky-500/15 via-primary/10 to-transparent">
    <div class="max-w-content mx-auto px-4 md:px-20 py-2.5">
      <div class="flex items-start gap-3 min-w-0 sm:items-center">
        <wa-icon name="circle-info" class="mt-0.5 shrink-0 text-sky-400 text-sm sm:mt-0"></wa-icon>
        <p class="min-w-0 flex-1 text-sm leading-snug text-white/90">
          {trimmedMessage}
          {#if trimmedLink}
            {' '}<a href={trimmedLink} class="text-primary hover:text-secondary underline underline-offset-2"
              >{linkText}</a
            >
          {/if}
        </p>
      </div>
    </div>
  </div>
{/if}
