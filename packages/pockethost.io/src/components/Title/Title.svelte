<script lang="ts">
  import { TitleSize } from './types'

  export let first = ''
  export let second = ''
  export let third = ''
  export let size: TitleSize = TitleSize.Normal
</script>

<h1 class={size}>{first}<span id="host">{second}</span>{third}</h1>

<style lang="scss">
  h1 {
    color: #ff3e00;
    font-size: 30px;
    margin-left: auto;
    margin-right: auto;
    display: block;
    text-align: center;
    font-weight: 300;

    #host {
      background-image: linear-gradient(
        83.2deg,
        rgba(150, 93, 233, 1) 10.8%,
        rgba(99, 88, 238, 1) 94.3%
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }
</style>
