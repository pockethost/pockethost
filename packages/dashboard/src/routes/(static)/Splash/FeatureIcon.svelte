<script lang="ts">
  import Fa from 'svelte-fa'
  import { type IconDefinition } from '@fortawesome/free-solid-svg-icons'

  export let icon: IconDefinition
</script>

<div
  class="text-[32px] bg-primary w-[60px] h-[60px] flex items-center justify-center rounded-full text-white shadow-xl"
>
  <Fa {icon} />
</div>
