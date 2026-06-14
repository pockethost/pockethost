<script lang="ts">
  import CopyField from '$components/CopyField.svelte'
  import { bash, dns, plaintext, typescript, type LanguageType } from 'svelte-highlight/languages'

  export let code: string
  export let language: LanguageType<'typescript' | 'bash' | 'dns' | 'plaintext'> = typescript
</script>

<CopyField text={code} {language} className="mb-4" />
