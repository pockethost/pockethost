<script lang="ts">
	import { authViaEmail, createUser } from '@pockethost/common/src/pocketbase';
	import Button from '../../components/Button/Button.svelte';
	import { parseError } from '../../components/Error/parseError';
	import Title from '../../components/Title.svelte';

	let email = '';
	let errorMessage = '';
	let password = '';
	let passwordError = '';

	//   client.users
	//     .authViaEmail('ben@benallfree.com', 'Dhjb2X6C1y0W')
	//     .then((u) => {
	//       console.log(`user logged in`, u)
	//       window.location.href = '/dashboard'
	//     })
	//     .catch((e) => console.error(`user login error`, e))

	const handleSignup = () => {
		errorMessage = '';
		passwordError = '';
		createUser(email, password)
			.then((user) => {
				console.log({ user });

				authViaEmail(email, password)
					.then((u) => {
						console.log(`user logged in`, u);
						window.location.href = '/dashboard';
					})
					.catch((e) => console.error(`user login error`, e));
			})
			.catch((e) => {
				errorMessage = parseError(e);
				console.error(errorMessage, e);
			});
	};
</script>

<Title first="Sign" second="Up" />

<main>
	<div>
		<label for="email">Email</label>
		<input name="email" type="email" bind:value={email} />
		<error>{errorMessage}</error>
	</div>
	<div>
		<label for="password">Password</label>
		<input name="password" type="password" bind:value={password} />
		<error>{passwordError}</error>
	</div>
	<Button click={handleSignup} disabled={email.length === 0 || password.length === 0}>
		Sign Up
	</Button>
	<div>
		Already have an account? <a href="/login">Log in</a>
	</div>
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
