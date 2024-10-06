<script>
    import png from './2024-10-06-09-11-52.png?enhanced';
</script>

# Admin Sync

Admin Sync ensures that your instance always has an admin account matching the login credentials of your pockethost.io account.

<enhanced:img src={png} c>

## Admin Sync: `Enabled` (Default)

When Admin Sync is enabled, your pockethost.io account credentials are copied as an admin login to your instance before it is launched.

If you change your pockethost.io credentials while an instance is running, they will not be updated until the next time the instance is launched. To force your instance to shut down, [power it down](/docs/power).

By default, Admin Sync is enabled. When an instance is created, it will automatically have an admin account that matches your pockethost.io login. This security measure ensures that someone else cannot create the initial admin account before you.

## Admin Sync: `Disabled`

When Admin Sync is disabled, your pockethost.io credentials will not be copied to your instance in future invocations.
