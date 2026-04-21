import type { ConfigurationContribution } from '../configurations/index.js';
import type {
  CompilerCapability,
  CompilerCapabilityKind,
  CompilerConsultedWorld,
} from '../compiler/index.js';
import type { ResourceDefinition, ResourceDefinitionKind } from '../resources/index.js';
import type { ResourceReferenceRef, ContainerWorldRef } from '../refs.js';
import type { ContainerStateEntry, ContainerStateOpenSeam } from '../registrations/index.js';

export const TYPESCRIPT_WORLD_CONSTRUCTION_OPEN_SEAM_KINDS = [
  'world-placement-open',
  'production-state-open',
  'registry-state-open',
  'renderer-state-open',
  'resource-registration-state-open',
  'resource-definition-match-open',
] as const;

export type TypeScriptWorldConstructionOpenSeamKind =
  typeof TYPESCRIPT_WORLD_CONSTRUCTION_OPEN_SEAM_KINDS[number];

export class TypeScriptWorldConstructionOpenSeam {
  constructor(
    readonly kind: TypeScriptWorldConstructionOpenSeamKind,
    readonly location: string | null = null,
    readonly note: string | null = null,
  ) {}
}

export class TypeScriptWorldConstruction {
  // This outer shell is a staging wrapper while world construction is being
  // decompressed. Compiler-facing work should prefer `compilerWorld`; the raw
  // arrays remain lower-level evidence surfaces.
  constructor(
    readonly id: string,
    readonly ownerContribution: ConfigurationContribution,
    readonly world: ContainerWorldRef,
    readonly compilerWorld: CompilerConsultedWorld,
    readonly containerStateEntries: readonly ContainerStateEntry[] = [],
    readonly containerStateOpenSeams: readonly ContainerStateOpenSeam[] = [],
    readonly visibleResources: readonly ResourceDefinition[] = [],
    readonly compilerCapabilities: readonly CompilerCapability[] = [],
    readonly openSeams: readonly TypeScriptWorldConstructionOpenSeam[] = [],
  ) {}

  readVisibleResourcesByKind<TKind extends ResourceDefinitionKind>(
    kind: TKind,
  ): readonly Extract<ResourceDefinition, { kind: TKind }>[] {
    return this.visibleResources.filter(
      (current): current is Extract<ResourceDefinition, { kind: TKind }> => current.kind === kind,
    );
  }

  findResourceDefinition(
    kind: ResourceDefinitionKind,
    name: string,
  ): ResourceDefinition | null {
    return this.compilerWorld.resourceResolver.findResourceDefinition(kind, name);
  }

  resolveResourceReference(
    reference: ResourceReferenceRef,
  ): ResourceDefinition | null {
    return this.compilerWorld.resourceResolver.resolveReference(reference);
  }

  readCompilerCapabilitiesByKind<TKind extends CompilerCapabilityKind>(
    kind: TKind,
  ): readonly Extract<CompilerCapability, { kind: TKind }>[] {
    return this.compilerCapabilities.filter(
      (current): current is Extract<CompilerCapability, { kind: TKind }> => current.kind === kind,
    );
  }
}
