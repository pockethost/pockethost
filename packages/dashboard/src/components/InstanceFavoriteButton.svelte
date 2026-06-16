<script lang="ts">
  export let isFavorite = false
  export let onToggle: () => void

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    onToggle()
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
      e.preventDefault()
      onToggle()
    }
  }
</script>

<button
  type="button"
  class="instance-favorite-btn"
  class:instance-favorite-btn--active={isFavorite}
  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
  aria-pressed={isFavorite}
  onclick={handleClick}
  onkeydown={handleKeydown}
>
  <wa-icon name="star" class="instance-favorite-icon"></wa-icon>
</button>

<style>
  .instance-favorite-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: rgb(255 255 255 / 0.25);
    cursor: pointer;
    transition:
      color 120ms ease,
      background-color 120ms ease;
  }

  .instance-favorite-btn:hover {
    color: rgb(255 255 255 / 0.55);
    background: rgb(255 255 255 / 0.06);
  }

  .instance-favorite-btn--active {
    color: #facc15;
  }

  .instance-favorite-btn--active:hover {
    color: #fde047;
  }

  .instance-favorite-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgb(255 255 255 / 0.2);
  }

  .instance-favorite-icon {
    font-size: 0.875rem;
  }

  .instance-favorite-btn--active .instance-favorite-icon {
    font-weight: 900;
  }
</style>
