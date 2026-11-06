/**
 * Mothership `message_templates` row for the archive email. Placeholders use the mothership's `{$name}` syntax and must
 * be lowercase (see interpolateString). Created on the first `--apply` run if missing; edit it in the mothership admin
 * afterwards.
 */
export const ARCHIVE_EMAIL_TEMPLATE = {
  slug: `instance-archived`,
  subject: `Your PocketHost instance {$subdomain} has been archived`,
  body_html: `<p>Hi,</p>
<p>Your PocketHost instance <strong>{$subdomain}</strong> hasn't been used in over 12 months, so we've archived it to free up space.</p>
<p><a href="{$link}">Download your archive</a> ({$size}, a <code>.tar.zst</code> of the instance folder).</p>
<p>The link works until <strong>{$deletedate}</strong>. After that, the archive is permanently deleted.</p>
<p>Want it restored instead of downloaded? Just reply to this email before {$deletedate}.</p>
<p>— PocketHost</p>`,
}
