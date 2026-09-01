import path from 'node:path';

import type { SemanticApp } from '../api/runtime.js';
import {
  semanticSourceReferenceMatchesFilePath,
  type SemanticSourceReference,
} from '../api/source-reference.js';
import type { KernelStore } from '../kernel/store.js';
import type { IdentityHandle, ProductHandle } from '../kernel/handles.js';
import type { ComputationRun } from '../kernel/computation-lifecycle.js';
import {
  BrowserEffectiveTemplateMaterializer,
} from './browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from './browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from './browser-template-selection.js';
import {
  compileTemplateCompilerContextFamily,
  TemplateCompilerContextFamilyCompilationReasonRole,
  TemplateCompilerContextFamilyCompilationState,
  type TemplateCompilerContextFamilyCompilationReason,
} from './template-compiler-context-family-compilation.js';
import {
  projectTemplateCompilerCompiledDefinitionFamily,
  TemplateCompilerCompiledDefinitionFamilyState,
  type TemplateCompilerCompiledDefinitionFamilyValue,
  type TemplateCompilerCompiledDefinitionReason,
} from './template-compiler-compiled-definition-value.js';
import {
  projectTemplateCompilerCompiledHandoff,
  projectTemplateCompilerOccurrenceCompiledHandoff,
  sourceReference,
  TemplateCompilerSourceCompiledTemplateUnavailable,
  type TemplateCompilerCompiledHandoffLocalFamilyProjection,
  type TemplateCompilerCompiledHandoffSpreadClosure,
  type TemplateCompilerCompiledHandoffValue,
} from './template-compiler-compiled-handoff-value.js';
import {
  projectTemplateCompilerRuntimeInstructionFamily,
  TemplateCompilerRuntimeInstructionFamilyState,
  TemplateCompilerRuntimeResourceRepresentation,
  type TemplateCompilerRuntimeInstructionFamilyValue,
  type TemplateCompilerRuntimeInstructionReason,
} from './template-instruction-runtime-value.js';
import type { TemplateCompilerContextFamilyValue } from './template-compiler-context-family-value.js';
import type {
  TemplateCompilerOccurrencePrecedentEmission,
  TemplateResourceRuntimeAnalysisEmission,
} from './template-compilation-project-pass.js';
import {
  projectSemanticAppRuntimeRegistrationRequirements,
  RuntimeRegistrationRequirementReasonKind,
  type RuntimeRegistrationRequirementCompilerInput,
  type SemanticAppRuntimeRegistrationRequirements,
} from './runtime-registration-requirements.js';
import {
  projectRuntimeSpreadCompilationHandoffs,
  type RuntimeSpreadCompilationHandoffResult,
  RuntimeSpreadCompilationHandoffState,
} from './runtime-spread-compilation-handoff.js';
import {
  compileTemplateCompilerOccurrenceFamily,
  type TemplateCompilerOccurrenceLocalDefinitionValue,
} from './template-compiler-occurrence-family-compilation.js';

export const enum TemplateCompilerCompiledHandoffState {
  Exact = 'exact',
  Pending = 'pending',
  Ineligible = 'ineligible',
  Open = 'open',
  Abrupt = 'abrupt',
}

export const enum TemplateCompilerCompiledHandoffStage {
  Input = 'input',
  ContextFamily = 'context-family',
  RuntimeInstructions = 'runtime-instructions',
  CompiledDefinitions = 'compiled-definitions',
}

export interface TemplateCompilerCompiledHandoffReason {
  readonly stage: TemplateCompilerCompiledHandoffStage;
  readonly reasonKind: string;
  readonly summary: string;
  readonly stableKeys: readonly string[];
  readonly frontierCause: TemplateCompilerCompiledHandoffFrontierCause | null;
}

export interface TemplateCompilerCompiledHandoffFrontierCause {
  readonly frontierKind: string;
  readonly nodeOccurrenceKey: string | null;
  readonly attributeOccurrenceKey: string | null;
  readonly issue: TemplateCompilerCompiledHandoffIssueAuthority | null;
  readonly source: SemanticSourceReference | null;
}

export interface TemplateCompilerCompiledHandoffIssueAuthority {
  readonly productHandle: ProductHandle;
  readonly identityHandle: IdentityHandle;
  readonly issueKind: string;
  readonly frameworkErrorCode: string | null;
}

export interface SemanticAppTemplateCompilerHandoffRequest {
  /** Current app generation opened with the `aot` inquiry profile so authored draft bindings are retained. */
  readonly app: SemanticApp;
  /** Exact source-file selection. Omit to materialize every app-runtime template resource. */
  readonly templateSourcePaths?: readonly string[];
  /** Include convention/authoring resources that are not members of the selected runtime app topology. */
  readonly includeAuthoringResources?: boolean;
}

export class SemanticAppTemplateCompilerHandoffBatch {
  constructor(
    readonly resources: readonly SemanticAppTemplateCompilerHandoffResource[],
    readonly unmatchedTemplateSourcePaths: readonly string[],
    readonly runtimeRegistrationRequirements: SemanticAppRuntimeRegistrationRequirements,
  ) {}
}

class SemanticAppTemplateCompilerMaterialization {
  constructor(
    readonly resource: TemplateResourceRuntimeAnalysisEmission,
    readonly handoff: SemanticAppTemplateCompilerHandoffResource,
    readonly requirementInputs: readonly RuntimeRegistrationRequirementCompilerInput[],
  ) {}
}

class SemanticAppTemplateCompilerLocalPreparation {
  constructor(
    readonly relation: TemplateCompilerOccurrenceLocalDefinitionValue,
    readonly resource: TemplateResourceRuntimeAnalysisEmission,
    readonly family: TemplateCompilerContextFamilyValue,
    readonly instructions: TemplateCompilerRuntimeInstructionFamilyValue,
    readonly definitions: TemplateCompilerCompiledDefinitionFamilyValue,
  ) {}
}

type SemanticAppTemplateCompilerPreparation =
  | {
      readonly state: 'unavailable';
      readonly materialization: SemanticAppTemplateCompilerMaterialization;
    }
  | {
      readonly state: 'exact';
      readonly resource: TemplateResourceRuntimeAnalysisEmission;
      readonly source: SemanticSourceReference | null;
      readonly family: TemplateCompilerContextFamilyValue;
      readonly instructions: TemplateCompilerRuntimeInstructionFamilyValue;
      readonly definitions: TemplateCompilerCompiledDefinitionFamilyValue;
      readonly markup: string;
      readonly authoredSourceRevision: string;
      readonly sourceAttachment: TemplateCompilerCompiledHandoffValue['address']['sourceAttachment'];
      readonly definitionProductHandle: ProductHandle;
      readonly localPreparations: readonly SemanticAppTemplateCompilerLocalPreparation[];
      readonly occurrenceSource: TemplateCompilerOccurrencePrecedentEmission | null;
    };

export type SemanticAppTemplateCompilerHandoffResource =
  | {
      readonly state: TemplateCompilerCompiledHandoffState.Exact;
      readonly source: SemanticSourceReference | null;
      readonly reasons: readonly [];
      readonly value: TemplateCompilerCompiledHandoffValue;
    }
  | {
      readonly state: Exclude<
        TemplateCompilerCompiledHandoffState,
        TemplateCompilerCompiledHandoffState.Exact
      >;
      readonly source: SemanticSourceReference | null;
      readonly reasons: readonly TemplateCompilerCompiledHandoffReason[];
      readonly value: null;
    };

type UnavailableSemanticAppTemplateCompilerHandoffResource = Extract<
  SemanticAppTemplateCompilerHandoffResource,
  { readonly value: null }
>;

/**
 * Materialize app template compiler output and detach it before retiring the run-local browser/compiler world.
 *
 * This lives on the explicit browser-template subpath instead of `SemanticApp.ask`: build consumers opt into parse5,
 * while ordinary MCP and IDE query graphs keep the browser parser and run-local compiler allocations out of their
 * module, retention, and cache policy.
 */
export function materializeSemanticAppTemplateCompilerHandoffs(
  request: SemanticAppTemplateCompilerHandoffRequest,
): SemanticAppTemplateCompilerHandoffBatch {
  const app = request.app;
  app.requireCurrent();
  const store = app.runtime.workspace.store;
  const requestedPaths = [...new Set(request.templateSourcePaths ?? [])];
  const candidates = request.includeAuthoringResources === true
    ? uniqueResources([
        ...app.emission.templates.resources,
        ...app.emission.templates.authoringResources,
      ])
    : app.emission.templates.resources;
  const selectedResources = candidates.filter((resource) =>
    requestedPaths.length === 0 || requestedPaths.some((filePath) => resourceMatchesPath(app, resource, filePath, store))
  );
  const localDefinitionIdentities = new Set(selectedResources.flatMap((resource) =>
    resource.compilation.unit.rootContext.dependencyIdentityHandles
  ));
  const resources = selectedResources.filter((resource) =>
    resource.compilation.definition.identityHandle == null
    || !localDefinitionIdentities.has(resource.compilation.definition.identityHandle)
  );
  const matchedPaths = new Set(requestedPaths.filter((filePath) =>
    selectedResources.some((resource) => resourceMatchesPath(app, resource, filePath, store))
  ));
  const run = app.runtime.computationLifecycle.begin({
    kind: 'semantic-app-template-compiler-handoff',
    reconciliationKey: `${app.project.projectKey}:template-compiler-handoff`,
    summary: 'Materialize detached browser-effective compiled template handoffs.',
  });
  try {
    const preparations = resources.map((resource, ordinal) => prepareResource(
      app,
      resource,
      ordinal,
      run,
      store,
    ));
    const requestorFamiliesByDefinitionProduct = uniquePreparedFamiliesByDefinitionProduct(preparations);
    const materialized = preparations.map((preparation) => preparation.state === 'exact'
      ? finalizeResource(preparation, requestorFamiliesByDefinitionProduct, store)
      : preparation.materialization
    );
    app.requireCurrent();
    return new SemanticAppTemplateCompilerHandoffBatch(
      materialized.map((entry) => entry.handoff),
      requestedPaths.filter((filePath) => !matchedPaths.has(filePath)),
      projectSemanticAppRuntimeRegistrationRequirements(
        app,
        materialized.flatMap((entry) => entry.requirementInputs),
        selectedResources.length === candidates.length
          ? []
          : [{
              reasonKind: RuntimeRegistrationRequirementReasonKind.CompilerCohortIncomplete,
              summary: 'Selective template handoff materialization does not cover the complete app runtime cohort.',
              stableKeys: candidates
                .filter((candidate) => !selectedResources.includes(candidate))
                .map((candidate) => candidate.compilation.localKey),
            }],
      ),
    );
  } finally {
    run.abort();
  }
}

function uniqueResources(
  resources: readonly TemplateResourceRuntimeAnalysisEmission[],
): readonly TemplateResourceRuntimeAnalysisEmission[] {
  return [...new Map(resources.map((resource) => [resource.compilation.localKey, resource])).values()];
}

function prepareResource(
  app: SemanticApp,
  resource: TemplateResourceRuntimeAnalysisEmission,
  ordinal: number,
  run: ComputationRun,
  store: KernelStore,
): SemanticAppTemplateCompilerPreparation {
  const compilation = resource.compilation;
  const occurrenceSource = occurrencePrecedentForResource(app, resource);
  if (occurrenceSource != null) {
    return prepareOccurrenceResource(app, resource, occurrenceSource, ordinal, run, store);
  }
  const templateSource = compilation.unit.templateSource;
  const source = sourceReference(store, templateSource.sourceAddressHandle);
  if (templateSource.markup == null) {
    return unavailablePreparation(unavailableMaterialization(resource, unavailable(
      TemplateCompilerCompiledHandoffState.Ineligible,
      source,
      TemplateCompilerCompiledHandoffStage.Input,
      'markup-unavailable',
      'Template compiler handoff requires authored markup.',
    )));
  }
  if (compilation.html.draft == null) {
    return unavailablePreparation(unavailableMaterialization(resource, unavailable(
      TemplateCompilerCompiledHandoffState.Pending,
      source,
      TemplateCompilerCompiledHandoffStage.Input,
      'authored-draft-unavailable',
      'Template compiler handoff requires retained authored HTML draft bindings; open the app with the aot profile.',
    )));
  }
  const localKey = `compiled-handoff:${ordinal}:${compilation.localKey}`;
  const browserDraft = parseBrowserTemplateFragmentDraft(templateSource.markup);
  const browser = new BrowserEffectiveTemplateMaterializer(run).materialize({
    localKey,
    sourceRevision: compilation.definition.template?.authoredSourceRevision ?? templateSource.productHandle,
    templateSource,
    authoredHtml: compilation.html,
    browser: browserDraft,
    carrierSelection: selectBrowserTemplateCompilerCarrier(browserDraft.fragment),
  });
  const family = compileTemplateCompilerContextFamily({
    compilationKey: localKey,
    compilation,
    browserEmission: browser,
    currentFrontDoor: app.emission.templates.frontDoor,
    compilerReadStore: store,
  });
  if (family.state !== TemplateCompilerContextFamilyCompilationState.Exact || family.value == null) {
    return unavailablePreparation(unavailableMaterialization(resource, {
      state: familyState(family.state),
      source,
      reasons: family.reasons
        .filter((reason) =>
          reason.role !== TemplateCompilerContextFamilyCompilationReasonRole.FrontierDerivative
        )
        .map((reason) => contextFamilyReason(reason, store)),
      value: null,
    }));
  }
  const instructions = projectTemplateCompilerRuntimeInstructionFamily({
    family: family.value,
    productDetails: store,
    resourceRepresentation: TemplateCompilerRuntimeResourceRepresentation.Name,
  });
  if (instructions.state !== TemplateCompilerRuntimeInstructionFamilyState.Exact || instructions.value == null) {
    return unavailablePreparation(unavailableMaterialization(resource, {
      state: instructionState(instructions.state),
      source,
      reasons: instructions.reasons.map(runtimeInstructionReason),
      value: null,
    }));
  }
  const definitions = projectTemplateCompilerCompiledDefinitionFamily({
    family: family.value,
    instructions,
    readView: store,
  });
  if (definitions.state !== TemplateCompilerCompiledDefinitionFamilyState.Exact || definitions.value == null) {
    return unavailablePreparation(unavailableMaterialization(resource, {
      state: definitionState(definitions.state),
      source,
      reasons: definitions.reasons.map(compiledDefinitionReason),
      value: null,
    }));
  }
  if (!definitions.value.isCurrent()) {
    throw new Error(`Compiled handoff for '${compilation.definition.name}' changed before detachment.`);
  }
  const authoredSourceRevision = compilation.definition.template?.authoredSourceRevision
    ?? templateSource.productHandle;
  const sourceAttachment = app.emission.resources.definitionSelections.find((selection) =>
    selection.definition === compilation.definition
  )?.sourceAttachment ?? null;
  const definitionProductHandle = compilation.definition.productHandle;
  if (definitionProductHandle == null) {
    return unavailablePreparation(unavailableMaterialization(resource, unavailable(
      TemplateCompilerCompiledHandoffState.Pending,
      source,
      TemplateCompilerCompiledHandoffStage.CompiledDefinitions,
      'definition-product-unavailable',
      'Template compiler handoff requires a materialized root resource definition identity.',
    )));
  }
  return {
    state: 'exact',
    resource,
    source,
    family: family.value,
    instructions: instructions.value,
    definitions: definitions.value,
    markup: templateSource.markup,
    authoredSourceRevision,
    sourceAttachment,
    definitionProductHandle,
    localPreparations: [],
    occurrenceSource: null,
  };
}

function occurrencePrecedentForResource(
  app: SemanticApp,
  resource: TemplateResourceRuntimeAnalysisEmission,
): TemplateCompilerOccurrencePrecedentEmission | null {
  if (resource.compilation.unit.rootContext.dependencyIdentityHandles.length === 0) return null;
  const family = app.emission.templates.frontDoor.familyForOwner(resource.compilation.familyOwnerHandle);
  if (family == null) return null;
  const productHandle = resource.compilation.definition.productHandle;
  const matches = [...family.appOccurrencePrecedents, ...family.authoringOccurrencePrecedents].filter((precedent) =>
    precedent.compilation.definition.productHandle === productHandle
  );
  return matches.length === 1 ? matches[0]! : null;
}

function prepareOccurrenceResource(
  app: SemanticApp,
  resource: TemplateResourceRuntimeAnalysisEmission,
  occurrenceSource: TemplateCompilerOccurrencePrecedentEmission,
  ordinal: number,
  run: ComputationRun,
  store: KernelStore,
): SemanticAppTemplateCompilerPreparation {
  const compilation = resource.compilation;
  const templateSource = occurrenceSource.compilation.unit.templateSource;
  const source = sourceReference(store, templateSource.sourceAddressHandle);
  if (templateSource.markup == null || occurrenceSource.compilation.html.draft == null) {
    return unavailablePreparation(unavailableMaterialization(resource, unavailable(
      TemplateCompilerCompiledHandoffState.Pending,
      source,
      TemplateCompilerCompiledHandoffStage.Input,
      'occurrence-source-unavailable',
      'Occurrence-first local-template handoff requires retained raw markup and authored draft bindings.',
    )));
  }
  const localKey = `compiled-handoff:${ordinal}:${compilation.localKey}:occurrence-family`;
  const browserDraft = parseBrowserTemplateFragmentDraft(templateSource.markup);
  const browser = new BrowserEffectiveTemplateMaterializer(run).materialize({
    localKey,
    sourceRevision: occurrenceSource.sourceRevision,
    templateSource,
    authoredHtml: occurrenceSource.compilation.html,
    browser: browserDraft,
    carrierSelection: selectBrowserTemplateCompilerCarrier(browserDraft.fragment),
  });
  const currentFamily = app.emission.templates.frontDoor.familyForOwner(compilation.familyOwnerHandle);
  if (currentFamily == null) {
    return unavailablePreparation(unavailableMaterialization(resource, unavailable(
      TemplateCompilerCompiledHandoffState.Ineligible,
      source,
      TemplateCompilerCompiledHandoffStage.Input,
      'occurrence-family-unavailable',
      'Occurrence-first local-template handoff lost its current front-door family.',
    )));
  }
  const occurrence = compileTemplateCompilerOccurrenceFamily({
    compilationKey: localKey,
    appCurrentness: app,
    occurrencePrecedent: occurrenceSource,
    browserEmission: browser,
    currentFrontDoor: app.emission.templates.frontDoor,
    currentFamily,
    appRootDefinitionProductHandle: compilation.appRootDefinitionProductHandle,
    publication: run,
  });
  if (occurrence.state !== TemplateCompilerContextFamilyCompilationState.Exact || occurrence.value == null) {
    return unavailablePreparation(unavailableMaterialization(resource, {
      state: familyState(occurrence.state),
      source,
      reasons: occurrence.reasons
        .filter((reason) => reason.role !== TemplateCompilerContextFamilyCompilationReasonRole.FrontierDerivative)
        .map((reason) => contextFamilyReason(reason, store)),
      value: null,
    }));
  }

  const projected = [occurrence.value.rootFamily, ...occurrence.value.locals.map((local) => local.family)].map((family) => {
    const instructions = projectTemplateCompilerRuntimeInstructionFamily({
      family,
      productDetails: run.domainReadProjection,
      resourceRepresentation: TemplateCompilerRuntimeResourceRepresentation.Name,
    });
    if (instructions.state !== TemplateCompilerRuntimeInstructionFamilyState.Exact || instructions.value == null) {
      return { state: 'unavailable' as const, instructions };
    }
    const definitions = projectTemplateCompilerCompiledDefinitionFamily({
      family,
      instructions,
      readView: run.domainReadProjection,
    });
    if (definitions.state !== TemplateCompilerCompiledDefinitionFamilyState.Exact || definitions.value == null) {
      return { state: 'unavailable' as const, instructions, definitions };
    }
    return { state: 'exact' as const, family, instructions: instructions.value, definitions: definitions.value };
  });
  const unavailableProjection = projected.find((entry) => entry.state === 'unavailable') ?? null;
  if (unavailableProjection != null) {
    const definitionFailure = 'definitions' in unavailableProjection
      ? unavailableProjection.definitions ?? null
      : null;
    const reasons = definitionFailure != null
      ? definitionFailure.reasons.map(compiledDefinitionReason)
      : unavailableProjection.instructions.reasons.map(runtimeInstructionReason);
    const state = definitionFailure != null
      ? definitionState(definitionFailure.state)
      : instructionState(unavailableProjection.instructions.state);
    return unavailablePreparation(unavailableMaterialization(resource, {
      state,
      source,
      reasons,
      value: null,
    }));
  }
  const exactProjected = projected.filter((entry): entry is Extract<typeof entry, { readonly state: 'exact' }> =>
    entry.state === 'exact'
  );
  const root = exactProjected[0];
  if (root == null) throw new Error('Exact occurrence family lost its projected root.');
  const sourceResources = new Map([
    ...app.emission.templates.resources,
    ...app.emission.templates.authoringResources,
  ].map((candidate) => [candidate.compilation.unit.templateSource.productHandle, candidate] as const));
  const localPreparations = occurrence.value.locals.map((relation, index) => {
    const localResource = sourceResources.get(relation.sourceTemplateProductHandle) ?? null;
    const projection = exactProjected[index + 1] ?? null;
    if (localResource == null || projection == null) {
      throw new Error(
        `Occurrence local definition '${relation.definition.name}' lost its source compilation `
        + `(resource=${localResource == null ? 'missing' : 'exact'}, projection=${projection == null ? 'missing' : 'exact'}, `
        + `product=${relation.localDefinitionProductHandle}).`,
      );
    }
    return new SemanticAppTemplateCompilerLocalPreparation(
      relation,
      localResource,
      projection.family,
      projection.instructions,
      projection.definitions,
    );
  });
  if (!root.definitions.isCurrent() || localPreparations.some((local) => !local.definitions.isCurrent())) {
    throw new Error(`Occurrence compiled handoff for '${compilation.definition.name}' changed before detachment.`);
  }
  const sourceAttachment = app.emission.resources.definitionSelections.find((selection) =>
    selection.definition === compilation.definition
  )?.sourceAttachment ?? null;
  const definitionProductHandle = compilation.definition.productHandle;
  if (definitionProductHandle == null) {
    return unavailablePreparation(unavailableMaterialization(resource, unavailable(
      TemplateCompilerCompiledHandoffState.Pending,
      source,
      TemplateCompilerCompiledHandoffStage.CompiledDefinitions,
      'definition-product-unavailable',
      'Occurrence compiler handoff requires a materialized root resource definition identity.',
    )));
  }
  return {
    state: 'exact',
    resource,
    source,
    family: root.family,
    instructions: root.instructions,
    definitions: root.definitions,
    markup: templateSource.markup,
    authoredSourceRevision: occurrenceSource.sourceRevision,
    sourceAttachment,
    definitionProductHandle,
    localPreparations,
    occurrenceSource,
  };
}

function finalizeResource(
  preparation: Extract<SemanticAppTemplateCompilerPreparation, { readonly state: 'exact' }>,
  requestorFamiliesByDefinitionProduct: ReadonlyMap<ProductHandle, TemplateCompilerContextFamilyValue>,
  store: KernelStore,
): SemanticAppTemplateCompilerMaterialization {
  if (
    !preparation.family.isCurrent()
    || !preparation.instructions.isCurrent()
    || !preparation.definitions.isCurrent()
    || preparation.localPreparations.some((local) =>
      !local.family.isCurrent() || !local.instructions.isCurrent() || !local.definitions.isCurrent()
    )
  ) {
    throw new Error(`Compiled handoff for '${preparation.resource.compilation.definition.name}' changed before final detachment.`);
  }
  const resource = preparation.resource;
  const compilation = resource.compilation;
  const spreadCompilations = [
    projectRuntimeSpreadCompilationHandoffs({
      resource,
      family: preparation.family,
      requestorFamiliesByDefinitionProduct,
      store,
    }),
    ...preparation.localPreparations.map((local) => projectRuntimeSpreadCompilationHandoffs({
      resource: local.resource,
      family: local.family,
      requestorFamiliesByDefinitionProduct,
      store,
    })),
  ];
  const spreadClosure = combinedSpreadCompilationClosure(spreadCompilations);
  const spreadPlansByInstruction = new Map(spreadCompilations.flatMap((result) =>
    result.state === RuntimeSpreadCompilationHandoffState.Exact ? [...result.plansByInstruction] : []
  ));
  const definitionsByRootProduct = new Map<ProductHandle, TemplateCompilerCompiledDefinitionFamilyValue>([
    [preparation.definitionProductHandle, preparation.definitions],
    ...preparation.localPreparations.map((local) => [
      local.relation.localDefinitionProductHandle,
      local.definitions,
    ] as const),
  ]);
  const localProjections: TemplateCompilerCompiledHandoffLocalFamilyProjection[] = preparation.localPreparations.map(
    (local) => {
      const parentDefinitions = definitionsByRootProduct.get(local.relation.parentDefinitionProductHandle) ?? null;
      if (parentDefinitions == null) {
        throw new Error(`Local definition '${local.relation.definition.name}' lost its parent compiled family.`);
      }
      return {
        definitions: local.definitions,
        sourceCompiledTemplates: local.resource.compilation.compiledTemplate,
        parentDefinitions,
        localDefinitionProductHandle: local.relation.localDefinitionProductHandle,
        localDefinitionIdentityHandle: local.relation.localDefinitionIdentityHandle,
        parentDefinitionProductHandle: local.relation.parentDefinitionProductHandle,
        declarationOrdinal: local.relation.declarationOrdinal,
        compilerAddedDependencyOrdinal: local.relation.compilerAddedDependencyOrdinal,
      };
    },
  );
  const sourceMap = preparation.occurrenceSource?.compilation.unit.templateSource.sourceMap
    ?? compilation.unit.templateSource.sourceMap;
  const handoffValueRequest = {
    definitions: preparation.definitions,
    sourceCompiledTemplates: compilation.compiledTemplate,
    address: {
      definitionProductHandle: preparation.definitionProductHandle,
      definitionIdentityHandle: compilation.definition.identityHandle,
      compilerWorldProductHandle: compilation.compilerWorld.world.productHandle,
      compilerWorldIdentityHandle: compilation.compilerWorld.world.identityHandle,
      sourceAttachment: preparation.sourceAttachment,
    },
    markup: preparation.markup,
    authoredSourceRevision: preparation.authoredSourceRevision,
    sourceMap,
    source: preparation.source,
    store,
    spreadPlansByInstruction,
    spreadClosure,
  } as const;
  let detachedValue: TemplateCompilerCompiledHandoffValue;
  try {
    detachedValue = localProjections.length === 0
      ? projectTemplateCompilerCompiledHandoff(handoffValueRequest)
      : projectTemplateCompilerOccurrenceCompiledHandoff({
          ...handoffValueRequest,
          locals: localProjections,
        });
  } catch (error) {
    if (!(error instanceof TemplateCompilerSourceCompiledTemplateUnavailable)) throw error;
    return unavailableMaterialization(resource, {
      state: TemplateCompilerCompiledHandoffState.Ineligible,
      source: preparation.source,
      value: null,
      reasons: [{
        stage: TemplateCompilerCompiledHandoffStage.CompiledDefinitions,
        reasonKind: error.reasonKind,
        summary: error.message,
        stableKeys: error.stableKeys,
        frontierCause: null,
      }],
    });
  }
  const handoff: SemanticAppTemplateCompilerHandoffResource = {
    state: TemplateCompilerCompiledHandoffState.Exact,
    source: preparation.source,
    reasons: [],
    value: detachedValue,
  };
  return new SemanticAppTemplateCompilerMaterialization(
    resource,
    handoff,
    [
      {
        resource,
        family: preparation.family,
        instructions: preparation.instructions,
        spreadHandoff: spreadCompilations[0]!,
        unavailableReasons: [],
      },
      ...preparation.localPreparations.map((local, index) => ({
        resource: local.resource,
        family: local.family,
        instructions: local.instructions,
        spreadHandoff: spreadCompilations[index + 1]!,
        unavailableReasons: [],
      })),
    ],
  );
}

function uniquePreparedFamiliesByDefinitionProduct(
  preparations: readonly SemanticAppTemplateCompilerPreparation[],
): ReadonlyMap<ProductHandle, TemplateCompilerContextFamilyValue> {
  const grouped = new Map<ProductHandle, TemplateCompilerContextFamilyValue[]>();
  for (const preparation of preparations) {
    if (preparation.state !== 'exact') continue;
    for (const [definitionProductHandle, family] of [
      [preparation.definitionProductHandle, preparation.family] as const,
      ...preparation.localPreparations.map((local) => [
        local.relation.localDefinitionProductHandle,
        local.family,
      ] as const),
    ]) {
      const families = grouped.get(definitionProductHandle);
      if (families == null) {
        grouped.set(definitionProductHandle, [family]);
      } else {
        families.push(family);
      }
    }
  }
  return new Map([...grouped].flatMap(([definitionProductHandle, families]) =>
    families.length === 1
      ? [[definitionProductHandle, families[0]!] as const]
      : []
  ));
}

function unavailablePreparation(
  materialization: SemanticAppTemplateCompilerMaterialization,
): SemanticAppTemplateCompilerPreparation {
  return { state: 'unavailable', materialization };
}

function unavailableMaterialization(
  resource: TemplateResourceRuntimeAnalysisEmission,
  handoff: UnavailableSemanticAppTemplateCompilerHandoffResource,
): SemanticAppTemplateCompilerMaterialization {
  return new SemanticAppTemplateCompilerMaterialization(
    resource,
    handoff,
    [{
      resource,
      family: null,
      instructions: null,
      spreadHandoff: null,
      unavailableReasons: handoff.reasons.map((reason) => ({
        reasonKind: RuntimeRegistrationRequirementReasonKind.CompilerHandoffUnavailable,
        summary: reason.summary,
        stableKeys: [reason.stage, reason.reasonKind, ...reason.stableKeys],
      })),
    }],
  );
}

function resourceMatchesPath(
  app: SemanticApp,
  resource: TemplateResourceRuntimeAnalysisEmission,
  filePath: string,
  store: KernelStore,
): boolean {
  const source = sourceReference(store, resource.compilation.unit.templateSource.sourceAddressHandle);
  const candidates = path.isAbsolute(filePath)
    ? [
        filePath,
        path.relative(app.project.rootDir, filePath),
        path.relative(app.runtime.workspace.rootDir, filePath),
      ]
    : [filePath];
  return candidates.some((candidate) => semanticSourceReferenceMatchesFilePath(source, candidate));
}

function contextFamilyReason(
  reason: TemplateCompilerContextFamilyCompilationReason,
  store: KernelStore,
): TemplateCompilerCompiledHandoffReason {
  const cause = reason.frontierCause;
  const issue = cause?.issue ?? null;
  return {
    stage: TemplateCompilerCompiledHandoffStage.ContextFamily,
    reasonKind: `${reason.stage}:${reason.reasonKind}`,
    summary: reason.summary,
    stableKeys: reason.stableKeys,
    frontierCause: cause == null
      ? null
      : {
          frontierKind: cause.frontierKind,
          nodeOccurrenceKey: cause.nodeOccurrenceKey,
          attributeOccurrenceKey: cause.attributeOccurrenceKey,
          issue: issue == null
            ? null
            : {
                productHandle: issue.productHandle,
                identityHandle: issue.identityHandle,
                issueKind: issue.issueKind,
                frameworkErrorCode: issue.frameworkErrorCode,
              },
          source: sourceReference(store, cause.sourceAddressHandle),
        },
  };
}

function runtimeInstructionReason(
  reason: TemplateCompilerRuntimeInstructionReason,
): TemplateCompilerCompiledHandoffReason {
  return {
    stage: TemplateCompilerCompiledHandoffStage.RuntimeInstructions,
    reasonKind: reason.reasonKind,
    summary: reason.summary,
    stableKeys: [reason.instructionKind, reason.instructionProductHandle]
      .filter((value) => value != null)
      .map(String),
    frontierCause: null,
  };
}

function compiledDefinitionReason(
  reason: TemplateCompilerCompiledDefinitionReason,
): TemplateCompilerCompiledHandoffReason {
  return {
    stage: TemplateCompilerCompiledHandoffStage.CompiledDefinitions,
    reasonKind: reason.reasonKind,
    summary: reason.summary,
    stableKeys: reason.stableKeys,
    frontierCause: null,
  };
}

function unavailable(
  state: Exclude<TemplateCompilerCompiledHandoffState, TemplateCompilerCompiledHandoffState.Exact>,
  source: SemanticSourceReference | null,
  stage: TemplateCompilerCompiledHandoffStage,
  reasonKind: string,
  summary: string,
): UnavailableSemanticAppTemplateCompilerHandoffResource {
  return {
    state,
    source,
    value: null,
    reasons: [{ stage, reasonKind, summary, stableKeys: [], frontierCause: null }],
  };
}

function familyState(
  state: TemplateCompilerContextFamilyCompilationState,
): Exclude<TemplateCompilerCompiledHandoffState, TemplateCompilerCompiledHandoffState.Exact> {
  switch (state) {
    case TemplateCompilerContextFamilyCompilationState.Pending: return TemplateCompilerCompiledHandoffState.Pending;
    case TemplateCompilerContextFamilyCompilationState.Ineligible: return TemplateCompilerCompiledHandoffState.Ineligible;
    case TemplateCompilerContextFamilyCompilationState.Open: return TemplateCompilerCompiledHandoffState.Open;
    case TemplateCompilerContextFamilyCompilationState.Abrupt: return TemplateCompilerCompiledHandoffState.Abrupt;
    case TemplateCompilerContextFamilyCompilationState.Exact:
      throw new Error('Exact context-family state cannot be projected as unavailable.');
  }
}

function instructionState(
  state: TemplateCompilerRuntimeInstructionFamilyState,
): TemplateCompilerCompiledHandoffState.Pending | TemplateCompilerCompiledHandoffState.Ineligible {
  if (state === TemplateCompilerRuntimeInstructionFamilyState.Exact) {
    throw new Error('Exact instruction-family state cannot be projected as unavailable.');
  }
  return state === TemplateCompilerRuntimeInstructionFamilyState.Pending
    ? TemplateCompilerCompiledHandoffState.Pending
    : TemplateCompilerCompiledHandoffState.Ineligible;
}

function combinedSpreadCompilationClosure(
  results: readonly RuntimeSpreadCompilationHandoffResult[],
): TemplateCompilerCompiledHandoffSpreadClosure {
  const unavailable = results.filter((result) => result.state !== RuntimeSpreadCompilationHandoffState.Exact);
  if (unavailable.length === 0) return { state: 'exact', reasons: [] };
  const state = unavailable.some((result) => result.state === RuntimeSpreadCompilationHandoffState.Ineligible)
    ? 'ineligible'
    : unavailable.some((result) => result.state === RuntimeSpreadCompilationHandoffState.Open)
      ? 'open'
      : 'pending';
  return {
    state,
    reasons: unavailable.flatMap((result) => result.reasons.map((reason) => ({
      reasonKind: reason.reasonKind,
      summary: reason.summary,
      stableKeys: reason.stableKeys,
    }))),
  };
}

function definitionState(
  state: TemplateCompilerCompiledDefinitionFamilyState,
): TemplateCompilerCompiledHandoffState.Pending | TemplateCompilerCompiledHandoffState.Ineligible {
  if (state === TemplateCompilerCompiledDefinitionFamilyState.Exact) {
    throw new Error('Exact compiled-definition state cannot be projected as unavailable.');
  }
  return state === TemplateCompilerCompiledDefinitionFamilyState.Pending
    ? TemplateCompilerCompiledHandoffState.Pending
    : TemplateCompilerCompiledHandoffState.Ineligible;
}
