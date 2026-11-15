<script lang="ts">
  import LoginForm from './LoginForm.svelte'
</script>

<!-- Login only. New customers start on /pricing: they pay first, and the payment creates the account (/claim). -->
<div class="auth-card w-full max-w-md">
  <LoginForm />
</div>
