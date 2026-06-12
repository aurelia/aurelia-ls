import { frameworkErrorCode } from '../kernel/framework-error-code.js';

export const RuntimeAstFrameworkErrorCode = {
  AstHostNotFound: frameworkErrorCode('runtime', 'ErrorNames', 'ast_$host_not_found', 'AUR0105'),
  AstNoAssignHost: frameworkErrorCode('runtime', 'ErrorNames', 'ast_no_assign_$host', 'AUR0106'),
  AstNotAFunction: frameworkErrorCode('runtime', 'ErrorNames', 'ast_not_a_function', 'AUR0107'),
  AstTaggedNotAFunction: frameworkErrorCode('runtime', 'ErrorNames', 'ast_tagged_not_a_function', 'AUR0110'),
  AstNameIsNotAFunction: frameworkErrorCode('runtime', 'ErrorNames', 'ast_name_is_not_a_function', 'AUR0111'),
  AstDestructNull: frameworkErrorCode('runtime', 'ErrorNames', 'ast_destruct_null', 'AUR0112'),
  AstIncrementInfiniteLoop: frameworkErrorCode('runtime', 'ErrorNames', 'ast_increment_infinite_loop', 'AUR0113'),
  AstNullishMemberAccess: frameworkErrorCode('runtime', 'ErrorNames', 'ast_nullish_member_access', 'AUR0114'),
  AstNullishKeyedAccess: frameworkErrorCode('runtime', 'ErrorNames', 'ast_nullish_keyed_access', 'AUR0115'),
  AstNullishAssignment: frameworkErrorCode('runtime', 'ErrorNames', 'ast_nullish_assignment', 'AUR0116'),
} as const;

export type RuntimeAstFrameworkErrorCode =
  typeof RuntimeAstFrameworkErrorCode[keyof typeof RuntimeAstFrameworkErrorCode];

export const RuntimeHtmlAstFrameworkErrorCode = {
  AstBehaviorNotFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'ast_behavior_not_found', 'AUR0101'),
  AstBehaviorDuplicated: frameworkErrorCode('runtime-html', 'ErrorNames', 'ast_behavior_duplicated', 'AUR0102'),
  AstConverterNotFound: frameworkErrorCode('runtime-html', 'ErrorNames', 'ast_converter_not_found', 'AUR0103'),
} as const;

export type RuntimeHtmlAstFrameworkErrorCode =
  typeof RuntimeHtmlAstFrameworkErrorCode[keyof typeof RuntimeHtmlAstFrameworkErrorCode];
