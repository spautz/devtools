import { PackagelintErrorLevel, PackagelintErrorLevelCounts } from './error-levels';
import {
  PackagelintAnyReporterOptions,
  PackagelintReporterConstructor,
  PackagelintReporterInstance,
  PackagelintReporterName,
} from './reporters';

// General Utility Types

export type PackagelintRuleName = string;

export type PackagelintAnyRuleOptions = Record<string, any>;
export type PackagelintAnyErrorData = Record<string, any>;
export type PackagelintUnknownRuleOptions = Record<string, unknown>;
export type PackagelintUnknownErrorData = Record<string, unknown>;

// Exports for Rules, Rulesets, and Reporters

// type FlexibleExportType<T> = T | Promise<T> | (() => T | Promise<T>);

export type PackagelintExportedRules = {
  packagelintRules: Record<string, PackagelintRuleDefinition | PackagelintRulesetDefinition>;
};
export type PackagelintExportedReporters = {
  packagelintReporters: Record<string, PackagelintReporterConstructor>;
};

// UserConfig

/**
 * An unprocessed config, usually from a .packagelintrc file. This drives everything about Packagelint:
 * nothing will be loaded or evaluated unless it's specified here, either directly or indirectly.
 */
export interface PackagelintUserConfig {
  /** Controls the exit code of the `packagelint` cli: it will exit 1 if any rule fails at or above the specified level */
  failOnErrorLevel: PackagelintErrorLevel;
  /** The rules and rulesets to run, specified as config objects or in shorthand. */
  rules: Array<PackagelintRuleEntry | PackagelintRulesetEntry>;
  /** Result reporters and their configs */
  reporters: Record<PackagelintReporterName, PackagelintAnyReporterOptions>;

  /** Internal implementation, for forking or hotfixing. Do not touch unless you're sure of what you're doing. */
  RulePreparer: PackagelintRulePreparerConstructor;
  /** Internal implementation, for forking or hotfixing. Do not touch unless you're sure of what you're doing. */
  RuleValidator: PackagelintRuleValidatorConstructor;

  // @TODO: aliases, reporterAliases
}

// RuleEntry and RuleConfig

/**
 * When a rule is listed in the UserConfig or in a RuleSetDefinition, it may be given in shorthand:
 *  - A simple string will enable the rule, with its default options
 *  - An array with a boolean will enable or disable the rule, with its default options
 *  - An array with a string will enable the rule, with its default options, and set its errorLevel
 *  - An array with an object will enable the rule and set its options
 *  - A full object allows you to customize options, errorLevel, and whatever other settings you wish
 */
export type PackagelintRuleEntry<
  OptionsType extends PackagelintAnyRuleOptions = PackagelintUnknownRuleOptions,
> =
  | PackagelintRuleName
  | [PackagelintRuleName, boolean]
  | [PackagelintRuleName, PackagelintErrorLevel]
  | [PackagelintRuleName, OptionsType]
  | PackagelintRuleConfig<OptionsType>;

export type PackagelintRuleConfig<
  OptionsType extends PackagelintAnyRuleOptions = PackagelintUnknownRuleOptions,
> = {
  /** The rule's unique identifier. If this matches an existing RuleConfig or a RuleDefinition then it will apply
   * settings to that rule. If it is a new, unrecognized value then `extendRule` must be specified. */
  name: PackagelintRuleName;
  /** Whether or not to run the rule during validation */
  enabled?: boolean;
  /** When creating a copy of a rule, to give it different options or a different errorLevel, its implementation and
   * default options will be copied from the base rule name. `name` must be a new, unrecognized value to do this. */
  extendRule?: PackagelintRuleName;
  /** If the rule fails, the errorLevel that its failure is reported as */
  errorLevel?: PackagelintErrorLevel;
  /** Rule-specific options */
  options?: OptionsType;
  /** When making a new copy of a rule via `extendRule`, this controls whether the base rule's current options are
   * used, or whether its original defaultOptions are used. */
  resetOptions?: boolean;
  /** If the rule fails validation, the error message will be generated from these messages. They may be customized
   * to support different language translations. */
  messages?: Record<string, string>;
};

// RulesetEntry and RulesetConfig

/**
 * When a ruleset is listed in the UserConfig or in another RuleSetDefinition, it may be given in shorthand:
 *  - A simple string will expand the ruleset into its rules, as configured by the ruleset
 *  - An array with a boolean will enable or disable the ruleset
 *  - A full object allows you to customize options, errorLevel, and whatever other settings you wish
 */
export type PackagelintRulesetEntry =
  | PackagelintRuleName
  | [PackagelintRuleName, boolean]
  | PackagelintRulesetConfig;
// @TODO: Ruleset options, errorLevels, and dynamic generation

export type PackagelintRulesetConfig = {
  name: PackagelintRuleName;
  enabled?: boolean;
  errorLevel?: PackagelintErrorLevel;

  // @TODO: enabled, options, globalOptions?, errorLevel, globalErrorLevel?
};

// RuleDefinition and PreparedRule

/**
 * The underlying implementation of a rule. This gets merged with a RuleConfig to form a ProcessedRule.
 */
export interface PackagelintRuleDefinition<
  OptionsType extends PackagelintAnyRuleOptions = PackagelintUnknownRuleOptions,
> {
  /* Unique identifier for the rule */
  name: PackagelintRuleName;
  /** @TODO */
  entityType?: string;
  /* Human-readable information about the rule */
  docs: {
    description: string;
    [key: string]: string;
  };
  /* Whether the rule may be used directly, or whether it must first be extended to define a different rule. This is
   * used for generic rules that need to be invoked multiple times with different options, like `file-exists` */
  isAbstract?: boolean;
  /* Error level for the rule, if not overridden by the user config or a ruleset. Defaults to "error". */
  defaultErrorLevel?: PackagelintErrorLevel;
  /* Options for the rule, if not overridden by the user config or a ruleset */
  defaultOptions: OptionsType;
  /* Human-readable messages for failed validate results */
  messages: Record<string, string>;
  /* Function that implements the rule's checks */
  doValidation: PackagelintValidationFn<OptionsType>;

  // @TODO: optionsSchema: Record<keyof OptionsType, string>;
}

export interface PackagelintPreparedRule<
  OptionsType extends PackagelintAnyRuleOptions = PackagelintUnknownRuleOptions,
> {
  preparedRuleName: PackagelintRuleName;
  docs: PackagelintRuleDefinition<OptionsType>['docs'];
  enabled: boolean;
  extendedFrom: PackagelintRuleName | null;
  defaultErrorLevel: PackagelintErrorLevel;
  errorLevel: PackagelintErrorLevel;
  defaultOptions: OptionsType;
  options: OptionsType;
  messages: PackagelintRuleDefinition<OptionsType>['messages'];
  doValidation: PackagelintRuleDefinition<OptionsType>['doValidation'];
}

// RulesetDefinition

export interface PackagelintRulesetDefinition {
  /* Unique identifier for the ruleset */
  name: PackagelintRuleName;
  /** @TODO */
  entityType?: string;
  /* Human-readable information about the rule */
  docs: {
    description: string;
    [key: string]: string;
  };
  rules: Array<PackagelintRuleEntry | PackagelintRulesetEntry>;

  // @TODO: errorLevel?: PackagelintErrorLevel;
}

// PreparedConfig: After preparing config and loading rules

export interface PackagelintPreparedConfig {
  failOnErrorLevel: PackagelintErrorLevel;
  rules: Array<PackagelintPreparedRule>;
  reporters: Array<PackagelintReporterInstance>;
  rulePreparerInstance: PackagelintRulePreparerInstance;
  ruleValidatorInstance: PackagelintRuleValidatorInstance;
}

/**
 * Config+rule preparation is performed via functions within a class or closure, to make it easier for forks to extend
 * or override separate pieces of the internal implementation. All of the functions marked as optional here exist in
 * the DefaultRulePreparer, although only `prepareUserConfig` will be called from outside.
 */
export interface PackagelintRulePreparerInstance {
  readonly prepareUserConfig: (
    userConfig: PackagelintUserConfig,
  ) => Promise<PackagelintPreparedConfig>;

  // These exist in the default implementation, but are not part of the API contract used by validatePreparedConfig().
  // These all implicitly use the preparedConfig passed into `validatePreparedConfig`, and will not work standalone.

  // @TODO: Maybe promote this to a required/supported helper, to allow async buildup of rules when using API?
  readonly _processRuleEntry?: (
    ruleEntry: PackagelintRuleEntry | PackagelintRulesetEntry,
  ) => Promise<PackagelintPreparedRule | Array<PackagelintPreparedRule>>;

  readonly _importRule?: (
    name: PackagelintRuleName,
  ) => Promise<PackagelintRuleDefinition | PackagelintRulesetDefinition>;

  // @TODO
  // readonly _processRuleConfig?: (
  //   ruleConfig: PackagelintRuleConfig,
  // ) => Promise<PackagelintPreparedRule>;

  // @TODO
  // readonly _processRulesetConfig?: (
  //   rulesetConfig: PackagelintRulesetConfig,
  // ) => Promise<Array<PackagelintPreparedRule>>;

  readonly _getPreparedRuleList?: () => Array<PackagelintPreparedRule>;

  readonly _getPreparedConfig?: () => PackagelintPreparedConfig;
}

/**
 * A PackagelintRulePreparerInstance may be created from classes
 */
export interface PackagelintRulePreparerClassConstructor {
  new (): PackagelintRulePreparerInstance;
}
/**
 * A PackagelintRulePreparerInstance may be created from functions
 */
export type PackagelintRulePreparerConstructorFunction = () => PackagelintRulePreparerInstance;
/**
 * A PackagelintRulePreparerInstance may be created from either classes or functions
 */
export type PackagelintRulePreparerConstructor =
  | PackagelintRulePreparerClassConstructor
  | PackagelintRulePreparerConstructorFunction;

// Validation Runner: PackagelintRuleValidator

/**
 * Validation is performed via functions within a class or closure, to make it easier for forks to extend or override
 * separate pieces of the internal implementation. All of the functions marked as optional here exist in the
 * DefaultRuleValidator, although only `validatePreparedConfig` will be called from outside.
 */
export interface PackagelintRuleValidatorInstance {
  readonly validatePreparedConfig: (
    preparedConfig: PackagelintPreparedConfig,
  ) => Promise<PackagelintOutput>;

  // These exist in the default implementation, but are not part of the API contract used by validatePreparedConfig().
  // These all implicitly use the preparedConfig passed into `validatePreparedConfig`, and will not work standalone.

  readonly _makeValidationContext?: (
    preparedRule: PackagelintPreparedRule,
  ) => PackagelintValidationContext;

  readonly _validateAllRules?: () => Promise<Array<PackagelintValidationResult>>;

  // @TODO: Maybe promote this to a required/supported helper, to allow async buildup of rules when using API?
  readonly _validateOneRule?: (
    preparedRule: PackagelintPreparedRule,
  ) => Promise<PackagelintValidationResult>;

  readonly _beforeRule?: (preparedRule: PackagelintPreparedRule) => Promise<Array<void | unknown>>;

  readonly _processRuleResult?: (
    preparedRule: PackagelintPreparedRule,
    rawResult: PackagelintValidationFnReturn | Error,
  ) => PackagelintValidationResult;

  readonly _afterRule?: (
    preparedRule: PackagelintPreparedRule,
    result: PackagelintValidationResult,
  ) => Promise<Array<void | unknown>>;

  readonly _getRawResults?: () => Array<PackagelintValidationResult>;

  readonly _getValidationOutput?: () => PackagelintOutput;
}

/**
 * A PackagelintRuleValidatorInstance may be created from classes
 */
export interface PackagelintRuleValidatorClassConstructor {
  new (): PackagelintRuleValidatorInstance;
}
/**
 * A PackagelintRuleValidatorInstance may be created from functions
 */
export type PackagelintRuleValidatorConstructorFunction = () => PackagelintRuleValidatorInstance;
/**
 * A PackagelintRuleValidatorInstance may be created from either classes or functions
 */
export type PackagelintRuleValidatorConstructor =
  | PackagelintRuleValidatorClassConstructor
  | PackagelintRuleValidatorConstructorFunction;

// Validation

export type PackagelintValidationFn<
  OptionsType extends PackagelintAnyRuleOptions = PackagelintUnknownRuleOptions,
  ErrorDataType extends PackagelintAnyErrorData = PackagelintUnknownErrorData,
> = (
  options: OptionsType,
  packageContext: PackagelintValidationContext<ErrorDataType>,
) =>
  | PackagelintValidationFnReturn<ErrorDataType>
  | Promise<PackagelintValidationFnReturn<ErrorDataType>>;

export type PackagelintValidationContext<
  ErrorDataType extends PackagelintAnyErrorData = PackagelintUnknownErrorData,
> = {
  // General information
  preparedRuleName: string;
  // Helpers so that rules don't have to implement everything themselves
  findFileUp: (fileGlob: string) => Promise<null | Array<string>>;
  // Setting errorData and returning errors
  createErrorToReturn: (
    errorName: string,
    extraErrorData?: ErrorDataType,
  ) => [string, ErrorDataType];
  setErrorData: (errorData: ErrorDataType) => void;
};

export type PackagelintValidationFnReturn<
  ErrorDataType extends PackagelintAnyErrorData = PackagelintUnknownErrorData,
> = [string, ErrorDataType] | null | undefined;

export type PackagelintValidationResult<
  ErrorDataType extends PackagelintAnyErrorData = PackagelintUnknownErrorData,
> = PackagelintValidationError<ErrorDataType> | null | undefined;

export interface PackagelintValidationError<
  ErrorDataType extends PackagelintAnyErrorData = PackagelintUnknownErrorData,
> {
  preparedRuleName: PackagelintRuleName;
  errorLevel: PackagelintErrorLevel;
  errorName: string | null;
  errorData: ErrorDataType | null;
  message: string;
}

// Final validation results

export interface PackagelintOutput {
  // Overall results
  numRulesEnabled: number;
  numRulesDisabled: number;
  numRulesPassed: number;
  numRulesFailed: number;
  exitCode: number;
  // Summary and detail information about error levels
  highestErrorLevel: PackagelintErrorLevel | null;
  errorLevelCounts: PackagelintErrorLevelCounts;
  // The full details used to generate the results
  rules: Array<PackagelintPreparedRule>;
  allResults: Array<PackagelintValidationResult>;
  errorResults: Array<PackagelintValidationError>;
}
