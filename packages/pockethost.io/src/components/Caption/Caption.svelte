<script lang="ts">
  import { CaptionSize } from './types'

  export let size: CaptionSize = CaptionSize.Normal
</script>

<div class="caption {size}"><slot /></div>

<style lang="scss">
  .caption {
    margin-top: 20px;
    margin-bottom: 20px;
    &.small {
      font-size: 15px;
    }
    &.normal {
      font-size: 25px;
    }
    &.large {
      font-size: 45px;
    }
    &.hero {
      font-size: 65px;
    }
  }
</style>
