<script lang="ts">
  import {fade} from 'svelte/transition';
  import {onMount} from "svelte";

  let isReady: boolean = false;

  onMount(() => {
    setTimeout(() => {
      isReady = true;
		}, 3000);
	})
</script>


<div class="homepage-hero-animation">
	{#if !isReady}
		<div class="text-center">
			<p>Creating Your New Instance...</p>
			<div class="spinner-border text-primary" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
	{/if}

	{#if isReady}
		<div in:fade="{{duration: 1000}}">
			<img src="/images/pocketbase-intro-screen.jpg" alt="Screenshot of the Pocketbase Intro UI" class="img-fluid" />
		</div>
	{/if}
</div>


<style>
    .homepage-hero-animation {
        border: 1px solid #eee;
				border-radius: 25px;
				padding: 30px;
				min-height: 500px;
				display: flex;
				align-items: center;
				justify-content: center;
    }
</style>