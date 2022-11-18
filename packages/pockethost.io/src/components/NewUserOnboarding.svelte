<script>
  import { isFirstTimeRegistration } from '$util/stores'
  import { onMount } from 'svelte'

  // When the modal is dismissed, set the global state to false so it doesn't show up again
  onMount(() => {
    try {
      const onboardingModal = document.getElementById('onboarding-modal')

      const onboardingModalInstance = new bootstrap.Modal('#onboarding-modal')

      // Check if the onboarding modal needs to be shown
      if ($isFirstTimeRegistration) {
        onboardingModalInstance.show()
      }

      onboardingModal.addEventListener('hidden.bs.modal', (event) => {
        isFirstTimeRegistration.set(false)
      })
    } catch (error) {
      // If this errors out for any reason, just ignore it
    }
  })
</script>

{#if $isFirstTimeRegistration}
  <div
    class="modal fade"
    id="onboarding-modal"
    tabindex="-1"
    aria-labelledby="onboarding-modal-label"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-body text-center">
          <div class="display-1">🎉</div>
          <h1 class="mb-5">Welcome to PocketHost!</h1>

          <div id="modal-indicators" class="carousel slide" data-bs-ride="true">
            <!-- These are the slides with each slide's content -->
            <div class="carousel-inner">
              <div class="carousel-item active">
                <div class="carousel-item-content">
                  Make sure to verify your account via your email to take advantage of all of
                  PocketHost's features.
                </div>
              </div>
              <div class="carousel-item">
                <div class="carousel-item-content">You can use 200 minutes for free</div>
              </div>
              <div class="carousel-item">
                <div class="carousel-item-content">Super fast!</div>
              </div>
            </div>

            <!-- These are the left and right buttons to navigate through the carousel -->
            <button
              class="carousel-control-prev"
              type="button"
              data-bs-target="#modal-indicators"
              data-bs-slide="prev"
            >
              <i class="bi bi-chevron-left" />
              <span class="visually-hidden">Previous</span>
            </button>
            <button
              class="carousel-control-next"
              type="button"
              data-bs-target="#modal-indicators"
              data-bs-slide="next"
            >
              <i class="bi bi-chevron-right" />
              <span class="visually-hidden">Next</span>
            </button>
          </div>
        </div>

        <div class="modal-footer justify-content-center border-0">
          <button type="button" class="btn btn-outline-primary" data-bs-dismiss="modal"
            >Close</button
          >
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal {
    backdrop-filter: blur(6px);
  }

  .carousel-control-next,
  .carousel-control-prev {
    color: var(--bs-body-color);
    font-size: 32px;
  }

  .carousel-inner {
    max-width: calc(100% - 136px);
    margin: 0 auto 24px auto;
  }

  .carousel-item-content {
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100%;
  }
</style>
