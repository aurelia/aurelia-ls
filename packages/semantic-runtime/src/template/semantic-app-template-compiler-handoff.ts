import path from 'node:path';

import type { SemanticApp } from '../api/runtime.js';
import {
  semanticSourceReferenceMatchesFilePath,
  type SemanticSourceReference,
} from '../api/source-reference.js';
import type { KernelStore } from '../kernel/store.js';
import type { ProductHandle } from '../kernel/handles.js';
import {
  BrowserEffectiveTemplateMaterializer,
} from './browser-effective-template-materializer.js';
import { parseBrowserTemplateFragmentDraft } from './browser-template-parser.js';
import { selectBrowserTemplateCompilerCarrier } from './browser-template-selection.js';
import {
  compileTemplateCompilerContextFamily,
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
  sourceReference,
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
import type { TemplateResourceRuntimeAnalysisEmission } from './template-compilation-project-pass.js';
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

type BrowserMaterializationContext = ConstructorParameters<typeof BrowserEffectiveTemplateMaterializer>[0];

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
    readonly requirementInput: RuntimeRegistrationRequirementCompilerInput,
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
  const resources = candidates.filter((resource) =>
    requestedPaths.length === 0 || requestedPaths.some((filePath) => resourceMatchesPath(app, resource, filePath, store))
  );
  const matchedPaths = new Set(requestedPaths.filter((filePath) =>
    resources.some((resource) => resourceMatchesPath(app, resource, filePath, store))
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
        materialized.map((entry) => entry.requirementInput),
        resources.length === candidates.length
          ? []
          : [{
              reasonKind: RuntimeRegistrationRequirementReasonKind.CompilerCohortIncomplete,
              summary: 'Selective template handoff materialization does not cover the complete app runtime cohort.',
              stableKeys: candidates
                .filter((candidate) => !resources.includes(candidate))
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
  run: BrowserMaterializationContext,
  store: KernelStore,
): SemanticAppTemplateCompilerPreparation {
  const compilation = resource.compilation;
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
      reasons: family.reasons.map(contextFamilyReason),
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
  ) {
    throw new Error(`Compiled handoff for '${preparation.resource.compilation.definition.name}' changed before final detachment.`);
  }
  const resource = preparation.resource;
  const compilation = resource.compilation;
  const spreadCompilations = projectRuntimeSpreadCompilationHandoffs({
    resource,
    family: preparation.family,
    requestorFamiliesByDefinitionProduct,
    store,
  });
  const spreadClosure = spreadCompilationClosure(spreadCompilations);
  const handoff: SemanticAppTemplateCompilerHandoffResource = {
    state: TemplateCompilerCompiledHandoffState.Exact,
    source: preparation.source,
    reasons: [],
    value: projectTemplateCompilerCompiledHandoff({
      definitions: preparation.definitions,
      address: {
        definitionProductHandle: preparation.definitionProductHandle,
        definitionIdentityHandle: compilation.definition.identityHandle,
        compilerWorldProductHandle: compilation.compilerWorld.world.productHandle,
        compilerWorldIdentityHandle: compilation.compilerWorld.world.identityHandle,
        sourceAttachment: preparation.sourceAttachment,
      },
      markup: preparation.markup,
      authoredSourceRevision: preparation.authoredSourceRevision,
      sourceMap: compilation.unit.templateSource.sourceMap,
      source: preparation.source,
      store,
      spreadPlansByInstruction: spreadCompilations.state === RuntimeSpreadCompilationHandoffState.Exact
        ? spreadCompilations.plansByInstruction
        : new Map(),
      spreadClosure,
    }),
  };
  return new SemanticAppTemplateCompilerMaterialization(
    resource,
    handoff,
    {
      resource,
      family: preparation.family,
      instructions: preparation.instructions,
      unavailableReasons: [],
    },
  );
}

function uniquePreparedFamiliesByDefinitionProduct(
  preparations: readonly SemanticAppTemplateCompilerPreparation[],
): ReadonlyMap<ProductHandle, TemplateCompilerContextFamilyValue> {
  const grouped = new Map<ProductHandle, TemplateCompilerContextFamilyValue[]>();
  for (const preparation of preparations) {
    if (preparation.state !== 'exact') continue;
    const families = grouped.get(preparation.definitionProductHandle);
    if (families == null) {
      grouped.set(preparation.definitionProductHandle, [preparation.family]);
    } else {
      families.push(preparation.family);
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
    {
      resource,
      family: null,
      instructions: null,
      unavailableReasons: handoff.reasons.map((reason) => ({
        reasonKind: RuntimeRegistrationRequirementReasonKind.CompilerHandoffUnavailable,
        summary: reason.summary,
        stableKeys: [reason.stage, reason.reasonKind, ...reason.stableKeys],
      })),
    },
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
): TemplateCompilerCompiledHandoffReason {
  return {
    stage: TemplateCompilerCompiledHandoffStage.ContextFamily,
    reasonKind: `${reason.stage}:${reason.reasonKind}`,
    summary: reason.summary,
    stableKeys: reason.stableKeys,
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
  };
}

function unavailable(
  state: Exclude<TemplateCompilerCompiledHandoffState, TemplateCompilerCompiledHandoffState.Exact>,
  source: SemanticSourceReference | null,
  stage: TemplateCompilerCompiledHandoffStage,
  reasonKind: string,
  summary: string,
): UnavailableSemanticAppTemplateCompilerHandoffResource {
  return { state, source, value: null, reasons: [{ stage, reasonKind, summary, stableKeys: [] }] };
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

function spreadCompilationClosure(
  result: RuntimeSpreadCompilationHandoffResult,
): TemplateCompilerCompiledHandoffSpreadClosure {
  return result.state === RuntimeSpreadCompilationHandoffState.Exact
    ? { state: 'exact', reasons: [] }
    : {
        state: result.state,
        reasons: result.reasons.map((reason) => ({
          reasonKind: reason.reasonKind,
          summary: reason.summary,
          stableKeys: reason.stableKeys,
        })),
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
