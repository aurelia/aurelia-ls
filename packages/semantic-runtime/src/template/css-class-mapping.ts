import type {
  AddressHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  ResourceDependencyReferenceKind,
  ResourceRegistryDependencyKind,
  type ResourceCssModulesRegistryInput,
  type ResourceDependencyReference,
} from '../resources/resource-reference.js';
import {
  TemplateCompilerServiceKind,
  TemplateCompilerServiceReference,
} from './compiler-world-reference.js';

/** Closure of one own property on the component-local `ICssClassMapping` object. */
export const enum CssClassMappingPropertyState {
  Absent = 'absent',
  Value = 'value',
  Open = 'open',
}

/** Aggregate precision of a component-local CSS class mapping. */
export const enum CssClassMappingAuthorityState {
  Exact = 'exact',
  Partial = 'partial',
  Open = 'open',
}

/** Source of residual mapping uncertainty after ordered registry inputs have been folded. */
export const enum CssClassMappingOpenReasonKind {
  RegistryArgument = 'registry-argument',
  OpaqueRegistry = 'opaque-registry',
  DependencySet = 'dependency-set',
}

/** Exact or open lookup result for one raw `ICssClassMapping` property. */
export class CssClassMappingLookup {
  constructor(
    readonly propertyState: CssClassMappingPropertyState,
    readonly mappedClassName: string | null,
  ) {}
}

export class CssClassMappingProperty {
  constructor(
    readonly className: string,
    readonly propertyState: CssClassMappingPropertyState.Value | CssClassMappingPropertyState.Open,
    readonly mappedClassName: string | null,
  ) {}
}

export class CssClassMappingOpenReason {
  constructor(
    readonly reasonKind: CssClassMappingOpenReasonKind,
    readonly summary: string,
    readonly sourceOrdinal: number | null,
    readonly mappingArgumentOrdinal: number | null,
    readonly sourceModuleKey: string | null,
    readonly sourceAddressHandle: AddressHandle | null = null,
    readonly openSeamHandles: readonly OpenSeamHandle[] = [],
  ) {}
}

interface CssClassMappingAuthorityRead {
  readonly properties: readonly CssClassMappingProperty[];
  readonly defaultPropertyState: CssClassMappingPropertyState.Absent | CssClassMappingPropertyState.Open;
  readonly openReasons: readonly CssClassMappingOpenReason[];
  lookup(className: string): CssClassMappingLookup;
}

/** Product-free mapping candidate used while deriving a component compiler/runtime world. */
export class CssClassMappingAuthorityCandidate implements CssClassMappingAuthorityRead {
  static readonly exactNone = new CssClassMappingAuthorityCandidate(
    [],
    CssClassMappingPropertyState.Absent,
    [],
  );

  constructor(
    readonly properties: readonly CssClassMappingProperty[],
    readonly defaultPropertyState: CssClassMappingPropertyState.Absent | CssClassMappingPropertyState.Open,
    readonly openReasons: readonly CssClassMappingOpenReason[],
  ) {}

  get authorityState(): CssClassMappingAuthorityState {
    return cssClassMappingAuthorityState(this.properties, this.defaultPropertyState);
  }

  lookup(className: string): CssClassMappingLookup {
    const property = this.properties.find((candidate) => candidate.className === className) ?? null;
    return property == null
      ? new CssClassMappingLookup(this.defaultPropertyState, null)
      : new CssClassMappingLookup(property.propertyState, property.mappedClassName);
  }
}

export class CssClassMappingAuthorityReference extends TemplateCompilerServiceReference {
  constructor(
    productHandle: ProductHandle,
    identityHandle: IdentityHandle,
    sourceAddressHandle: AddressHandle | null,
  ) {
    super(
      TemplateCompilerServiceKind.CssClassMapping,
      productHandle,
      identityHandle,
      sourceAddressHandle,
    );
  }

  get sourceAddressHandle(): AddressHandle | null {
    return this.addressHandle;
  }
}

/** Durable shared leaf-locus mapping consumed by generated CSS hooks and runtime class handling. */
export class CssClassMappingAuthority implements CssClassMappingAuthorityRead {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly properties: readonly CssClassMappingProperty[],
    readonly defaultPropertyState: CssClassMappingPropertyState.Absent | CssClassMappingPropertyState.Open,
    readonly openReasons: readonly CssClassMappingOpenReason[],
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}

  get authorityState(): CssClassMappingAuthorityState {
    return cssClassMappingAuthorityState(this.properties, this.defaultPropertyState);
  }

  lookup(className: string): CssClassMappingLookup {
    const property = this.properties.find((candidate) => candidate.className === className) ?? null;
    return property == null
      ? new CssClassMappingLookup(this.defaultPropertyState, null)
      : new CssClassMappingLookup(property.propertyState, property.mappedClassName);
  }

  toCandidate(): CssClassMappingAuthorityCandidate {
    return new CssClassMappingAuthorityCandidate(
      this.properties,
      this.defaultPropertyState,
      this.openReasons,
    );
  }

  toReference(): CssClassMappingAuthorityReference {
    return new CssClassMappingAuthorityReference(
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

/**
 * Fold component dependencies exactly as repeated `cssModules(...)` registry bodies mutate their shared own mapping.
 *
 * Parent input is used only when a derivation is proven to retain the same runtime container locus. Component and
 * app-root-controller derivations start from a fresh empty mapping because CSS Modules use `own(ICssClassMapping)` and
 * do not inherit through parent containers. Generated local elements replay their owner dependencies into a fresh map.
 */
export function deriveCssClassMappingForDependencies(
  parent: CssClassMappingAuthorityRead,
  dependencies: readonly ResourceDependencyReference[],
  preserveParentLocus: boolean,
  dependencyOpenReasons: readonly CssClassMappingOpenReason[] = [],
): CssClassMappingAuthorityCandidate {
  const classNames = new Set<string>(preserveParentLocus
    ? parent.properties.map((property) => property.className)
    : []);
  for (const dependency of dependencies) {
    for (const argument of dependency.cssModulesInput?.mappingArguments ?? []) {
      for (const entry of argument.entries) {
        classNames.add(entry.className);
      }
    }
  }

  const properties = [...classNames]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((className): readonly CssClassMappingProperty[] => {
      let lookup = preserveParentLocus
        ? parent.lookup(className)
        : new CssClassMappingLookup(CssClassMappingPropertyState.Absent, null);
      for (const dependency of dependencies) {
        lookup = applyDependencyToLookup(dependency, className, lookup);
      }
      if (dependencyOpenReasons.length > 0) {
        lookup = new CssClassMappingLookup(CssClassMappingPropertyState.Open, null);
      }
      return lookup.propertyState === CssClassMappingPropertyState.Absent
        ? []
        : [new CssClassMappingProperty(
            className,
            lookup.propertyState,
            lookup.mappedClassName,
          )];
    });

  let defaultPropertyState = preserveParentLocus
    ? parent.defaultPropertyState
    : CssClassMappingPropertyState.Absent;
  for (const dependency of dependencies) {
    if (dependencyMayWriteUnknownCssClass(dependency)) {
      defaultPropertyState = CssClassMappingPropertyState.Open;
    }
  }
  if (dependencyOpenReasons.length > 0) {
    defaultPropertyState = CssClassMappingPropertyState.Open;
  }

  const openReasons = compactCssClassMappingOpenReasons([
    ...(preserveParentLocus ? parent.openReasons : []),
    ...dependencies.flatMap(cssClassMappingOpenReasonsForDependency),
    ...dependencyOpenReasons,
  ]);
  return properties.length === 0
    && defaultPropertyState === CssClassMappingPropertyState.Absent
    && openReasons.length === 0
    ? CssClassMappingAuthorityCandidate.exactNone
    : new CssClassMappingAuthorityCandidate(properties, defaultPropertyState, openReasons);
}

export function sameCssClassMappingAuthorityCandidate(
  left: CssClassMappingAuthorityCandidate,
  right: CssClassMappingAuthorityCandidate,
): boolean {
  return left.defaultPropertyState === right.defaultPropertyState
    && sameArrays(left.properties, right.properties, (a, b) =>
      a.className === b.className
      && a.propertyState === b.propertyState
      && a.mappedClassName === b.mappedClassName)
    && sameArrays(left.openReasons, right.openReasons, sameCssClassMappingOpenReason);
}

function applyDependencyToLookup(
  dependency: ResourceDependencyReference,
  className: string,
  previous: CssClassMappingLookup,
): CssClassMappingLookup {
  if (dependency.dependencyKind !== ResourceDependencyReferenceKind.Registry) return previous;
  switch (dependency.registryKind) {
    case ResourceRegistryDependencyKind.CssModules:
      return applyCssModulesInputToLookup(dependency.cssModulesInput, className, previous);
    case ResourceRegistryDependencyKind.OpaqueRegistry:
      return new CssClassMappingLookup(CssClassMappingPropertyState.Open, null);
    case ResourceRegistryDependencyKind.ShadowCss:
    case ResourceRegistryDependencyKind.ChildrenLifecycleHooks:
    case ResourceRegistryDependencyKind.SlottedLifecycleHooks:
    case ResourceRegistryDependencyKind.TemplateCompilerHook:
    case null:
      return previous;
  }
}

function applyCssModulesInputToLookup(
  input: ResourceCssModulesRegistryInput | null,
  className: string,
  previous: CssClassMappingLookup,
): CssClassMappingLookup {
  if (input == null || input.mayHaveUnknownArguments || input.mayHaveUnknownArgumentOrder) {
    return new CssClassMappingLookup(CssClassMappingPropertyState.Open, null);
  }
  let lookup = previous;
  for (const argument of input.mappingArguments) {
    const entry = argument.entries.find((candidate) => candidate.className === className) ?? null;
    if (entry != null) {
      lookup = new CssClassMappingLookup(CssClassMappingPropertyState.Value, entry.mappedClassName);
    } else if (argument.mayHaveUnknownMappings) {
      lookup = new CssClassMappingLookup(CssClassMappingPropertyState.Open, null);
    }
  }
  return lookup;
}

function dependencyMayWriteUnknownCssClass(
  dependency: ResourceDependencyReference,
): boolean {
  if (dependency.dependencyKind !== ResourceDependencyReferenceKind.Registry) return false;
  if (dependency.registryKind === ResourceRegistryDependencyKind.OpaqueRegistry) return true;
  if (dependency.registryKind !== ResourceRegistryDependencyKind.CssModules) return false;
  const input = dependency.cssModulesInput;
  return input == null
    || input.mayHaveUnknownArguments
    || input.mayHaveUnknownArgumentOrder
    || input.mappingArguments.some((argument) => argument.mayHaveUnknownMappings);
}

function cssClassMappingOpenReasonsForDependency(
  dependency: ResourceDependencyReference,
  sourceOrdinal: number,
): readonly CssClassMappingOpenReason[] {
  if (dependency.dependencyKind !== ResourceDependencyReferenceKind.Registry) return [];
  if (dependency.registryKind === ResourceRegistryDependencyKind.OpaqueRegistry) {
    return [new CssClassMappingOpenReason(
      CssClassMappingOpenReasonKind.OpaqueRegistry,
      `Component dependency '${dependency.localName ?? dependency.keyName ?? sourceOrdinal}' has opaque registry effects that may write ICssClassMapping.`,
      sourceOrdinal,
      null,
      null,
    )];
  }
  if (dependency.registryKind !== ResourceRegistryDependencyKind.CssModules) return [];
  const input = dependency.cssModulesInput;
  if (input == null) {
    return [new CssClassMappingOpenReason(
      CssClassMappingOpenReasonKind.RegistryArgument,
      'A cssModules registry is known, but its ordered mapping input was not retained.',
      sourceOrdinal,
      null,
      null,
    )];
  }
  const reasons: CssClassMappingOpenReason[] = [];
  if (input.mayHaveUnknownArguments || input.mayHaveUnknownArgumentOrder) {
    reasons.push(new CssClassMappingOpenReason(
      CssClassMappingOpenReasonKind.RegistryArgument,
      'A cssModules registry argument list has open membership or order.',
      sourceOrdinal,
      null,
      null,
    ));
  }
  input.mappingArguments.forEach((argument, mappingArgumentOrdinal) => {
    if (!argument.mayHaveUnknownMappings) return;
    reasons.push(new CssClassMappingOpenReason(
      CssClassMappingOpenReasonKind.RegistryArgument,
      argument.sourceModuleKey == null
        ? 'A cssModules registry argument may contain additional or unresolved class mappings.'
        : `CSS Module '${argument.sourceModuleKey}' requires build-transform mapping authority.`,
      sourceOrdinal,
      mappingArgumentOrdinal,
      argument.sourceModuleKey,
    ));
  });
  return reasons;
}

function compactCssClassMappingOpenReasons(
  reasons: readonly CssClassMappingOpenReason[],
): readonly CssClassMappingOpenReason[] {
  const seen = new Set<string>();
  return reasons.filter((reason) => {
    const key = [
      reason.reasonKind,
      reason.summary,
      reason.sourceOrdinal ?? '',
      reason.mappingArgumentOrdinal ?? '',
      reason.sourceModuleKey ?? '',
      reason.sourceAddressHandle ?? '',
      ...reason.openSeamHandles,
    ].join('\0');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sameCssClassMappingOpenReason(
  left: CssClassMappingOpenReason,
  right: CssClassMappingOpenReason,
): boolean {
  return left.reasonKind === right.reasonKind
    && left.summary === right.summary
    && left.sourceOrdinal === right.sourceOrdinal
    && left.mappingArgumentOrdinal === right.mappingArgumentOrdinal
    && left.sourceModuleKey === right.sourceModuleKey
    && left.sourceAddressHandle === right.sourceAddressHandle
    && sameArrays(left.openSeamHandles, right.openSeamHandles, (a, b) => a === b);
}

function sameArrays<T>(
  left: readonly T[],
  right: readonly T[],
  same: (left: T, right: T) => boolean,
): boolean {
  return left.length === right.length && left.every((value, index) => same(value, right[index]!));
}

function cssClassMappingAuthorityState(
  properties: readonly CssClassMappingProperty[],
  defaultPropertyState: CssClassMappingPropertyState.Absent | CssClassMappingPropertyState.Open,
): CssClassMappingAuthorityState {
  const hasOpenProperty = properties.some((property) =>
    property.propertyState === CssClassMappingPropertyState.Open
  );
  if (defaultPropertyState === CssClassMappingPropertyState.Absent && !hasOpenProperty) {
    return CssClassMappingAuthorityState.Exact;
  }
  const hasExactProperty = properties.some((property) =>
    property.propertyState === CssClassMappingPropertyState.Value
  );
  return hasExactProperty || defaultPropertyState === CssClassMappingPropertyState.Absent
    ? CssClassMappingAuthorityState.Partial
    : CssClassMappingAuthorityState.Open;
}
