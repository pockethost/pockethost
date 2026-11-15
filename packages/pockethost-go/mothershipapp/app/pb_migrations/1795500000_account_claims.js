/// <reference path="../pb_data/types.d.ts" />
// Pay-first signup (common/billing/accountClaim.ts): the LS webhook creates the account from the order email and the
// buyer claims it. users.claim_open marks an account made by checkout and not yet claimed; users.claim_hash is the
// sha256 of the browser claim token. Both hidden from the API.
// Templates (editable in the admin; a rerun keeps edits). Sent straight to the billing email, even though the account
// is unverified. Vars: {$CLAIM_URL} claim link (about 7 days), {$LOGIN_URL} login, {$ACCOUNT_EMAIL} masked account email.
const SIGN = "<p>~b<br>Ben Allfree, Cap'n</p>"
const DISCORD = '<a href="https://discord.gg/nVTxCMEcGT">Discord</a>'

const TEMPLATES = {
  account_claim: {
    subject: 'Your PocketHost account is ready',
    body: [
      '<p>Hey, thanks for subscribing!</p>',
      '<p>Your payment went through and your PocketHost account is ready. Finish setting it up here. You can use a different email for your account if this one is just for billing.</p>',
      '<p><a href="{$CLAIM_URL}">Set up your account</a></p>',
      '<p>This link works for 7 days. If you already set up your account, just <a href="{$LOGIN_URL}">log in</a>.</p>',
      `<p>If you have any questions, just reply and we can figure it out together. I'm always on ${DISCORD}.</p>`,
      SIGN,
    ],
  },
  account_purchase_added: {
    subject: 'Your purchase was added to your PocketHost account',
    body: [
      '<p>Hey, thanks for your purchase!</p>',
      '<p>It was added to your existing PocketHost account ({$ACCOUNT_EMAIL}). <a href="{$LOGIN_URL}">Log in</a> to create your instances.</p>',
      `<p>If that's not the account you meant, just reply and we'll sort it out. I'm always on ${DISCORD}.</p>`,
      SIGN,
    ],
  },
}

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(
      new Field({
        hidden: true,
        id: 'clmopen1',
        name: 'claim_open',
        presentable: false,
        required: false,
        system: false,
        type: 'bool',
      })
    )
    users.fields.add(
      new Field({
        autogeneratePattern: '',
        hidden: true,
        id: 'clmhash1',
        max: 0,
        min: 0,
        name: 'claim_hash',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      })
    )
    app.save(users)

    const templates = app.findCollectionByNameOrId('message_templates')
    for (const [slug, t] of Object.entries(TEMPLATES)) {
      try {
        app.findFirstRecordByData('message_templates', 'slug', slug)
        continue // keep admin edits
      } catch {}
      app.save(new Record(templates, { slug, subject: t.subject, body_html: t.body.join('\n') }))
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeById('clmopen1')
    users.fields.removeById('clmhash1')
    app.save(users)
    for (const slug of Object.keys(TEMPLATES)) {
      try {
        app.delete(app.findFirstRecordByData('message_templates', 'slug', slug))
      } catch {
        // already removed
      }
    }
  }
)
