/// <reference path="../pb_data/types.d.ts" />
migrate(
  (db) => {
    const dao = new Dao(db)
    const collection = dao.findCollectionByNameOrId('buq519uv711078p')

    collection.options = {
      query:
        "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    (select value from settings where name='founders-edition-count') as founder_slots_remaining, \n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'founder' THEN users.id END) AS total_founder_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'flounder' THEN users.id END) AS total_flounder_subscribers,\n  \n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-1 hour') THEN users.id END) AS new_users_last_hour,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-24 hours') THEN users.id END) AS new_users_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-7 days') THEN users.id END) AS new_users_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-30 days') THEN users.id END) AS new_users_last_30_days,\n  \n    COUNT(DISTINCT instances.id ) AS total_instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS total_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS total_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS total_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS total_instances_last_30_days,\n  \n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-1 hour') THEN instances.id END) AS new_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-24 hours') THEN instances.id END) AS new_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-7 days') THEN instances.id END) AS new_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-30 days') THEN instances.id END) AS new_instances_last_30_days\n  \nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n",
    }

    // remove
    collection.schema.removeField('whnth1ow')

    // remove
    collection.schema.removeField('5r0sudx8')

    // remove
    collection.schema.removeField('rxdzahkw')

    // remove
    collection.schema.removeField('xsxnmdsp')

    // remove
    collection.schema.removeField('hkcphcld')

    // remove
    collection.schema.removeField('0dkdw3r3')

    // remove
    collection.schema.removeField('vjzlrpp5')

    // remove
    collection.schema.removeField('gshholu6')

    // remove
    collection.schema.removeField('7sizvzfh')

    // remove
    collection.schema.removeField('ydwycdml')

    // remove
    collection.schema.removeField('nb60heh5')

    // remove
    collection.schema.removeField('fbwsspvv')

    // remove
    collection.schema.removeField('fvderbxo')

    // remove
    collection.schema.removeField('ca9fm9h6')

    // remove
    collection.schema.removeField('w9yjd8ek')

    // remove
    collection.schema.removeField('8tz3rw8x')

    // remove
    collection.schema.removeField('qyec1qlp')

    // remove
    collection.schema.removeField('iltflfri')

    // remove
    collection.schema.removeField('dn8g2wrp')

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'olfw54w4',
        name: 'founder_slots_remaining',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSize: 1,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '5kccdute',
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
        id: 'qovtyhva',
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
        id: 'dt7icjgm',
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
        id: 'ynly1jnq',
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
        id: '4d4ws31z',
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
        id: '3dchdzeb',
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
        id: 'mfz9gmmo',
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
        id: 'dz7hxxym',
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
        id: 'lggsuk5y',
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
        id: 'amzhaqas',
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
        id: 'eslk4yoy',
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
        id: 'z3ggf7u5',
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
        id: '6krhmk5w',
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
        id: 'g4pt5kc5',
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
        id: 'o2gs4ft7',
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
        id: 'laevotl0',
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
        id: '0z0jw0j6',
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
        id: 'ibwk1qs9',
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
        id: 'xnrffftl',
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
        "SELECT\n  (ROW_NUMBER() OVER()) as id,\n    (select value from settings where name='founders-edition-count') as founder_slots_remaining, \n    COUNT(DISTINCT users.id) AS total_users,\n    COUNT(DISTINCT CASE WHEN users.subscription ='legacy' THEN users.id END) AS total_legacy_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription ='free' THEN users.id END) AS total_free_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'premium' THEN users.id END) AS total_pro_subscribers,\n    COUNT(DISTINCT CASE WHEN users.subscription= 'lifetime' THEN users.id END) AS total_lifetime_subscribers,\n  \n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-1 hour') THEN users.id END) AS new_users_last_hour,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-24 hours') THEN users.id END) AS new_users_last_24_hours,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-7 days') THEN users.id END) AS new_users_last_7_days,\n    COUNT(DISTINCT CASE WHEN users.created > DATETIME('now', '-30 days') THEN users.id END) AS new_users_last_30_days,\n  \n    COUNT(DISTINCT instances.id ) AS total_instances,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-1 hour') THEN instances.id END) AS total_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-24 hours') THEN instances.id END) AS total_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-7 days') THEN instances.id END) AS total_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.updated > DATETIME('now', '-30 days') THEN instances.id END) AS total_instances_last_30_days,\n  \n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-1 hour') THEN instances.id END) AS new_instances_last_hour,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-24 hours') THEN instances.id END) AS new_instances_last_24_hours,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-7 days') THEN instances.id END) AS new_instances_last_7_days,\n    COUNT(DISTINCT CASE WHEN instances.created > DATETIME('now', '-30 days') THEN instances.id END) AS new_instances_last_30_days\n  \nFROM\n    verified_users users\nLEFT JOIN\n    instances ON users.id = instances.uid;\n",
    }

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: 'whnth1ow',
        name: 'founder_slots_remaining',
        type: 'json',
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSize: 1,
        },
      })
    )

    // add
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: '5r0sudx8',
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
        id: 'rxdzahkw',
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
        id: 'xsxnmdsp',
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
        id: 'hkcphcld',
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
        id: '0dkdw3r3',
        name: 'total_lifetime_subscribers',
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
        id: 'vjzlrpp5',
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
        id: 'gshholu6',
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
        id: '7sizvzfh',
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
        id: 'ydwycdml',
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
        id: 'nb60heh5',
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
        id: 'fbwsspvv',
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
        id: 'fvderbxo',
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
        id: 'ca9fm9h6',
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
        id: 'w9yjd8ek',
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
        id: '8tz3rw8x',
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
        id: 'qyec1qlp',
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
        id: 'iltflfri',
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
        id: 'dn8g2wrp',
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
    collection.schema.removeField('olfw54w4')

    // remove
    collection.schema.removeField('5kccdute')

    // remove
    collection.schema.removeField('qovtyhva')

    // remove
    collection.schema.removeField('dt7icjgm')

    // remove
    collection.schema.removeField('ynly1jnq')

    // remove
    collection.schema.removeField('4d4ws31z')

    // remove
    collection.schema.removeField('3dchdzeb')

    // remove
    collection.schema.removeField('mfz9gmmo')

    // remove
    collection.schema.removeField('dz7hxxym')

    // remove
    collection.schema.removeField('lggsuk5y')

    // remove
    collection.schema.removeField('amzhaqas')

    // remove
    collection.schema.removeField('eslk4yoy')

    // remove
    collection.schema.removeField('z3ggf7u5')

    // remove
    collection.schema.removeField('6krhmk5w')

    // remove
    collection.schema.removeField('g4pt5kc5')

    // remove
    collection.schema.removeField('o2gs4ft7')

    // remove
    collection.schema.removeField('laevotl0')

    // remove
    collection.schema.removeField('0z0jw0j6')

    // remove
    collection.schema.removeField('ibwk1qs9')

    // remove
    collection.schema.removeField('xnrffftl')

    return dao.saveCollection(collection)
  }
)
