import { PackagelintRuleDefinition, PackagelintValidationContext } from '@packagelint/types';

export type AlwaysFailRuleOptions = {};

const alwaysFailRuleDefinition: PackagelintRuleDefinition<AlwaysFailRuleOptions> = {
  name: 'always-fail',
  docs: {
    description: 'This rule will always fail.',
    url: 'https://github.com/spautz/packagelint',
  },
  defaultErrorLevel: 'error',
  defaultOptions: {},
  messages: {
    alwaysFail: 'This rule will always fail',
  },
  doValidation: alwaysFailRuleValidationFn,
};

function alwaysFailRuleValidationFn(
  _options: AlwaysFailRuleOptions,
  packageContext: PackagelintValidationContext,
) {
  return packageContext.createErrorToReturn('alwaysFail');
}

export { alwaysFailRuleDefinition, alwaysFailRuleValidationFn };
