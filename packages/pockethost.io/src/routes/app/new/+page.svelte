<script lang="ts">
  import { browser } from '$app/environment'
  import Button from '$components/Button/Button.svelte'
  import { ButtonStyles } from '$components/Button/types'
  import Error from '$components/Error/Error.svelte'
  import { parseError } from '$components/Error/parseError'
  import Protected from '$components/Protected.svelte'
  import Title from '$components/Title/Title.svelte'
  import { redirect } from '$util/redirect'
  import { faRefresh } from '@fortawesome/free-solid-svg-icons'
  import { assertExists } from '@pockethost/common/src/assert'
  import { createInstance, user } from '@pockethost/common/src/pocketbase'
  import type { Subdomain, UserId } from '@pockethost/common/src/schema'
  import PocketBase from 'pocketbase'
  import { generateSlug } from 'random-word-slugs'
  import Fa from 'svelte-fa'
  import { identity } from 'ts-brand'

  const client = new PocketBase('https://db.pockethost.io')
  if (browser && !client.authStore.isValid) {
    redirect('/signup')
  }
  let instanceName = generateSlug(2)

  let errorMessage = ''
  let code = ''
  $: {
    code = `const url = 'https://${instanceName}.pockethost.io'\nconst client = new PocketBase(url)`
  }

  const handleCreate = () => {
    console.log(`creating `, instanceName)
    const { id } = user() || {}
    assertExists<UserId>(id, `Expected uid here`)
    createInstance({
      subdomain: identity<Subdomain>(instanceName),
      uid: id
    })
      .then((rec) => {
        console.log(`Record`, rec)
        redirect(`/app/instances/${rec.id}`)
      })
      .catch((e) => {
        errorMessage = parseError(e)
        console.error(errorMessage, e)
      })
  }
</script>

<Protected>
  <Title />
  <main>
    <h2>New App</h2>
    <div class="caption">Choose a name for your PocketBase app.</div>
    <div class="subdomain">
      <label for="instanceName">Instance Name</label>
      <Button click={() => (instanceName = generateSlug(2))} style={ButtonStyles.Micro}>
        <Fa icon={faRefresh} /></Button
      >

      <input
        class="subdomain"
        name="instanceName"
        type="text"
        bind:value={instanceName}
      />.pockethost.io
    </div>
    <Error>{errorMessage}</Error>
    <Button click={handleCreate}>Create</Button>
  </main>
</Protected>

<style type="text/scss">
  main {
    padding: 1em;
    margin-left: auto;
    margin-right: auto;
    label {
      display: block;
      font-weight: bold;
      width: 200px;
    }
    .caption {
      font-size: 15px;
      margin-top: 20px;
      margin-bottom: 20px;
    }
    .subdomain {
      input {
        text-align: right;
        max-width: 200px;
      }
      white-space: nowrap;
    }
  }
</style>
