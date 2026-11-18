/// <reference path="../pb_data/types.d.ts" />
// bonus_cancelled_earning said "your next one was coming {$NEXT}", and {$NEXT} is capitalized ("On your <date>
// renewal") for the "Next one:" label lines, so the sentence read "coming On your ...". Use {$DATE} there instead.
// Only touches the record if it still has the old phrase, so admin edits are kept.
const OLD = 'your next one was coming {$NEXT}.'
const NEW = 'your next one was coming on your {$DATE} renewal.'
migrate(
  (app) => {
    let rec
    try {
      rec = app.findFirstRecordByData('message_templates', 'slug', 'bonus_cancelled_earning')
    } catch {
      return
    }
    const body = rec.getString('body_html')
    if (!body.includes(OLD)) return
    rec.set('body_html', body.replace(OLD, NEW))
    app.save(rec)
  },
  (app) => {}
)
