---
title: Backup & Restore
category: usage
description: Learn how to perform backup and restore operations for your
  PocketHost projects using FTP. This guide provides step-by-step instructions
  on how to ensure data safety and continuity for your PocketBase instances by
  backing up and restoring your work efficiently. Empower your projects with
  robust data management best practices.

---

# Overview

In the digital realm, safeguarding data is paramount. Therefore, knowing how to efficiently backup and restore your data is a crucial facet for any developer or enterprise owner. This guide focuses on those working with PocketHost projects, detailing how you can use File Transfer Protocol (FTP) to perform these operations with ease, thereby ensuring the safety and continuity of your PocketBase instances.

Before delving into the process, it’s important to ascertain the status of your PocketHost instance. Ideally, you’d want it in an idle state, a detail expanded upon in our instances usage document. Having your instance idle optimizes the process and reduces the risk of data conflicts.

Backing up is the first line of defense against loss of data or unforeseen errors. However, a backup is useless without knowing how to restore it correctly. It's a good practice to regularly test restoring from your backups to ensure they'd work correctly if the need arises. 

Additionally, effective data management isn't only about ensuring the safe storage and retrieval of data. It also involves synchronizing data between different environments or platforms. The guide will provide some insights on how you can automate this process using lftp, based on a brilliant Stack Overflow article we found.


You can use [FTP](/docs/usage/ftp/) to perform backup and restore operations.

## Before you Begin

Make sure your PocketHost instance status is [idle](/docs/usage/instances/#on-demand-execution).

## Backing Up

## Restoring

## Synchronizing

- [SO article about using lftp to sync](https://askubuntu.com/questions/758640/how-to-automatically-sync-the-contents-of-a-local-folder-with-the-contents-of-a)
