/// <reference path="../types/types.d.ts" />

routerAdd(
  'GET',
  '/api/stats',
  (c) => {
    const result = new DynamicModel({
      total_flounder_subscribers: 0,
    })

    $app
      .dao()
      .db()
      .select('total_flounder_subscribers')
      .from('stats')
      .one(result)

    return c.json(200, result)
  } /* optional middlewares */,
)
