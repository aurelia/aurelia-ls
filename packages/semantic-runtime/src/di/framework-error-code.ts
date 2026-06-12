import { frameworkErrorCode } from '../kernel/framework-error-code.js';

/**
 * Aurelia kernel DI error-code labels that DI world construction can cite when
 * it models the same framework container behavior.
 */
export const DiFrameworkErrorCode = {
  /** `kernel ErrorNames.none_resolver_found`; DefaultResolver.none rejected a missing DI key. */
  NoneResolverFound: frameworkErrorCode('kernel', 'ErrorNames', 'none_resolver_found', 'AUR0002'),
  /** `kernel ErrorNames.cyclic_dependency`; singleton resolver activation re-entered the same resolver. */
  CyclicDependency: frameworkErrorCode('kernel', 'ErrorNames', 'cyclic_dependency', 'AUR0003'),
  /** `kernel ErrorNames.invalid_resolver_strategy`; a resolver resolved with a non-framework strategy value. */
  InvalidResolverStrategy: frameworkErrorCode('kernel', 'ErrorNames', 'invalid_resolver_strategy', 'AUR0005'),
  /** `kernel ErrorNames.unable_auto_register`; container.register recursion hit the framework depth guard. */
  UnableAutoRegister: frameworkErrorCode('kernel', 'ErrorNames', 'unable_auto_register', 'AUR0006'),
  /** `kernel ErrorNames.resource_already_exists`; a resource key is already registered in the local container. */
  ResourceAlreadyExists: frameworkErrorCode('kernel', 'ErrorNames', 'resource_already_exists', 'AUR0007'),
  /** `kernel ErrorNames.null_undefined_key`; a container key is null or undefined. */
  NullUndefinedKey: frameworkErrorCode('kernel', 'ErrorNames', 'null_undefined_key', 'AUR0014'),
  /** `kernel ErrorNames.no_active_container_for_resolve`; ambient `resolve(...)` ran without current container. */
  NoActiveContainerForResolve: frameworkErrorCode('kernel', 'ErrorNames', 'no_active_container_for_resolve', 'AUR0016'),
  /** `kernel ErrorNames.unable_jit_non_constructor`; JIT/factory lookup could not derive a constructable type. */
  UnableJitNonConstructor: frameworkErrorCode('kernel', 'ErrorNames', 'unable_jit_non_constructor', 'AUR0009'),
  /** `kernel ErrorNames.no_jit_intrinsic_type`; container JIT was asked to auto-register an intrinsic type. */
  NoJitIntrinsicType: frameworkErrorCode('kernel', 'ErrorNames', 'no_jit_intrinsic_type', 'AUR0010'),
  /** `kernel ErrorNames.no_jit_interface`; container JIT was asked to auto-register an interface symbol. */
  NoJitInterface: frameworkErrorCode('kernel', 'ErrorNames', 'no_jit_interface', 'AUR0012'),
  /** `kernel ErrorNames.null_resolver_from_register`; registry auto-registration returned no resolver. */
  NullResolverFromRegister: frameworkErrorCode('kernel', 'ErrorNames', 'null_resolver_from_register', 'AUR0011'),
  /** `kernel ErrorNames.invalid_new_instance_on_interface`; newInstance targeted an interface without a default. */
  InvalidNewInstanceOnInterface: frameworkErrorCode('kernel', 'ErrorNames', 'invalid_new_instance_on_interface', 'AUR0017'),
  /** `kernel ErrorNames.no_instance_provided`; an InstanceProvider resolved before prepare or after dispose. */
  NoInstanceProvided: frameworkErrorCode('kernel', 'ErrorNames', 'no_instance_provided', 'AUR0013'),
  /** `kernel ErrorNames.no_construct_native_fn`; container invoke/factory refused native function construction. */
  NoConstructNativeFunction: frameworkErrorCode('kernel', 'ErrorNames', 'no_construct_native_fn', 'AUR0015'),
  /** `kernel ErrorNames.invalid_inject_decorator_usage`; @inject-like decorator targeted an unsupported context. */
  InvalidInjectDecoratorUsage: frameworkErrorCode('kernel', 'ErrorNames', 'invalid_inject_decorator_usage', 'AUR0022'),
} as const;

export type DiFrameworkErrorCode =
  typeof DiFrameworkErrorCode[keyof typeof DiFrameworkErrorCode];
