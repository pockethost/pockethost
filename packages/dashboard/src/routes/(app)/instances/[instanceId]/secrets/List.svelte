<script lang="ts">
  import { fade } from 'svelte/transition'
  import { items } from './stores'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import { logger, type UpdateInstancePayload } from 'pockethost/common'

  const handleDelete = (name: string) => async (e: Event) => {
    e.preventDefault()
    logger().debug(`Deleting ${name}`)
    items.delete(name)
    await client().updateInstance({
      id: $instance.id,
      fields: {
        secrets: $items.reduce(
          (c, v) => {
            const { name, value } = v
            c[name] = value
            return c
          },
          {} as NonNullable<UpdateInstancePayload['fields']['secrets']>
        ),
      },
    })
  }
</script>

<table class="table mb-8 w-full table-auto">
  <thead>
    <tr>
      <th class="w-2/5 border-b-2 border-neutral text-left">Key</th>
      <th class="w-2/5 border-b-2 border-neutral text-left">Value</th>
      <th class="w-1/5 border-b-2 border-neutral text-right">Actions</th>
    </tr>
  </thead>

  <tbody>
    {#each $items as item}
      <tr transition:fade>
        <th class="truncate max-w-[150px]">{item.name}</th>
        <td class="truncate max-w-[150px]">
          {item.value.slice(0, 2) + item.value.slice(2).replaceAll(/./g, '*')}
        </td>
        <td class="text-right">
          <wa-button
            aria-label="Delete"
            onclick={handleDelete(item.name)}
            type="button"
            variant="warning"
            size="small"
            appearance="outline"
          >
            <wa-icon name="trash"></wa-icon>
          </wa-button>
        </td>
      </tr>
    {/each}
  </tbody>
</table>
