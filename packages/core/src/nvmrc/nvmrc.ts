import { readFile } from 'fs/promises';
import semver from 'semver';

import { PackagelintRuleDefinition, PackagelintValidationContext } from '../types';

export type NvmrcRuleOptions = {
  fileName: string;
  version: string;
};

const nvmrcRuleDefinition: PackagelintRuleDefinition<NvmrcRuleOptions> = {
  name: '@packagelint/core/nvmrc',
  docs: {
    description: 'require a .nvmrc file',
    url: 'https://github.com/spautz/packagelint',
  },
  defaultOptions: {
    fileName: '.nvmrc',
    version: '>=10',
  },
  messages: {
    fileNotFound: '{{fileName}} not found',
    invalidNvmrc: 'Invalid {{fileName}}: must contain a version number',
    invalidVersion: 'Invalid Node version in {{fileName}}: must match "{{version}}"',
  },
  doValidation: nvmrcRuleValidation,
};

async function nvmrcRuleValidation(
  options: NvmrcRuleOptions,
  packageContext: PackagelintValidationContext,
) {
  const { fileName, version } = options;
  const { findFileUp, createErrorToReturn, setErrorData } = packageContext;

  const nvmrcFilePaths = await findFileUp(fileName);
  setErrorData({ nvmrcFilePaths });
  if (!nvmrcFilePaths || nvmrcFilePaths.length !== 1) {
    return createErrorToReturn('fileNotFound');
  }

  const nvmrcFileContent = await readFile(nvmrcFilePaths[0]).toString();
  setErrorData({ nvmrcFileContent });
  if (!nvmrcFileContent || !semver.valid(nvmrcFileContent)) {
    return createErrorToReturn('invalidNvmrc');
  }

  if (!semver.satisfies(nvmrcFileContent, version)) {
    return createErrorToReturn('invalidVersion');
  }

  return null;
}

export { nvmrcRuleDefinition, nvmrcRuleValidation };