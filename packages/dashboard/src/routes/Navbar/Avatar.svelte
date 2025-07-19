<script lang="ts">
  import { writable } from 'svelte/store'
  import { userStore } from '$util/stores'

  let className = ''
  export { className as class }

  async function gravatarHash(email: string) {
    // Normalize the email by trimming and converting to lowercase
    const normalizedEmail = email.trim().toLowerCase()

    // Convert the normalized email to a UTF-8 byte array
    const msgBuffer = new TextEncoder().encode(normalizedEmail)

    // Hash the email using MD5
    const hashBuffer = await crypto.subtle?.digest('SHA-256', msgBuffer)

    // Convert the hash to a hex stringc
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    return hashHex
  }

  const avatar = writable('')
  $: {
    if ($userStore?.email) {
      gravatarHash($userStore.email)
        .then((hash) => {
          avatar.set(`https://www.gravatar.com/avatar/${hash}`)
        })
        .catch((err) => {
          // Default when the avatar is not found
          // There's one on /images/logo-square.png
          console.error(err)
          avatar.set(`/logo.png`)
        })
    }
  }
</script>

<div tabindex="0" role="button" class="avatar {className}">
  <div class="w-8 rounded-full">
    <img src={$avatar} alt="Gravatar" />
  </div>
</div>
