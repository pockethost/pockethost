<script lang="ts">
  import { Card, CardBody, CardHeader, CardText, CardTitle } from 'sveltestrap'
  import Check from './Icons/Check.svelte'

  export let title: string
</script>

<main>
  <Card class="">
    <CardHeader>
      <CardTitle><Check /> {title}</CardTitle>
    </CardHeader>
    <CardBody style={'height: 220px'}>
      <CardText>
        <div class="body">
          <slot />
        </div>
      </CardText>
    </CardBody>
  </Card>
</main>

<style lang="scss">
  main {
    width: 300px;
    margin: 5px;
    display: inline-block;
  }
  .body {
    text-align: left;
  }
</style>
