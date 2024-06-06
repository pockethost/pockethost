module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'root',
        'dashboard',
        'lander',
        'superadmin',
        'pockethost',
        'common',
        'ga',
      ],
    ],
    'scope-empty': [2, 'never'],
  },
}
