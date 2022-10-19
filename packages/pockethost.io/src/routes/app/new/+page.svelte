<script lang="ts">
  import { browser } from '$app/environment'
  import Button from '$components/Button/Button.svelte'
  import { ButtonColors, ButtonSizes } from '$components/Button/types'
  import Error from '$components/Error/Error.svelte'
  import Protected from '$components/Protected.svelte'
  import Title from '$components/Title/Title.svelte'
  import { PUBLIC_PB_DOMAIN } from '$src/env'
  import { client } from '$src/pocketbase'
  import { redirect } from '$util/redirect'
  import { faRefresh } from '@fortawesome/free-solid-svg-icons'
  import { assertExists } from '@pockethost/common/src/assert'
  import type { UserId } from '@pockethost/common/src/schema'
  import { generateSlug } from 'random-word-slugs'
  import Fa from 'svelte-fa'

  const { user, createInstance, parseError } = client

  if (browser && !user) {
    redirect('/signup')
  }
  let instanceName = generateSlug(2)

  let errorMessage: string[] = []
  let code = ''
  $: {
    code = `const url = 'https://${instanceName}.${PUBLIC_PB_DOMAIN}'\nconst client = new PocketBase(url)`
  }

  const handleCreate = () => {
    console.log(`creating `, instanceName)
    const { id } = user() || {}
    assertExists<UserId>(id, `Expected uid here`)
    createInstance({
      subdomain: instanceName,
      uid: id
    })
      .then((rec) => {
        console.log(`Record`, rec)
        redirect(`/app/instances/${rec.id}`)
      })
      .catch((e) => {
        errorMessage = parseError(e)
        console.error(errorMessage.join('\n'), e)
      })
  }
</script>

<Protected>
  <Title first="New" second="App" />
  <main>
    <div class="caption">Choose a name for your PocketBase app.</div>
    <div class="subdomain">
      <label for="instanceName">Instance Name</label>
      <Button click={() => (instanceName = generateSlug(2))} size={ButtonSizes.Micro}>
        <Fa icon={faRefresh} /></Button
      >

      <input
        class="subdomain"
        name="instanceName"
        id="instanceName"
        type="text"
        bind:value={instanceName}
      />.{PUBLIC_PB_DOMAIN}
    </div>
    <Error>{errorMessage.join('<br/>')}</Error>
    <Button click={handleCreate}>Create</Button>
    <Button href={`/dashboard`} color={ButtonColors.Light}>Cancel</Button>
  </main>
</Protected>

<style lang="scss">
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
