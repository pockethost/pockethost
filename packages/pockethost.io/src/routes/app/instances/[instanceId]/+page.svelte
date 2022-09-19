<script lang="ts">
	import { page } from '$app/stores'
	import { identity } from 'ts-brand'
	import Caption from '../../../../components/Caption/Caption.svelte'
	import CodeSample from '../../../../components/CodeSample.svelte'
	import Protected from '../../../../components/Protected.svelte'
	import Title from '../../../../components/Title.svelte'
	import { isBrowser } from '@pockethost/common/src/isBrowser'
	import { assertExists } from '@pockethost/common/src/assert'
	import { getInstanceById, watchInstanceById } from '@pockethost/common/src/pocketbase'
	import {
		InstanceStatuses,
		type InstanceId,
		type Instance_Out
	} from '@pockethost/common/src/schema'
	import { onDestroy, onMount } from 'svelte'
	import type { Unsubscriber } from 'svelte/store'
	import ProvisioningStatus from '../../../../components/ProvisioningStatus/ProvisioningStatus.svelte'
	import { ProvisioningSize } from '../../../../components/ProvisioningStatus/types'

	const { instanceId } = $page.params

	let instance: Instance_Out | undefined

	let url: string
	let code: string = ''
	let unsub: Unsubscriber = () => {}
	onMount(() => {
		unsub = watchInstanceById(identity<InstanceId>(instanceId), (r) => {
			console.log(`got a record`, r)
			instance = r
			assertExists(instance, `Expected instance here`)
			const { subdomain } = instance
			url = `https://${subdomain}.pockethost.io`
			code = `const url = '${url}'\nconst client = new PocketBase(url)`
		})
	})
	onDestroy(() => unsub())
</script>

<Protected>
	<Title />
	{#if instance}
		{#if instance.status === InstanceStatuses.Started}
			<Caption>Your PocketHost instance is now live.</Caption>
			<div>
				Admin URL: <a href={`${url}/_`} target="_blank">{`${url}/_`}</a>
			</div>
			<div>
				JavaScript:
				<CodeSample {code} />
			</div>
		{/if}
		{#if instance.status !== InstanceStatuses.Started}
			<Caption>Please stand by, your instance is starting now...</Caption>
			<div class="provisioning">
				<ProvisioningStatus status={instance.status} size={ProvisioningSize.Hero} />
			</div>
		{/if}
	{/if}
</Protected>

<style lang="scss">
	.provisioning {
		text-align: center;
	}
</style>
