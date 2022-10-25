<script lang="ts">
  // Documentation Source
  // https://svelte.dev/repl/26eb44932920421da01e2e21539494cd?version=3.51.0

  import { onMount } from 'svelte'

  export let query = ''

  let mql: MediaQueryList | undefined = undefined
  let mqlListener: (e: MediaQueryListEvent) => void
  let wasMounted = false
  let matches = false

  onMount(() => {
    wasMounted = true
    return () => {
      removeActiveListener()
    }
  })

  $: {
    if (wasMounted) {
      removeActiveListener()
      addNewListener(query)
    }
  }

  function addNewListener(query: string) {
    mql = window.matchMedia(query)
    mqlListener = (v) => (matches = v.matches)
    mql.addListener(mqlListener)
    matches = mql.matches
  }

  function removeActiveListener() {
    if (mql && mqlListener) {
      mql.removeListener(mqlListener)
    }
  }
</script>

<slot {matches} />
