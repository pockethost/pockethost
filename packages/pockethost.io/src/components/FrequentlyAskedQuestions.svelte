<script lang="ts">
	interface Question {
		title: string,
		answer: string,
		collapsed: boolean
	}

	const questions: Question[] = [
		{
			title: "How many instances can I create ?",
			answer: "For now, you can create an unlimited number of PocketBase instances.",
			collapsed: false
		},
		{
			title: "How do I migrate away from pockethost.io and host pocketbase on my own ?",
			answer: "Reponse 2",
			collapsed: true
		},
		{
			title: "How often does my data get backed up ?",
			answer: "Reponse 2",
			collapsed: true
		},
		{
			title: "What versions of PocketBase do you support ?",
			answer: "Reponse 2",
			collapsed: true
		},
		{
			title: "Can I import data from my local into pockethost ?",
			answer: "Reponse 2",
			collapsed: true
		}
	]
</script>

<div class="section accordion w-100">
  <h2 class="mb-5">Frequently asked questions</h2>
	{#each questions as question}
  <div class="accordion-item shadow">
    <h5 class="accordion-header">
      <button
        class="accordion-button title {question.collapsed ? "collapsed" : ""}"
        type="button"
        on:click={() => question.collapsed = !question.collapsed}
      >
        {question.title}
      </button>
    </h5>
    <div
      class="accordion-collapse {question.collapsed ? "collapse" : ""}"
    >
      <div class="accordion-body">
        {question.answer}
      </div>
    </div>
  </div>
	{/each}
</div>

<style>
	.section {
    padding: 120px 0;
	}

	.section h2 {
		font-size: 56px;
	}

	.title {
		font-size: 20px;
		font-weight: bold;
	}
</style>
