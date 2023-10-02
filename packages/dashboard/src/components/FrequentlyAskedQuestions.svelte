<script lang="ts">
  import { faq } from '$src/docs'
  // ts interface for the Question type
  interface Question {
    title: string
    body: string
    collapsed: boolean
  }

  interface rawQ {
    title: string
    body: string
  }

  // Array of Questions, if the boolean <collapsed> is set to false, the answer is displayed
  const questions: Question[] = faq.outline.map((q: rawQ) => ({ ...q, collapsed: true }))
</script>

<div class="accordion w-100">
  {#each questions as question}
    <div class="accordion-item shadow">
      <h5 class="accordion-header">
        <button
          class="accordion-button title {question.collapsed ? 'collapsed' : ''}"
          type="button"
          on:click={() => (question.collapsed = !question.collapsed)}
        >
          {question.title}
        </button>
      </h5>
      <div class="accordion-collapse {question.collapsed ? 'collapse' : ''}">
        <div class="accordion-body">
          {@html question.body}
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
