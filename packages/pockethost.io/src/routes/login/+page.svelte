<script lang="ts">
	import { ClientResponseError } from 'pocketbase'
	import AuthCheck from '../../components/AuthCheck.svelte'
	import Button from '../../components/Button/Button.svelte'
	import Title from '../../components/Title.svelte'
	import { authViaEmail, createUser } from '@pockethost/common/src/pocketbase'

	let email = ''
	let password = ''
	let loginError = ''

	const handleLogin = () => {
		loginError = ''
		authViaEmail(email, password)
			.then((user) => {
				console.log(user)
				window.location.href = '/dashboard'
			})
			.catch((e) => {
				loginError = e.message
			})
	}
</script>

<Title first="Log" second="In" />

<main>
	<error>{loginError}</error>
	<div>
		<label for="email">Email</label>
		<input name="email" type="email" bind:value={email} />
	</div>
	<div>
		<label for="password">Password</label>
		<input name="password" type="password" bind:value={password} />
	</div>
	<div>
		Need to <a href="/signup">create an account</a>?
	</div>
	<Button click={handleLogin} disabled={email.length === 0 || password.length === 0}>Log In</Button>
</main>

<style type="text/scss">
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
</style>
