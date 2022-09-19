<script lang="ts">
  import Button from '$components/Button/Button.svelte'
  import { ButtonSizes } from '$components/Button/types'
  import Gap from '$components/Gap.svelte'
  import Protected from '$components/Protected.svelte'
  import ProvisioningStatus from '$components/ProvisioningStatus/ProvisioningStatus.svelte'
  import Title from '$components/Title/Title.svelte'
  import { getAllInstancesById } from '@pockethost/common/src/pocketbase'
  import { InstanceStatuses, type Instance_Out_ByIdCollection } from '@pockethost/common/src/schema'
  import { values } from '@s-libs/micro-dash'
  import { Col, Container, Row } from 'sveltestrap'

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
  <Title first="Dash" second="board" />
  <main>
    <h2>Apps</h2>
    <Container>
      {#each values(apps) as app}
        <Row>
          <Col>
            <ProvisioningStatus status={app.status} />
          </Col>
          <Col>
            {app.subdomain}.pockethost.io
          </Col>

          <Col>
            <Button size={ButtonSizes.Micro} href={`/app/instances/${app.id}`}>Details</Button>

            <Button
              disabled={app.status !== InstanceStatuses.Started}
              size={ButtonSizes.Micro}
              click={() => {
                window.open(`https://${app.subdomain}.pockethost.io/_`)
              }}>Admin</Button
            >
          </Col>
        </Row>
      {/each}
    </Container>
    <Gap />
    <div class="newApp">
      <Button href="/app/new" size={ButtonSizes.Wide}>+ New App</Button>
    </div>
  </main>
</Protected>

<style type="text/scss">
  main {
    margin-top: 10px;
    margin-right: auto;
    margin-bottom: 10px;
    margin-left: auto;
    max-width: 600px;
    padding: 10px;
    h2 {
      text-align: center;
    }
    .newApp {
      width: 200px;
      margin-left: auto;
      margin-right: auto;
      text-align: center;
    }
  }
</style>
