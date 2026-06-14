---
title: Getting Started
description: A step-by-step guide to getting started with PocketHost
---
# Getting Started with PocketHost

Welcome to PocketHost! This guide will help you set up your first PocketBase instance and get you familiar with the basics of our platform. Let's dive in!

## 1. Create a PocketHost Account

The first step is to create a free account on PocketHost.

- **Sign Up**: Visit [pockethost.io/get-started](https://pockethost.io/get-started).
- **Email Verification**: Provide a valid email address and verify it through the confirmation email sent to you.
- **Account Setup**: Complete your profile setup, and you're ready to go!

_For detailed instructions, see [Account Creation](/docs/account-creation)._

## 2. Choose an Instance Name

After logging in, you can create a new PocketBase instance.

- **Auto-Assigned Name**: If you prefer, you can let PocketHost assign a random, unique name to your instance.
- **Custom Name**: You can also choose a custom name that reflects your project or brand.

**Note**: Instance names must be unique and comply with our naming guidelines.

_Learn more in [Choosing an Instance Name](#)._

## 3. Accessing the Instance Admin Interface

Once your instance is created, you can access the PocketBase admin UI.

- **Admin URL**: Navigate to `https://<instance>.pockethost.io/_`
  - Replace `<instance>` with your instance name.
- **Login**: Use the default admin credentials provided during instance creation.

**Example**:

```plaintext
https://myapp.pockethost.io/_
```

_For more details, visit [Accessing the Admin Interface](#)._

## 4. Exploring the Instance Dashboard

PocketHost provides a user-friendly dashboard to manage your instances.

- **Dashboard Access**: Log in to your PocketHost account and go to the [Dashboard](https://pockethost.io/dashboard).
- **Instance Management**: From the dashboard, you can:
  - Start, stop, or restart instances.
  - View instance status and resource usage.
  - Configure settings and access logs.

_See [Using the PocketHost Dashboard](#) for an in-depth guide._

## 5. Managing instance files (SFTP)

For hooks, migrations, and backups, use **SFTP** with an Ed25519 SSH key.

1. Create a key with `ssh-keygen -t ed25519` and register the public key under **[Account → Keys](/account/keys)**.
2. Connect to `ftp.pockethost.io` on port **2222** with your email as the username and your private key.

Legacy FTPS on port 21 is deprecated. See **[SFTP File Access](/docs/ftp)** for macOS, Windows, Linux, and client-specific instructions.

---

**Next Steps**:

Now that you're set up, you can start building your application!

- **Configure Your Database**: Set up collections and records in the admin UI.
- **Integrate with Your App**: Connect your PocketBase instance to your web or mobile application.
- **Deploy Updates**: Use [SFTP](/docs/ftp) or the admin UI to manage your instance files.

---

_Happy building with PocketHost!_
