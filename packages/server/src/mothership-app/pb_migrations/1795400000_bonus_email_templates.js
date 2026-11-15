/// <reference path="../pb_data/types.d.ts" />
// Loyalty bonus emails (copy by Ben, 2026-11-14). Editable in the admin (message_templates); a rerun keeps edits.
// Vars: {$CURRENT} bonus now, {$NEXT} "On your Jan 14, 2027 renewal" or "You're at the max", {$MAX} 5,
// {$DATE} the date the next bonus lands, {$ENDS} when a cancelled sub ends, {$DEADLINE} 30 days after it ended,
// {$RESUME_URL} one-click resume, {$PRICING_URL} pricing.
const DISCORD = '<a href="https://discord.gg/nVTxCMEcGT">Discord</a>'
const SIGN = "<p>~b<br>Ben Allfree, Cap'n</p>"
const HELP = `<p>If you have any questions, just reply and we can figure it out together. The community is super helpful and I'm always on ${DISCORD}.</p>`
const PARTY = (them) =>
  `<p>So what are you going to do with ${them}? A staging server? A brand new project? Inquiring minds want to know. The community is super helpful and I'm always on ${DISCORD}, so jump on and tell us.</p>`
const SORRY = `<p>If something wasn't right, just reply and we can figure it out together. The community is super helpful and I'm always on ${DISCORD}.</p>`
const STATUS = '<p>Current: {$CURRENT}<br>Next one: {$NEXT}<br>Max: {$MAX}</p>'

const TEMPLATES = {
  bonus_welcome: {
    subject: 'Your first bonus instance arrives {$DATE}',
    body: [
      '<p>Hey, thanks for subscribing!</p>',
      '<p>Just so you know, you get free bonus instances for supporting the project. Your first bonus instance will land on {$DATE} when your sub renews.</p>',
      HELP,
      SIGN,
    ],
  },
  bonus_first_earned: {
    subject: 'You just earned your first bonus instance!',
    body: [
      '<p>Hey,</p>',
      "<p>Your sub just renewed, and that means you earned your first bonus instance. It's yours, free, for supporting the project. Thank you!</p>",
      PARTY('it'),
      '<p>Next one: {$NEXT}</p>',
      SIGN,
    ],
  },
  bonus_earned: {
    subject: 'You just earned another bonus instance!',
    body: [
      '<p>Hey,</p>',
      '<p>Your sub just renewed, and you earned another bonus instance. Thanks for supporting the project!</p>',
      STATUS,
      HELP,
      SIGN,
    ],
  },
  bonus_progress: {
    subject: 'How to keep your bonus instances',
    body: [
      '<p>Hey, just a heads up that your subscription renewed and you got another credit toward a bonus instance.</p>',
      STATUS,
      HELP,
      SIGN,
    ],
  },
  bonus_welcome_annual: {
    subject: 'You just got 5 bonus instances!',
    body: [
      '<p>Hey, thanks for going annual!</p>',
      '<p>Just so you know, you get free bonus instances for supporting the project, and annual gets the max right away: 5 bonus instances, yours as long as your sub stays active.</p>',
      PARTY('them'),
      SIGN,
    ],
  },
  bonus_welcome_lifetime: {
    subject: 'You just got 5 bonus instances!',
    body: [
      '<p>Hey, thanks for going lifetime!</p>',
      '<p>Just so you know, you get free bonus instances for supporting the project, and lifetime gets the max: 5 bonus instances, yours for good.</p>',
      PARTY('them'),
      SIGN,
    ],
  },
  bonus_cancelled_none: {
    subject: 'Sorry to see you go',
    body: [
      '<p>Hey,</p>',
      '<p>Your subscription is cancelled, and it stays active until {$ENDS}.</p>',
      `<p>Just so you know, you get free bonus instances for supporting the project. Your first bonus instance lands on {$ENDS} if your sub renews. <a href="{$RESUME_URL}">Resume your subscription</a> and it's yours.</p>`,
      SORRY,
      SIGN,
    ],
  },
  bonus_cancelled_earning: {
    subject: 'Sorry to see you go',
    body: [
      '<p>Hey,</p>',
      '<p>Your subscription is cancelled, and it stays active until {$ENDS}.</p>',
      '<p>Just so you know, your {$CURRENT} bonus instances go away when your sub ends, and your next one was coming {$NEXT}. <a href="{$RESUME_URL}">Resume your subscription</a> before {$ENDS} and you keep them all.</p>',
      SORRY,
      SIGN,
    ],
  },
  bonus_cancelled_maxed: {
    subject: 'Sorry to see you go',
    body: [
      '<p>Hey,</p>',
      '<p>Your subscription is cancelled, and it stays active until {$ENDS}.</p>',
      '<p>Just so you know, you maxed out at 5 bonus instances, and they go away when your sub ends. <a href="{$RESUME_URL}">Resume your subscription</a> before {$ENDS} and you keep all 5.</p>',
      SORRY,
      SIGN,
    ],
  },
  bonus_last_chance_none: {
    subject: 'Your PocketHost subscription has ended',
    body: [
      '<p>Hey,</p>',
      "<p>Your subscription has ended, so your instances have stopped running. Nothing is deleted. They're still here, just as you left them, and they start right back up when you resubscribe.</p>",
      `<p>Just so you know, you get free bonus instances for supporting the project. <a href="{$PRICING_URL}">Resubscribe</a> whenever you're ready, and your first bonus instance lands after your first month.</p>`,
      SORRY,
      SIGN,
    ],
  },
  bonus_last_chance_earning: {
    subject: 'Last chance to keep your bonus instances',
    body: [
      '<p>Hey,</p>',
      "<p>Your subscription has ended. Just so you know, I'm holding your {$CURRENT} bonus instances for you until {$DEADLINE}.</p>",
      `<p><a href="{$PRICING_URL}">Resubscribe</a> by then and they come right back, and you pick up earning where you left off. After {$DEADLINE} they're gone and a new sub starts from zero.</p>`,
      SORRY,
      SIGN,
    ],
  },
  bonus_last_chance_maxed: {
    subject: 'Last chance to keep your 5 bonus instances',
    body: [
      '<p>Hey,</p>',
      "<p>Your subscription has ended. Just so you know, you'd maxed out at 5 bonus instances, and I'm holding all 5 for you until {$DEADLINE}.</p>",
      `<p><a href="{$PRICING_URL}">Resubscribe</a> by then and all 5 come right back. After {$DEADLINE} they're gone and a new sub starts from zero.</p>`,
      SORRY,
      SIGN,
    ],
  },
}

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('message_templates')
    for (const [slug, t] of Object.entries(TEMPLATES)) {
      try {
        app.findFirstRecordByData('message_templates', 'slug', slug)
        continue // keep admin edits
      } catch {}
      app.save(new Record(collection, { slug, subject: t.subject, body_html: t.body.join('\n') }))
    }
  },
  (app) => {
    for (const slug of Object.keys(TEMPLATES)) {
      try {
        app.delete(app.findFirstRecordByData('message_templates', 'slug', slug))
      } catch {
        // already removed
      }
    }
  }
)
