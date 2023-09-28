<script lang="ts">
  export let minHeight: number = 0
  export let bgColor: string = 'var(--bs-body-bg)'

  // Construct the CSS styles since Svelte doesn't support CSS injection yet
  let cssStyles = `min-height: ${minHeight}px; background-color: ${bgColor};`
</script>

<div class="homepage-hero-animation" style={cssStyles}>
  <slot />
</div>

<style>
  .homepage-hero-animation {
    box-shadow: var(--bs-primary) 0 0 0 3px inset, var(--bs-body-bg) 10px -10px 0px -3px,
      var(--bs-success) 10px -10px, var(--bs-body-bg) 20px -20px 0px -3px,
      var(--bs-warning) 20px -20px, var(--bs-body-bg) 30px -30px 0px -3px,
      var(--bs-orange) 30px -30px, var(--bs-body-bg) 40px -40px 0px -3px,
      var(--bs-danger) 40px -40px;
    border: 0;
    border-radius: 25px;
    padding: 30px;
    margin-right: 45px;
    margin-top: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media screen and (min-width: 768px) {
    .homepage-hero-animation {
      margin: 0;
    }
  }
</style>
