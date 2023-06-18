<script lang="ts">
  import { uniqueId } from '@s-libs/micro-dash'

  export let title = ''
  export let show: boolean = false
  export let header: 'primary' | 'danger' = 'primary'
  const uid = uniqueId('a')
  const headerId = `header${uid}`
  const bodyId = `body${uid}`
</script>

<div class="accordion-item">
  <h2 class="accordion-header " id={headerId}>
    <button
      class="accordion-button {show ? '' : 'collapsed'} text-bg-{header} "
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#{bodyId}"
      aria-expanded="true"
      aria-controls={bodyId}
    >
      {title}
    </button>
  </h2>
  <div
    id={bodyId}
    class="accordion-collapse collapse {show ? 'show' : ''} "
    aria-labelledby={bodyId}
    data-bs-parent="#accordionExample"
  >
    <div class="accordion-body">
      <slot />
    </div>
  </div>
</div>
