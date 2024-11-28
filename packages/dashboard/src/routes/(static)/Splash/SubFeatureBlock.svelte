<script lang="ts">
  import FeatureIcon from './FeatureIcon.svelte'
  import { type IconDefinition } from '@fortawesome/free-solid-svg-icons'

  export let icon: IconDefinition
  export let title: string
  export let content: string
</script>

<div class="xl:w-1/5 md:w-1/2 xl:mb-0 mb-12">
  <div class="text-center flex flex-col items-center px-4">
    <div class="mb-4"><FeatureIcon {icon} /></div>

    <p class="text-white font-bold text-xl mb-4">{title}</p>

    <p class="break-words">{content}</p>
  </div>
</div>
