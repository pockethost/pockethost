<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import CodeSample from '$components/CodeSample.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { INSTANCE_BARE_HOST } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { isUserPaid } from '$util/stores'
  import { dns } from 'svelte-highlight/languages'
  import { instance } from '../store'
  import { onDestroy } from 'svelte'
  import { browser } from '$app/environment'

  const { updateInstance } = client()

  $: ({ cname, id } = $instance)

  // Health polling state
  let healthCheckInterval: ReturnType<typeof setTimeout>
  let domainHealthy: boolean | null = null // null = unchecked, true = healthy, false = unhealthy

  // Clean up health check interval on component destroy
  onDestroy(() => {
    clearInterval(healthCheckInterval)
  })

  // Function to check domain health
  const checkDomainHealth = async (domain: string): Promise<boolean> => {
    try {
      const url = `https://${domain}/api/firewall/health`
      console.log(`Checking health of ${url}`)
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (response.status === 200) {
        const data = await response.json()
        return data.code === 200
      }

      return false
    } catch (error) {
      console.log(`Health check error for ${domain}:`, error)
      return false
    }
  }

  $: cnameToCheck = regex.test(cname.trim()) && !errorMessage ? cname.trim() : null
  $: {
    if (cnameToCheck) {
      pollHealth()
    }
  }
  // Simple polling function that runs every 5s
  const pollHealth = async () => {
    clearTimeout(healthCheckInterval)

    // If no valid cname, reset state and return
    if (cnameToCheck) {
      domainHealthy = await checkDomainHealth(cnameToCheck)
    } else {
      domainHealthy = null
    }

    healthCheckInterval = setTimeout(pollHealth, 5000)
  }

  // Start the simple polling interval on component mount
  if (browser) {
    pollHealth()
  }

  // Create a copy of the subdomain
  let formCname = cname
  $: {
    formCname = cname
  }

  // Controls the disabled state of the button
  let isButtonDisabled = false

  // Controls visibility of an error message
  let errorMessage = ''

  const regex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/

  $: {
    isButtonDisabled = (!!formCname.trim() && !regex.test(formCname)) || (!formCname.trim() && !cname.trim())
  }
  const onRename = (e: Event) => {
    e.preventDefault()

    const trimmed = formCname.trim()

    if (trimmed && !$isUserPaid) {
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
    }).catch((error) => {
      if (error.response?.data?.cname?.code === 'validation_not_unique') {
        errorMessage = `This domain is already in use. Please use a different domain.`
      } else {
        errorMessage = error.data.message
      }
    })

    // Set the button back to normal
    isButtonDisabled = false
  }
</script>

<div class="max-w-2xl">
  <CardHeader documentation={`/docs/custom-domains`}>Custom Domain (CNAME)</CardHeader>

  <div class="mb-8">Use a custom domain (CNAME) with your PocketHost instance.</div>
  {#if cname && regex.test(formCname.trim())}
    <div class="mb-8">Go to your DNS provider and add a CNAME entry.</div>
    <div class="mb-4">
      <CodeSample code={`${formCname} CNAME ${INSTANCE_BARE_HOST($instance)}`} language={dns} />
    </div>
  {/if}

  <AlertBar message={errorMessage} type="error" />

  {#if cnameToCheck}
    {#if domainHealthy}
      <AlertBar message={`Your custom domain name is active.`} type="success" />
    {:else if domainHealthy === false}
      <AlertBar
        message={`We are having trouble checking the health of your custom domain name. Check your CNAME settings and try again.`}
        type="warning"
      />
    {:else if domainHealthy === null}
      <AlertBar message={`Checking health of your custom domain name...`} type="info" />
    {/if}
  {/if}

  <form class="flex rename-instance-form-container-query gap-4" on:submit={onRename}>
    <div class="relative flex-1">
      <input
        title="Only valid domain name patterns are allowed"
        type="text"
        bind:value={formCname}
        class="input input-bordered w-full pr-10"
      />
      {#if cnameToCheck}
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
          {#if domainHealthy === true}
            <span class="text-green-500 text-lg">✓</span>
          {:else if domainHealthy === false}
            <span class="text-red-500 text-lg">✗</span>
          {:else if domainHealthy === null}
            <span class="loading loading-spinner loading-sm"></span>
          {/if}
        </div>
      {/if}
    </div>

    <button type="submit" class="btn btn-error" disabled={isButtonDisabled}> Update Custom Domain </button>
  </form>
</div>

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
