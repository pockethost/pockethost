<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import CodeSample from '$components/CodeSample.svelte'
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { DOCS_URL, INSTANCE_BARE_HOST } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { userSubscriptionType } from '$util/stores'
  import { SubscriptionType } from 'pockethost/common'
  import { dns } from 'svelte-highlight/languages'
  import { instance } from '../store'

  const { updateInstance } = client()

  $: ({ cname, id, cname_active } = $instance)

  // Create a copy of the subdomain
  let formCname = cname
  $: {
    formCname = cname
  }

  // Controls the disabled state of the button
  let isButtonDisabled = false

  // Controls visibility of an error message
  let errorMessage = ''
  let successMessage = ''

  const regex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/

  $: {
    isButtonDisabled = !!formCname.trim() && !regex.test(formCname)
  }
  const onRename = (e: Event) => {
    e.preventDefault()

    const trimmed = formCname.trim()

    if (
      trimmed &&
      ![SubscriptionType.Premium, SubscriptionType.Lifetime].includes(
        $userSubscriptionType,
      )
    ) {
      errorMessage = `Oof, you hit a paywall. This is a Pro feature only. Please <a class='link' href="/account">upgrade your account.</a>`
      return
    }

    // Disable the button to prevent double submissions
    isButtonDisabled = true

    errorMessage = ``
    if (trimmed.length > 0 && !regex.test(trimmed)) {
      errorMessage = `Must be a valid domain (subdomain optional)`
      isButtonDisabled = false
      return
    }

    updateInstance({
      id,
      fields: {
        cname: formCname,
      },
    })
      .then(() => {
        successMessage = 'Saved'
      })
      .catch((error) => {
        errorMessage = error.data.message
      })

    // Set the button back to normal
    isButtonDisabled = false
  }
</script>

<Card>
  <CardHeader documentation={DOCS_URL(`/usage/custom-domain`)}>
    Custom Domain (CNAME)
  </CardHeader>

  <div class="mb-8">
    Use a custom domain (CNAME) with your PocketHost instance.
  </div>
  {#if formCname && regex.test(formCname.trim())}
    <div class="mb-8">Go to your DNS provider and add a CNAME entry.</div>
    <div class="mb-4">
      <CodeSample
        code={`${formCname} CNAME ${INSTANCE_BARE_HOST($instance)}`}
        language={dns}
      />
    </div>
  {/if}

  <AlertBar message={successMessage} type="success" />
  <AlertBar message={errorMessage} type="error" />

  {#if cname}
    {#if !cname_active}
      <AlertBar
        message={`Your custom domain name is pending. Go find <a class='btn btn-primary' target='_blank' href="https://discord.com/channels/1128192380500193370/1189948945967882250">@noaxis on Discord</a> to complete setup.`}
        type="warning"
      />
    {:else}
      <AlertBar message={`Your custom domain name is active.`} type="success" />
    {/if}
  {/if}

  <form
    class="flex rename-instance-form-container-query gap-4"
    on:submit={onRename}
  >
    <input
      title="Only valid domain name patterns are allowed"
      type="text"
      bind:value={formCname}
      class="input input-bordered w-full"
    />

    <button type="submit" class="btn btn-error" disabled={isButtonDisabled}
      >Update Custom Domain</button
    >
  </form>
</Card>

<style>
  .rename-instance-form-container-query {
    flex-direction: column;
  }

  @container (min-width: 400px) {
    .rename-instance-form-container-query {
      flex-direction: row;
    }
  }
</style>
