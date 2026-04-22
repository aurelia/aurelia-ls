import {
  DependencyAssociationMaterializer,
  type DependencyAssociation,
  type DependencyMaterialization,
} from '../di/index.js';
import type { KeyRef, SourceNodeRef, SymbolRef } from '../refs.js';
import type { HydrationPublicationTokenKind } from './hydration-publication.js';

export const HYDRATION_LOOKUP_ROUTE_KINDS = [
  'hydration-context-own',
] as const;

export type HydrationLookupRouteKind =
  typeof HYDRATION_LOOKUP_ROUTE_KINDS[number];

export class HydrationConstructionRequirement {
  constructor(
    readonly token: HydrationPublicationTokenKind,
    readonly key: KeyRef | null,
    readonly dependency: DependencyAssociation,
    readonly note: string | null = null,
  ) {}
}

export class HydrationLookupRequirement {
  constructor(
    readonly route: HydrationLookupRouteKind,
    readonly key: KeyRef | null,
    readonly dependency: DependencyAssociation,
    readonly note: string | null = null,
  ) {}
}

export class HydrationConstructionContract {
  constructor(
    readonly owner: SymbolRef | SourceNodeRef,
    readonly dependencies: DependencyMaterialization,
    readonly requirements: readonly HydrationConstructionRequirement[] = [],
    readonly lookupRequirements: readonly HydrationLookupRequirement[] = [],
    readonly note: string | null = null,
  ) {}
}

export class HydrationConstructionContractMaterializer {
  private readonly dependencyMaterializer = new DependencyAssociationMaterializer();

  materialize(
    owner: SymbolRef | SourceNodeRef,
  ): HydrationConstructionContract {
    const dependencies = this.dependencyMaterializer.materialize(owner);
    const requirements = dependencies.associations.flatMap((current) => {
      const requirement = readHydrationRequirement(current);
      return requirement == null
        ? []
        : [new HydrationConstructionRequirement(
          requirement.token,
          requirement.key,
          current,
          requirement.note,
        )];
    });
    const lookupRequirements = dependencies.associations.flatMap((current) => {
      const requirement = readHydrationLookupRequirement(current);
      return requirement == null
        ? []
        : [new HydrationLookupRequirement(
          requirement.route,
          requirement.key,
          current,
          requirement.note,
        )];
    });

    return new HydrationConstructionContract(
      owner,
      dependencies,
      requirements,
      lookupRequirements,
      requirements.length === 0 && lookupRequirements.length === 0
        ? 'No hydration-specific constructor/field dependencies were detected through the ordinary DI lane.'
        : 'Hydration-specific constructor/field dependencies recovered through the ordinary DI materialization lane, including publication requirements and later lookup-regime requirements.',
    );
  }
}

// TODO: lookupRequirements are intentionally kept separate from direct
// publication requirements. They describe routed runtime lookup like
// fromHydrationContext(key) => hydrationContext.controller.container.get(own(key)),
// but they are not yet spent through a real container-lookup evaluator.
function readHydrationRequirement(
  dependency: DependencyAssociation,
): {
  readonly token: HydrationPublicationTokenKind;
  readonly key: KeyRef | null;
  readonly note: string;
} | null {
  // TODO: imported framework interface keys now close through the bounded
  // ordinary-DI import-following lane, but general package-export closure is
  // still open. Keep the name-only fallback until dependency subject
  // resolution can prove arbitrary package imports with real key identity.
  const resolvedFriendlyName = dependency.resolvedSubject?.interfaceKey?.friendlyName ?? null;
  const candidate = resolvedFriendlyName
    ?? dependency.request.candidateName
    ?? null;

  switch (candidate) {
    case 'IController':
    case 'IInstruction':
    case 'IRenderLocation':
    case 'IViewFactory':
    case 'IAuSlotsInfo':
    case 'IHydrationContext':
      return {
        token: candidate,
        key: dependency.resolvedSubject?.key ?? null,
        note: resolvedFriendlyName == null
          ? `Hydration-relevant dependency ${candidate} was identified from the authored dependency request name only. Imported/interface-key closure may still be open.`
          : `Hydration-relevant dependency ${candidate} closed through the ordinary DI materialization lane with concrete key identity.`,
      };
    default:
      return null;
  }
}

function readHydrationLookupRequirement(
  dependency: DependencyAssociation,
): {
  readonly route: HydrationLookupRouteKind;
  readonly key: KeyRef | null;
  readonly note: string;
} | null {
  const modifiers = dependency.lookupModifiers.map((current) => current.kind);
  if (!modifiers.includes('from-hydration-context')) {
    return null;
  }

  return {
    route: 'hydration-context-own',
    key: dependency.resolvedSubject?.key ?? null,
    note: dependency.resolvedSubject?.key == null
      ? 'Dependency lookup is routed through fromHydrationContext(...), but the inner key did not yet close to a concrete identity under the current DI reader.'
      : 'Dependency lookup is routed through fromHydrationContext(...), which means runtime resolves the inner key from the nearest hydration-context controller container with own(key) semantics.',
  };
}
