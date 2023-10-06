pockethost.io is a hosted version of the open source project named PocketHost (licensed under the MIT open source license) which is based on the PocketBase open source project.

PocketBase is essentially a REST API and admin UI over a SQLite database. PocketBase is written in golang. It provides user management, logging, REST security, as well as an advanced SQLite schema editor and data editor.

PocketHost is a multitenant 'one click' hosting and deployment service for PocketBase. Users can create accounts, create projects with uniquely named subdomains off the pockethost.io apex domain. This way, they don't have to do any setup to get PocketBase running. Our motto is "Up and running in 30 seconds with zero config". As you might imagine, preparing PocketBase for production use takes a lot of Linux administration skills. SSL, DNS, Domain management, CNAMES, Docker containers, restarting on errors, SMTP, etc. PocketHost does all this for the user. We have a Discord channel to provide support and collect feature ideas.

PocketHost has been received very positively by the community and has over 400 stars. It is used by many hobbyist developers as well as live applications.

### Overview

PocketHost hosts your [PocketBase](https://pocketbase.io) projects, so you don't have to. Create a project like you would in Firebase and Supabase and let PocketHost do the rest.

PocketHost is a cloud hosting platform for PocketBase. You can use it to instantly provision a PocketBase backend for your latest project. Features include:

- Create unlimited PocketBase projects, each with a custom subdomain
- Each instance runs on a subdomain of `pockethost.io`
- Access your PocketBase instance using the PocketBase JavaScript SDK as easily as `new PocketBase('https://my-project.pockethost.io')`
- Run your instance in an ultra-beefy shared environment

### Focus on your app

Get a live PocketBase instance in 10 seconds with no backend setup:

1. Create an account at pockethost.io
2. Provision your first PocketBase instance
3. Connect from anywhere

```ts
import PocketBase from 'pocketbase'

const client = new PocketBase(`https://harvest.pockethost.io`)
```

### Batteries Included

Here's all the Linux/devops stuff that PocketHost does for you:

- Email and DKIM+SPF and more
- DNS jargon: MX, TXT, CNAME
- SSL cert provisioning and management
- Storage
- Volume mounts
- Could computing or VPS deployment
- CDN and static asset hosting
- Amazon AWS
- Lots more - scaling, firewalls, DDoS defense, user security, log rotation, patches, updates, build tools, CPU architectures, multitenancy, on and on
