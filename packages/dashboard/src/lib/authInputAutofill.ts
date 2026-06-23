const AUTOFILL_ANIMATION = 'ph-autofill-start'

/** Password managers often skip input events; re-dispatch so bind:value stays in sync. */
export function authInputAutofill(node: HTMLInputElement) {
  const notify = () => {
    if (node.value) {
      node.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }

  const onAnimation = (e: AnimationEvent) => {
    if (e.animationName === AUTOFILL_ANIMATION) notify()
  }

  node.addEventListener('change', notify)
  node.addEventListener('animationstart', onAnimation)
  requestAnimationFrame(notify)

  return {
    destroy() {
      node.removeEventListener('change', notify)
      node.removeEventListener('animationstart', onAnimation)
    },
  }
}
