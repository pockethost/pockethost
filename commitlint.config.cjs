module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'root',
        'pockethost',
        'console-logger',
        'auto-admin',
        'launcher-spawn',
        'cfr-logger',
        `template`,
        `maildev`,
        'ftp-server',
        'multi',
      ],
    ],
    'scope-empty': [2, 'never'],
  },
}
