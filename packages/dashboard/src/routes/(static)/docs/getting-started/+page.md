---
title: Getting Started
description: A step-by-step guide to getting started with PocketHost
---
# Getting Started with PocketHost

Welcome to PocketHost! This guide will help you set up your first PocketBase instance and get you familiar with the basics of our platform. Let's dive in!

## 1. Create a PocketHost Account

The first step is to [create a PocketHost account](https://pockethost.io/get-started) and subscribe.

- **Sign Up**: Visit [pockethost.io/get-started](https://pockethost.io/get-started).
- **Email Verification**: Click the link in the confirmation email. You can't use instances until your email is verified. Unverified accounts and their instances are deleted after **7 days**.
- **Changing your email**: Go to [Account → Change email](/account/change-email), enter the new address, and confirm from the new inbox with your current password. Your old email stays active until you confirm. 

## 2. Choose an Instance Name

After logging in, you can create a new PocketBase instance.

- **Auto-Assigned Name**: If you prefer, you can let PocketHost assign a random, unique name to your instance.
- **Custom Name**: You can also choose a custom name that reflects your project or brand.

**Note**: Instance names must be unique and comply with our naming guidelines.

## 3. Accessing the Instance Admin Interface

Once your instance is created, you can access the PocketBase admin UI.

- **Admin URL**: Navigate to `https://<instance>.pockethost.io/_`
  - Replace `<instance>` with your instance name.
- **Login**: Use the default admin credentials provided during instance creation.

**Example**:

```plaintext
https://myapp.pockethost.io/_
```

## 4. Exploring the Instance Dashboard

PocketHost provides a user-friendly dashboard to manage your instances.

- **Dashboard Access**: Log in to your PocketHost account and go to the [Dashboard](https://pockethost.io/dashboard).
- **Instance Management**: From the dashboard, you can:
  - Start, stop, or restart instances.
  - View instance status and resource usage.
  - Configure settings and access logs.

## 5. Managing instance files

Use the **[PocketHost CLI](/docs/cli)** for hooks, migrations, static files, and backups:

```bash
npm install -g pockethost
pockethost login
pockethost link my-instance
pockethost dev
```

`pockethost dev` deploys your project as you save. `pockethost files`, `pull`, `upload` and `rm` handle everything else, including `pb_data`. See **[Files](/docs/cli#files)**.

SFTP shuts down on February 6, 2027. See [SFTP shuts down February 6, 2027](/blog/sftp-sunset).

---

**Next Steps**:

Now that you're set up, read [How PocketHost Works](/docs/how-it-works) to see what's different from running PocketBase yourself. Then:

- **Configure Your Database**: Set up collections and records in the admin UI.
- **Integrate with Your App**: Connect your PocketBase instance to your web or mobile application.
- **Deploy Updates**: Use the [PocketHost CLI](/docs/cli) or the admin UI to manage your instance files.

---

_Happy building with PocketHost!_
