/// <reference path="../pb_data/types.d.ts" />
// Deploys are not recorded (2026-11-20): the edges stopped writing `deploys` and nothing read it, so the collection
// and its rows go. The down migration doesn't bring it back: the rows are gone either way.
migrate(
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('deploys'))
    } catch (e) {
      // already gone
    }
  },
  (app) => {}
)
