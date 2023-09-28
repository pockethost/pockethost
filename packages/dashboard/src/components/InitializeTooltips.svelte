<script>
  import { afterNavigate } from '$app/navigation'
  import { browser } from '$app/environment'

  // Tooltips must be manually initialized
  // https://getbootstrap.com/docs/5.2/components/tooltips/#enable-tooltips
  afterNavigate(() => {
    if (browser) {
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
      const tooltipList = [...tooltipTriggerList].map(
        (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
      )
    }
  })
</script>
