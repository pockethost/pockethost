/**
 * Mothership `message_templates` rows for the over-limit sweep. Placeholders use the mothership's `{$name}` syntax and
 * must be lowercase. Created on the first `--apply` run if missing; edit them in the mothership admin afterwards.
 * `previous` lists bodies this code shipped before: a row still holding one of them was never edited, so the sweep
 * updates it to the current copy. Rows edited in the admin are left alone.
 */
export const OVER_LIMIT_WARNING_TEMPLATE = {
  slug: `instances-over-limit-warning`,
  subject: `Some of your PocketHost instances will be powered off on {$deadline}`,
  body_html: `<p>Hi,</p>
<p>Your PocketHost plan includes <strong>{$allowance}</strong>, and <strong>{$running}</strong> are running right now. This usually happens when the number of instances on your plan goes down, or when one of your subscriptions ends.</p>
<p>On <strong>{$deadline}</strong>, we'll power off the ones you've used least recently:</p>
<p>{$instances}</p>
<p>To keep them running, <a href="{$upgradelink}">add instances to your plan</a>. Or, in your <a href="{$dashboardlink}">dashboard</a>, power off or delete the instances you don't need, and the ones you choose will keep running.</p>
<p>Nothing is deleted. A powered-off instance keeps all of its data, and you can power it back on whenever your plan has room.</p>
<p>— PocketHost</p>`,
  previous: [
    `<p>Hi,</p>
<p>Your PocketHost plan includes <strong>{$allowance}</strong>, and <strong>{$running}</strong> are running right now. This usually happens when a subscription ends or its quantity goes down.</p>
<p>On <strong>{$deadline}</strong>, we'll power off the ones you've used least recently:</p>
<p>{$instances}</p>
<p>To keep them running, <a href="{$upgradelink}">add instances to your plan</a>. Or, in your <a href="{$dashboardlink}">dashboard</a>, power off or delete the instances you don't need, and the ones you choose will keep running.</p>
<p>Nothing is deleted. A powered-off instance keeps all of its data, and you can power it back on whenever your plan has room.</p>
<p>— PocketHost</p>`,
  ],
}

export const OVER_LIMIT_POWERED_OFF_TEMPLATE = {
  slug: `instances-over-limit-powered-off`,
  subject: `We powered off {$count} of your PocketHost instances`,
  body_html: `<p>Hi,</p>
<p>Your PocketHost plan includes <strong>{$allowance}</strong>, and more than that were running, so we powered off the ones you've used least recently:</p>
<p>{$instances}</p>
<p>Nothing was deleted. They keep all of their data, and you can power them back on in your <a href="{$dashboardlink}">dashboard</a> whenever your plan has room: <a href="{$upgradelink}">add instances to your plan</a>, or power off others you don't need.</p>
<p>— PocketHost</p>`,
}

export const SUBSCRIPTION_LAPSED_TEMPLATE = {
  slug: `instances-subscription-lapsed`,
  subject: `Your PocketHost instances have stopped`,
  body_html: `<p>Hi,</p>
<p>Your PocketHost subscription has ended, so your plan doesn't include any instances now and these have stopped running:</p>
<p>{$instances}</p>
<p>Nothing was deleted. Each one keeps all of its data and settings. <a href="{$upgradelink}">Add instances to your plan</a> and they'll start again right away, just as you left them.</p>
<p>— PocketHost</p>`,
}
