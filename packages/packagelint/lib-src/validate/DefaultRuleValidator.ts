import {
  PackagelintPreparedRule,
  PackagelintOutput,
  PackagelintPreparedConfig,
  PackagelintValidationResult,
  PackagelintValidationError,
  PackagelintRuleValidatorInstance,
  PackagelintValidationContext,
  PackagelintValidationFnReturn,
  PackagelintUnknownErrorData,
} from '@packagelint/core';

import {
  ERROR_LEVEL__EXCEPTION,
  FAILURE__VALIDATION,
  SUCCESS,
  countErrorTypes,
  getHighestErrorLevel,
  isErrorLessSevereThan,
} from '../util';
import { broadcastEvent, broadcastEventUsingReporters } from '../report';

class PackageLintRuleValidator_MissingPreparedConfigError extends Error {
  constructor(functionNameOrError: string | Error) {
    super(
      `Packagelint internal error: Cannot ${functionNameOrError} when no preparedConfig is set`,
    );
    this.name = 'PackageLintRuleValidator_MissingPreparedConfigError';
  }
}

class DefaultRuleValidator implements Required<PackagelintRuleValidatorInstance> {
  _preparedConfig: PackagelintPreparedConfig | null = null;
  _ruleList: Array<PackagelintPreparedRule> = [];
  _allResults: Array<PackagelintValidationResult> = [];

  async validatePreparedConfig(
    preparedConfig: PackagelintPreparedConfig,
  ): Promise<PackagelintOutput> {
    if (!preparedConfig) {
      throw new Error('RuleValidator.validatePreparedConfig() must be given a preparedConfig');
    }

    this._preparedConfig = preparedConfig;
    this._ruleList = preparedConfig.rules;

    await broadcastEvent(preparedConfig, 'onValidationStart', preparedConfig);
    this._allResults = await this._validateAllRules();

    const output = this._getValidationOutput();
    await broadcastEvent(preparedConfig, 'onValidationComplete', output);

    return output;
  }

  _makeValidationContext(preparedRule: PackagelintPreparedRule): PackagelintValidationContext {
    if (!this._preparedConfig) {
      throw new PackageLintRuleValidator_MissingPreparedConfigError('makeValidationContext');
    }

    const { preparedRuleName } = preparedRule;

    const accumulatedErrorData = {};

    function setErrorData(errorData: PackagelintUnknownErrorData): void {
      Object.assign(accumulatedErrorData, errorData);
    }

    return {
      // General information
      preparedRuleName,

      // Helpers so that rules don't have to implement everything themselves
      findFileUp: (_fileGlob: string) => {
        throw new Error('Not implemented');
      },
      // Setting errorData and returning errors
      createErrorToReturn: (
        errorName: string,
        extraErrorData?: PackagelintUnknownErrorData,
      ): [string, PackagelintUnknownErrorData] => {
        if (extraErrorData) {
          setErrorData(extraErrorData);
        }
        return [errorName, accumulatedErrorData];
      },
      setErrorData,
    };
  }

  async _validateAllRules(): Promise<Array<PackagelintValidationResult>> {
    if (!this._preparedConfig) {
      throw new PackageLintRuleValidator_MissingPreparedConfigError('validateAllRules');
    }

    return await Promise.all(
      this._ruleList.map((preparedRule) => {
        return this._validateOneRule(preparedRule);
      }),
    );
  }

  async _validateOneRule(
    preparedRule: PackagelintPreparedRule,
  ): Promise<PackagelintValidationResult> {
    if (!this._preparedConfig) {
      throw new PackageLintRuleValidator_MissingPreparedConfigError('validateOneRule');
    }

    const { enabled, options } = preparedRule;

    if (enabled) {
      const context = this._makeValidationContext(preparedRule);

      try {
        const validationErrorInfo = await preparedRule.doValidation(options, context);
        return this._processRuleResult(preparedRule, validationErrorInfo);
      } catch (e) {
        return this._processRuleResult(preparedRule, e);
      }
    }
    // null indicates a successful run; undefined indicates no run at all
    return;
  }

  async _beforeRule(preparedRule: PackagelintPreparedRule): Promise<Array<void | unknown>> {
    if (!this._preparedConfig) {
      throw new PackageLintRuleValidator_MissingPreparedConfigError('beforeRule');
    }

    const { reporters } = this._preparedConfig;

    return await broadcastEventUsingReporters(reporters, 'onRuleStart', preparedRule);
  }

  _processRuleResult(
    preparedRule: PackagelintPreparedRule,
    rawResult: PackagelintValidationFnReturn | Error,
  ): PackagelintValidationResult {
    if (!this._preparedConfig) {
      throw new PackageLintRuleValidator_MissingPreparedConfigError('processRuleResult');
    }

    const { preparedRuleName, errorLevel, messages } = preparedRule;

    if (rawResult instanceof Error) {
      const result = {
        preparedRuleName: preparedRuleName,
        errorLevel: ERROR_LEVEL__EXCEPTION,
        errorName: null,
        errorData: null,
        message: rawResult.message,
      };
      return result;
    } else if (rawResult) {
      const [errorName, errorData] = rawResult;

      const result = {
        preparedRuleName: preparedRuleName,
        errorLevel,
        errorName: errorName,
        errorData: errorData,
        // @TODO: Apply errorData to template
        message: messages[errorName] || errorName,
      };
      return result;
    }

    return null;
  }

  async _afterRule(
    preparedRule: PackagelintPreparedRule,
    result: PackagelintValidationResult,
  ): Promise<Array<void | unknown>> {
    if (!this._preparedConfig) {
      throw new PackageLintRuleValidator_MissingPreparedConfigError('afterRule');
    }

    const { reporters } = this._preparedConfig;

    return await broadcastEventUsingReporters(reporters, 'onRuleResult', preparedRule, result);
  }

  _getRawResults(): Array<PackagelintValidationResult> {
    if (!this._preparedConfig) {
      throw new PackageLintRuleValidator_MissingPreparedConfigError('getRawResults');
    }

    return this._allResults;
  }

  _getValidationOutput(): PackagelintOutput {
    if (!this._preparedConfig) {
      throw new Error(
        'Packagelint internal error: Cannot getValidationOutput when no preparedConfig is set',
      );
    }

    const { failOnErrorLevel } = this._preparedConfig;

    const allRuleResults = this._getRawResults();
    const enabledRuleResults = allRuleResults.filter(
      (validationResult) => validationResult !== undefined,
    );
    const errorResults = enabledRuleResults.filter(
      (validationResult) => !!validationResult,
    ) as Array<PackagelintValidationError>;

    const errorLevelCounts = countErrorTypes(errorResults);
    const highestErrorLevel = getHighestErrorLevel(errorLevelCounts);
    const exitCode = isErrorLessSevereThan(highestErrorLevel, failOnErrorLevel)
      ? SUCCESS
      : FAILURE__VALIDATION;

    const output = {
      numRulesEnabled: enabledRuleResults.length,
      numRulesDisabled: allRuleResults.length - enabledRuleResults.length,
      numRulesPassed: enabledRuleResults.length - errorResults.length,
      numRulesFailed: errorResults.length,
      exitCode,

      highestErrorLevel,
      errorLevelCounts,
      rules: this._ruleList,
      allResults: this._allResults,
      errorResults,
    };
    return output;
  }
}

export { DefaultRuleValidator, PackageLintRuleValidator_MissingPreparedConfigError };