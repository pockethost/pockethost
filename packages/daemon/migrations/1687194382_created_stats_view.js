migrate(
  (db) => {
    const collection = new Collection({
      id: 'se6fljwhhc03k4q',
      name: 'statsView',
      type: 'view',
      system: false,
      schema: [
        {
          id: 'bg2ll4o3',
          name: 'daysUp',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'xhpxeosn',
          name: 'userCount',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'fy3ip5rd',
          name: 'runningInstanceCount',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'lslpll2e',
          name: 'instanceCount',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'vnckdv2z',
          name: 'instanceCount1Hour',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'k2b1hlow',
          name: 'instanceCount1Day',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: '2gxiv0ms',
          name: 'instanceCount7Day',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'gyx3ho4m',
          name: 'instanceCount30Day',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: '6b6e6jrj',
          name: 'invocationCount',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'ry4re1ml',
          name: 'invocationCount1Hour',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'knsloc4s',
          name: 'invocationCount1Day',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'gqkawb2y',
          name: 'invocationCount7Day',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'csyviigl',
          name: 'invocationCount30Day',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'eannyk2g',
          name: 'invocationSeconds',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'upv0v8xv',
          name: 'invocationSeconds1Hour',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'xm0tjcte',
          name: 'invocationSeconds1Day',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: '4xkbzvrb',
          name: 'invocationSeconds7Day',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
        {
          id: 'z5cjouey',
          name: 'invocationSeconds30Day',
          type: 'json',
          system: false,
          required: false,
          options: {},
        },
      ],
      indexes: [],
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      options: {
        query:
          "select\n  (ROW_NUMBER() OVER()) as id, \n  (select  julianday('now') - julianday( '2023-06-01' )) as daysUp,\n  (select count(*) from users where verified=TRUE) as userCount,\n  (select count(*) from instances where status='running') as runningInstanceCount,\n  (select count(distinct instanceId) from invocations ) as instanceCount,\n  (select count(distinct instanceId) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 hour'))) as instanceCount1Hour,\n  (select count(distinct instanceId) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 day'))) as instanceCount1Day,\n    (select count(distinct instanceId) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-7 day'))) as instanceCount7Day,\n    (select count(distinct instanceId) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-30 day'))) as instanceCount30Day,\n  (select count(*) from invocations) as invocationCount,\n  (select count(*) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 hour'))) as invocationCount1Hour,\n(select count(*) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 day'))) as invocationCount1Day,\n(select count(*) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-7 day'))) as invocationCount7Day,\n(select count(*) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-30 day'))) as invocationCount30Day,\n  (select sum(totalSeconds) from invocations) as invocationSeconds,\n  (select sum(totalSeconds) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 hour'))) as invocationSeconds1Hour,\n  (select sum(totalSeconds) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-1 day'))) as invocationSeconds1Day,\n  (select sum(totalSeconds) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-7 day'))) as invocationSeconds7Day,\n  (select sum(totalSeconds) from invocations where created > STRFTIME('%Y-%m-%d %H:%fZ', datetime('now','-30 day'))) as invocationSeconds30Day\n\n\n\n\n\n\n\n\n",
      },
    })

    return Dao(db).saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('se6fljwhhc03k4q')

    return dao.deleteCollection(collection)
  }
)
