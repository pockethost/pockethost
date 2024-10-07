<script lang="ts">
  import { fade } from 'svelte/transition'
  import { items } from './stores'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import { reduce } from '@s-libs/micro-dash'
  import { logger, type UpdateInstancePayload } from 'pockethost'

  const handleDelete = (name: string) => async (e: Event) => {
    e.preventDefault()
    logger().debug(`Deleting ${name}`)
    items.delete(name)
    await client().updateInstance({
      id: $instance.id,
      fields: {
        secrets: reduce(
          $items,
          (c, v) => {
            const { name, value } = v
            c[name] = value
            return c
          },
          {} as NonNullable<UpdateInstancePayload['fields']['secrets']>,
        ),
      },
    })
  }
</script>

<table class="table">
  <thead>
    <tr>
      <th class="w-2/5 border-b-2 border-neutral">Key</th>
      <th class="w-2/5 border-b-2 border-neutral">Value</th>
      <th class="w-1/5 border-b-2 border-neutral text-right">Actions</th>
    </tr>
  </thead>

  <tbody>
    {#each $items as item}
      <tr transition:fade>
        <th>{item.name}</th>
        <td
          >{item.value.slice(0, 2) +
            item.value.slice(2).replaceAll(/./g, '*')}</td
        >
        <td class="text-right">
          <button
            aria-label="Delete"
            on:click={handleDelete(item.name)}
            type="button"
            class="btn btn-sm btn-square btn-outline btn-warning"
            ><i class="fa-regular fa-trash"></i></button
          >
        </td>
      </tr>
    {/each}
  </tbody>
</table>
