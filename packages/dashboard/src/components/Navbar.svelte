<script lang="ts">
  import { page } from '$app/stores'
  import Logo from '$components/Logo.svelte'
  import MediaQuery from '$components/MediaQuery.svelte'
  import ThemeToggle from '$components/ThemeToggle.svelte'
  import { handleLogoutAndRedirect } from '$util/database'
  import { getInstances } from '$util/getInstances'
  import { globalInstancesStore } from '$util/stores'
  import { values } from '@s-libs/micro-dash'

  // This will query the database for all instances and then update the global state
  getInstances()

  const linkClasses =
    'font-medium text-xl text-base-content btn btn-ghost capitalize justify-start'
  const subLinkClasses =
    'font-medium text-base-content btn btn-ghost btn-sm capitalize justify-start'
  const addNewAppClasses =
    'font-medium text-base-content btn btn-outline btn-primary btn-sm capitalize justify-start'

  const handleClick = () => {
    document.querySelector('.drawer-overlay')?.click()
  }
</script>

<aside class="p-4 min-w-[250px] flex flex-col h-screen">
  <MediaQuery query="(min-width: 1280px)" let:matches>
    {#if matches}
      <a href="/dashboard" class="flex gap-2 items-center justify-center">
        <Logo hideLogoText={true} logoWidth="w-20" />
      </a>
    {/if}
  </MediaQuery>

  <div class="flex flex-col gap-2 mb-auto">
    <a on:click={handleClick} href="/dashboard" class={linkClasses}
      ><i
        class="fa-regular fa-table-columns {$page.url.pathname ===
          '/dashboard' && 'text-primary'}"
      ></i> Dashboard</a
    >

    <div class="pl-8 flex flex-col gap-4 mb-4">
      {#each values($globalInstancesStore) as app}
        <a
          href={`/app/instances/${app.id}`}
          on:click={handleClick}
          class={subLinkClasses}
        >
          <i
            class="fa-regular fa-server {$page.url.pathname ===
              `/app/instances/${app.id}` && 'text-primary'}"
          ></i>
          {app.subdomain}
        </a>
      {/each}

      <a href="/app/new" on:click={handleClick} class={addNewAppClasses}>
        <i
          class="fa-regular fa-plus {$page.url.pathname === `/app/new` &&
            'text-primary'}"
        ></i> Create A New App
      </a>
    </div>

    <a
      href="https://github.com/benallfree/pockethost/discussions"
      class={linkClasses}
      target="_blank"
      rel="noreferrer"
      ><i class="fa-regular fa-comment-code"></i> Discussion
      <i
        class="fa-regular fa-arrow-up-right-from-square ml-auto opacity-50 text-sm"
      ></i></a
    >

    <a
      href="https://pockethost.io/docs"
      class={linkClasses}
      target="_blank"
      rel="noreferrer"
    >
      <i class="fa-regular fa-webhook"></i> Docs
      <i
        class="fa-regular fa-arrow-up-right-from-square ml-auto opacity-50 text-sm"
      ></i></a
    >

    <a
      href="https://github.com/pockethost/pockethost"
      class={linkClasses}
      target="_blank"
      rel="noreferrer"
    >
      <i class="fa-brands fa-github"></i> GitHub
      <i
        class="fa-regular fa-arrow-up-right-from-square ml-auto opacity-50 text-sm"
      ></i></a
    >

    <button type="button" class={linkClasses} on:click={handleLogoutAndRedirect}
      ><i class="fa-regular fa-arrow-up-left-from-circle"></i> Logout</button
    >
  </div>

  <ThemeToggle />
</aside>
