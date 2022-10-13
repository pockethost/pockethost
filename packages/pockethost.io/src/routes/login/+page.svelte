<script lang="ts">
  import Button from '$components/Button/Button.svelte'
  import Title from '$components/Title/Title.svelte'
  import { client } from '$src/pocketbase'
  import { redirect } from '$util/redirect'
  import { Form, FormGroup, Input, Label } from 'sveltestrap'

  let email = ''
  let password = ''
  let loginError = ''

  const { authViaEmail } = client

  const handleLogin = () => {
    loginError = ''
    authViaEmail(email, password)
      .then((user) => {
        console.log(user)
        redirect('/dashboard')
      })
      .catch((e) => {
        loginError = e.message
      })
  }
</script>

<Title first="Log" second="in" />

<main>
  <error>{loginError}</error>
  <Form>
    <FormGroup>
      <Label for="email">Email</Label>
      <Input type="email" id="email" bind:value={email} />
    </FormGroup>
    <FormGroup>
      <Label for="password">Password</Label>
      <Input type="password" id="password" bind:value={password} />
    </FormGroup>
  </Form>

  <div>
    Need to <a href="/signup">create an account</a>?
  </div>
  <Button click={handleLogin} disabled={email.length === 0 || password.length === 0}>Log In</Button>
</main>

<style type="text/scss">
  main {
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
  }
</style>
