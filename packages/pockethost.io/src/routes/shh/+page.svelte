<script lang="ts">
  import Title from '$components/Title/Title.svelte'
  import { TitleSize } from '$components/Title/types'

  
</script>

<Title first="So" second="Much" third="Quiet" size={TitleSize.Normal} />

<main>
  <img src="https://media4.giphy.com/media/V9sdMLcmIFqqk/giphy.gif?cid=790b76118f409453704f5eaabaea1a3dc7380a9daf4fca63&rid=giphy.gif&ct=g"/>
  <h3>The PocketHost instance you are seeking does not exist.</h3>
  <p>Please check the instance URL and try again.</p>
</main>

<style type="text/scss">
  main {
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    img {
      width: 100%
    }

    .caption {
      font-size: 30px;
      margin-top: 20px;
      margin-bottom: 20px;
    }
  }
</style>
