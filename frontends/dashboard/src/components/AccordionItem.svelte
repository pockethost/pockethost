<script lang="ts">
  import { uniqueId } from '@s-libs/micro-dash'

  export let title = ''
  export let show: boolean = false
  export let header: 'primary' | 'danger' = 'primary'
  const uid = uniqueId('a')
  const headerId = `header${uid}`
  const bodyId = `body${uid}`
</script>

<div class="collapse collapse-arrow bg-base-200">
  <input type="radio" name="my-accordion-1" checked={show} />
  <div class="collapse-title text-xl font-medium">
    {title}
  </div>
  <div class="collapse-content">
    <slot />
  </div>
</div>
