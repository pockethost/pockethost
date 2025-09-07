---
title: Custom Domain
description: Learn how to set up a custom domain for your PocketHost instance
---
# Custom Domain

PocketHost instances can use a custom domain instead of the default `*.pockethost.io` subdomain.

## How It Works

Setting up a custom domain is straightforward:

1. **Set up your CNAME record** with your DNS provider to point to your PocketHost instance
2. **Add the domain** in your instance's Settings tab in the PocketHost Dashboard
3. **Verification happens automatically** using Cloudflare's HTTP verification system

Verification typically takes seconds to minutes, assuming your CNAME record has propagated. PocketHost will automatically check your domain status, or you can manually refresh by clicking the refresh button next to any domain.

## Setup Process

### Step 1: Configure Your CNAME

Create a CNAME record with your DNS provider:

- **Name/Host**: Your desired subdomain (e.g., `api` for `api.yourdomain.com`) or `@` for root domain
- **Value/Target**: Your PocketHost instance URL (e.g., `your-instance-name.pockethost.io`)

### Step 2: Add Domain in Dashboard

1. Navigate to your instance in the PocketHost Dashboard
2. Go to the **Settings** tab
3. Add your custom domain in the custom domain section
4. PocketHost will automatically begin verification

### Step 3: Verification

PocketHost uses Cloudflare's HTTP verification system to confirm domain ownership. Once your CNAME record has propagated (usually within minutes), verification will complete automatically.

You can check the status anytime in your dashboard or click the refresh button to manually trigger a verification check.

## Static Files and Custom Domain

All static files in your instance's `pb_public` directory will be served through your custom domain over HTTPS, making it perfect for static sites and assets.

---

## Background Information

### Understanding CNAMEs

A CNAME (Canonical Name) record is a type of DNS record that maps one domain name to another. When you create a CNAME record pointing your domain to your PocketHost instance, visitors to your custom domain will be directed to your PocketHost instance.

For example, if you create a CNAME record:

- **Name**: `api.yourdomain.com`
- **Value**: `your-instance.pockethost.io`

When someone visits `api.yourdomain.com`, they'll actually be connecting to your PocketHost instance.

### DNS Management Without Domain Transfer

You don't need to transfer your domain to a new registrar to manage DNS settings. You can:

1. Keep your domain at your current registrar
2. Change your name servers to point to a DNS provider like Cloudflare
3. Manage DNS records (including CNAMEs) through your DNS provider's interface

### CNAME Flattening

Traditional DNS doesn't allow CNAME records on root domains (e.g., `yourdomain.com`). However, Cloudflare provides CNAME flattening, which allows root domains to work like CNAMEs. This means you can point your root domain directly to your PocketHost instance.

### Cloudflare Benefits

We recommend Cloudflare because:

- **CNAME flattening** allows root domain usage
- **HTTP verification** provides fast, automatic domain verification
- **Global CDN** improves performance worldwide
- **Free SSL certificates** are automatically provisioned
