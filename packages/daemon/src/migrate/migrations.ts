import { Collection, SchemaField } from 'pocketbase'

export type Collection_Serialized = Omit<Partial<Collection>, 'schema'> & {
  schema: Array<Partial<SchemaField>>
}

export const collections_001: Collection_Serialized[] = [
  {
    id: 'etae8tuiaxl6xfv',
    name: 'instances',
    type: 'base',
    system: false,
    schema: [
      {
        id: 'qdtuuld1',
        name: 'subdomain',
        type: 'text',
        system: false,
        required: true,
        unique: true,
        options: {
          min: null,
          max: 50,
          pattern: '^[a-z][\\-a-z]+$',
        },
      },
      {
        id: 'rbj14krn',
        name: 'uid',
        type: 'relation',
        system: false,
        required: true,
        unique: false,
        options: {
          maxSelect: 1,
          collectionId: 'systemprofiles0',
          cascadeDelete: false,
        },
      },
      {
        id: 'c2y74d7h',
        name: 'status',
        type: 'text',
        system: false,
        required: true,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: '',
        },
      },
      {
        id: 'yxby5r6b',
        name: 'platform',
        type: 'text',
        system: false,
        required: true,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: '',
        },
      },
      {
        id: '4ydffkv3',
        name: 'version',
        type: 'text',
        system: false,
        required: true,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: '',
        },
      },
    ],
    listRule: 'uid=@request.auth.id',
    viewRule: 'uid = @request.auth.id',
    createRule: "uid = @request.auth.id && (status = 'idle' || status = '')",
    updateRule: null,
    deleteRule: null,
    options: {},
  },
  {
    id: 'systemprofiles0',
    name: 'users',
    type: 'auth',
    system: false,
    schema: [
      {
        id: 'pbfieldname',
        name: 'name',
        type: 'text',
        system: false,
        required: false,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: '',
        },
      },
      {
        id: 'pbfieldavatar',
        name: 'avatar',
        type: 'file',
        system: false,
        required: false,
        unique: false,
        options: {
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: [
            'image/jpg',
            'image/jpeg',
            'image/png',
            'image/svg+xml',
            'image/gif',
          ],
          thumbs: null,
        },
      },
    ],
    listRule: 'id = @request.auth.id',
    viewRule: 'id = @request.auth.id',
    createRule: '',
    updateRule: 'id = @request.auth.id',
    deleteRule: null,
    options: {
      allowEmailAuth: true,
      allowOAuth2Auth: true,
      allowUsernameAuth: false,
      exceptEmailDomains: null,
      manageRule: null,
      minPasswordLength: 8,
      onlyEmailDomains: null,
      requireEmail: true,
    },
  },
]
