const { extendedRules } = require('./naming-convention')

module.exports = {
  extends: ['eslint-config-yceffort/typescript'],
  rules: {
    '@typescript-eslint/naming-convention': extendedRules,
    'react/react-in-jsx-scope': 'off',
  },
}
