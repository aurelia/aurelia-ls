import type { AddressHandle, IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { ComputationLocus } from '../kernel/computation-lifecycle.js';
import type { CustomElementDefinition } from '../resources/custom-element-definition.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';

export const enum TemplateCompilationCohortKind {
  /** App-admitted component compilation inside one app-root compiler cohort. */
  App = 'app',
  /** Standalone authoring compilation outside an admitted app-root cohort. */
  Authoring = 'authoring',
}

/** Stable computation locus for one top-level authored template family across all compiler cohorts. */
export class TemplateCompilationLocus implements ComputationLocus {
  readonly kind = 'template-compilation';
  readonly reconciliationKey: string;
  readonly summary: string;

  constructor(
    readonly projectKey: string,
    readonly ownerHandle: IdentityHandle | ProductHandle,
  ) {
    this.reconciliationKey = encodeTemplateCompilationKeyParts([
      projectKey,
      ownerHandle,
    ]);
    this.summary = `template family ${ownerHandle} in ${projectKey}`;
  }
}

export const enum TemplateCompilationAdmissionOriginKind {
  /** The owner is visible in the app-root compiler scope. */
  AppVisibility = 'app-visibility',
  /** A route context owned by this app root names the owner as its component. */
  RouteComponent = 'route-component',
  /** A route context owned by this app root names the owner as its fallback. */
  RouteFallback = 'route-fallback',
  /** Another admitted owner declares this owner as a component-local dependency. */
  ResourceDependency = 'resource-dependency',
  /** Authoring policy selected an otherwise app-unowned authored template. */
  AuthoringPolicy = 'authoring-policy',
}

/** Inspectable reason one authored owner belongs to a compiler cohort. */
export class TemplateCompilationAdmissionOrigin {
  constructor(
    readonly kind: TemplateCompilationAdmissionOriginKind,
    /** Nearest authored registration, route-entry, dependency-carrier, or authoring-selection source. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Route config, visible resource, or depending definition that supplied the admission. */
    readonly viaProductHandle: ProductHandle | null,
  ) {}
}

/** Planned retained parent world and admission evidence for one owner/cohort occurrence. */
export class TemplateCompilationCohortPlan {
  readonly key: string;

  constructor(
    readonly kind: TemplateCompilationCohortKind,
    readonly analysisContextProductHandle: ProductHandle,
    readonly appRootDefinitionProductHandle: ProductHandle | null,
    readonly parentCompilerWorld: TemplateCompilerWorldEmission,
    readonly admissions: readonly TemplateCompilationAdmissionOrigin[],
  ) {
    this.key = templateCompilationCohortKey(
      kind,
      analysisContextProductHandle,
      appRootDefinitionProductHandle,
    );
  }
}

/** Complete compiler-cohort membership for one stable authored custom-element owner. */
export class TemplateCompilationOwnerPlan {
  readonly ownerHandle: IdentityHandle | ProductHandle;

  constructor(
    readonly definition: CustomElementDefinition,
    readonly cohorts: readonly TemplateCompilationCohortPlan[],
  ) {
    const ownerHandle = definition.identityHandle ?? definition.productHandle;
    if (ownerHandle == null) {
      throw new Error(`Template owner ${definition.name} has no stable identity or product handle.`);
    }
    this.ownerHandle = ownerHandle;
    assertUniqueTemplateCompilationCohorts(ownerHandle, cohorts);
  }
}

/** Complete app/authoring compiler-world and owner-cohort plan for one project snapshot. */
export class TemplateCompilationCohortProjectPlan {
  constructor(
    readonly projectKey: string,
    readonly appRootCompilerWorlds: readonly TemplateCompilerWorldEmission[],
    readonly ownerPlans: readonly TemplateCompilationOwnerPlan[],
    readonly authoringCompilerWorld: TemplateCompilerWorldEmission | null,
  ) {
    const ownerHandles = new Set<IdentityHandle | ProductHandle>();
    for (const owner of ownerPlans) {
      if (ownerHandles.has(owner.ownerHandle)) {
        throw new Error(`Template compilation project plan contains duplicate owner ${owner.ownerHandle}.`);
      }
      ownerHandles.add(owner.ownerHandle);
    }
  }
}

export function encodeTemplateCompilationKeyParts(parts: readonly string[]): string {
  return parts.map((part) => `${part.length}:${part}`).join('|');
}

function templateCompilationCohortKey(
  kind: TemplateCompilationCohortKind,
  analysisContextProductHandle: ProductHandle,
  appRootDefinitionProductHandle: ProductHandle | null,
): string {
  return encodeTemplateCompilationKeyParts([
    kind,
    analysisContextProductHandle,
    appRootDefinitionProductHandle ?? 'no-app-root',
  ]);
}

function assertUniqueTemplateCompilationCohorts(
  ownerHandle: IdentityHandle | ProductHandle,
  cohorts: readonly TemplateCompilationCohortPlan[],
): void {
  const keys = new Set<string>();
  for (const cohort of cohorts) {
    if (keys.has(cohort.key)) {
      throw new Error(`Template compilation owner ${ownerHandle} contains duplicate cohort ${cohort.key}.`);
    }
    keys.add(cohort.key);
  }
}
