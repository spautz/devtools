module.exports = {
  failOnErrorLevel: 'warning',
  rules: [
    // `@packagelint/core` defines the rules, but rules are disabled by default:
    // each `@packagelint/presets` ruleset enables a default set of core rules.
    // '@packagelint/presets:library',

    // Update the `nvmrc` rule to require at least Node 14, instead of the default.
    // This could also be written like this, if you prefer shorthand:
    //  ['@packagelint/core:nvmrc', { minVersion: '14' }],
    {
      name: '@packagelint/core:nvmrc',
      options: {
        version: '^14',
      },
    },

    // Update the `npmrc` rule to require `save-exact=true`.
    // You would use a similar approach if your organization requires a specific `registry` to be set in .npmrc
    // {
    //   name: '@packagelint/core:npmrc',
    //   errorLevel: 'warning',
    //   options: {
    //     requireValues: {
    //       'save-exact': 'true',
    //     },
    //   },
    // },
  ],
};
