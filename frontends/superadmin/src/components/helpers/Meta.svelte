<script>
  import { APP_URL } from '$src/env'

  const baseUrl = APP_URL()
  const imageUrl = `${baseUrl}poster.png`
  const tagline = `Get a PocketBase backend for your next app in under 10 seconds.`
</script>

<svelte:head>
  <!-- HTML Meta Tags -->
  <title>PocketHost</title>
  <meta name="description" content={tagline} />

  <link rel="manifest" href="/manifest.json" />

  <!-- Facebook Meta Tags -->
  <meta property="og:url" content={baseUrl} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="PocketHost" />
  <meta property="og:description" content={tagline} />
  <meta property="og:image" content={imageUrl} />

  <!-- Twitter Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta property="twitter:domain" content={APP_URL()} />
  <meta property="twitter:url" content={baseUrl} />
  <meta name="twitter:title" content="PocketHost" />
  <meta name="twitter:description" content={tagline} />
  <meta name="twitter:image" content={imageUrl} />
</svelte:head>
