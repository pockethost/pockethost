<script lang="ts">
  import { TitleSize } from './types'

  export let first = 'Pocket'
  export let second = 'Host'
  export let third = ''
  export let size: TitleSize = TitleSize.Normal
</script>

<h1 class={size}>{first}<span id="host">{second}</span>{third}</h1>

<style type="text/scss">
  h1 {
    color: #ff3e00;
    font-size: 12vw;
    font-weight: 100;
    margin-left: auto;
    margin-right: auto;
    display: block;
    text-align: center;
    #host {
      color: blue;
    }
    &.nav {
      font-size: 15px;
      font-weight: 400;
      display: inline-block;
    }
  }
</style>
