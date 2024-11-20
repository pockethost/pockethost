<script lang="ts">
  import markdownit from 'markdown-it'
  import markdownItAttrs from 'markdown-it-attrs'
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import { every, keys, map, values } from '@s-libs/micro-dash'
  import StepContainer from './StepContainer.svelte'

  import {
    steps,
    type Action,
    type StepKey,
    type Steps,
    type StepState,
  } from './steps'
  import { writable } from 'svelte/store'

  const stepKeys = keys(steps) as StepKey[]
  const stepsArray = values(steps)

  const errors = writable<string[]>([])
  const infos = writable<string[]>([])
  const inputs = writable<Record<string, string>>({})

  const stateDefaults: Partial<Record<StepKey, string>> = {
    email: 'foo@bar.com',
    otp: 'ok',
    marketing: 'opt_in',
    appIntent: 'testing',
    platform: 'web',
    dbSize: 'large',
    customDomain: 'no',
    fileCount: 'small',
    fileStorage: 'small',
    userCount: 'large',
    traffic: 'large',
    mailService: 'yes',
    hibernation: 'always-on',
    ddosInfo: 'acknowledged',
    support: 'yes',
    projectCount: 'large',
    legal: 'no',
    region: 'atl',
    discordInfo: 'acknowledged',
    userInfo: 'acknowledged',
    openSourceInfo: 'acknowledged',
  }
  const state = writable<Partial<Record<StepKey, string>>>(stateDefaults)

  $: stepIdx = keys($state).length
  const setStep = (n: number) => {
    stepIdx = n
  }

  const handleInputChange = (name: string) => (e: Event) => {
    const target = e.target as HTMLInputElement
    inputs.update((inputs) => {
      inputs[name] = target.value
      return inputs
    })
  }

  const handleClick = (action: Action) => async () => {
    errors.set([])
    infos.set([])
    try {
      if (action.mode === 'back') {
        setStep(stepIdx - 1)
        return
      }
      if (action.mode === 'next' || !action.mode) {
        await Promise.all(
          map(step.inputs, async (input, name) => {
            const validator = input.validator
            if (validator) {
              console.log(`validating ${name}`)
              const res = await validator($inputs[name] || '', $state)
              if (typeof res === 'string') {
                errors.update((errors) => [...errors, `${res}`])
              }
            }
          }),
        )
        const allValid = $errors.length === 0
        if (!allValid) {
          return
        }
      }
      const valueHandler = action.value
      const valueHandlerResult =
        typeof valueHandler === 'string'
          ? valueHandler
          : await valueHandler($inputs, $state)
      if (typeof valueHandlerResult === 'string') {
        state.update((state) => {
          state[stepKey] = valueHandlerResult
          return state
        })
      } else {
        if ('message' in valueHandlerResult) {
          infos.set([valueHandlerResult.message])
        }
      }
      if (action.mode === 'next') {
        setStep(stepIdx + 1)
      }
    } catch (e) {
      errors.update((errors) => [...errors, `${(e as Error).message ?? e}`])
    }
  }

  const md = markdownit().use(markdownItAttrs)
  $: step = stepsArray[stepIdx]!
  $: stepKey = stepKeys[stepIdx]!
  $: stepTitle = md.render(
    typeof step.title === 'function' ? step.title($state) : step.title,
  )
  $: stepQuestion = md.render(
    typeof step.question === 'function' ? step.question($state) : step.question,
  )
  $: console.log(
    JSON.stringify(
      {
        step,
        stepKey,
        stepTitle,
        stepQuestion,
        inputs: $inputs,
        state: $state,
        errors: $errors,
        infos: $infos,
      },
      null,
      2,
    ),
  )
</script>

<svelte:head>
  <title>Home - PocketHost</title>
</svelte:head>

<div>
  <div
    class="mx-auto flex items-center justify-center border rounded-lg m-4 w-[330px]"
  >
    <div>
      <Logo />
      <progress
        class="progress progress-primary w-full"
        value={stepIdx + 1}
        max={keys(steps).length}
      ></progress>

      <div class="relative h-[450px] w-[325px] overflow-hidden p-4">
        <StepContainer title={stepTitle}>
          <div class="mt-2">{@html stepQuestion}</div>
          <div class="mt-2">
            {#if $infos.length > 0}
              <div class="pt-2 pb-2">
                <div class="bg-info text-info-content rounded-md p-2">
                  {#each $infos as info}
                    <div>{info}</div>
                  {/each}
                </div>
              </div>
            {/if}
            {#if $errors.length > 0}
              <div class="pt-2 pb-2">
                <div class="bg-error text-error-content rounded-md p-2">
                  {#each $errors as error}
                    <div>{error}</div>
                  {/each}
                </div>
              </div>
            {/if}
            {#each Object.entries(step.inputs || {}) as [name, input]}
              {#if input.type === 'text' || input.type === 'email' || input.type === 'number'}
                <input
                  type={input.type}
                  class="input input-bordered w-full max-w-xs"
                  placeholder={input.placeholder}
                  required
                  on:change={handleInputChange(name)}
                />
              {/if}
              {#if input.type === 'select'}
                <select
                  class="select select-bordered w-full max-w-xs"
                  on:change={handleInputChange(name)}
                >
                  {#each input.values as value}
                    <option value={value.value}>{value.display}</option>
                  {/each}
                </select>
              {/if}
            {/each}
          </div>
          <div class="mt-2 flex justify-center flex-wrap">
            {#each step.actions || [] as action}
              <button
                class="btn btn-primary btn-sm {action.style} mr-2 mb-2"
                on:click={handleClick(action)}
              >
                {action.display}
              </button>
            {/each}
          </div>
        </StepContainer>
      </div>
    </div>
  </div>
</div>
