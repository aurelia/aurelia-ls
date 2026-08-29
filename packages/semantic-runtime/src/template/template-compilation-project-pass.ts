import { performance } from 'node:perf_hooks';

import type { ProjectBootFrame } from '../boot/frames.js';
import type { AureliaAppWorldEmission } from '../configuration/app-world-composer.js';
import {
  DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
  type SemanticAppAnalysisDepth,
} from '../configuration/app-analysis.js';
import {
  DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE,
} from '../telemetry/inquiry-profile.js';
import {
  normalizeSemanticRuntimeTelemetryOptions,
  type NormalizedSemanticRuntimeTelemetryOptions,
  type SemanticRuntimeTelemetryOptions,
} from '../telemetry/options.js';
import {
  measureSemanticRuntimePhase,
  type SemanticRuntimePhaseTiming,
} from '../telemetry/phase.js';
import type { RouteConfigContextMaterializationProjectResult } from '../router/route-context-materialization.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import {
  CustomElementDefinition,
  type CustomElementTemplateDefinition,
  CustomElementTemplateKind,
} from '../resources/custom-element-definition.js';
import type { ResourceDefinitionIndex } from '../resources/resource-definition-index.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { KernelStore, KernelTelemetryReadView } from '../kernel/store.js';
import { sourceFileAddressHostPath } from '../boot/source-ownership.js';
import { sourceFileAddressForAddress } from '../kernel/source-address.js';
import { sourceTextContentRevision } from '../kernel/source-text-revision.js';
import { SemanticRuntimeAnalysisCurrentnessError } from '../kernel/analysis-currentness.js';
import {
  SemanticRuntimeProjectInputReadKind,
  semanticRuntimeProjectInputFileReadKey,
} from '../kernel/project-input.js';
import type { FrameworkSupportCatalogs } from '../framework/framework-support-authority.js';
import type { GenerationAuthority } from '../kernel/generation-authority.js';
import type {
  ComputationChildCarry,
  ComputationRead,
  ComputationReadRebaseContext,
  ComputationReadRebaser,
  ComputationRun,
} from '../kernel/computation-lifecycle.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import { CheckerTypeProjector } from '../type-system/checker-projector.js';
import type { StaticProjectEvaluationResult } from '../evaluation/project-evaluation.js';
import {
  DiProviderActivationView,
  noDiProviderActivationValues,
} from '../di/provider-activation.js';
import {
  runtimeBoundControllerValueTableForTemplateResources,
  type RuntimeBoundControllerValueTable,
} from '../observation/runtime-bound-controller-value.js';
import type {
  ComputedObserverSourceProjectResult,
} from '../observation/computed-observer-source.js';
import { StateStoreVisibility } from '../state/state-store-visibility.js';
import {
  AttributeClassificationMaterializer,
  type AttributeClassificationEmission,
  type AttributeClassificationRequest,
} from './attribute-classification-materializer.js';
import {
  AttributeSyntaxMaterializer,
  type AttributeSyntaxParseEmission,
  type AttributeSyntaxParseRequest,
} from './attribute-syntax-materializer.js';
import type { AttributeSyntax } from './attribute-syntax.js';
import type { TemplateCompilerWorldEmission } from './compiler-world-materializer.js';
import {
  TemplateCompilerCompileRequest,
  TemplateCompilerCompileState,
  templateCompilerCompileState,
  type TemplateCompilerCompileHost,
  type TemplateCompilerService,
} from './compiler-world.js';
import {
  TemplateCompilationUnitConstructionRequest,
  TemplateCompilationUnitMaterializer,
  type TemplateCompilationUnitEmission,
} from './compilation-unit-materializer.js';
import {
  TemplateCompilationUnitKind,
  TemplateSourceKind,
  TemplateSourceOwnerReference,
} from './compilation-unit.js';
import {
  HtmlParseMaterializer,
  type HtmlParseEmission,
  type HtmlParseRequest,
} from './html-parse-materializer.js';
import {
  TemplateValueSiteMaterializer,
  type TemplateValueSiteEmission,
  type TemplateValueSiteRequest,
} from './value-site-materializer.js';
import {
  BindingCommandLoweringMaterializer,
  type BindingCommandLoweringEmission,
  type BindingCommandLoweringRequest,
} from './binding-command-lowering-materializer.js';
import type { TemplateCompilerAttributeOwnerProgression } from './attribute-owner-progression.js';
import {
  CompiledTemplateMaterializer,
  type CompiledTemplateEmission,
  type CompiledTemplateMaterializationRequest,
} from './compiled-template-materializer.js';
import {
  HydrateElementInstruction,
} from './instruction-ir.js';
import {
  TemplateRuntimeAnalysisMaterializer,
  TemplateRuntimeAnalysisRequest,
  type TemplateRuntimeAnalysisEmission,
} from './template-runtime-analysis.js';
import {
  TemplateRuntimeAnalysisProjectContext,
  TemplateRuntimeAnalysisResource,
} from './template-runtime-analysis-context.js';
import {
  directDependencyDefinitions,
} from './resource-scope-builder.js';
import {
  LocalTemplateDefinitionMaterializer,
} from './local-template-definition-materializer.js';
import {
  TemplateCompilerReadObservation,
  TemplateCompilerReadView,
  TemplateCompilerWorldAuthority,
} from './compiler-read-view.js';
import {
  TemplateCompilerHookKind,
} from './compiler-hook-world.js';
import { TemplateCompilerInvocationWorldMaterializer } from './compiler-invocation-world-materializer.js';
import {
  TemplateCompilationCohortKind,
  TemplateCompilationLocus,
  type TemplateCompilationCohortProjectPlan,
  type TemplateCompilationCohortPlan,
  type TemplateCompilationOwnerPlan,
  encodeTemplateCompilationKeyParts,
} from './template-compilation-cohort.js';
import {
  TemplateCompilationCohortPlanner,
  TemplateCompilationCohortPlanningPhase,
  TemplateCompilationCohortPlanningRequest,
} from './template-compilation-cohort-planner.js';
import {
  buildTemplateCompilerNormalizedSiteIndex,
  TemplateCompilerNormalizedSiteIndexState,
  type TemplateCompilerNormalizedSiteIndexResult,
} from './template-compiler-normalized-site-index.js';

/** Front-door template products produced for one compiler-visible custom element definition. */
export class TemplateResourceCompilationEmission {
  /** Top-level and secondary AttrSyntax products in compiler publication order. */
  readonly authoredAttributeSyntaxes: readonly AttributeSyntax[];
  /** JIT-ordered owner observations consumed by mapper-sensitive lowering. */
  readonly attributeOwnerProgression: TemplateCompilerAttributeOwnerProgression;

  constructor(
    /** Store-local key shared by this resource's compiler and runtime phases. */
    readonly localKey: string,
    /** Top-level authored family retained across recursive local-template compilation. */
    readonly familyOwnerHandle: IdentityHandle | ProductHandle,
    /** Root compiler-world product that owns this runtime-analysis cohort. */
    readonly analysisContextProductHandle: ProductHandle,
    /** App-root component definition for this cohort; null when authoring/runtime ownership is not proven. */
    readonly appRootDefinitionProductHandle: ProductHandle | null,
    /** Compiler world supplied before this definition's compiler-local resources are introduced. */
    readonly parentCompilerWorld: TemplateCompilerWorldEmission,
    /** Compiler world that supplied resources, syntax handlers, and runtime-shaped compiler services. */
    readonly compilerWorld: TemplateCompilerWorldEmission,
    /** Custom element definition whose authored template was admitted. */
    readonly definition: CustomElementDefinition,
    /** Compilation-unit emission for the authored template source. */
    readonly unit: TemplateCompilationUnitEmission,
    /** Authored HTML parse emission for the template source. */
    readonly html: HtmlParseEmission,
    /** Runtime-shaped attribute syntax parse over the HTML attributes. */
    readonly attributeSyntax: AttributeSyntaxParseEmission,
    /** Resource/bindable/binding-command classification over parsed attribute syntax. */
    readonly attributeClassification: AttributeClassificationEmission,
    /** Value sites plus expression parser publications for parser-owned values. */
    readonly valueSites: TemplateValueSiteEmission,
    /** Binding-command build inputs, command-owned parser publications, and instruction products. */
    readonly bindingCommandLowering: BindingCommandLoweringEmission,
    /** Compiled template handoff: render targets, instruction rows, and visible compiler gaps. */
    readonly compiledTemplate: CompiledTemplateEmission,
    /** Complete compiler-scope read set observed while producing this front door. */
    readonly registeredReads: readonly ComputationRead[],
  ) {
    this.authoredAttributeSyntaxes = [
      ...attributeSyntax.syntaxes,
      ...bindingCommandLowering.attributeSyntaxes,
    ];
    this.attributeOwnerProgression = bindingCommandLowering.attributeOwnerProgression;
  }

  /** Retain compiler products while rebasing the generation-bound authorities consumed downstream. */
  forGeneration(
    parentCompilerWorld: TemplateCompilerWorldEmission,
    compilerWorld: TemplateCompilerWorldEmission,
    definition: CustomElementDefinition,
    registeredReads: readonly ComputationRead[],
  ): TemplateResourceCompilationEmission {
    return new TemplateResourceCompilationEmission(
      this.localKey,
      this.familyOwnerHandle,
      this.analysisContextProductHandle,
      this.appRootDefinitionProductHandle,
      parentCompilerWorld,
      compilerWorld,
      definition,
      this.unit,
      this.html,
      this.attributeSyntax,
      this.attributeClassification,
      this.valueSites,
      this.bindingCommandLowering,
      this.compiledTemplate,
      registeredReads,
    );
  }
}

/**
 * Opt-in raw whole-source precedent for browser-occurrence compilation.
 *
 * This is not runtime compiled output. It preserves the original authored product space under the pre-local compiler
 * world so later root/child lane views can spend the exact bundles referenced by browser occurrence origins.
 */
export const enum TemplateCompilerOccurrencePrecedentAdmissionKind {
  /** Initial overlap corridor: legacy source extraction proved at least one authored local declaration. */
  LegacyLocalOverlap = 'legacy-local-overlap',
  /** Authored syntax names a possible local declaration even though legacy static extraction did not close. */
  AuthoredLocalSyntaxCandidate = 'authored-local-syntax-candidate',
}

export class TemplateCompilerOccurrencePrecedentEmission {
  readonly normalizedSites: TemplateCompilerNormalizedSiteIndexResult;

  constructor(
    readonly compilation: TemplateResourceCompilationEmission,
    readonly preLocalCompilerWorld: TemplateCompilerWorldEmission,
    readonly sourceRevision: string,
    readonly admissionKind: TemplateCompilerOccurrencePrecedentAdmissionKind,
  ) {
    this.normalizedSites = buildTemplateCompilerNormalizedSiteIndex(compilation);
    const template = compilation.definition.template;
    const rootContext = compilation.unit.rootContext;
    if (
      template?.kind !== CustomElementTemplateKind.Markup
      || template.markup == null
      || template.authoredSourceRevision !== sourceRevision
      || compilation.unit.templateSource.markup !== template.markup
      || compilation.parentCompilerWorld !== preLocalCompilerWorld
      || compilation.compilerWorld !== preLocalCompilerWorld
      || compilation.html.draft == null
      || (this.normalizedSites.state === TemplateCompilerNormalizedSiteIndexState.GraphExact
        && this.normalizedSites.index?.compilation !== compilation)
      || rootContext.localElementNames.length !== 0
      || rootContext.dependencyIdentityHandles.length !== 0
    ) {
      throw new Error(
        'Occurrence precedent lost raw source, pre-local world, normalized-site ownership, or local cohort authority.',
      );
    }
  }
}

/** One recursive resource compilation plus the optional raw occurrence precedent for its owner lane. */
export class TemplateResourceFamilyCompilationEmission {
  constructor(
    readonly compilations: readonly TemplateResourceCompilationEmission[],
    readonly occurrencePrecedents: readonly TemplateCompilerOccurrencePrecedentEmission[],
  ) {
    const ordinary = new Set(compilations);
    if (
      (occurrencePrecedents.length > 0 && compilations.length === 0)
      || occurrencePrecedents.some((precedent) => ordinary.has(precedent.compilation))
      || new Set(occurrencePrecedents.map((precedent) => precedent.compilation.localKey)).size
        !== occurrencePrecedents.length
    ) {
      throw new Error('Resource family compilation lost runtime output or mixed its occurrence precedent into it.');
    }
  }
}

/** Complete compiler-front-door input for one template occurrence in one compiler cohort. */
export class TemplateResourceCompilationRequest {
  constructor(
    readonly localKey: string,
    readonly familyOwnerHandle: IdentityHandle | ProductHandle,
    readonly analysisContextProductHandle: ProductHandle,
    readonly appRootDefinitionProductHandle: ProductHandle | null,
    readonly parentCompilerWorld: TemplateCompilerWorldEmission,
    readonly compilerWorld: TemplateCompilerWorldEmission,
    readonly definition: CustomElementDefinition,
    readonly template: CustomElementTemplateDefinition,
    readonly compilerReads: TemplateCompilerReadView,
    readonly localElementNames: readonly string[] = [],
    readonly dependencyIdentityHandles: readonly IdentityHandle[] = [],
    readonly retainDraftBindings: boolean = false,
  ) {}
}

/** Recursive template-family front door rooted at one admitted custom-element template. */
export class TemplateResourceFamilyCompilationRequest {
  constructor(
    readonly localKey: string,
    readonly familyOwnerHandle: IdentityHandle | ProductHandle,
    readonly analysisContextProductHandle: ProductHandle,
    readonly appRootDefinitionProductHandle: ProductHandle | null,
    readonly compilerWorldAuthority: TemplateCompilerWorldAuthority,
    readonly definition: CustomElementDefinition,
    readonly template: CustomElementTemplateDefinition,
    readonly includeCompilerOccurrencePrecedents: boolean = false,
  ) {}
}

/** Runtime/checker products produced after the project has admitted compiled template front doors. */
export class TemplateResourceRuntimeAnalysisEmission {
  constructor(
    /** Compiler-front-door products for the analyzed resource. */
    readonly compilation: TemplateResourceCompilationEmission,
    /** Runtime/checker analysis downstream of compiled-template row assembly. */
    readonly runtimeAnalysis: TemplateRuntimeAnalysisEmission,
  ) {}

  /** Preserve runtime/checker products while adopting the current front-door and expression-world authorities. */
  forGeneration(
    compilation: TemplateResourceCompilationEmission,
    expressionWorld: CheckerExpressionTypeWorld,
  ): TemplateResourceRuntimeAnalysisEmission {
    return new TemplateResourceRuntimeAnalysisEmission(
      compilation,
      this.runtimeAnalysis.forExpressionWorld(expressionWorld),
    );
  }

  /** Reuse retained semantic products under current front-door authorities without replaying runtime analysis. */
  forCarriedGeneration(
    compilation: TemplateResourceCompilationEmission,
    expressionWorld: CheckerExpressionTypeWorld,
  ): TemplateResourceRuntimeAnalysisEmission {
    return new TemplateResourceRuntimeAnalysisEmission(
      compilation,
      this.runtimeAnalysis.forCarriedExpressionWorld(expressionWorld),
    );
  }

  /** Preserve the analyzed products while replacing their closed run-bound expression world. */
  forCommittedGeneration(expressionWorld: CheckerExpressionTypeWorld): TemplateResourceRuntimeAnalysisEmission {
    return this.forGeneration(this.compilation, expressionWorld);
  }
}

export type TemplateCompilationProjectPhaseName =
  | TemplateCompilationCohortPlanningPhase
  | 'compilation-unit'
  | 'html-parse'
  | 'compiler-hook-world'
  | 'local-template-definitions'
  | 'attribute-syntax'
  | 'attribute-classification'
  | 'value-sites'
  | 'binding-command-lowering'
  | 'compiled-template'
  | 'runtime-analysis';

export type TemplateCompilationProjectPhaseTiming = SemanticRuntimePhaseTiming<TemplateCompilationProjectPhaseName>;

export interface TemplateCompilationProjectProfile {
  readonly totalMilliseconds: number;
  readonly phases: readonly TemplateCompilationProjectPhaseTiming[];
}

export interface TemplateCompilationProjectOptions {
  readonly runtimeAnalysisDepth?: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`;
  readonly evaluation?: StaticProjectEvaluationResult | null;
  /** Pre-template state visibility authority; omitted only when the standalone compiler has no state project. */
  readonly stateStoreVisibility?: StateStoreVisibility;
  readonly includeAuthoringTemplates?: boolean;
  /** Retain raw whole-source compiler precedents for browser-occurrence/AOT compilation. */
  readonly includeCompilerOccurrencePrecedents?: boolean;
  readonly authoringTemplateSourceFiles?: readonly string[];
  readonly authoringTemplateLimit?: number | null;
  readonly projectKey?: string;
  readonly telemetry?: SemanticRuntimeTelemetryOptions | null;
  /** Pre-template computed-source authority available to controller observer setup. */
  readonly computedObserverSources?: ComputedObserverSourceProjectResult | null;
}

/** Immutable pre-template plan shared by family compilation and post-template runtime analysis. */
export class TemplateCompilationProjectPlan {
  constructor(
    readonly appWorld: AureliaAppWorldEmission,
    readonly cohortPlan: TemplateCompilationCohortProjectPlan,
    /** State registry definitions and DI ownership fixed for this planned compiler generation. */
    readonly stateStoreVisibility: StateStoreVisibility,
    readonly authoringTemplateSourceFiles: readonly string[],
    readonly authoringTemplateLimit: number | null,
    readonly includeCompilerOccurrencePrecedents: boolean,
    readonly telemetry: NormalizedSemanticRuntimeTelemetryOptions,
    readonly profile: TemplateCompilationProjectProfile,
  ) {}
}

/** Complete recursive compiler-front-door values before project-wide runtime/checker analysis. */
export class TemplateCompilationFamilyFrontDoorEmission {
  readonly cohortKeys: readonly string[];
  readonly appCompilations: readonly TemplateResourceCompilationEmission[];
  readonly authoringCompilations: readonly TemplateResourceCompilationEmission[];

  constructor(
    readonly ownerHandle: IdentityHandle | ProductHandle,
    cohortKeys: readonly string[],
    appCompilations: readonly TemplateResourceCompilationEmission[],
    authoringCompilations: readonly TemplateResourceCompilationEmission[],
    readonly appOccurrencePrecedents: readonly TemplateCompilerOccurrencePrecedentEmission[] = [],
    readonly authoringOccurrencePrecedents: readonly TemplateCompilerOccurrencePrecedentEmission[] = [],
    readonly occurrencePrecedentsRequested: boolean = false,
  ) {
    this.cohortKeys = Object.freeze([...cohortKeys]);
    this.appCompilations = Object.freeze([...appCompilations]);
    this.authoringCompilations = Object.freeze([...authoringCompilations]);
    this.appOccurrencePrecedents = Object.freeze([...appOccurrencePrecedents]);
    this.authoringOccurrencePrecedents = Object.freeze([...authoringOccurrencePrecedents]);
    const ordinary = new Set([...appCompilations, ...authoringCompilations]);
    const precedents = [...appOccurrencePrecedents, ...authoringOccurrencePrecedents];
    if (
      precedents.some((precedent) =>
        ordinary.has(precedent.compilation)
        || precedent.compilation.familyOwnerHandle !== ownerHandle
      )
      || (precedents.length > 0 && !occurrencePrecedentsRequested)
      || new Set(precedents.map((precedent) => precedent.compilation.localKey)).size !== precedents.length
    ) {
      throw new Error('Template front-door family mixed occurrence precedents with runtime compilation membership.');
    }
  }

  matches(owner: TemplateCompilationOwnerPlan): boolean {
    const cohortKeys = owner.cohorts.map((cohort) => cohort.key);
    return owner.ownerHandle === this.ownerHandle
      && cohortKeys.length === this.cohortKeys.length
      && cohortKeys.every((key, index) => key === this.cohortKeys[index]);
  }
}

/** Candidate-local bridge from a retained family closure to current compiler-world and read authorities. */
class TemplateCompilationFamilyCarryRebaser {
  private readonly worldsByScope = new Map<IdentityHandle, TemplateCompilerWorldEmission>();
  private readonly containersByIdentity = new Map<IdentityHandle, TemplateCompilerWorldEmission['container']>();
  private readonly callableBindingsByContainerIdentity = new Map<
    IdentityHandle,
    TemplateCompilerWorldEmission['callableBindings']
  >();
  private readonly readRebasersByScope = new Map<
    IdentityHandle,
    (read: TemplateCompilerReadObservation) => TemplateCompilerReadObservation | null
  >();

  constructor(
    private readonly owner: TemplateCompilationOwnerPlan,
    private readonly previous: TemplateCompilationFamilyFrontDoorEmission,
    private readonly project: ProjectBootFrame | null,
  ) {
    for (const cohort of owner.cohorts) {
      const world = cohort.parentCompilerWorld;
      this.containersByIdentity.set(world.container.identityHandle, world.container);
      this.callableBindingsByContainerIdentity.set(world.container.identityHandle, world.callableBindings);
      this.worldsByScope.set(world.resourceScope.identityHandle, world);
    }
    for (const compilation of [
      ...previous.appCompilations,
      ...previous.authoringCompilations,
      ...previous.appOccurrencePrecedents.map((precedent) => precedent.compilation),
      ...previous.authoringOccurrencePrecedents.map((precedent) => precedent.compilation),
    ]) {
      this.rebaseWorld(compilation.parentCompilerWorld);
      this.rebaseWorld(compilation.compilerWorld);
    }
  }

  readonly rebaseRead = (
    read: ComputationRead,
    context: ComputationReadRebaseContext,
  ): ComputationRead | null | undefined => {
    const projectInput = this.project?.inputGeneration.rebaseComputationRead(read);
    if (projectInput !== undefined) {
      return projectInput;
    }
    if (!(read instanceof TemplateCompilerReadObservation)) {
      return undefined;
    }
    const world = this.worldsByScope.get(read.compilerScopeIdentityHandle) ?? null;
    if (world == null) {
      return null;
    }
    let rebase = this.readRebasersByScope.get(read.compilerScopeIdentityHandle);
    if (rebase == null) {
      rebase = TemplateCompilerReadObservation.createRebaser(
        context,
        TemplateCompilerWorldAuthority.fixed(world),
      );
      this.readRebasersByScope.set(read.compilerScopeIdentityHandle, rebase);
    }
    return rebase(read);
  };

  rebase(carry: ComputationChildCarry): TemplateCompilationFamilyFrontDoorEmission {
    return new TemplateCompilationFamilyFrontDoorEmission(
      this.owner.ownerHandle,
      this.owner.cohorts.map((cohort) => cohort.key),
      this.previous.appCompilations.map((compilation) => this.rebaseCompilation(compilation, carry)),
      this.previous.authoringCompilations.map((compilation) => this.rebaseCompilation(compilation, carry)),
      this.previous.appOccurrencePrecedents.map((precedent) => this.rebasePrecedent(precedent, carry)),
      this.previous.authoringOccurrencePrecedents.map((precedent) => this.rebasePrecedent(precedent, carry)),
      this.previous.occurrencePrecedentsRequested,
    );
  }

  private rebaseCompilation(
    compilation: TemplateResourceCompilationEmission,
    carry: ComputationChildCarry,
  ): TemplateResourceCompilationEmission {
    const parentCompilerWorld = this.rebaseWorld(compilation.parentCompilerWorld);
    const compilerWorld = this.rebaseWorld(compilation.compilerWorld);
    if (parentCompilerWorld == null || compilerWorld == null) {
      throw new Error(`Carried template family ${this.owner.ownerHandle} lost its current compiler-world container.`);
    }
    return compilation.forGeneration(
      parentCompilerWorld,
      compilerWorld,
      compilation.definition,
      compilation.registeredReads.map((read) => carry.readFor(read)),
    );
  }

  private rebasePrecedent(
    precedent: TemplateCompilerOccurrencePrecedentEmission,
    carry: ComputationChildCarry,
  ): TemplateCompilerOccurrencePrecedentEmission {
    const compilation = this.rebaseCompilation(precedent.compilation, carry);
    if (compilation.compilerWorld !== compilation.parentCompilerWorld) {
      throw new Error(`Carried occurrence precedent '${compilation.localKey}' lost its pre-local compiler world.`);
    }
    return new TemplateCompilerOccurrencePrecedentEmission(
      compilation,
      compilation.compilerWorld,
      precedent.sourceRevision,
      precedent.admissionKind,
    );
  }

  private rebaseWorld(previous: TemplateCompilerWorldEmission): TemplateCompilerWorldEmission | null {
    const scopeIdentityHandle = previous.resourceScope.identityHandle;
    const current = this.worldsByScope.get(scopeIdentityHandle) ?? null;
    if (current != null) {
      return current;
    }
    const container = this.containersByIdentity.get(previous.container.identityHandle) ?? null;
    if (container == null) {
      return null;
    }
    const callableBindings = this.callableBindingsByContainerIdentity.get(container.identityHandle) ?? null;
    if (callableBindings == null) {
      return null;
    }
    const rebased = previous.forContainerGeneration(container, callableBindings);
    this.worldsByScope.set(scopeIdentityHandle, rebased);
    return rebased;
  }
}

/** Complete recursive compiler-front-door values before project-wide runtime/checker analysis. */
export class TemplateCompilationFrontDoorEmission {
  readonly families: readonly TemplateCompilationFamilyFrontDoorEmission[];
  readonly appCompilations: readonly TemplateResourceCompilationEmission[];
  readonly authoringCompilations: readonly TemplateResourceCompilationEmission[];
  private readonly familiesByOwnerHandle: ReadonlyMap<IdentityHandle | ProductHandle, TemplateCompilationFamilyFrontDoorEmission>;
  private readonly membershipRevision: string;

  constructor(
    readonly plan: TemplateCompilationProjectPlan,
    families: readonly TemplateCompilationFamilyFrontDoorEmission[],
    readonly profile: TemplateCompilationProjectProfile,
  ) {
    this.families = Object.freeze([...families]);
    this.appCompilations = Object.freeze(families.flatMap((family) => family.appCompilations));
    this.authoringCompilations = Object.freeze(families.flatMap((family) => family.authoringCompilations));
    this.familiesByOwnerHandle = new Map(families.map((family) => [family.ownerHandle, family]));
    this.membershipRevision = templateFrontDoorMembershipRevision(families);
    if (this.familiesByOwnerHandle.size !== families.length) {
      throw new Error('Template front-door emission contains duplicate family owners.');
    }
  }

  familyForOwner(
    ownerHandle: IdentityHandle | ProductHandle,
  ): TemplateCompilationFamilyFrontDoorEmission | null {
    return this.familiesByOwnerHandle.get(ownerHandle) ?? null;
  }

  hasSameMembershipAs(other: TemplateCompilationFrontDoorEmission): boolean {
    return this.membershipRevision === other.membershipRevision;
  }
}

/** Rebase candidate-owned compiler reads through the current complete front-door compiler scopes. */
export function templateCompilerReadRebaserForFrontDoor(
  frontDoor: TemplateCompilationFrontDoorEmission,
  project: ProjectBootFrame,
): ComputationReadRebaser {
  const worldsByScope = new Map(uniqueCompilerWorlds([
    ...frontDoor.plan.appWorld.compilerWorlds,
    ...frontDoor.appCompilations.flatMap((compilation) => [
      compilation.parentCompilerWorld,
      compilation.compilerWorld,
    ]),
    ...frontDoor.authoringCompilations.flatMap((compilation) => [
      compilation.parentCompilerWorld,
      compilation.compilerWorld,
    ]),
  ]).map((world) => [world.resourceScope.identityHandle, world]));
  const rebasers = new Map<
    IdentityHandle,
    (read: TemplateCompilerReadObservation) => TemplateCompilerReadObservation | null
  >();
  return (read, context) => {
    const projectInput = project.inputGeneration.rebaseComputationRead(read);
    if (projectInput !== undefined) {
      return projectInput;
    }
    if (!(read instanceof TemplateCompilerReadObservation)) {
      return undefined;
    }
    const world = worldsByScope.get(read.compilerScopeIdentityHandle) ?? null;
    if (world == null) {
      return null;
    }
    let rebase = rebasers.get(read.compilerScopeIdentityHandle);
    if (rebase == null) {
      rebase = TemplateCompilerReadObservation.createRebaser(
        context,
        TemplateCompilerWorldAuthority.fixed(world),
      );
      rebasers.set(read.compilerScopeIdentityHandle, rebase);
    }
    return rebase(read);
  };
}

class TemplateCompilationPhaseRecorder {
  readonly phases: TemplateCompilationProjectPhaseTiming[] = [];

  constructor(
    private readonly kernel: KernelTelemetryReadView,
    readonly telemetry: NormalizedSemanticRuntimeTelemetryOptions,
  ) {}

  measure<TValue>(
    name: TemplateCompilationProjectPhaseName,
    read: () => TValue,
  ): TValue {
    return measureSemanticRuntimePhase(this.phases, name, this.kernel, this.telemetry, read);
  }
}

/** Template compilation-front-door result for one app-world composition. */
export class TemplateCompilationProjectEmission {
  get appWorld(): AureliaAppWorldEmission {
    return this.frontDoor.plan.appWorld;
  }

  get cohortPlan(): TemplateCompilationCohortProjectPlan {
    return this.frontDoor.plan.cohortPlan;
  }

  get authoringTemplateSourceFiles(): readonly string[] {
    return this.frontDoor.plan.authoringTemplateSourceFiles;
  }

  get authoringTemplateLimit(): number | null {
    return this.frontDoor.plan.authoringTemplateLimit;
  }

  get compilerWorlds(): readonly TemplateCompilerWorldEmission[] {
    return uniqueCompilerWorlds([
      ...this.cohortPlan.appRootCompilerWorlds,
      ...this.resources.map((resource) => resource.compilation.compilerWorld),
      ...this.authoringResources.map((resource) => resource.compilation.compilerWorld),
    ]);
  }

  constructor(
    /** Plan plus complete recursive compiler-front-door values consumed by runtime/checker analysis. */
    readonly frontDoor: TemplateCompilationFrontDoorEmission,
    /** App/runtime visible template compilation plus runtime/checker analysis emissions. */
    readonly resources: readonly TemplateResourceRuntimeAnalysisEmission[],
    /** Opt-in standalone resource-library template emissions for authoring/LSP inquiries. */
    readonly authoringResources: readonly TemplateResourceRuntimeAnalysisEmission[],
    /** Checker-expression generation shared by every resource and app-level follow-up in this project emission. */
    readonly expressionWorld: CheckerExpressionTypeWorld,
    /** Nested timing profile for template front-door and runtime-analysis pressure. */
    readonly profile: TemplateCompilationProjectProfile,
  ) {}

  /** Replace a run-bound expression world with a fresh store-backed world after this generation commits. */
  forCommittedGeneration(authority: GenerationAuthority): TemplateCompilationProjectEmission {
    const expressionWorld = this.expressionWorld.forCommittedGeneration(authority);
    return new TemplateCompilationProjectEmission(
      this.frontDoor,
      this.resources.map((resource) => resource.forCommittedGeneration(expressionWorld)),
      this.authoringResources.map((resource) => resource.forCommittedGeneration(expressionWorld)),
      expressionWorld,
      this.profile,
    );
  }
}

/**
 * Runs the current template front door over compiler-visible custom elements.
 *
 * This pass establishes the route from converged resource definitions through compiler-world selection into
 * compilation units, authored HTML, runtime-shaped attribute syntax, attribute classification, compiler-owned
 * value-site selection, binding-command lowering, compiled-template row assembly, runtime Rendering dispatch, and
 * TypeChecker-backed binding-scope projection. Remaining compiler gaps stay visible as open seams at the materializer
 * that exposed them.
 */
export class TemplateCompilationProjectPass {
  private readonly invocationWorlds: TemplateCompilerInvocationWorldMaterializer;
  private readonly cohortPlanner: TemplateCompilationCohortPlanner;
  private readonly unitMaterializer: TemplateCompilationUnitMaterializer;
  private readonly htmlParser: HtmlParseMaterializer;
  private readonly localTemplateDefinitions: LocalTemplateDefinitionMaterializer;
  private readonly attributeSyntax: AttributeSyntaxMaterializer;
  private readonly attributeClassification: AttributeClassificationMaterializer;
  private readonly valueSites: TemplateValueSiteMaterializer;
  private readonly bindingCommandLowering: BindingCommandLoweringMaterializer;
  private readonly compiledTemplate: CompiledTemplateMaterializer;
  private readonly runtimeAnalysis: TemplateRuntimeAnalysisMaterializer;

  constructor(
    /** Hot analysis store shared by child materializers. */
    readonly store: KernelStore,
    /** Publication context shared by the compiler-front-door phases. */
    readonly publication: ComputationRun,
    /** Stable framework support borrowed by standalone authoring compiler worlds. */
    readonly support: FrameworkSupportCatalogs,
  ) {
    this.invocationWorlds = new TemplateCompilerInvocationWorldMaterializer(store, publication);
    this.cohortPlanner = new TemplateCompilationCohortPlanner(store, publication, support);
    this.unitMaterializer = new TemplateCompilationUnitMaterializer(publication);
    this.htmlParser = new HtmlParseMaterializer(publication);
    this.localTemplateDefinitions = new LocalTemplateDefinitionMaterializer(publication);
    this.attributeSyntax = new AttributeSyntaxMaterializer(publication);
    this.attributeClassification = new AttributeClassificationMaterializer(publication);
    this.valueSites = new TemplateValueSiteMaterializer(publication);
    this.bindingCommandLowering = new BindingCommandLoweringMaterializer(publication);
    this.compiledTemplate = new CompiledTemplateMaterializer(publication);
    this.runtimeAnalysis = new TemplateRuntimeAnalysisMaterializer(store, publication);
  }

  compile(
    appWorld: AureliaAppWorldEmission,
    typeSystem: TypeSystemProject | null = null,
    resourceDefinitions: ResourceDefinitionIndex | null = null,
    routeContexts: RouteConfigContextMaterializationProjectResult | null = null,
    options: TemplateCompilationProjectOptions = {},
  ): TemplateCompilationProjectEmission {
    const plan = this.plan(appWorld, typeSystem, resourceDefinitions, routeContexts, options);
    const frontDoor = this.compileFrontDoors(plan);
    return this.analyzeFrontDoors(frontDoor, typeSystem, resourceDefinitions, options);
  }

  /** Plan the complete stable owner/cohort set before entering any authored family child. */
  plan(
    appWorld: AureliaAppWorldEmission,
    typeSystem: TypeSystemProject | null = null,
    resourceDefinitions: ResourceDefinitionIndex | null = null,
    routeContexts: RouteConfigContextMaterializationProjectResult | null = null,
    options: TemplateCompilationProjectOptions = {},
  ): TemplateCompilationProjectPlan {
    const started = performance.now();
    const telemetry = normalizeSemanticRuntimeTelemetryOptions(
      options.telemetry,
      DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE,
    );
    const phases = new TemplateCompilationPhaseRecorder(this.publication, telemetry);
    const authoringTemplateLimit = normalizedAuthoringTemplateLimit(options.authoringTemplateLimit);
    const authoringTemplateSourceFiles = normalizedAuthoringTemplateSourceFiles(options.authoringTemplateSourceFiles);
    const projectKey = options.projectKey ?? 'project';
    const cohortPlan = this.cohortPlanner.plan(new TemplateCompilationCohortPlanningRequest(
      projectKey,
      appWorld,
      typeSystem,
      resourceDefinitions,
      routeContexts,
      options.includeAuthoringTemplates === true,
      authoringTemplateSourceFiles,
      authoringTemplateLimit,
      phases,
    ));
    return new TemplateCompilationProjectPlan(
      appWorld,
      cohortPlan,
      options.stateStoreVisibility ?? StateStoreVisibility.empty(),
      authoringTemplateSourceFiles,
      authoringTemplateLimit,
      options.includeCompilerOccurrencePrecedents === true,
      telemetry,
      templateCompilationProfile(started, phases.phases),
    );
  }

  /** Compile every recursive family under its existing stable child locus. */
  compileFrontDoors(
    plan: TemplateCompilationProjectPlan,
    project: ProjectBootFrame | null = null,
    previous: TemplateCompilationFrontDoorEmission | null = null,
  ): TemplateCompilationFrontDoorEmission {
    const started = performance.now();
    const phases = new TemplateCompilationPhaseRecorder(this.publication, plan.telemetry);
    const families = this.activatePlannedFamilies(
      plan.cohortPlan,
      plan.includeCompilerOccurrencePrecedents,
      phases,
      project,
      previous,
    );
    return new TemplateCompilationFrontDoorEmission(
      plan,
      families,
      mergeTemplateCompilationProfiles(plan.profile, templateCompilationProfile(started, phases.phases)),
    );
  }

  /** Materialize the shared runtime/checker graph from already compiled family front doors. */
  analyzeFrontDoors(
    frontDoor: TemplateCompilationFrontDoorEmission,
    typeSystem: TypeSystemProject | null = null,
    resourceDefinitions: ResourceDefinitionIndex | null = null,
    options: TemplateCompilationProjectOptions = {},
  ): TemplateCompilationProjectEmission {
    const started = performance.now();
    const evaluation = options.evaluation?.forkSession() ?? null;
    const sourceValueActivationView = evaluation == null || typeSystem == null
      ? null
      : new DiProviderActivationView(
          this.publication,
          evaluation,
          typeSystem,
          frontDoor.plan.appWorld.configuration,
          frontDoor.plan.appWorld.diWorld,
          noDiProviderActivationValues,
        );
    const phaseRecorder = new TemplateCompilationPhaseRecorder(this.publication, frontDoor.plan.telemetry);
    const runtimeAnalysisDepth = options.runtimeAnalysisDepth ?? DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH;
    const stateStoreVisibility = frontDoor.plan.stateStoreVisibility
      .withContainers(templateCompilerWorldContainers(frontDoor));
    const expressionWorld = new CheckerExpressionTypeWorld(
      this.store,
      new CheckerTypeProjector(this.store, this.publication),
      undefined,
      stateStoreVisibility,
    );
    const resources = this.analyzeCompiledResources(
      frontDoor.appCompilations,
      options.projectKey ?? null,
      evaluation,
      typeSystem,
      sourceValueActivationView,
      resourceDefinitions,
      options.computedObserverSources ?? null,
      runtimeAnalysisDepth,
      expressionWorld,
      phaseRecorder,
    );
    const authoringResources = this.analyzeCompiledResources(
      frontDoor.authoringCompilations,
      options.projectKey ?? null,
      evaluation,
      typeSystem,
      sourceValueActivationView,
      resourceDefinitions,
      options.computedObserverSources ?? null,
      runtimeAnalysisDepth,
      expressionWorld,
      phaseRecorder,
    );

    return new TemplateCompilationProjectEmission(
      frontDoor,
      resources,
      authoringResources,
      expressionWorld,
      mergeTemplateCompilationProfiles(
        frontDoor.profile,
        templateCompilationProfile(started, phaseRecorder.phases),
      ),
    );
  }

  /** Rebind one lifecycle-carried runtime-analysis graph to the current equivalent front door. */
  rebaseAnalyzedFrontDoors(
    frontDoor: TemplateCompilationFrontDoorEmission,
    previous: TemplateCompilationProjectEmission,
    options: TemplateCompilationProjectOptions = {},
  ): TemplateCompilationProjectEmission | null {
    const runtimeAnalysisDepth = options.runtimeAnalysisDepth ?? DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH;
    if (
      !frontDoor.hasSameMembershipAs(previous.frontDoor)
      || [...previous.resources, ...previous.authoringResources].some(
        (resource) => resource.runtimeAnalysis.analysisDepth !== runtimeAnalysisDepth,
      )
    ) {
      return null;
    }
    const stateStoreVisibility = frontDoor.plan.stateStoreVisibility
      .withContainers(templateCompilerWorldContainers(frontDoor));
    const expressionWorld = new CheckerExpressionTypeWorld(
      this.store,
      new CheckerTypeProjector(this.store, this.publication),
      undefined,
      stateStoreVisibility,
    );
    const resources = rebaseRuntimeAnalysisResources(
      frontDoor.appCompilations,
      previous.resources,
      expressionWorld,
    );
    const authoringResources = rebaseRuntimeAnalysisResources(
      frontDoor.authoringCompilations,
      previous.authoringResources,
      expressionWorld,
    );
    if (resources == null || authoringResources == null) {
      return null;
    }
    return new TemplateCompilationProjectEmission(
      frontDoor,
      resources,
      authoringResources,
      expressionWorld,
      frontDoor.profile,
    );
  }

  /** Activate the flat family layer in plan order: carry an exact prior closure or compile that owner afresh. */
  private activatePlannedFamilies(
    plan: TemplateCompilationCohortProjectPlan,
    includeCompilerOccurrencePrecedents: boolean,
    phases: TemplateCompilationPhaseRecorder,
    project: ProjectBootFrame | null,
    previous: TemplateCompilationFrontDoorEmission | null,
  ): readonly TemplateCompilationFamilyFrontDoorEmission[] {
    const families: TemplateCompilationFamilyFrontDoorEmission[] = [];
    for (const owner of plan.ownerPlans) {
      if (
        owner.cohorts.length === 0
        || templateCompilerCompileState(owner.definition) !== TemplateCompilerCompileState.Compiled
      ) {
        continue;
      }
      const locus = new TemplateCompilationLocus(plan.projectKey, owner.ownerHandle);
      const previousFamily = previous?.familyForOwner(owner.ownerHandle) ?? null;
      const familyRebaser = previousFamily == null
        ? null
        : new TemplateCompilationFamilyCarryRebaser(owner, previousFamily, project);
      if (
        previousFamily?.matches(owner) === true
        && previousFamily.occurrencePrecedentsRequested === includeCompilerOccurrencePrecedents
        && familyRebaser != null
      ) {
        const carry = this.publication.tryCarryChild(locus, familyRebaser.rebaseRead);
        if (carry != null) {
          families.push(familyRebaser.rebase(carry));
          continue;
        }
      }
      const app: TemplateResourceCompilationEmission[] = [];
      const authoring: TemplateResourceCompilationEmission[] = [];
      const appOccurrencePrecedents: TemplateCompilerOccurrencePrecedentEmission[] = [];
      const authoringOccurrencePrecedents: TemplateCompilerOccurrencePrecedentEmission[] = [];
      this.publication.withChild(locus, () => {
        const compileOwner = (): void => {
          const definition = this.requireCurrentTemplateOwnerDefinition(owner);
          if (project != null) {
            this.requireCurrentTemplateSource(project, owner);
          }
          for (const cohort of owner.cohorts) {
            const localKey = templateResourceCompilationLocalKey(plan.projectKey, owner, cohort);
            const result = cohort.parentCompilerWorld.templateCompiler.compile(
              new TemplateCompilerCompileRequest(localKey, definition),
              new ProjectTemplateCompilerHost(
                this,
                owner.ownerHandle,
                TemplateCompilerWorldAuthority.fixed(cohort.parentCompilerWorld),
                cohort.analysisContextProductHandle,
                cohort.appRootDefinitionProductHandle,
                phases,
                includeCompilerOccurrencePrecedents,
              ),
            );
            if (result.output != null) {
              const target = cohort.kind === TemplateCompilationCohortKind.App ? app : authoring;
              target.push(...result.output.compilations);
              if (result.output.occurrencePrecedents.length > 0) {
                const precedents = cohort.kind === TemplateCompilationCohortKind.App
                  ? appOccurrencePrecedents
                  : authoringOccurrencePrecedents;
                precedents.push(...result.output.occurrencePrecedents);
              }
            }
          }
        };
        if (project == null) {
          compileOwner();
          return;
        }
        const inputReads = project.inputGeneration.createReadScope(
          `template-family:${encodeTemplateCompilationKeyParts([plan.projectKey, owner.ownerHandle])}`,
        );
        project.inputGeneration.withReadScope(inputReads, compileOwner);
        for (const read of inputReads.readRegisteredInputs()) {
          this.publication.observe(read);
        }
      });
      families.push(new TemplateCompilationFamilyFrontDoorEmission(
        owner.ownerHandle,
        owner.cohorts.map((cohort) => cohort.key),
        app,
        authoring,
        appOccurrencePrecedents,
        authoringOccurrencePrecedents,
        includeCompilerOccurrencePrecedents,
      ));
    }
    return families;
  }

  private requireCurrentTemplateOwnerDefinition(
    owner: TemplateCompilationOwnerPlan,
  ): CustomElementDefinition {
    const productHandle = owner.definition.productHandle;
    if (productHandle == null) return owner.definition;
    const definition = this.publication.readProductDetail(ResourceProductDetails.Definition, productHandle);
    if (!(definition instanceof CustomElementDefinition)) {
      throw new Error(`Template owner ${owner.definition.name} lost its current custom-element definition.`);
    }
    return definition;
  }

  private requireCurrentTemplateSource(
    project: ProjectBootFrame,
    owner: TemplateCompilationOwnerPlan,
  ): void {
    const template = owner.definition.template;
    const sourceAddressHandle = template?.addressHandle ?? null;
    if (template == null) {
      throw new Error(`Template owner ${owner.definition.name} has no template definition.`);
    }
    if (sourceAddressHandle == null) {
      if (template.kind === CustomElementTemplateKind.Open) {
        return;
      }
      throw new Error(
        `Template owner ${owner.definition.name} has no exact authored source revision `
        + `(kind=${template?.kind ?? 'absent'}, address=${sourceAddressHandle ?? 'absent'}, `
        + `contributions=${owner.definition.contributions.map((entry) => entry.contributionKind).join(',') || 'none'}).`,
      );
    }
    const sourceFile = sourceFileAddressForAddress(this.publication, sourceAddressHandle);
    if (sourceFile == null) {
      throw new Error(`Template owner ${owner.definition.name} has no authored source-file address.`);
    }
    const sourceHostPath = sourceFileAddressHostPath(project.workspaceRootDir, sourceFile);
    if (template.authoredSourceRevision == null) {
      if (!project.inputGeneration.host.fileExists(sourceHostPath)) {
        return;
      }
      if (project.inputGeneration.host.readFile(sourceHostPath) == null) {
        throw new SemanticRuntimeAnalysisCurrentnessError({
          message: `Template source ${sourceHostPath} exists but its text is unavailable.`,
          reason: 'computation-inputs-changed',
          changedReadKeys: [semanticRuntimeProjectInputFileReadKey(
            SemanticRuntimeProjectInputReadKind.FileExistence,
            sourceHostPath,
          )],
          changedFacets: ['file-existence'],
        });
      }
      throw new SemanticRuntimeAnalysisCurrentnessError({
        message: `Template source ${sourceFile.path} became available after an open definition was admitted.`,
        reason: 'computation-inputs-changed',
        changedReadKeys: [semanticRuntimeProjectInputFileReadKey(
          SemanticRuntimeProjectInputReadKind.FileExistence,
          sourceHostPath,
        )],
        changedFacets: ['file-existence'],
      });
    }
    if (!project.inputGeneration.host.fileExists(sourceHostPath)) {
      throw new SemanticRuntimeAnalysisCurrentnessError({
        message: `Template source ${sourceFile.path} is absent from its exact authored source path.`,
        reason: 'computation-inputs-changed',
        changedReadKeys: [semanticRuntimeProjectInputFileReadKey(
        SemanticRuntimeProjectInputReadKind.FileExistence,
          sourceHostPath,
        )],
        changedFacets: ['file-existence'],
      });
    }
    const sourceText = project.inputGeneration.host.readFile(sourceHostPath);
    if (sourceText == null) {
      throw new SemanticRuntimeAnalysisCurrentnessError({
        message: `Template source ${sourceHostPath} exists but its text is unavailable.`,
        reason: 'computation-inputs-changed',
        changedReadKeys: [semanticRuntimeProjectInputFileReadKey(
          SemanticRuntimeProjectInputReadKind.FileContent,
          sourceHostPath,
        )],
        changedFacets: ['file-content'],
      });
    }
    if (sourceTextContentRevision(sourceText) !== template.authoredSourceRevision) {
      throw new SemanticRuntimeAnalysisCurrentnessError({
        message: `Template source ${sourceFile.path} changed after its definition was admitted.`,
        reason: 'computation-inputs-changed',
        changedReadKeys: [semanticRuntimeProjectInputFileReadKey(
          SemanticRuntimeProjectInputReadKind.FileContent,
          sourceHostPath,
        )],
        changedFacets: ['file-content'],
      });
    }
  }

  private analyzeCompiledResources(
    compilations: readonly TemplateResourceCompilationEmission[],
    projectKey: string | null,
    evaluation: StaticProjectEvaluationResult | null,
    typeSystem: TypeSystemProject | null,
    sourceValueActivationView: DiProviderActivationView | null,
    resourceDefinitions: ResourceDefinitionIndex | null,
    computedObserverSources: ComputedObserverSourceProjectResult | null,
    runtimeAnalysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`,
    expressionWorld: CheckerExpressionTypeWorld,
    phases: TemplateCompilationPhaseRecorder,
  ): readonly TemplateResourceRuntimeAnalysisEmission[] {
    const resources: TemplateResourceRuntimeAnalysisEmission[] = [];
    for (const cohort of runtimeAnalysisCohorts(compilations)) {
      const projectContext = templateRuntimeAnalysisProjectContext(this.publication, cohort);
      // Current definition details own both scheduling and analysis. The project context spends every exact compiler
      // product at this boundary and serves the same registered resource to recursive runtime consumers.
      const currentCohort = cohort.map((compilation) => projectContext.requireCompilation(compilation));
      const cohortResources: TemplateResourceRuntimeAnalysisEmission[] = [];
      for (const group of runtimeAnalysisScheduleGroups(currentCohort, resourceDefinitions)) {
        const boundControllerValues = runtimeBoundControllerValueTableForTemplateResources(
          cohortResources,
        );
        const groupResources = group.map((compilation) =>
          new TemplateResourceRuntimeAnalysisEmission(
            compilation,
            phases.measure(
              'runtime-analysis',
              () => this.analyzeResource(
                compilation,
                projectContext,
                projectKey,
                evaluation,
                typeSystem,
                sourceValueActivationView,
                resourceDefinitions,
                computedObserverSources,
                runtimeAnalysisDepth,
                expressionWorld,
                phases.telemetry,
                boundControllerValues,
              ),
            ),
          )
        );
        cohortResources.push(...groupResources);
      }
      resources.push(...cohortResources);
    }
    return resources;
  }

  compileResourceTree(
    compilerWorldAuthority: TemplateCompilerWorldAuthority,
    familyOwnerHandle: IdentityHandle | ProductHandle,
    analysisContextProductHandle: ProductHandle,
    appRootDefinitionProductHandle: ProductHandle | null,
    definition: CustomElementDefinition,
    template: CustomElementTemplateDefinition,
    localKey: string,
    phases: TemplateCompilationPhaseRecorder,
    includeCompilerOccurrencePrecedents: boolean,
  ): TemplateResourceFamilyCompilationEmission {
    const definitionCompilerWorld = phases.measure(
      'compiler-hook-world',
      () => this.invocationWorlds.constructDefinitionHookWorld(
        compilerWorldAuthority,
        definition,
        appRootDefinitionProductHandle,
        localKey,
        template.addressHandle ?? definition.sourceAddressHandle,
      ),
    );
    const localDefinitions = phases.measure(
      'local-template-definitions',
      () => this.localTemplateDefinitions.materialize(localKey, definition, template),
    );
    const parentCompilerWorld = definitionCompilerWorld.world;
    const activeCompilerWorld = localDefinitions.definitions.length === 0
      ? definitionCompilerWorld
      : phases.measure(
        TemplateCompilationCohortPlanningPhase.ComponentCompilerWorld,
        () => this.invocationWorlds.constructPostLocalWorld(
          definitionCompilerWorld.authority,
          localDefinitions.definitions,
          localKey,
          template.addressHandle ?? definition.sourceAddressHandle,
        ),
      );
    const localElementNames = localDefinitions.definitions.map((localDefinition) => localDefinition.name);
    const dependencyIdentityHandles = localDefinitions.definitions
      .map((localDefinition) => localDefinition.identityHandle)
      .filter((identityHandle): identityHandle is IdentityHandle => identityHandle != null);
    const ownerTemplate = localDefinitions.ownerTemplate;
    const owner = ownerTemplate == null
      ? null
      : this.compileResource(
        new TemplateResourceCompilationRequest(
          localKey,
          familyOwnerHandle,
          analysisContextProductHandle,
          appRootDefinitionProductHandle,
          parentCompilerWorld,
          activeCompilerWorld.world,
          definition,
          ownerTemplate,
          new TemplateCompilerReadView(
            this.publication.domainReadProjection,
            activeCompilerWorld.authority,
          ),
          localElementNames,
          dependencyIdentityHandles,
        ),
        phases,
      );
    const compilations: TemplateResourceCompilationEmission[] = owner == null ? [] : [owner];
    const occurrenceSourceRevision = template.authoredSourceRevision;
    const occurrenceAdmissionKind = !includeCompilerOccurrencePrecedents || occurrenceSourceRevision == null
      ? null
      : localDefinitions.definitions.length > 0
        ? TemplateCompilerOccurrencePrecedentAdmissionKind.LegacyLocalOverlap
        : hasAuthoredLocalTemplateSyntax(template.markup)
          ? TemplateCompilerOccurrencePrecedentAdmissionKind.AuthoredLocalSyntaxCandidate
          : null;
    const occurrencePrecedentCompilation = owner == null
      || occurrenceAdmissionKind == null
      ? null
      : this.compileResource(
          new TemplateResourceCompilationRequest(
            `${localKey}:occurrence-precedent`,
            familyOwnerHandle,
            analysisContextProductHandle,
            appRootDefinitionProductHandle,
            parentCompilerWorld,
            parentCompilerWorld,
            definition,
            template,
            new TemplateCompilerReadView(
              this.publication.domainReadProjection,
              definitionCompilerWorld.authority,
            ),
            [],
            [],
            true,
          ),
          phases,
        );
    let occurrencePrecedent: TemplateCompilerOccurrencePrecedentEmission | null = null;
    if (occurrencePrecedentCompilation != null) {
      if (occurrenceSourceRevision == null || occurrenceAdmissionKind == null) {
        throw new Error('Occurrence precedent compilation lost its admitted source revision or syntax posture.');
      }
      occurrencePrecedent = new TemplateCompilerOccurrencePrecedentEmission(
        occurrencePrecedentCompilation,
        parentCompilerWorld,
        occurrenceSourceRevision,
        occurrenceAdmissionKind,
      );
    }
    const occurrencePrecedents: TemplateCompilerOccurrencePrecedentEmission[] = occurrencePrecedent == null
      ? []
      : [occurrencePrecedent];
    for (let index = 0; index < localDefinitions.definitions.length; index++) {
      const localDefinition = localDefinitions.definitions[index]!;
      const childLocalKey = `${localKey}:local-template:${localDefinition.name}`;
      const result = activeCompilerWorld.world.templateCompiler.compile(
        new TemplateCompilerCompileRequest(childLocalKey, localDefinition),
        new ProjectTemplateCompilerHost(
          this,
          familyOwnerHandle,
          activeCompilerWorld.authority,
          analysisContextProductHandle,
          appRootDefinitionProductHandle,
          phases,
          false,
        ),
      );
      if (result.output != null) {
        compilations.push(...result.output.compilations);
        occurrencePrecedents.push(...result.output.occurrencePrecedents);
      }
    }
    return new TemplateResourceFamilyCompilationEmission(compilations, occurrencePrecedents);
  }

  compileResourceFamilyFrontDoor(
    request: TemplateResourceFamilyCompilationRequest,
    telemetry: SemanticRuntimeTelemetryOptions | null = null,
  ): readonly TemplateResourceCompilationEmission[] {
    return this.compileResourceTree(
      request.compilerWorldAuthority,
      request.familyOwnerHandle,
      request.analysisContextProductHandle,
      request.appRootDefinitionProductHandle,
      request.definition,
      request.template,
      request.localKey,
      new TemplateCompilationPhaseRecorder(
        this.publication,
        normalizeSemanticRuntimeTelemetryOptions(
          telemetry,
          DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE,
        ),
      ),
      request.includeCompilerOccurrencePrecedents,
    ).compilations;
  }

  compileResourceFrontDoor(
    request: TemplateResourceCompilationRequest,
    telemetry: SemanticRuntimeTelemetryOptions | null = null,
  ): TemplateResourceCompilationEmission | null {
    return this.compileResource(
      request,
      new TemplateCompilationPhaseRecorder(
        this.publication,
        normalizeSemanticRuntimeTelemetryOptions(
          telemetry,
          DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE,
        ),
      ),
    );
  }

  private compileResource(
    request: TemplateResourceCompilationRequest,
    phases: TemplateCompilationPhaseRecorder,
  ): TemplateResourceCompilationEmission | null {
    const {
      compilerWorld,
      parentCompilerWorld,
      analysisContextProductHandle,
      appRootDefinitionProductHandle,
      definition,
      localKey,
      familyOwnerHandle,
      template,
      compilerReads,
      localElementNames,
      dependencyIdentityHandles,
      retainDraftBindings,
    } = request;
    const sourceKind = templateSourceKind(template);
    if (sourceKind == null) {
      return null;
    }

    // Hook membership is a pre-walk compiler-world input even while execution remains a later browser-tree phase.
    const compilerHooks = compilerReads.compilerHooks();
    if (compilerHooks.entries.some((entry) => entry.hookKind === TemplateCompilerHookKind.CssModules)) {
      compilerReads.cssClassMapping();
    }

    const unit = this.constructCompilationUnit(
      localKey,
      compilerWorld,
      definition,
      template,
      sourceKind,
      localElementNames,
      dependencyIdentityHandles,
      phases,
    );
    const html = this.parseHtml(localKey, unit, phases, retainDraftBindings);
    const attributeSyntax = this.parseAttributeSyntax(
      localKey,
      compilerWorld,
      compilerReads,
      unit,
      html,
      phases,
    );
    const attributeClassification = this.classifyAttributes(
      localKey,
      compilerWorld,
      compilerReads,
      unit,
      html,
      attributeSyntax,
      phases,
    );
    const valueSites = this.materializeValueSites(
      localKey,
      compilerReads,
      unit,
      html,
      attributeSyntax,
      attributeClassification,
      phases,
    );
    const bindingCommandLowering = this.lowerBindingCommands(
      localKey,
      compilerWorld,
      compilerReads,
      unit,
      html,
      attributeSyntax,
      attributeClassification,
      valueSites,
      phases,
    );
    const compiledTemplate = this.materializeCompiledTemplate(
      localKey,
      compilerWorld,
      compilerReads,
      definition,
      unit,
      html,
      attributeSyntax,
      attributeClassification,
      valueSites,
      bindingCommandLowering,
      phases,
    );
    const emission = new TemplateResourceCompilationEmission(
      localKey,
      familyOwnerHandle,
      analysisContextProductHandle,
      appRootDefinitionProductHandle,
      parentCompilerWorld,
      compilerWorld,
      definition,
      unit,
      html,
      attributeSyntax,
      attributeClassification,
      valueSites,
      bindingCommandLowering,
      compiledTemplate,
      compilerReads.readAll(),
    );
    for (const read of emission.registeredReads) {
      this.publication.observe(read);
    }
    return emission;
  }

  private constructCompilationUnit(
    localKey: string,
    compilerWorld: TemplateCompilerWorldEmission,
    definition: CustomElementDefinition,
    template: CustomElementTemplateDefinition,
    sourceKind: TemplateSourceKind,
    localElementNames: readonly string[],
    dependencyIdentityHandles: readonly IdentityHandle[],
    phases: TemplateCompilationPhaseRecorder,
  ): TemplateCompilationUnitEmission {
    const sourceAddressHandle = template.addressHandle ?? definition.sourceAddressHandle;
    return phases.measure('compilation-unit', () =>
      this.unitMaterializer.construct(new TemplateCompilationUnitConstructionRequest(
        localKey,
        TemplateCompilationUnitKind.CustomElement,
        compilerWorld,
        this.templateSourceOwner(definition),
        sourceKind,
        template.markup,
        sourceAddressHandle,
        template.sourceMap,
        localElementNames,
        dependencyIdentityHandles,
      ))
    );
  }

  private templateSourceOwner(definition: CustomElementDefinition): TemplateSourceOwnerReference {
    return new TemplateSourceOwnerReference(
      definition.productHandle,
      definition.identityHandle,
      ResourceDefinitionKind.CustomElement,
      definition.name,
      definition.sourceAddressHandle,
    );
  }

  private parseHtml(
    localKey: string,
    unit: TemplateCompilationUnitEmission,
    phases: TemplateCompilationPhaseRecorder,
    retainDraftBindings: boolean,
  ): HtmlParseEmission {
    return phases.measure('html-parse', () =>
      this.htmlParser.parse({
        localKey,
        templateSource: unit.templateSource,
        compilationUnit: unit.compilationUnit,
        parseContext: unit.parseContext,
        retainDraftBindings: retainDraftBindings || phases.telemetry.inquiryProfile === 'aot',
      } satisfies HtmlParseRequest)
    );
  }

  private parseAttributeSyntax(
    localKey: string,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    unit: TemplateCompilationUnitEmission,
    html: HtmlParseEmission,
    phases: TemplateCompilationPhaseRecorder,
  ): AttributeSyntaxParseEmission {
    return phases.measure('attribute-syntax', () =>
      this.attributeSyntax.parse({
        localKey,
        compilationUnit: unit.compilationUnit,
        html,
        compilerWorld,
        compilerReads,
      } satisfies AttributeSyntaxParseRequest)
    );
  }

  private classifyAttributes(
    localKey: string,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    unit: TemplateCompilationUnitEmission,
    html: HtmlParseEmission,
    attributeSyntax: AttributeSyntaxParseEmission,
    phases: TemplateCompilationPhaseRecorder,
  ): AttributeClassificationEmission {
    return phases.measure('attribute-classification', () =>
      this.attributeClassification.classify({
        localKey,
        compilationUnit: unit.compilationUnit,
        html,
        attributeSyntax,
        compilerWorld,
        compilerReads,
      } satisfies AttributeClassificationRequest)
    );
  }

  private materializeValueSites(
    localKey: string,
    compilerReads: TemplateCompilerReadView,
    unit: TemplateCompilationUnitEmission,
    html: HtmlParseEmission,
    attributeSyntax: AttributeSyntaxParseEmission,
    attributeClassification: AttributeClassificationEmission,
    phases: TemplateCompilationPhaseRecorder,
  ): TemplateValueSiteEmission {
    return phases.measure('value-sites', () =>
      this.valueSites.materialize({
        localKey,
        compilationUnit: unit.compilationUnit,
        html,
        attributeSyntax,
        attributeClassification,
        compilerReads,
      } satisfies TemplateValueSiteRequest)
    );
  }

  private lowerBindingCommands(
    localKey: string,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    unit: TemplateCompilationUnitEmission,
    html: HtmlParseEmission,
    attributeSyntax: AttributeSyntaxParseEmission,
    attributeClassification: AttributeClassificationEmission,
    valueSites: TemplateValueSiteEmission,
    phases: TemplateCompilationPhaseRecorder,
  ): BindingCommandLoweringEmission {
    return phases.measure('binding-command-lowering', () =>
      this.bindingCommandLowering.lower({
        localKey,
        compilationUnit: unit.compilationUnit,
        html,
        attributeSyntax,
        attributeClassification,
        valueSites,
        compilerWorld,
        compilerReads,
      } satisfies BindingCommandLoweringRequest)
    );
  }

  private materializeCompiledTemplate(
    localKey: string,
    compilerWorld: TemplateCompilerWorldEmission,
    compilerReads: TemplateCompilerReadView,
    definition: CustomElementDefinition,
    unit: TemplateCompilationUnitEmission,
    html: HtmlParseEmission,
    attributeSyntax: AttributeSyntaxParseEmission,
    attributeClassification: AttributeClassificationEmission,
    valueSites: TemplateValueSiteEmission,
    bindingCommandLowering: BindingCommandLoweringEmission,
    phases: TemplateCompilationPhaseRecorder,
  ): CompiledTemplateEmission {
    return phases.measure('compiled-template', () =>
      this.compiledTemplate.materialize({
        localKey,
        compilationUnit: unit.compilationUnit,
        html,
        attributeSyntax,
        attributeClassification,
        valueSites,
        bindingCommandLowering,
        compilerWorld,
        compilerReads,
        definition,
      } satisfies CompiledTemplateMaterializationRequest)
    );
  }

  analyzeResource(
    compilation: TemplateResourceCompilationEmission,
    projectContext: TemplateRuntimeAnalysisProjectContext,
    projectKey: string | null,
    evaluation: StaticProjectEvaluationResult | null,
    typeSystem: TypeSystemProject | null,
    sourceValueActivationView: DiProviderActivationView | null,
    resourceDefinitions: ResourceDefinitionIndex | null,
    computedObserverSources: ComputedObserverSourceProjectResult | null,
    analysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` = DEFAULT_SEMANTIC_APP_ANALYSIS_DEPTH,
    expressionWorld: CheckerExpressionTypeWorld | null = null,
    telemetry: SemanticRuntimeTelemetryOptions | null = null,
    boundControllerValues?: RuntimeBoundControllerValueTable,
  ): TemplateRuntimeAnalysisEmission {
    return this.runtimeAnalysis.materialize(new TemplateRuntimeAnalysisRequest(
      compilation.localKey,
      projectKey,
      compilation.definition,
      compilation.appRootDefinitionProductHandle,
      compilation.compiledTemplate,
      compilation.attributeSyntax,
      compilation.compilerWorld,
      projectContext,
      evaluation,
      typeSystem,
      sourceValueActivationView,
      resourceDefinitions,
      computedObserverSources,
      analysisDepth,
      expressionWorld,
      telemetry,
      boundControllerValues,
    ));
  }
}

function templateCompilerWorldContainers(
  frontDoor: TemplateCompilationFrontDoorEmission,
): readonly TemplateCompilerWorldEmission['container'][] {
  return [...new Map([
    ...frontDoor.plan.appWorld.diWorld.containers,
    ...[
      ...frontDoor.appCompilations,
      ...frontDoor.authoringCompilations,
    ].flatMap((compilation) => [
      compilation.parentCompilerWorld.container,
      compilation.compilerWorld.container,
    ]),
  ].map((container) => [container.identityHandle, container])).values()];
}

class ProjectTemplateCompilerHost implements TemplateCompilerCompileHost<TemplateResourceFamilyCompilationEmission> {
  constructor(
    private readonly pass: TemplateCompilationProjectPass,
    private readonly familyOwnerHandle: IdentityHandle | ProductHandle,
    private readonly compilerWorldAuthority: TemplateCompilerWorldAuthority,
    private readonly analysisContextProductHandle: ProductHandle,
    private readonly appRootDefinitionProductHandle: ProductHandle | null,
    private readonly phases: TemplateCompilationPhaseRecorder,
    private readonly includeCompilerOccurrencePrecedents: boolean,
  ) {}

  compile(
    request: TemplateCompilerCompileRequest,
    _compiler: TemplateCompilerService,
  ): TemplateResourceFamilyCompilationEmission {
    const template = request.definition.template;
    if (template == null) {
      throw new Error(`TemplateCompiler admitted ${request.definition.name} without a template.`);
    }
    return this.pass.compileResourceTree(
      this.compilerWorldAuthority,
      this.familyOwnerHandle,
      this.analysisContextProductHandle,
      this.appRootDefinitionProductHandle,
      request.definition,
      template,
      request.localKey,
      this.phases,
      this.includeCompilerOccurrencePrecedents,
    );
  }
}

function uniqueCompilerWorlds(
  compilerWorlds: readonly TemplateCompilerWorldEmission[],
): readonly TemplateCompilerWorldEmission[] {
  const seen = new Set<string>();
  const result: TemplateCompilerWorldEmission[] = [];
  for (const compilerWorld of compilerWorlds) {
    if (seen.has(compilerWorld.world.productHandle)) {
      continue;
    }
    seen.add(compilerWorld.world.productHandle);
    result.push(compilerWorld);
  }
  return result;
}

function templateFrontDoorMembershipRevision(
  families: readonly TemplateCompilationFamilyFrontDoorEmission[],
): string {
  return JSON.stringify(families.map((family) => [
    family.ownerHandle,
    family.cohortKeys,
    family.appCompilations.map(templateCompilationMembership),
    family.authoringCompilations.map(templateCompilationMembership),
    family.appOccurrencePrecedents.map(occurrencePrecedentMembership),
    family.authoringOccurrencePrecedents.map(occurrencePrecedentMembership),
  ]));
}

function occurrencePrecedentMembership(
  precedent: TemplateCompilerOccurrencePrecedentEmission,
): readonly unknown[] {
  return [
    precedent.sourceRevision,
    precedent.admissionKind,
    precedent.normalizedSites.state,
    precedent.normalizedSites.mismatches.map((mismatch) => mismatch.mismatchKind),
    templateCompilationMembership(precedent.compilation),
  ];
}

function templateCompilationMembership(
  compilation: TemplateResourceCompilationEmission,
): readonly (string | null)[] {
  return [
    compilation.localKey,
    compilation.familyOwnerHandle,
    compilation.analysisContextProductHandle,
    compilation.appRootDefinitionProductHandle,
    compilation.definition.productHandle,
    compilation.definition.key,
    compilation.definition.name,
    compilation.parentCompilerWorld.resourceScope.identityHandle,
    compilation.compilerWorld.resourceScope.identityHandle,
    compilation.unit.compilationUnit.productHandle,
    compilation.compiledTemplate.compiledTemplate.productHandle,
  ];
}

function rebaseRuntimeAnalysisResources(
  compilations: readonly TemplateResourceCompilationEmission[],
  previous: readonly TemplateResourceRuntimeAnalysisEmission[],
  expressionWorld: CheckerExpressionTypeWorld,
): readonly TemplateResourceRuntimeAnalysisEmission[] | null {
  if (compilations.length !== previous.length) {
    return null;
  }
  const compilationsByLocalKey = new Map<string, TemplateResourceCompilationEmission>();
  for (const compilation of compilations) {
    if (compilationsByLocalKey.has(compilation.localKey)) {
      return null;
    }
    compilationsByLocalKey.set(compilation.localKey, compilation);
  }
  const rebased: TemplateResourceRuntimeAnalysisEmission[] = [];
  for (const resource of previous) {
    const compilation = compilationsByLocalKey.get(resource.compilation.localKey) ?? null;
    if (compilation == null) {
      return null;
    }
    compilationsByLocalKey.delete(compilation.localKey);
    rebased.push(resource.forCarriedGeneration(compilation, expressionWorld));
  }
  return compilationsByLocalKey.size === 0 ? rebased : null;
}

function templateSourceKind(template: CustomElementTemplateDefinition | null): TemplateSourceKind | null {
  if (template == null) {
    return null;
  }

  switch (template.kind) {
    case CustomElementTemplateKind.Markup:
      return TemplateSourceKind.Markup;
    case CustomElementTemplateKind.DomNode:
      return TemplateSourceKind.DomNode;
    case CustomElementTemplateKind.Open:
      return TemplateSourceKind.Open;
    case CustomElementTemplateKind.None:
      return null;
  }
}

function hasAuthoredLocalTemplateSyntax(markup: string | null): boolean {
  return markup != null && /\bas-custom-element\b/iu.test(markup);
}

function templateResourceCompilationKey(
  definition: CustomElementDefinition,
): string {
  return definition.productHandle ?? `${definition.key}:${definition.name}`;
}

function runtimeAnalysisCohorts(
  compilations: readonly TemplateResourceCompilationEmission[],
): readonly (readonly TemplateResourceCompilationEmission[])[] {
  const cohortsByContext = new Map<ProductHandle, TemplateResourceCompilationEmission[]>();
  for (const compilation of compilations) {
    const cohort = cohortsByContext.get(compilation.analysisContextProductHandle) ?? [];
    cohort.push(compilation);
    cohortsByContext.set(compilation.analysisContextProductHandle, cohort);
  }
  return [...cohortsByContext.values()];
}

function runtimeAnalysisScheduleGroups(
  compilations: readonly TemplateResourceCompilationEmission[],
  resourceDefinitions: ResourceDefinitionIndex | null,
): readonly (readonly TemplateResourceCompilationEmission[])[] {
  if (compilations.length < 2) {
    return compilations.map((compilation) => [compilation]);
  }

  const byKey = new Map<string, TemplateResourceCompilationEmission>();
  const keyByDefinitionProductHandle = new Map<ProductHandle, string>();
  const originalIndexByKey = new Map<string, number>();
  const keys = compilations.map((compilation, index) => {
    const key = templateResourceCompilationKey(compilation.definition);
    byKey.set(key, compilation);
    originalIndexByKey.set(key, index);
    if (compilation.definition.productHandle != null) {
      keyByDefinitionProductHandle.set(compilation.definition.productHandle, key);
    }
    return key;
  });
  const outgoingByKey = runtimeAnalysisDependencyGraph(
    compilations,
    resourceDefinitions,
    byKey,
    keyByDefinitionProductHandle,
  );
  const groupKeys = stronglyConnectedRuntimeAnalysisGroups(keys, outgoingByKey, originalIndexByKey);
  const scheduledGroupKeys = scheduleRuntimeAnalysisGroups(groupKeys, outgoingByKey, originalIndexByKey);
  return scheduledGroupKeys.map((group) =>
    group.map((key) => byKey.get(key)).filter((compilation): compilation is TemplateResourceCompilationEmission => compilation != null)
  );
}

function runtimeAnalysisDependencyGraph(
  compilations: readonly TemplateResourceCompilationEmission[],
  resourceDefinitions: ResourceDefinitionIndex | null,
  byKey: ReadonlyMap<string, TemplateResourceCompilationEmission>,
  keyByDefinitionProductHandle: ReadonlyMap<ProductHandle, string>,
): ReadonlyMap<string, ReadonlySet<string>> {
  const outgoingByKey = new Map<string, Set<string>>();
  for (const compilation of compilations) {
    const parentKey = templateResourceCompilationKey(compilation.definition);
    const childKeys = new Set<string>();
    const addChildKey = (childKey: string | null): void => {
      if (childKey != null && byKey.has(childKey) && childKey !== parentKey) {
        childKeys.add(childKey);
      }
    };

    if (resourceDefinitions != null) {
      for (const dependency of directDependencyDefinitions(compilation.definition, resourceDefinitions)) {
        if (!(dependency instanceof CustomElementDefinition)) {
          continue;
        }
        addChildKey(templateResourceCompilationKey(dependency));
      }
    }
    for (const instruction of compilation.compiledTemplate.instructions) {
      if (!(instruction instanceof HydrateElementInstruction)) {
        continue;
      }
      addChildKey(instruction.definitionProductHandle == null
        ? null
        : keyByDefinitionProductHandle.get(instruction.definitionProductHandle) ?? null);
    }
    outgoingByKey.set(parentKey, childKeys);
  }
  return outgoingByKey;
}

function stronglyConnectedRuntimeAnalysisGroups(
  keys: readonly string[],
  outgoingByKey: ReadonlyMap<string, ReadonlySet<string>>,
  originalIndexByKey: ReadonlyMap<string, number>,
): readonly (readonly string[])[] {
  const indexByKey = new Map<string, number>();
  const lowLinkByKey = new Map<string, number>();
  const stack: string[] = [];
  const keysOnStack = new Set<string>();
  const groups: string[][] = [];
  let nextIndex = 0;

  const visit = (key: string): void => {
    indexByKey.set(key, nextIndex);
    lowLinkByKey.set(key, nextIndex);
    nextIndex += 1;
    stack.push(key);
    keysOnStack.add(key);

    for (const childKey of outgoingByKey.get(key) ?? []) {
      if (!indexByKey.has(childKey)) {
        visit(childKey);
        lowLinkByKey.set(key, Math.min(lowLinkByKey.get(key)!, lowLinkByKey.get(childKey)!));
      } else if (keysOnStack.has(childKey)) {
        lowLinkByKey.set(key, Math.min(lowLinkByKey.get(key)!, indexByKey.get(childKey)!));
      }
    }

    if (lowLinkByKey.get(key) !== indexByKey.get(key)) {
      return;
    }
    const group: string[] = [];
    while (stack.length > 0) {
      const member = stack.pop()!;
      keysOnStack.delete(member);
      group.push(member);
      if (member === key) {
        break;
      }
    }
    groups.push(group);
  };

  for (const key of keys) {
    if (!indexByKey.has(key)) {
      visit(key);
    }
  }

  return groups.map((group) =>
    group.sort((left, right) => originalIndexForKey(left, originalIndexByKey) - originalIndexForKey(right, originalIndexByKey))
  );
}

function scheduleRuntimeAnalysisGroups(
  groups: readonly (readonly string[])[],
  outgoingByKey: ReadonlyMap<string, ReadonlySet<string>>,
  originalIndexByKey: ReadonlyMap<string, number>,
): readonly (readonly string[])[] {
  const groupIndexByKey = new Map<string, number>();
  groups.forEach((group, groupIndex) => {
    for (const key of group) {
      groupIndexByKey.set(key, groupIndex);
    }
  });

  const incomingCountByGroup = new Map<number, number>();
  const outgoingGroupsByGroup = new Map<number, Set<number>>();
  groups.forEach((_, groupIndex) => incomingCountByGroup.set(groupIndex, 0));
  for (const [parentKey, childKeys] of outgoingByKey) {
    const parentGroup = groupIndexByKey.get(parentKey);
    if (parentGroup == null) {
      continue;
    }
    for (const childKey of childKeys) {
      const childGroup = groupIndexByKey.get(childKey);
      if (childGroup == null || childGroup === parentGroup) {
        continue;
      }
      const outgoingGroups = outgoingGroupsByGroup.get(parentGroup) ?? new Set<number>();
      outgoingGroupsByGroup.set(parentGroup, outgoingGroups);
      if (outgoingGroups.has(childGroup)) {
        continue;
      }
      outgoingGroups.add(childGroup);
      incomingCountByGroup.set(childGroup, (incomingCountByGroup.get(childGroup) ?? 0) + 1);
    }
  }

  const groupSortKey = (groupIndex: number): number =>
    Math.min(...groups[groupIndex]!.map((key) => originalIndexForKey(key, originalIndexByKey)));
  const ready = groups
    .map((_, groupIndex) => groupIndex)
    .filter((groupIndex) => incomingCountByGroup.get(groupIndex) === 0)
    .sort((left, right) => groupSortKey(left) - groupSortKey(right));
  const scheduledGroups: string[][] = [];
  const emitted = new Set<number>();

  while (ready.length > 0) {
    const groupIndex = ready.shift()!;
    if (emitted.has(groupIndex)) {
      continue;
    }
    emitted.add(groupIndex);
    scheduledGroups.push([...groups[groupIndex]!]);
    for (const childGroup of outgoingGroupsByGroup.get(groupIndex) ?? []) {
      const remaining = (incomingCountByGroup.get(childGroup) ?? 0) - 1;
      incomingCountByGroup.set(childGroup, remaining);
      if (remaining === 0) {
        ready.push(childGroup);
        ready.sort((left, right) => groupSortKey(left) - groupSortKey(right));
      }
    }
  }

  return scheduledGroups;
}

function originalIndexForKey(
  key: string,
  originalIndexByKey: ReadonlyMap<string, number>,
): number {
  return originalIndexByKey.get(key) ?? Number.MAX_SAFE_INTEGER;
}

function templateRuntimeAnalysisProjectContext(
  publication: ComputationRun,
  compilations: readonly TemplateResourceCompilationEmission[],
): TemplateRuntimeAnalysisProjectContext {
  return new TemplateRuntimeAnalysisProjectContext(
    publication,
    compilations.map((compilation) => new TemplateRuntimeAnalysisResource(compilation)),
  );
}

function templateResourceCompilationLocalKey(
  projectKey: string,
  owner: TemplateCompilationOwnerPlan,
  cohort: TemplateCompilationCohortPlan,
): string {
  return `component-template:${encodeTemplateCompilationKeyParts([
    projectKey,
    owner.ownerHandle,
    cohort.key,
  ])}`;
}

function templateCompilationProfile(
  started: number,
  phases: readonly TemplateCompilationProjectPhaseTiming[],
): TemplateCompilationProjectProfile {
  return {
    totalMilliseconds: performance.now() - started,
    phases,
  };
}

function mergeTemplateCompilationProfiles(
  left: TemplateCompilationProjectProfile,
  right: TemplateCompilationProjectProfile,
): TemplateCompilationProjectProfile {
  return {
    totalMilliseconds: left.totalMilliseconds + right.totalMilliseconds,
    phases: [...left.phases, ...right.phases],
  };
}

function normalizedAuthoringTemplateLimit(value: number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function normalizedAuthoringTemplateSourceFiles(
  value: readonly string[] | null | undefined,
): readonly string[] {
  if (value == null) {
    return [];
  }
  return [...new Set(value
    .map((fileName) => fileName.trim().replace(/\\/g, '/'))
    .filter((fileName) => fileName.length > 0))]
    .sort();
}
