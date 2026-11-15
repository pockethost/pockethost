/// <reference path="../pb_data/types.d.ts" />
// Loyalty bonus emails (copy by Ben, 2026-11-14). Editable in the admin (message_templates); a rerun keeps edits.
// Vars: {$CURRENT} bonus now, {$NEXT} "On your Jan 14, 2027 renewal" or "You're at the max", {$MAX} 5,
// {$DATE} the date the next bonus lands.
const DISCORD = '<a href="https://discord.gg/nVTxCMEcGT">Discord</a>'
const SIGN = "<p>~b<br>Ben Allfree, Cap'n</p>"
const HELP = `<p>If you have any questions, just reply and we can figure it out together. The community is super helpful and I'm always on ${DISCORD}.</p>`
const PARTY = (them) =>
  `<p>So what are you going to do with ${them}? A staging server? A brand new project? Inquiring minds want to know. The community is super helpful and I'm always on ${DISCORD}, so jump on and tell us.</p>`
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
