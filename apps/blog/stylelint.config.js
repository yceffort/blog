/** @type {import('stylelint').Config} */
const config = {
  extends: ['@naverpay/stylelint-config'],
  defaultSeverity: 'error',
  // Frozen pre-migration output: formatting it would rewrite the test reference.
  ignoreFiles: ['tests/styles/baseline.css'],
  rules: {},
}

export default config
