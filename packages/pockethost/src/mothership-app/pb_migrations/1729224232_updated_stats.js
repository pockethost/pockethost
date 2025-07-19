/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('buq519uv711078p')

    collection.options = {
      query:
        "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' and users.subscription_interval='month' THEN users.id END) AS total_pro_month_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' and users.subscription_interval='year' THEN users.id END) AS total_pro_year_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'founder' THEN users.id END) AS total_founder_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'flounder' THEN users.id END) AS total_flounder_subscribers,\n  \n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-1 hour') THEN users.id END) AS new_users_last_hour,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-24 hours') THEN users.id END) AS new_users_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-7 days') THEN users.id END) AS new_users_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-30 days') THEN users.id END) AS new_users_last_30_days,\n  \n    COUNT(DISTINCT instances.id ) AS total_instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS total_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS total_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS total_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS total_instances_last_30_days,\n  \n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-1 hour') THEN instances.id END) AS new_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-24 hours') THEN instances.id END) AS new_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-7 days') THEN instances.id END) AS new_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-30 days') THEN instances.id END) AS new_instances_last_30_days\n  \nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n",
    }

    // remove
    collection.schema.removeField('y2weqof7')

    // remove
    collection.schema.removeField('sr33ovja')

    // remove
    collection.schema.removeField('mq2acp0p')

    // remove
    collection.schema.removeField('nmjyqh18')

    // remove
    collection.schema.removeField('l5wcacsc')

    // remove
    collection.schema.removeField('82xa2ihs')

    // remove
    collection.schema.removeField('8hjq7s97')

    // remove
    collection.schema.removeField('rw5nkivi')

    // remove
    collection.schema.removeField('vtqekl4b')

    // remove
    collection.schema.removeField('7ewlybyg')

    // remove
    collection.schema.removeField('dr9gn7nc')

    // remove
    collection.schema.removeField('uaq20ew3')

    // remove
    collection.schema.removeField('4vlfklku')

    // remove
    collection.schema.removeField('1dxhhnnv')

    // remove
    collection.schema.removeField('gdnae6zl')

    // remove
    collection.schema.removeField('1vqziild')

    // remove
    collection.schema.removeField('tpcbbfjp')

    // remove
    collection.schema.removeField('eviqvobv')

    // remove
    collection.schema.removeField('a2ip71w4')

    // remove
    collection.schema.removeField('dhiuhaid')

    // remove
    collection.schema.removeField('jslxkgsc')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'jnfw9k3i',
        name: 'total_users',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'o4i8nwpy',
        name: 'total_free_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'g1axjvpo',
        name: 'total_pro_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'hdvpvmyz',
        name: 'total_pro_month_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'fbllwtxz',
        name: 'total_pro_year_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '4q844qsv',
        name: 'total_founder_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'qqrjtdna',
        name: 'total_flounder_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'nr08d14y',
        name: 'new_users_last_hour',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'kwr3wpeh',
        name: 'new_users_last_24_hours',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'ml2w4v5h',
        name: 'new_users_last_7_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'dbao78l3',
        name: 'new_users_last_30_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'qis0qckm',
        name: 'total_instances',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'pygkmabh',
        name: 'total_instances_last_hour',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'w8y2m3ra',
        name: 'total_instances_last_24_hours',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'ppfamxbk',
        name: 'total_instances_last_7_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'vvdlbqyy',
        name: 'total_instances_last_30_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'h0ehflrf',
        name: 'new_instances_last_hour',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'yp2yookd',
        name: 'new_instances_last_24_hours',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 's8ingt5t',
        name: 'new_instances_last_7_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'ojtxbkzj',
        name: 'new_instances_last_30_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    return dao.saveCollection(collection)
  },
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('buq519uv711078p')

    collection.options = {
      query:
        "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' and users.subscription_interval='month' THEN users.id END) AS total_pro_month_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' and users.subscription_interval='year' THEN users.id END) AS total_pro_year_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'founder' THEN users.id END) AS total_founder_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'flounder' THEN users.id END) AS total_flounder_subscribers,\n  \n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-1 hour') THEN users.id END) AS new_users_last_hour,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-24 hours') THEN users.id END) AS new_users_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-7 days') THEN users.id END) AS new_users_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-30 days') THEN users.id END) AS new_users_last_30_days,\n  \n    COUNT(DISTINCT instances.id ) AS total_instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS total_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS total_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS total_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS total_instances_last_30_days,\n  \n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-1 hour') THEN instances.id END) AS new_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-24 hours') THEN instances.id END) AS new_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-7 days') THEN instances.id END) AS new_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-30 days') THEN instances.id END) AS new_instances_last_30_days\n  \nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n",
    }

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'y2weqof7',
        name: 'total_users',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'sr33ovja',
        name: 'total_legacy_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'mq2acp0p',
        name: 'total_free_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'nmjyqh18',
        name: 'total_pro_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'l5wcacsc',
        name: 'total_pro_month_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '82xa2ihs',
        name: 'total_pro_year_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '8hjq7s97',
        name: 'total_founder_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'rw5nkivi',
        name: 'total_flounder_subscribers',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'vtqekl4b',
        name: 'new_users_last_hour',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '7ewlybyg',
        name: 'new_users_last_24_hours',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'dr9gn7nc',
        name: 'new_users_last_7_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'uaq20ew3',
        name: 'new_users_last_30_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '4vlfklku',
        name: 'total_instances',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '1dxhhnnv',
        name: 'total_instances_last_hour',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'gdnae6zl',
        name: 'total_instances_last_24_hours',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '1vqziild',
        name: 'total_instances_last_7_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'tpcbbfjp',
        name: 'total_instances_last_30_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'eviqvobv',
        name: 'new_instances_last_hour',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'a2ip71w4',
        name: 'new_instances_last_24_hours',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'dhiuhaid',
        name: 'new_instances_last_7_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'jslxkgsc',
        name: 'new_instances_last_30_days',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          noDecimal: false,
        },
      })
    )

    // remove
    collection.schema.removeField('jnfw9k3i')

    // remove
    collection.schema.removeField('o4i8nwpy')

    // remove
    collection.schema.removeField('g1axjvpo')

    // remove
    collection.schema.removeField('hdvpvmyz')

    // remove
    collection.schema.removeField('fbllwtxz')

    // remove
    collection.schema.removeField('4q844qsv')

    // remove
    collection.schema.removeField('qqrjtdna')

    // remove
    collection.schema.removeField('nr08d14y')

    // remove
    collection.schema.removeField('kwr3wpeh')

    // remove
    collection.schema.removeField('ml2w4v5h')

    // remove
    collection.schema.removeField('dbao78l3')

    // remove
    collection.schema.removeField('qis0qckm')

    // remove
    collection.schema.removeField('pygkmabh')

    // remove
    collection.schema.removeField('w8y2m3ra')

    // remove
    collection.schema.removeField('ppfamxbk')

    // remove
    collection.schema.removeField('vvdlbqyy')

    // remove
    collection.schema.removeField('h0ehflrf')

    // remove
    collection.schema.removeField('yp2yookd')

    // remove
    collection.schema.removeField('s8ingt5t')

    // remove
    collection.schema.removeField('ojtxbkzj')

    return dao.saveCollection(collection)
  }
)
