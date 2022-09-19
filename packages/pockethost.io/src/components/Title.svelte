<script lang="ts">
  export let first = 'Pocket'
  export let second = 'Host'
  export let third = ''
</script>

<h1>{first}<span id="host">{second}</span>{third}</h1>

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
  }
</style>
