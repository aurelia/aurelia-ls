import { frameworkErrorCode } from '../kernel/framework-error-code.js';

/**
 * Aurelia runtime-html configuration/framework-service error-code labels that
 * configuration convergence can cite when it models the same framework failure.
 */
export const ConfigurationFrameworkErrorCode = {
  /** `runtime ErrorNames.null_scope`; Scope API received a null/undefined Scope. */
  NullScope: frameworkErrorCode('runtime', 'ErrorNames', 'null_scope', 'AUR0203'),
  /** `runtime ErrorNames.create_scope_with_null_context`; Scope.create received a null/undefined binding context. */
  CreateScopeWithNullContext: frameworkErrorCode(
    'runtime',
    'ErrorNames',
    'create_scope_with_null_context',
    'AUR0204',
  ),
  /** `runtime-html ErrorNames.node_observer_mapping_existed`; NodeObserverLocator already has a mapping for node/property. */
  NodeObserverMappingExisted: frameworkErrorCode('runtime-html', 'ErrorNames', 'node_observer_mapping_existed', 'AUR0653'),
  /** `runtime-html ErrorNames.compiler_attr_mapper_duplicate_mapping`; AttrMapper already has a mapping for attr/tag. */
  AttrMapperDuplicateMapping: frameworkErrorCode('runtime-html', 'ErrorNames', 'compiler_attr_mapper_duplicate_mapping', 'AUR0719'),
} as const;

export type ConfigurationFrameworkErrorCode =
  typeof ConfigurationFrameworkErrorCode[keyof typeof ConfigurationFrameworkErrorCode];
