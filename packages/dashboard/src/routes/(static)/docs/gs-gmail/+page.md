# Setting up a new email domain in Google Suite

The process of setting up a new email domain in Google Suite involves several steps. In this guide, we will walk you through the process, from adding the domain to activating Gmail and setting up a catch-all email. By following these steps, you'll be able to configure your email domain effectively and ensure smooth communication within your organization. Let's get started!

<!-- @import "[TOC]" {cmd="toc" depthFrom=2 depthTo=6 orderedList=false} -->

<!-- code_chunk_output -->

- [Add the domain](#add-the-domain)
- [Domain Verification](#domain-verification)
- [Activating Gmail](#activating-gmail)
- [Adding a Catch-All Email](#adding-a-catch-all-email)
- [Test Your Email Setup](#test-your-email-setup)
- [Add a Sender Account to Gmail](#add-a-sender-account-to-gmail)

<!-- /code_chunk_output -->

## Add the domain

Go to the [domains admin](https://admin.google.com/ac/domains/manage) and add a new domain.

![](2024-09-08-19-12-14.png)

Set up an "alias domain," which involves a verification step where you need to update your DNS records. Otherwise, you may have to do the following steps manually.

![](2024-09-08-19-04-47.png)

## Domain Verification

If you're using Cloudflare as your DNS manager, Google will automatically recognize it and add the necessary DNS records.

![](2024-09-08-19-06-15.png)

![](2024-09-08-19-07-10.png)

Then, wait for domain verification to complete. It should be fast.

![](2024-09-08-19-07-35.png)

## Activating Gmail

![](2024-09-08-19-11-38.png)

![](2024-09-08-19-12-59.png)

Once again, Cloudflare makes it easy and automatic. Otherwise, this may involve manual steps if Google is not integrated with your DNS provider.

![](2024-09-08-19-14-04.png)

![](2024-09-08-19-15-06.png)

## Adding a Catch-All Email

I set up a catch-all email so that any email sent to `<anything>@pocodex.dev` is routed to `ben@pocodex.dev` if the specific email address doesn’t exist. This is optional, but you might want to consider what happens to unrecognized email addresses in your setup.

[This Google help article](https://apps.google.com/supportwidget/articlehome) covers it, but here it is below too:

I like to go to [Default Routing](https://admin.google.com/ac/apps/gmail/defaultrouting) and add a rule:

![](2024-09-08-19-21-45.png)

Use a regex to match the entire domain like `@pocodex\.dev$`. I also like to prepend `[CATCHALL] - ` to the subject so I know that it wasn't sent to my "real" address.

![](2024-09-08-19-25-59.png)

Redirect the emails to your "real" email address:

![](2024-09-08-19-25-14.png)

Finally, make sure you only perform this on unrecognized email addresses.

![](2024-09-08-19-24-55.png)

![](2024-09-08-19-51-48.png)

## Test Your Email Setup

Send an email to yourself using the new domain to ensure that everything is working correctly.

You may need to wait a bit for the MX records to propagate. Just because Google says everything is verified doesn't mean the Internet at large has received the memo.

![](2024-09-08-19-39-27.png)

If you want to be extra sure, try sending from a completely different email provider like Proton or AOL.

Once you receive messages, you're all set!

## Add a Sender Account to Gmail

Sometimes you might want to send email FROM your domain, such as replies or customer messages. To do that, go to your user settings in Gmail and add an account:

![](2024-09-08-19-56-56.png)

![](2024-09-08-19-57-35.png)
