<script lang="ts">
  import Button from '$components/Button/Button.svelte'
  import { ButtonStyles } from '$components/Button/types'
  import Protected from '$components/Protected.svelte'
  import ProvisioningStatus from '$components/ProvisioningStatus/ProvisioningStatus.svelte'
  import Title from '$components/Title/Title.svelte'
  import { getAllInstancesById } from '@pockethost/common/src/pocketbase'
  import { InstanceStatuses, type Instance_Out_ByIdCollection } from '@pockethost/common/src/schema'
  import { values } from '@s-libs/micro-dash'

  let apps: Instance_Out_ByIdCollection = {}
  getAllInstancesById()
    .then((instances) => {
      apps = instances
    })
    .catch((e) => {
      console.error(`Failed to fetch instances`)
    })
</script>

<Protected>
  <Title />
  <main>
    <h2>Dashboard</h2>
    <h4>Apps</h4>
    {#each values(apps) as app}
      <div>
        <ProvisioningStatus status={app.status} />
        {app.subdomain}.pockethost.io

        <Button style={ButtonStyles.Micro} href={`/app/instances/${app.id}`}>Details</Button>
        <Button
          disabled={app.status !== InstanceStatuses.Started}
          style={ButtonStyles.Micro}
          click={() => {
            window.open(`https://${app.subdomain}.pockethost.io/_`)
          }}>Admin</Button
        >
      </div>
    {/each}
    <Button href="/app/new">+</Button>
  </main>
</Protected>

<style type="text/scss">
  main {
    padding: 1em;
    margin-left: auto;
    margin-right: auto;

    .caption {
      font-size: 30px;
      margin-top: 20px;
      margin-bottom: 20px;
    }
  }
</style>
