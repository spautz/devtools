import {
  PackagelintException_Import,
  PackagelintException_UserConfig,
  PackagelintExportedRules,
  PackagelintRuleDefinition,
  PackagelintRuleName,
  PackagelintRulesetDefinition,
} from '@packagelint/types';

import { resolveImportedValue } from '../util';

async function resolveRuleOrRuleset(
  name: PackagelintRuleName,
): Promise<PackagelintRuleDefinition | PackagelintRulesetDefinition> {
  // @TODO: Implement this properly
  // @TODO: Validation

  const [packageName, ruleOrRulesetName] = name.split(':');

  if (!packageName || !ruleOrRulesetName) {
    // @FIXME: Need to handle custom rule names: aliases of aliases are currently broken!
    throw new PackagelintException_UserConfig(`Rule "${name}" is not a valid rule name`);
  }

  const packageExports = await resolveImportedValue<PackagelintExportedRules>(require(packageName));
  const packagelintRules = await resolveImportedValue<PackagelintExportedRules['packagelintRules']>(
    packageExports.packagelintRules,
  );

  if (!packagelintRules) {
    throw new PackagelintException_Import(
      `Package "${packageName}" does not provide any packagelint rules`,
    );
  }
  if (typeof packagelintRules !== 'object') {
    throw new PackagelintException_Import(
      `Package "${packageName}" does not provide any valid packagelint rules`,
    );
  }
  if (!Object.prototype.hasOwnProperty.call(packagelintRules, ruleOrRulesetName)) {
    throw new PackagelintException_Import(
      `Package "${packageName}" does not provide rule "${ruleOrRulesetName}"`,
    );
  }

  return packagelintRules[ruleOrRulesetName];
}

export { resolveRuleOrRuleset };
