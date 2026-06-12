import {
  SourcePlanFileRole,
  sourcePatternUseSummary,
  type SourcePlan,
} from '../../source-plan/source-plan.js';
import {
  AppBuilderAppStateOwnershipMode,
  AppBuilderPackageCapability,
} from '../aurelia-lowering-option.js';
import {
  AppBuilderSeedDataSetId,
} from '../seed-data.js';
import type {
  AppBuilderSuppliedInput,
} from './input-readiness.js';
import {
  AppBuilderSourceLoweringSourcePlanSelectionKind,
} from './source-lowering-request-field.js';
import {
  appBuilderSourceLoweringPluginPolicyPayloads,
  appBuilderSourceLoweringStatePolicyPayloads,
} from './source-lowering-inputs.js';
import type {
  AppBuilderSourceLoweringSourcePlanFrame,
} from './source-lowering-source-plan-selection.js';
import type {
  ExpectedSemanticEffectKind,
} from '../../fixture-verification/expected-effect.js';
import type {
  AppBuilderOntologyRowRef,
} from './relation.js';

/** Public boundary note attached to generated SourcePlan answers for AI handoff. */
export enum AppBuilderSourcePlanHandoffNoteKind {
  /** Source-pattern policy explains whether generated source is directly applicable, selective reference material, or analysis pressure. */
  SourcePatternUse = 'source-pattern-use',
  /** Generated seed records are scaffold/input material rather than durable product data or persistence policy. */
  SeedDataScaffold = 'seed-data-scaffold',
  /** Generated service files are local service/adaptor scaffolds, not a server/fetch/persistence contract. */
  ServiceBoundaryScaffold = 'service-boundary-scaffold',
  /** App-builder emitted Aurelia wiring and source structure while caller/AI retains ordinary business-rule ownership. */
  BusinessBehaviorCallerOwned = 'business-behavior-caller-owned',
  /** Application assembly composes route/service topology without proving every cross-area business-state invariant. */
  ApplicationAssemblyLocality = 'application-assembly-locality',
  /** Selected optional plugin/capability policy is recognized but this SourcePlan did not emit that architecture. */
  DeferredCapabilityHandoff = 'deferred-capability-handoff',
  /** SourcePlan preview is a complete write plan only after the host writes the returned file rows. */
  MaterializationInstruction = 'materialization-instruction',
  /** SourcePlan preview declares facts to verify after materialization; the preview itself has not written or reopened files. */
  SemanticVerificationContract = 'semantic-verification-contract',
}

/** Compact stable row explaining what an AI or host still owns after source-plan generation. */
export interface AppBuilderSourcePlanHandoffNote {
  /** Stable handoff note family. */
  readonly kind: AppBuilderSourcePlanHandoffNoteKind;
  /** Human-readable boundary statement intended for MCP/IDE consumers. */
  readonly summary: string;
  /** App-builder ontology rows whose generated source caused or contextualized the note. */
  readonly targetRefs: readonly AppBuilderOntologyRowRef[];
  /** Source file roles that make the note concrete, when applicable. */
  readonly sourceFileRoles: readonly SourcePlanFileRole[];
  /** Expected-effect families involved in the note, when applicable. */
  readonly expectedEffectKinds: readonly ExpectedSemanticEffectKind[];
}

/** Derive factual AI handoff/result-boundary notes from one SourcePlan preview. */
export function appBuilderSourcePlanHandoffNotes(
  sourcePlan: SourcePlan | null,
  frame: AppBuilderSourceLoweringSourcePlanFrame,
  suppliedInputs: readonly AppBuilderSuppliedInput[] = [],
): readonly AppBuilderSourcePlanHandoffNote[] {
  if (sourcePlan == null) {
    return [];
  }
  const sourceFileRoles = uniqueSourceFileRoles(sourcePlan);
  return uniqueHandoffNotes([
    ...sourcePatternUseNotes(sourcePlan, frame.sourceLoweringTargetRefs),
    ...seedDataScaffoldNotes(frame),
    ...serviceBoundaryScaffoldNotes(sourceFileRoles, frame.sourceLoweringTargetRefs),
    businessBehaviorCallerOwnedNote(sourceFileRoles, frame.sourceLoweringTargetRefs),
    materializationInstructionNote(sourcePlan, frame, sourceFileRoles),
    ...applicationAssemblyLocalityNotes(frame),
    ...deferredCapabilityHandoffNotes(suppliedInputs, sourceFileRoles, frame.sourceLoweringTargetRefs),
    semanticVerificationContractNote(frame, sourceFileRoles),
  ]);
}

function materializationInstructionNote(
  sourcePlan: SourcePlan,
  frame: AppBuilderSourceLoweringSourcePlanFrame,
  sourceFileRoles: readonly SourcePlanFileRole[],
): AppBuilderSourcePlanHandoffNote {
  const writableFileCount = sourcePlan.files.filter((file) => file.text != null).length;
  const targetRoot = sourcePlan.rootDir.length === 0 ? 'the requested root' : sourcePlan.rootDir;
  return handoffNote(
    AppBuilderSourcePlanHandoffNoteKind.MaterializationInstruction,
    `To materialize this preview, write the ${writableFileCount}/${sourcePlan.files.length} returned sourcePlan.files row(s) that include complete text under ${targetRoot}, apply returned projectTooling/package setup when present, then reopen the app through semantic-runtime; this query does not write files.`,
    frame.sourceLoweringTargetRefs,
    sourceFileRoles,
    [],
  );
}

function sourcePatternUseNotes(
  sourcePlan: SourcePlan,
  targetRefs: readonly AppBuilderOntologyRowRef[],
): readonly AppBuilderSourcePlanHandoffNote[] {
  return sourcePlan.pattern == null
    ? []
    : [handoffNote(
        AppBuilderSourcePlanHandoffNoteKind.SourcePatternUse,
        sourcePatternUseSummary(sourcePlan.pattern),
        targetRefs,
        [],
        [],
      )];
}

function seedDataScaffoldNotes(
  frame: AppBuilderSourceLoweringSourcePlanFrame,
): readonly AppBuilderSourcePlanHandoffNote[] {
  if (!sourcePlanFrameHasSeedRecords(frame)) {
    return [];
  }
  return [handoffNote(
    AppBuilderSourcePlanHandoffNoteKind.SeedDataScaffold,
    'Generated seed records came from explicit app-builder input and keep the app runnable; replace them or connect them to real persistence when moving beyond scaffold data.',
    frame.sourceLoweringTargetRefs,
    [SourcePlanFileRole.StateModel, SourcePlanFileRole.Component, SourcePlanFileRole.Service],
    [],
  )];
}

function serviceBoundaryScaffoldNotes(
  sourceFileRoles: readonly SourcePlanFileRole[],
  targetRefs: readonly AppBuilderOntologyRowRef[],
): readonly AppBuilderSourcePlanHandoffNote[] {
  return sourceFileRoles.includes(SourcePlanFileRole.Service)
    ? [handoffNote(
        AppBuilderSourcePlanHandoffNoteKind.ServiceBoundaryScaffold,
        'Generated service source is a local service/adaptor scaffold for Aurelia wiring and semantic verification; server APIs, fetch policy, caching, retries, and persistence remain caller/AI-owned.',
        targetRefs,
        [SourcePlanFileRole.Service],
        [],
      )]
    : [];
}

function businessBehaviorCallerOwnedNote(
  sourceFileRoles: readonly SourcePlanFileRole[],
  targetRefs: readonly AppBuilderOntologyRowRef[],
): AppBuilderSourcePlanHandoffNote {
  return handoffNote(
    AppBuilderSourcePlanHandoffNoteKind.BusinessBehaviorCallerOwned,
    'App-builder generated Aurelia source structure, bindings, DI/router wiring, and selected source-lowering mechanics; ordinary TypeScript domain rules and business policy remain caller/AI-owned unless they are explicit generated source facts.',
    targetRefs,
    sourceFileRoles,
    [],
  );
}

function applicationAssemblyLocalityNotes(
  frame: AppBuilderSourceLoweringSourcePlanFrame,
): readonly AppBuilderSourcePlanHandoffNote[] {
  return frame.sourceLoweringSelectionKind === AppBuilderSourceLoweringSourcePlanSelectionKind.ApplicationAssembly
    ? [handoffNote(
        AppBuilderSourcePlanHandoffNoteKind.ApplicationAssemblyLocality,
        'ApplicationAssembly composes runnable app topology and route/service areas from explicit child source plans; generated DI state collections share an assembly-level state boundary, while service persistence, external data, and caller-owned business invariants remain outside the declared expected semantic effects.',
        frame.sourceLoweringTargetRefs,
        [SourcePlanFileRole.RootComponent, SourcePlanFileRole.Entrypoint, SourcePlanFileRole.StateModel, SourcePlanFileRole.Service],
        frame.expectedEffectKinds,
      )]
    : [];
}

function deferredCapabilityHandoffNotes(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  sourceFileRoles: readonly SourcePlanFileRole[],
  targetRefs: readonly AppBuilderOntologyRowRef[],
): readonly AppBuilderSourcePlanHandoffNote[] {
  const deferredCapabilities = selectedDeferredPackageCapabilities(suppliedInputs);
  return deferredCapabilities.length === 0
    ? []
    : [handoffNote(
        AppBuilderSourcePlanHandoffNoteKind.DeferredCapabilityHandoff,
        `Selected optional Aurelia package capability/capabilities (${deferredCapabilities.join(', ')}) are recognized policy input, but this SourcePlan did not emit plugin-specific architecture for them; keep existing app usage visible through semantic-runtime analysis or let the caller/AI integrate the plugin deliberately.`,
        targetRefs,
        sourceFileRoles,
        [],
      )];
}

function selectedDeferredPackageCapabilities(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderPackageCapability[] {
  return uniqueValues([
    ...appBuilderSourceLoweringPluginPolicyPayloads(suppliedInputs)
      .flatMap((payload) => payload.packageCapabilities ?? []),
    ...appBuilderSourceLoweringStatePolicyPayloads(suppliedInputs)
      .filter((payload) => payload.appStateOwnership === AppBuilderAppStateOwnershipMode.StatePluginStore)
      .map(() => AppBuilderPackageCapability.State),
  ]);
}

function semanticVerificationContractNote(
  frame: AppBuilderSourceLoweringSourcePlanFrame,
  sourceFileRoles: readonly SourcePlanFileRole[],
): AppBuilderSourcePlanHandoffNote {
  return handoffNote(
    AppBuilderSourcePlanHandoffNoteKind.SemanticVerificationContract,
    `This SourcePlan declares ${frame.expectedEffects.length} expected semantic effect(s), ${frame.controlUseInventoryRows.length} generated control-use row(s), and generated source/tooling witnesses for verification after materialization; the preview itself has not written files or reopened the generated app.`,
    frame.sourceLoweringTargetRefs,
    sourceFileRoles,
    frame.expectedEffectKinds,
  );
}

function sourcePlanFrameHasSeedRecords(
  frame: AppBuilderSourceLoweringSourcePlanFrame,
): boolean {
  return (frame.sourceLoweringRouterBackedListDetail?.seedDataSet?.id === AppBuilderSeedDataSetId.CallerSupplied
      && frame.sourceLoweringRouterBackedListDetail.seedDataSet.records.length > 0)
    || (frame.sourceLoweringApplicationAssembly?.routeAreas.some((routeArea) =>
      routeArea.seedDataSet?.id === AppBuilderSeedDataSetId.CallerSupplied
      && routeArea.seedDataSet.records.length > 0
    ) ?? false)
    || (frame.sourceLoweringDiStateClass?.seedRecords.length ?? 0) > 0
    || (frame.sourceLoweringLocalViewModelState?.seedRecords.length ?? 0) > 0
    || (frame.sourceLoweringComponentPair?.sourceLoweringLocalViewModelState?.seedRecords.length ?? 0) > 0;
}

function handoffNote(
  kind: AppBuilderSourcePlanHandoffNoteKind,
  summary: string,
  targetRefs: readonly AppBuilderOntologyRowRef[],
  sourceFileRoles: readonly SourcePlanFileRole[],
  expectedEffectKinds: readonly ExpectedSemanticEffectKind[],
): AppBuilderSourcePlanHandoffNote {
  return {
    kind,
    summary,
    targetRefs,
    sourceFileRoles: uniqueValues(sourceFileRoles),
    expectedEffectKinds: uniqueValues(expectedEffectKinds),
  };
}

function uniqueHandoffNotes(
  notes: readonly AppBuilderSourcePlanHandoffNote[],
): readonly AppBuilderSourcePlanHandoffNote[] {
  const byKind = new Map<AppBuilderSourcePlanHandoffNoteKind, AppBuilderSourcePlanHandoffNote>();
  for (const note of notes) {
    if (!byKind.has(note.kind)) {
      byKind.set(note.kind, note);
    }
  }
  return [...byKind.values()];
}

function uniqueSourceFileRoles(sourcePlan: SourcePlan): readonly SourcePlanFileRole[] {
  return uniqueValues([
    ...sourcePlan.files.map((file) => file.role),
    ...(sourcePlan.projectTooling == null ? [] : [SourcePlanFileRole.ProjectConfig]),
  ]);
}

function uniqueValues<TValue extends string>(
  values: readonly TValue[],
): readonly TValue[] {
  return [...new Set(values)];
}
