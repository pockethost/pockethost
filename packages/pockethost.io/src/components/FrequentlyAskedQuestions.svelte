<script lang="ts">
  // ts interface for the Question type
  interface Question {
    title: string,
    answer: string,
    collapsed: boolean
  }

  // Array of Questions, if the boolean <collapsed> is set to false, the answer is displayed
  const questions: Question[] = [
    {
      title: "How many instances can I create ?",
      answer: "For now, you can create an unlimited number of PocketBase instances.",
      collapsed: false
    },
    {
      title: "How do I migrate away from pockethost.io and host pocketbase on my own ?",
      answer: "We're planning on letting users download their data as an archive.",
      collapsed: true
    },
    {
      title: "How often does my data get backed up ?",
      answer: "Every day.",
      collapsed: true
    },
    {
      title: "What versions of PocketBase do you support ?",
      answer: "Pocketbase up to version 0.10.4 has been tested and is supported.",
      collapsed: true
    },
    {
      title: "Can I import data from my local into pockethost ?",
      answer: "Yes.",
      collapsed: true
    }
  ]
</script>

<div class="accordion w-100">
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
  .title {
    font-size: 20px;
    font-weight: bold;
  }
</style>
