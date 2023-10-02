<script lang="ts">
  export let block = true;
  export let height: string = "h-full";
  export let marginBottom: string = '';
</script>

<div class='card card-body bg-base-200 {block ? "block" : ""} {height} {marginBottom}'>
  <slot />
</div>