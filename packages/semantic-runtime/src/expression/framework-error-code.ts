import { frameworkErrorCode } from '../kernel/framework-error-code.js';

/**
 * Aurelia expression-parser error-code labels that the semantic-runtime
 * expression parser can cite when it is modeling the same parser failure.
 *
 * These are labels, not semantic-runtime-owned diagnostics. Add a member only
 * after checking the framework `ErrorNames`/mapped-message row through Atlas.
 */
export const ExpressionFrameworkErrorCode = {
  /** `expression-parser ErrorNames.parse_invalid_start`; the current token cannot begin an Aurelia expression. */
  ParseInvalidStart: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_invalid_start', 'AUR0151'),
  /** `expression-parser ErrorNames.parse_no_spread`; spread syntax is not accepted in Aurelia binding expressions. */
  ParseNoSpread: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_no_spread', 'AUR0152'),
  /** `expression-parser ErrorNames.parse_expected_identifier`; an identifier was required by this grammar position. */
  ParseExpectedIdentifier: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_expected_identifier', 'AUR0153'),
  /** `expression-parser ErrorNames.parse_invalid_member_expr`; a `$parent` scope path was followed by a token that cannot be a scope/member continuation. */
  ParseInvalidMemberExpression: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_invalid_member_expr', 'AUR0154'),
  /** `expression-parser ErrorNames.parse_unexpected_end`; the expression ended before a required grammar item. */
  ParseUnexpectedEnd: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_unexpected_end', 'AUR0155'),
  /** `expression-parser ErrorNames.parse_unconsumed_token`; the parser found trailing syntax after a complete expression. */
  ParseUnconsumedToken: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_unconsumed_token', 'AUR0156'),
  /** `expression-parser ErrorNames.parse_left_hand_side_not_assignable`; an assignment target is not an Aurelia assignable expression. */
  ParseLeftHandSideNotAssignable: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_left_hand_side_not_assignable', 'AUR0158'),
  /** `expression-parser ErrorNames.parse_expected_converter_identifier`; a value-converter tail has no converter name. */
  ParseExpectedConverterIdentifier: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_expected_converter_identifier', 'AUR0159'),
  /** `expression-parser ErrorNames.parse_expected_behavior_identifier`; a binding-behavior tail has no behavior name. */
  ParseExpectedBehaviorIdentifier: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_expected_behavior_identifier', 'AUR0160'),
  /** `expression-parser ErrorNames.parse_unexpected_keyword_of`; `of` appeared outside the iterator separator position. */
  ParseUnexpectedKeywordOf: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_unexpected_keyword_of', 'AUR0161'),
  /** `expression-parser ErrorNames.parse_unexpected_keyword_import`; bare `import` is rejected in binding expressions. */
  ParseUnexpectedKeywordImport: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_unexpected_keyword_import', 'AUR0162'),
  /** `expression-parser ErrorNames.parse_invalid_identifier_in_forof`; a repeat.for declaration is not followed by framework-valid `of` syntax. */
  ParseInvalidIdentifierInForOf: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_invalid_identifier_in_forof', 'AUR0163'),
  /** `expression-parser ErrorNames.parse_invalid_identifier_object_literal_key`; object literal key syntax is not supported. */
  ParseInvalidIdentifierObjectLiteralKey: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_invalid_identifier_object_literal_key', 'AUR0164'),
  /** `expression-parser ErrorNames.parse_unterminated_string`; a string literal did not close. */
  ParseUnterminatedString: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_unterminated_string', 'AUR0165'),
  /** `expression-parser ErrorNames.parse_unterminated_template_string`; a template literal did not close. */
  ParseUnterminatedTemplateString: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_unterminated_template_string', 'AUR0166'),
  /** `expression-parser ErrorNames.parse_missing_expected_token`; a required delimiter or grammar token was absent. */
  ParseMissingExpectedToken: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_missing_expected_token', 'AUR0167'),
  /** `expression-parser ErrorNames.parse_unexpected_character`; the scanner found a character outside the expression grammar. */
  ParseUnexpectedCharacter: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_unexpected_character', 'AUR0168'),
  /** `expression-parser ErrorNames.parse_unexpected_token_destructuring`; array destructuring found a token outside the framework destructuring grammar. */
  ParseUnexpectedTokenDestructuring: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_unexpected_token_destructuring', 'AUR0170'),
  /** `expression-parser ErrorNames.parse_unexpected_token_optional_chain`; an optional-chain tail used a token outside Aurelia's optional suffix grammar. */
  ParseUnexpectedTokenOptionalChain: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_unexpected_token_optional_chain', 'AUR0171'),
  /** `expression-parser ErrorNames.parse_invalid_tag_in_optional_chain`; optional chains cannot be tagged-template receivers. */
  ParseInvalidTagInOptionalChain: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_invalid_tag_in_optional_chain', 'AUR0172'),
  /** `expression-parser ErrorNames.parse_invalid_arrow_params`; the arrow-function parameter list is not accepted by the framework parser. */
  ParseInvalidArrowParams: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_invalid_arrow_params', 'AUR0173'),
  /** `expression-parser ErrorNames.parse_no_arrow_param_default_value`; default arrow parameters are not accepted. */
  ParseNoArrowParamDefaultValue: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_no_arrow_param_default_value', 'AUR0174'),
  /** `expression-parser ErrorNames.parse_no_arrow_param_destructuring`; destructuring arrow parameters are not accepted. */
  ParseNoArrowParamDestructuring: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_no_arrow_param_destructuring', 'AUR0175'),
  /** `expression-parser ErrorNames.parse_rest_must_be_last`; a rest parameter is not the final arrow parameter. */
  ParseRestMustBeLast: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_rest_must_be_last', 'AUR0176'),
  /** `expression-parser ErrorNames.parse_no_arrow_fn_body`; block-bodied arrow functions are not accepted. */
  ParseNoArrowFnBody: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_no_arrow_fn_body', 'AUR0178'),
  /** `expression-parser ErrorNames.parse_unexpected_double_dot`; a leading `..` token is not an Aurelia expression. */
  ParseUnexpectedDoubleDot: frameworkErrorCode('expression-parser', 'ErrorNames', 'parse_unexpected_double_dot', 'AUR0179'),
} as const;

export type ExpressionFrameworkErrorCode =
  typeof ExpressionFrameworkErrorCode[keyof typeof ExpressionFrameworkErrorCode];
