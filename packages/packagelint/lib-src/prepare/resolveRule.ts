import {
  PackagelintRuleName,
  PackagelintRuleDefinition,
  PackagelintRulesetDefinition,
} from '@packagelint/types';

function resolveRule(
  name: PackagelintRuleName,
): PackagelintRuleDefinition | PackagelintRulesetDefinition {
  // @TODO: Implement this properly
  // @TODO: Validation

  const [packageName, ruleOrRulesetName] = name.split(':');

  if (!packageName || !ruleOrRulesetName) {
    throw new Error(`Rule "${name}" is not a valid rule name`);
  }

  const { packagelintRules } = require(packageName);

  if (!packagelintRules) {
    throw new Error(`Package "${packageName}" does not provide any packagelint rules`);
  }
  if (typeof packagelintRules !== 'object') {
    throw new Error(`Package "${packageName}" does not provide any valid packagelint rules`);
  }
  if (!Object.prototype.hasOwnProperty.call(packagelintRules, ruleOrRulesetName)) {
    throw new Error(`Package "${packageName}" does not provide rule "${ruleOrRulesetName}"`);
  }

  return packagelintRules[ruleOrRulesetName];
}

export { resolveRule };
