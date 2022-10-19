<script lang="ts">
  import Button from '$components/Button/Button.svelte'
  import { ButtonSizes } from '$components/Button/types'
  import Protected from '$components/Protected.svelte'
  import ProvisioningStatus from '$components/ProvisioningStatus/ProvisioningStatus.svelte'
  import Title from '$components/Title/Title.svelte'
  import { PUBLIC_PB_DOMAIN } from '$src/env'
  import { client } from '$src/pocketbase'
  import type { Instance_Out_ByIdCollection } from '@pockethost/common/src/schema'
  import { forEach, values } from '@s-libs/micro-dash'
  import { onDestroy, onMount } from 'svelte'
  import type { Unsubscriber } from 'svelte/store'
  import { Col, Container, Row } from 'sveltestrap'

  const { getAllInstancesById, watchInstanceById } = client
  let apps: Instance_Out_ByIdCollection = {}

  let unsubs: Unsubscriber[] = []
  onMount(() => {
    getAllInstancesById()
      .then((instances) => {
        apps = instances
        forEach(apps, (app) => {
          const instanceId = app.id
          const unsub = watchInstanceById(instanceId, (r) => {
            console.log(`got a record`, r)
            apps[r.id] = r
          })
          unsubs.push(unsub)
        })
      })
      .catch((e) => {
        console.error(`Failed to fetch instances`)
      })
  })
  onDestroy(() => {
    unsubs.forEach((u) => u())
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
            <div class="nowrap">
              {app.subdomain}
            </div>
          </Col>

          <Col>
            <Button size={ButtonSizes.Micro} href={`/app/instances/${app.id}`}>Details</Button>

            <Button
              size={ButtonSizes.Micro}
              click={() => {
                window.open(`https://${app.subdomain}.${PUBLIC_PB_DOMAIN}/_`)
              }}>Admin</Button
            >
          </Col>
        </Row>
      {/each}
    </Container>

    <div class="newApp">
      <Button href="/app/new" size={ButtonSizes.Wide}>+ New App</Button>
    </div>
  </main>
</Protected>

<style lang="scss">
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
    .nowrap {
      white-space: nowrap;
    }
    .newApp {
      width: 200px;
      margin-left: auto;
      margin-right: auto;
      text-align: center;
    }
  }
</style>
