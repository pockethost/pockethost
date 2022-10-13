<script lang="ts">
  import Button from '$components/Button/Button.svelte'
  import Error from '$components/Error/Error.svelte'
  import Title from '$components/Title/Title.svelte'
  import { TitleSize } from '$components/Title/types'
  import { client } from '$src/pocketbase'
  import { redirect } from '$util/redirect'
  import { Form, FormGroup, Input, Label } from 'sveltestrap'

  const { authViaEmail, createUser, parseError } = client
  let email = ''
  let emailError: string[] = []
  let password = ''
  let passwordError = ''

  //   client.users
  //     .authViaEmail('ben@benallfree.com', 'Dhjb2X6C1y0W')
  //     .then((u) => {
  //       console.log(`user logged in`, u)
  //       window.location.href = '/dashboard'
  //     })
  //     .catch((e) => console.error(`user login error`, e))

  const handleSignup = () => {
    emailError = []
    passwordError = ''
    createUser(email, password)
      .then((user) => {
        console.log({ user })

        authViaEmail(email, password)
          .then((u) => {
            console.log(`user logged in`, u)
            redirect('/dashboard')
          })
          .catch((e) => console.error(`user login error`, e))
      })
      .catch((e) => {
        emailError = parseError(e)
        console.error(emailError.join('\n'), e)
      })
  }
</script>

<Title first="Sign" second="up" size={TitleSize.Normal} />

<main>
  <Form>
    <FormGroup>
      <Label for="email">Email Address</Label>
      <Input type="email" bind:value={email} id="email" />
      <Error>{emailError.join('<br/>')}</Error>
    </FormGroup>
    <FormGroup>
      <Label for="password">Password</Label>
      <Input type="password" name="password" id="password" bind:value={password} />
      <Error>{passwordError}</Error>
    </FormGroup>
  </Form>
  <Button click={handleSignup} disabled={email.length === 0 || password.length === 0}>
    Sign Up
  </Button>
  <div>
    Already have an account? <a href="/login">Log in</a>
  </div>
</main>

<style type="text/scss">
  main {
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
    error {
      color: red;
      display: block;
    }

    label {
      display: block;
      font-weight: bold;
      width: 200px;
    }
    main {
      padding: 1em;
      margin-left: auto;
      margin-right: auto;
    }

    .caption {
      font-size: 30px;
      margin-top: 20px;
      margin-bottom: 20px;
    }
  }
</style>
