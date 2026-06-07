import {
  AppBuilderAffordanceId,
} from './affordance.js';
import {
  APP_BUILDER_INPUT_CONTRACT_ROWS,
  APP_BUILDER_INPUT_FACET_ROWS,
  AppBuilderInputContractId,
  type AppBuilderInputFacetId,
  AppBuilderInputNecessity,
  AppBuilderSuppliedInputSource,
  type AppBuilderInputContractRow,
  type AppBuilderInputFacetRow,
  appBuilderUniqueInputFacetIds,
} from './input.js';
import {
  appBuilderInputFacetDetail,
  AppBuilderInputPayloadSchemaKind,
  AppBuilderInputPayloadSchemaState,
  type AppBuilderInputPayloadSchema,
} from './input-contract-detail.js';
import {
  AppBuilderOntologyRelationKind,
  AppBuilderOntologyRowKind,
  appBuilderOntologyRowRef,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  APP_BUILDER_ONTOLOGY_RELATION_ROWS,
} from './relation-index.js';
import {
  appBuilderOntologyRowDescriptor,
  type AppBuilderOntologyRowDescriptor,
} from './row-descriptor.js';
import {
  appBuilderDecisionBundleDecisionCount,
  appBuilderDecisionBundleExpansionRows,
  appBuilderSuppliedInputsForTarget,
  appBuilderSuppliedInputsWithDecisionBundles,
  type AppBuilderDecisionBundle,
  type AppBuilderDecisionBundleExpansionRow,
} from '../policy/decision-bundle.js';
import {
  AppBuilderOntologyTargetSelectionIssueKind,
  appBuilderNormalizeOntologyTargetSelection,
  type AppBuilderOntologyTargetSelectionIssue,
  type AppBuilderOntologyTargetSelector,
} from './target-selector.js';
import type {
  AppBuilderOntologyDomain,
} from './status.js';

/** Readiness state for one input dependency after supplied inputs are considered. */
export enum AppBuilderInputReadinessState {
  /** An accepted supplied input covers this dependency. */
  Satisfied = 'satisfied',
  /** A structurally required input is absent. */
  MissingRequired = 'missing-required',
  /** A normally useful or quality-improving input is absent. */
  MissingRecommended = 'missing-recommended',
  /** An optional input is absent. */
  MissingOptional = 'missing-optional',
  /** The input belongs to a later feature ring. */
  Deferred = 'deferred',
}

/** Stable value list for app-builder input-readiness transport schemas. */
export const APP_BUILDER_INPUT_READINESS_STATES = [
  AppBuilderInputReadinessState.Satisfied,
  AppBuilderInputReadinessState.MissingRequired,
  AppBuilderInputReadinessState.MissingRecommended,
  AppBuilderInputReadinessState.MissingOptional,
  AppBuilderInputReadinessState.Deferred,
] as const;

/** Issue category produced while projecting app-builder input readiness. */
export enum AppBuilderInputReadinessIssueKind {
  /** The caller requested a target row that the ontology does not admit. */
  UnknownTarget = 'unknown-target',
  /** A compact target selector supplied a domain that does not match its row kind. */
  TargetSelectorDomainMismatch = 'target-selector-domain-mismatch',
  /** An ontology relation points at an input contract that is not admitted. */
  UnknownInputContract = 'unknown-input-contract',
  /** An ontology relation points at an input facet that is not admitted under the target input contract. */
  UnknownInputFacet = 'unknown-input-facet',
  /** A supplied input marker names an input contract that the ontology does not admit. */
  UnknownSuppliedInputContract = 'unknown-supplied-input-contract',
  /** A supplied input marker names an input facet that the ontology does not admit. */
  UnknownSuppliedInputFacet = 'unknown-supplied-input-facet',
  /** A supplied input marker names a facet outside its own input contract. */
  UnsupportedSuppliedInputFacet = 'unsupported-supplied-input-facet',
  /** A supplied input source cannot honestly satisfy the target contract. */
  UnsupportedInputSource = 'unsupported-input-source',
  /** A supplied facet payload does not match the modeled input-contract detail schema. */
  InvalidSuppliedInputPayload = 'invalid-supplied-input-payload',
}

/** Stable value list for input-readiness issue transport schemas. */
export const APP_BUILDER_INPUT_READINESS_ISSUE_KINDS = [
  AppBuilderInputReadinessIssueKind.UnknownTarget,
  AppBuilderInputReadinessIssueKind.TargetSelectorDomainMismatch,
  AppBuilderInputReadinessIssueKind.UnknownInputContract,
  AppBuilderInputReadinessIssueKind.UnknownInputFacet,
  AppBuilderInputReadinessIssueKind.UnknownSuppliedInputContract,
  AppBuilderInputReadinessIssueKind.UnknownSuppliedInputFacet,
  AppBuilderInputReadinessIssueKind.UnsupportedSuppliedInputFacet,
  AppBuilderInputReadinessIssueKind.UnsupportedInputSource,
  AppBuilderInputReadinessIssueKind.InvalidSuppliedInputPayload,
] as const;

/** Validation state for one supplied input facet payload. */
export enum AppBuilderSuppliedInputPayloadValidationState {
  /** Payload matched the modeled facet schema. */
  Valid = 'valid',
  /** Payload did not match the modeled facet schema. */
  Invalid = 'invalid',
  /** Payload belongs to a facet whose schema is TBD, deferred, or semantic-runtime supplied. */
  Unvalidated = 'unvalidated',
}

/** Stable value list for supplied input payload validation state transport schemas. */
export const APP_BUILDER_SUPPLIED_INPUT_PAYLOAD_VALIDATION_STATES = [
  AppBuilderSuppliedInputPayloadValidationState.Valid,
  AppBuilderSuppliedInputPayloadValidationState.Invalid,
  AppBuilderSuppliedInputPayloadValidationState.Unvalidated,
] as const;

/** Concrete payload supplied for one fine-grained input facet. */
export interface AppBuilderSuppliedInputFacetPayload {
  /** Facet whose concrete input value is being supplied. */
  readonly inputFacetId: AppBuilderInputFacetId | `${AppBuilderInputFacetId}`;
  /** Caller/AI/public-preset/app-fact value for this facet; interpreted through input-contract-detail schemas. */
  readonly value: unknown;
  /** Optional compact label for AI-facing display. */
  readonly label?: string;
  /** Optional compact explanation of the payload. */
  readonly summary?: string;
}

/** Marker that a caller, AI, app fact, policy, or public preset supplies one input contract. */
export interface AppBuilderSuppliedInput {
  /** Input contract this supplied marker claims to satisfy. */
  readonly inputContractId: AppBuilderInputContractId | `${AppBuilderInputContractId}`;
  /** Provenance category for the supplied input. */
  readonly sourceId: AppBuilderSuppliedInputSource | `${AppBuilderSuppliedInputSource}`;
  /** Specific facets this marker satisfies; omitted means the marker claims the whole contract. */
  readonly inputFacetIds?: readonly (AppBuilderInputFacetId | `${AppBuilderInputFacetId}`)[] | null;
  /** Target rows this input applies to; omitted means the marker is target-global. */
  readonly targetRefs?: readonly AppBuilderOntologyRowRef[] | null;
  /** Concrete facet payloads supplied alongside this marker. */
  readonly facetPayloads?: readonly AppBuilderSuppliedInputFacetPayload[] | null;
  /** Optional compact label for AI-facing display. */
  readonly label?: string;
  /** Optional compact explanation of what was supplied. */
  readonly summary?: string;
}

/** Validation row for one supplied facet payload after applying the compact input schema vocabulary. */
export interface AppBuilderSuppliedInputPayloadValidationRow {
  /** Input contract the payload travelled with. */
  readonly inputContractId: AppBuilderInputContractId | `${AppBuilderInputContractId}`;
  /** Source category for the supplied input marker. */
  readonly sourceId: AppBuilderSuppliedInputSource | `${AppBuilderSuppliedInputSource}`;
  /** Facet whose payload was validated. */
  readonly inputFacetId: AppBuilderInputFacetId | `${AppBuilderInputFacetId}`;
  /** Whether the payload validated, failed, or could not be schema-validated yet. */
  readonly state: AppBuilderSuppliedInputPayloadValidationState;
  /** Payload schema state from input-contract-detail. */
  readonly payloadSchemaState?: AppBuilderInputPayloadSchemaState;
  /** Validation failure messages when state is invalid. */
  readonly issues: readonly string[];
  /** Compact explanation suitable for MCP/IDE display. */
  readonly summary: string;
}

/** Request for projecting input readiness over selected app-builder ontology targets. */
export interface AppBuilderInputReadinessRequest {
  /** Ontology rows to inspect; omitted means the default blank-slate intake affordance. */
  readonly targetRefs?: readonly AppBuilderOntologyRowRef[] | null;
  /** Compact kind/id target selectors; normalized to exact targetRefs before graph operations. */
  readonly targetSelectors?: readonly AppBuilderOntologyTargetSelector[] | null;
  /** Input markers already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles that expand into supplied input markers before readiness is evaluated. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include fine-grained input facets on dependency rows; defaults to true. */
  readonly includeInputFacets?: boolean | null;
  /** Include decision-bundle expansion rows; defaults to false so compact answers keep counts only. */
  readonly includeDecisionBundleExpansionRows?: boolean | null;
}

/** Issue row produced by app-builder input-readiness projection. */
export interface AppBuilderInputReadinessIssue {
  /** Stable issue category. */
  readonly issueKind: AppBuilderInputReadinessIssueKind;
  /** Target row involved in the issue when applicable. */
  readonly targetRef?: AppBuilderOntologyRowRef;
  /** Compact target selector involved in the issue when applicable. */
  readonly targetSelector?: AppBuilderOntologyTargetSelector;
  /** Derived target domain when a compact selector supplied an inconsistent domain. */
  readonly expectedDomain?: AppBuilderOntologyDomain;
  /** Input contract involved in the issue when applicable. */
  readonly inputContractId?: AppBuilderInputContractId | `${AppBuilderInputContractId}`;
  /** Input facet involved in the issue when applicable. */
  readonly inputFacetId?: AppBuilderInputFacetId | `${AppBuilderInputFacetId}`;
  /** Supplied input marker involved in the issue when applicable. */
  readonly suppliedInput?: AppBuilderSuppliedInput;
  /** Supplied input payload validation row involved in the issue when applicable. */
  readonly payloadValidation?: AppBuilderSuppliedInputPayloadValidationRow;
  /** Compact explanation suitable for MCP/IDE display. */
  readonly summary: string;
}

/** Readiness row for one target row -> input contract dependency. */
export interface AppBuilderInputReadinessDependencyRow {
  /** Target ontology row being inspected. */
  readonly targetRef: AppBuilderOntologyRowRef;
  /** Input contract dependency. */
  readonly inputContract: AppBuilderInputContractRow;
  /** Fine-grained facets that explain what this input contract can contain. */
  readonly inputFacets?: readonly AppBuilderInputFacetRow[];
  /** Facet ids that this dependency specifically needs; omitted/empty means the whole contract. */
  readonly dependencyInputFacetIds: readonly AppBuilderInputFacetId[];
  /** Facet ids covered by accepted supplied inputs for this dependency. */
  readonly suppliedInputFacetIds: readonly AppBuilderInputFacetId[];
  /** Required dependency facets that remain uncovered. */
  readonly missingInputFacetIds: readonly AppBuilderInputFacetId[];
  /** Accepted supplied markers for this input contract. */
  readonly suppliedInputs: readonly AppBuilderSuppliedInput[];
  /** Supplied markers that named this contract but used an unacceptable source. */
  readonly rejectedInputs: readonly AppBuilderSuppliedInput[];
  /** Payload validation rows for facet payloads carried by accepted supplied markers. */
  readonly payloadValidations: readonly AppBuilderSuppliedInputPayloadValidationRow[];
  /** Computed readiness state. */
  readonly state: AppBuilderInputReadinessState;
  /** Compact explanation of why this dependency has this state. */
  readonly summary: string;
}

/** Readiness summary for one selected ontology target. */
export interface AppBuilderInputReadinessTargetRow {
  /** Target ontology row. */
  readonly targetRef: AppBuilderOntologyRowRef;
  /** Target display title. */
  readonly title: string;
  /** Target display summary. */
  readonly summary: string;
  /** Input dependency rows for this target. */
  readonly inputDependencies: readonly AppBuilderInputReadinessDependencyRow[];
  /** Number of satisfied dependencies. */
  readonly satisfiedCount: number;
  /** Number of absent required dependencies. */
  readonly missingRequiredCount: number;
  /** Number of absent recommended dependencies. */
  readonly missingRecommendedCount: number;
  /** Number of deferred dependencies. */
  readonly deferredCount: number;
}

/** Read-only readiness projection over app-builder ontology input dependencies. */
export interface AppBuilderInputReadinessResult {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Whether omitted targets caused the default blank-slate intake target to be used. */
  readonly defaultTargetUsed: boolean;
  /** Target readiness rows. */
  readonly targets: readonly AppBuilderInputReadinessTargetRow[];
  /** Issues found while resolving targets and supplied input sources. */
  readonly issues: readonly AppBuilderInputReadinessIssue[];
  /** Number of supplied input markers considered. */
  readonly suppliedInputCount: number;
  /** Number of supplied input markers explicitly present before decision-bundle expansion. */
  readonly explicitSuppliedInputCount: number;
  /** Number of request-local decision bundles considered. */
  readonly decisionBundleCount: number;
  /** Number of decisions carried by request-local decision bundles. */
  readonly decisionBundleDecisionCount: number;
  /** Expansion rows showing which decision-bundle decisions became supplied inputs when explicitly requested. */
  readonly decisionBundleExpansionRows?: readonly AppBuilderDecisionBundleExpansionRow[];
  /** Number of supplied facet payloads considered. */
  readonly suppliedInputPayloadCount: number;
  /** Number of supplied facet payloads that matched modeled schemas. */
  readonly validPayloadCount: number;
  /** Number of supplied facet payloads that failed modeled schemas. */
  readonly invalidPayloadCount: number;
  /** Number of supplied facet payloads that could not be schema-validated yet. */
  readonly unvalidatedPayloadCount: number;
  /** Total satisfied dependency rows. */
  readonly satisfiedCount: number;
  /** Total missing required dependency rows. */
  readonly missingRequiredCount: number;
  /** Total missing recommended dependency rows. */
  readonly missingRecommendedCount: number;
  /** Total deferred dependency rows. */
  readonly deferredCount: number;
}

const DEFAULT_INPUT_READINESS_TARGET_REFS = [
  appBuilderOntologyRowRef(AppBuilderOntologyRowKind.Affordance, AppBuilderAffordanceId.BlankSlateIntake),
] as const;

const INPUT_CONTRACTS_BY_ID = new Map<AppBuilderInputContractId, AppBuilderInputContractRow>(
  APP_BUILDER_INPUT_CONTRACT_ROWS.map((row) => [row.id, row]),
);

const INPUT_FACETS_BY_ID = new Map<AppBuilderInputFacetId, AppBuilderInputFacetRow>(
  APP_BUILDER_INPUT_FACET_ROWS.map((row) => [row.id, row]),
);

const INPUT_FACETS_BY_CONTRACT_ID = APP_BUILDER_INPUT_FACET_ROWS.reduce(
  (map, facet) => {
    const existing = map.get(facet.contractId) ?? [];
    map.set(facet.contractId, [...existing, facet]);
    return map;
  },
  new Map<AppBuilderInputContractId, readonly AppBuilderInputFacetRow[]>(),
);

const ALL_INPUT_DEPENDENCY_RELATIONS = APP_BUILDER_ONTOLOGY_RELATION_ROWS
  .filter((row) => row.relationKind === AppBuilderOntologyRelationKind.InputDependency);

/** Project missing/satisfied input dependencies for selected app-builder ontology rows. */
export function appBuilderInputReadiness(
  request: AppBuilderInputReadinessRequest = {},
): AppBuilderInputReadinessResult {
  const explicitSuppliedInputs = request.suppliedInputs ?? [];
  const suppliedInputs = appBuilderSuppliedInputsWithDecisionBundles(explicitSuppliedInputs, request.decisionBundles);
  const includeInputFacets = request.includeInputFacets !== false;
  const includeDecisionBundleExpansionRows = request.includeDecisionBundleExpansionRows === true;
  const targetSelection = appBuilderNormalizeOntologyTargetSelection(request);
  const defaultTargetUsed = !targetSelection.selectionProvided;
  const targetRefs = defaultTargetUsed ? DEFAULT_INPUT_READINESS_TARGET_REFS : targetSelection.targetRefs;
  const issues: AppBuilderInputReadinessIssue[] = [];
  issues.push(...targetSelection.issues.map(appBuilderInputReadinessIssueForTargetSelectionIssue));
  validateSuppliedInputContracts(suppliedInputs, issues);
  const targets = targetRefs.flatMap((targetRef) => {
    const target = appBuilderOntologyRowDescriptor(targetRef);
    if (target == null) {
      issues.push({
        issueKind: AppBuilderInputReadinessIssueKind.UnknownTarget,
        targetRef,
        summary: `App-builder input readiness does not know ontology target '${targetRef.kind}:${targetRef.id}'.`,
      });
      return [];
    }
    return [targetReadiness(
      target,
      appBuilderSuppliedInputsForTarget(suppliedInputs, target.ref),
      includeInputFacets,
      issues,
    )];
  });
  const satisfiedCount = sumTargets(targets, (target) => target.satisfiedCount);
  const missingRequiredCount = sumTargets(targets, (target) => target.missingRequiredCount);
  const missingRecommendedCount = sumTargets(targets, (target) => target.missingRecommendedCount);
  const deferredCount = sumTargets(targets, (target) => target.deferredCount);
  const payloadValidations = targets.flatMap((target) =>
    target.inputDependencies.flatMap((dependency) => dependency.payloadValidations)
  );
  const validPayloadCount = payloadValidations.filter((row) =>
    row.state === AppBuilderSuppliedInputPayloadValidationState.Valid
  ).length;
  const invalidPayloadCount = payloadValidations.filter((row) =>
    row.state === AppBuilderSuppliedInputPayloadValidationState.Invalid
  ).length;
  const unvalidatedPayloadCount = payloadValidations.filter((row) =>
    row.state === AppBuilderSuppliedInputPayloadValidationState.Unvalidated
  ).length;
  const suppliedInputPayloadCount = suppliedInputs.reduce((sum, input) =>
    sum + (input.facetPayloads?.length ?? 0), 0);
  const decisionBundleCount = request.decisionBundles?.length ?? 0;
  const decisionBundleDecisionCount = appBuilderDecisionBundleDecisionCount(request.decisionBundles);
  return {
    displayText: `App-builder input readiness: ${targets.length} target(s), ${satisfiedCount} satisfied, ${missingRequiredCount} missing required, ${missingRecommendedCount} missing recommended, ${deferredCount} deferred, suppliedInputs=${suppliedInputs.length}, decisionBundles=${decisionBundleCount}, payloads=${suppliedInputPayloadCount}, invalidPayloads=${invalidPayloadCount}, ${issues.length} issue(s)${defaultTargetUsed ? '; defaultTarget=blank-slate-intake' : ''}.`,
    defaultTargetUsed,
    targets,
    issues,
    suppliedInputCount: suppliedInputs.length,
    explicitSuppliedInputCount: explicitSuppliedInputs.length,
    decisionBundleCount,
    decisionBundleDecisionCount,
    ...(includeDecisionBundleExpansionRows ? {
      decisionBundleExpansionRows: appBuilderDecisionBundleExpansionRows(request.decisionBundles),
    } : {}),
    suppliedInputPayloadCount,
    validPayloadCount,
    invalidPayloadCount,
    unvalidatedPayloadCount,
    satisfiedCount,
    missingRequiredCount,
    missingRecommendedCount,
    deferredCount,
  };
}

/** Convert shared target-selection issues into input-readiness issue rows for public read-model answers. */
export function appBuilderInputReadinessIssueForTargetSelectionIssue(
  issue: AppBuilderOntologyTargetSelectionIssue,
): AppBuilderInputReadinessIssue {
  return {
    issueKind: issue.issueKind === AppBuilderOntologyTargetSelectionIssueKind.TargetSelectorDomainMismatch
      ? AppBuilderInputReadinessIssueKind.TargetSelectorDomainMismatch
      : AppBuilderInputReadinessIssueKind.UnknownTarget,
    targetRef: issue.targetRef,
    targetSelector: issue.targetSelector,
    expectedDomain: issue.expectedDomain,
    summary: issue.summary,
  };
}

function targetReadiness(
  target: AppBuilderOntologyRowDescriptor,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  includeInputFacets: boolean,
  issues: AppBuilderInputReadinessIssue[],
): AppBuilderInputReadinessTargetRow {
  const dependencies = ALL_INPUT_DEPENDENCY_RELATIONS
    .filter((row) => sameRowRef(row.from, target.ref))
    .flatMap((relation): readonly AppBuilderInputReadinessDependencyRow[] => {
      const inputContractId = relation.to.id as AppBuilderInputContractId;
      const inputContract = INPUT_CONTRACTS_BY_ID.get(inputContractId);
      if (inputContract == null) {
        issues.push({
          issueKind: AppBuilderInputReadinessIssueKind.UnknownInputContract,
          targetRef: target.ref,
          inputContractId,
          summary: `App-builder ontology relation points at unknown input contract '${inputContractId}'.`,
        });
        return [];
      }
      return [dependencyReadiness(
        target.ref,
        inputContract,
        relation.inputFacetIds,
        suppliedInputs,
        includeInputFacets,
        issues,
      )];
    });
  return {
    targetRef: target.ref,
    title: target.title,
    summary: target.summary,
    inputDependencies: dependencies,
    satisfiedCount: dependencies.filter((row) => row.state === AppBuilderInputReadinessState.Satisfied).length,
    missingRequiredCount: dependencies.filter((row) => row.state === AppBuilderInputReadinessState.MissingRequired).length,
    missingRecommendedCount: dependencies.filter((row) => row.state === AppBuilderInputReadinessState.MissingRecommended).length,
    deferredCount: dependencies.filter((row) => row.state === AppBuilderInputReadinessState.Deferred).length,
  };
}

function dependencyReadiness(
  targetRef: AppBuilderOntologyRowRef,
  inputContract: AppBuilderInputContractRow,
  inputFacetIds: readonly AppBuilderInputFacetId[] | undefined,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  includeInputFacets: boolean,
  issues: AppBuilderInputReadinessIssue[],
): AppBuilderInputReadinessDependencyRow {
  const suppliedForContract = suppliedInputs.filter((input) => input.inputContractId === inputContract.id);
  const sourceAccepted = suppliedForContract.filter((input) =>
    inputContract.acceptedSourceIds.includes(input.sourceId as AppBuilderSuppliedInputSource)
  );
  const rejected = suppliedForContract.filter((input) =>
    !inputContract.acceptedSourceIds.includes(input.sourceId as AppBuilderSuppliedInputSource)
  );
  for (const suppliedInput of rejected) {
    issues.push({
      issueKind: AppBuilderInputReadinessIssueKind.UnsupportedInputSource,
      targetRef,
      inputContractId: inputContract.id,
      suppliedInput,
      summary: `Input contract '${inputContract.id}' cannot be supplied by '${suppliedInput.sourceId}'.`,
    });
  }
  const validFacetIdsByInput = new Map<AppBuilderSuppliedInput, readonly AppBuilderInputFacetId[]>();
  const payloadValidations: AppBuilderSuppliedInputPayloadValidationRow[] = [];
  for (const suppliedInput of sourceAccepted) {
    const validations = validateSuppliedInputPayloads(targetRef, inputContract, suppliedInput, issues);
    const invalidPayloadFacetIds = validations
      .filter((row) => row.state === AppBuilderSuppliedInputPayloadValidationState.Invalid)
      .map((row) => row.inputFacetId as AppBuilderInputFacetId);
    const validFacetIds = validSuppliedInputFacetIds(targetRef, inputContract, suppliedInput, issues)
      .filter((inputFacetId) => !invalidPayloadFacetIds.includes(inputFacetId));
    validFacetIdsByInput.set(suppliedInput, validFacetIds);
    payloadValidations.push(...validations);
  }
  const dependencyInputFacetIds = inputFacetIds ?? [];
  const supplied = sourceAccepted.filter((input) =>
    suppliedInputContributesToDependency(input, validFacetIdsByInput.get(input) ?? [], dependencyInputFacetIds)
  );
  const suppliedInputFacetIds = appBuilderUniqueInputFacetIds(
    supplied.flatMap((input) => validFacetIdsByInput.get(input) ?? []),
  );
  const missingInputFacetIds = dependencyInputFacetIds.filter((inputFacetId) =>
    !suppliedInputFacetIds.includes(inputFacetId)
    && !supplied.some((input) => isContractWideSuppliedInput(input))
  );
  const state = supplied.length > 0 && missingInputFacetIds.length === 0
    ? AppBuilderInputReadinessState.Satisfied
    : readinessStateForNecessity(inputContract.necessity);
  return {
    targetRef,
    inputContract,
    ...(includeInputFacets
      ? { inputFacets: inputFacetsForDependency(targetRef, inputContract, inputFacetIds, issues) }
      : {}),
    dependencyInputFacetIds,
    suppliedInputFacetIds,
    missingInputFacetIds,
    suppliedInputs: supplied,
    rejectedInputs: rejected,
    payloadValidations,
    state,
    summary: dependencyReadinessSummary(inputContract, dependencyInputFacetIds, state, supplied, missingInputFacetIds),
  };
}

function validateSuppliedInputContracts(
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  issues: AppBuilderInputReadinessIssue[],
): void {
  for (const suppliedInput of suppliedInputs) {
    if (!INPUT_CONTRACTS_BY_ID.has(suppliedInput.inputContractId as AppBuilderInputContractId)) {
      issues.push({
        issueKind: AppBuilderInputReadinessIssueKind.UnknownSuppliedInputContract,
        inputContractId: suppliedInput.inputContractId,
        suppliedInput,
        summary: `Supplied input marker names unknown input contract '${suppliedInput.inputContractId}'.`,
      });
    }
  }
}

function inputFacetsForDependency(
  targetRef: AppBuilderOntologyRowRef,
  inputContract: AppBuilderInputContractRow,
  inputFacetIds: readonly AppBuilderInputFacetId[] | undefined,
  issues: AppBuilderInputReadinessIssue[],
): readonly AppBuilderInputFacetRow[] {
  const contractFacets = INPUT_FACETS_BY_CONTRACT_ID.get(inputContract.id) ?? [];
  if (inputFacetIds == null) {
    return contractFacets;
  }
  const facetsById = new Map(contractFacets.map((facet) => [facet.id, facet]));
  const selectedFacets: AppBuilderInputFacetRow[] = [];
  for (const inputFacetId of inputFacetIds) {
    const facet = facetsById.get(inputFacetId);
    if (facet == null) {
      issues.push({
        issueKind: AppBuilderInputReadinessIssueKind.UnknownInputFacet,
        targetRef,
        inputContractId: inputContract.id,
        inputFacetId,
        summary: `Input dependency '${targetRef.kind}:${targetRef.id}' narrows '${inputContract.id}' to unknown facet '${inputFacetId}'.`,
      });
    } else {
      selectedFacets.push(facet);
    }
  }
  return selectedFacets;
}

function validSuppliedInputFacetIds(
  targetRef: AppBuilderOntologyRowRef,
  inputContract: AppBuilderInputContractRow,
  suppliedInput: AppBuilderSuppliedInput,
  issues: AppBuilderInputReadinessIssue[],
): readonly AppBuilderInputFacetId[] {
  const inputFacetIds = suppliedInputFacetIds(suppliedInput);
  const validFacetIds: AppBuilderInputFacetId[] = [];
  for (const inputFacetId of inputFacetIds) {
    const facet = INPUT_FACETS_BY_ID.get(inputFacetId);
    if (facet == null) {
      issues.push({
        issueKind: AppBuilderInputReadinessIssueKind.UnknownSuppliedInputFacet,
        targetRef,
        inputContractId: inputContract.id,
        inputFacetId,
        suppliedInput,
        summary: `Supplied input marker for '${inputContract.id}' names unknown input facet '${inputFacetId}'.`,
      });
      continue;
    }
    if (facet.contractId !== inputContract.id) {
      issues.push({
        issueKind: AppBuilderInputReadinessIssueKind.UnsupportedSuppliedInputFacet,
        targetRef,
        inputContractId: inputContract.id,
        inputFacetId,
        suppliedInput,
        summary: `Supplied input marker for '${inputContract.id}' cannot satisfy facet '${inputFacetId}' because that facet belongs to '${facet.contractId}'.`,
      });
      continue;
    }
    validFacetIds.push(inputFacetId);
  }
  return appBuilderUniqueInputFacetIds(validFacetIds);
}

function validateSuppliedInputPayloads(
  targetRef: AppBuilderOntologyRowRef,
  inputContract: AppBuilderInputContractRow,
  suppliedInput: AppBuilderSuppliedInput,
  issues: AppBuilderInputReadinessIssue[],
): readonly AppBuilderSuppliedInputPayloadValidationRow[] {
  return (suppliedInput.facetPayloads ?? []).flatMap((payload): readonly AppBuilderSuppliedInputPayloadValidationRow[] => {
    const inputFacetId = payload.inputFacetId as AppBuilderInputFacetId;
    const facet = INPUT_FACETS_BY_ID.get(inputFacetId);
    if (facet == null || facet.contractId !== inputContract.id) {
      return [];
    }
    const detail = appBuilderInputFacetDetail(facet, true);
    if (detail.payloadSchemaState !== AppBuilderInputPayloadSchemaState.Modeled || detail.payloadSchema == null) {
      return [{
        inputContractId: inputContract.id,
        sourceId: suppliedInput.sourceId,
        inputFacetId,
        state: AppBuilderSuppliedInputPayloadValidationState.Unvalidated,
        payloadSchemaState: detail.payloadSchemaState,
        issues: [],
        summary: `Supplied payload for '${inputFacetId}' cannot be schema-validated yet because its payload schema state is '${detail.payloadSchemaState}'.`,
      }];
    }
    const validationIssues = validateInputPayload(detail.payloadSchema, payload.value, inputFacetId);
    const state = validationIssues.length === 0
      ? AppBuilderSuppliedInputPayloadValidationState.Valid
      : AppBuilderSuppliedInputPayloadValidationState.Invalid;
    const row: AppBuilderSuppliedInputPayloadValidationRow = {
      inputContractId: inputContract.id,
      sourceId: suppliedInput.sourceId,
      inputFacetId,
      state,
      payloadSchemaState: detail.payloadSchemaState,
      issues: validationIssues,
      summary: state === AppBuilderSuppliedInputPayloadValidationState.Valid
        ? `Supplied payload for '${inputFacetId}' matches the modeled input schema.`
        : `Supplied payload for '${inputFacetId}' has ${validationIssues.length} schema issue(s).`,
    };
    if (state === AppBuilderSuppliedInputPayloadValidationState.Invalid) {
      issues.push({
        issueKind: AppBuilderInputReadinessIssueKind.InvalidSuppliedInputPayload,
        targetRef,
        inputContractId: inputContract.id,
        inputFacetId,
        suppliedInput,
        payloadValidation: row,
        summary: row.summary,
      });
    }
    return [row];
  });
}

function suppliedInputContributesToDependency(
  suppliedInput: AppBuilderSuppliedInput,
  validFacetIds: readonly AppBuilderInputFacetId[],
  dependencyInputFacetIds: readonly AppBuilderInputFacetId[],
): boolean {
  if (dependencyInputFacetIds.length === 0) {
    return isContractWideSuppliedInput(suppliedInput);
  }
  if (isContractWideSuppliedInput(suppliedInput)) {
    return true;
  }
  return dependencyInputFacetIds.some((inputFacetId) => validFacetIds.includes(inputFacetId));
}

function isContractWideSuppliedInput(
  suppliedInput: AppBuilderSuppliedInput,
): boolean {
  return (suppliedInput.inputFacetIds == null || suppliedInput.inputFacetIds.length === 0)
    && (suppliedInput.facetPayloads == null || suppliedInput.facetPayloads.length === 0);
}

function suppliedInputFacetIds(
  suppliedInput: AppBuilderSuppliedInput,
): readonly AppBuilderInputFacetId[] {
  return appBuilderUniqueInputFacetIds([
    ...((suppliedInput.inputFacetIds ?? []) as readonly AppBuilderInputFacetId[]),
    ...((suppliedInput.facetPayloads ?? []).map((payload) => payload.inputFacetId as AppBuilderInputFacetId)),
  ]);
}

function validateInputPayload(
  schema: AppBuilderInputPayloadSchema,
  value: unknown,
  path: string,
): readonly string[] {
  switch (schema.kind) {
    case AppBuilderInputPayloadSchemaKind.Null:
      return value === null ? [] : [`${path} must be null.`];
    case AppBuilderInputPayloadSchemaKind.String:
      return typeof value === 'string' ? [] : [`${path} must be a string.`];
    case AppBuilderInputPayloadSchemaKind.PatternString:
      return validatePatternStringPayload(schema, value, path);
    case AppBuilderInputPayloadSchemaKind.Boolean:
      return typeof value === 'boolean' ? [] : [`${path} must be a boolean.`];
    case AppBuilderInputPayloadSchemaKind.Number:
      return typeof value === 'number' && Number.isFinite(value) ? [] : [`${path} must be a finite number.`];
    case AppBuilderInputPayloadSchemaKind.Enum:
      return typeof value === 'string' && schema.enumValues?.includes(value) === true
        ? []
        : [`${path} must be one of: ${(schema.enumValues ?? []).join(', ')}.`];
    case AppBuilderInputPayloadSchemaKind.Union:
      return (schema.variants ?? []).some((variant) => validateInputPayload(variant, value, path).length === 0)
        ? []
        : [`${path} must match one of ${schema.variants?.length ?? 0} declared schema variant(s).`];
    case AppBuilderInputPayloadSchemaKind.Object:
      return validateObjectPayload(schema, value, path);
    case AppBuilderInputPayloadSchemaKind.Record:
      return validateRecordPayload(schema, value, path);
    case AppBuilderInputPayloadSchemaKind.Array:
      return validateArrayPayload(schema, value, path);
  }
}

function validatePatternStringPayload(
  schema: AppBuilderInputPayloadSchema,
  value: unknown,
  path: string,
): readonly string[] {
  if (typeof value !== 'string') {
    return [`${path} must be a string.`];
  }
  const pattern = schema.pattern;
  if (pattern == null) {
    return [`${path} has no declared pattern.`];
  }
  return new RegExp(pattern).test(value)
    ? []
    : [`${path} must match ${schema.patternSummary ?? pattern}.`];
}

function validateObjectPayload(
  schema: AppBuilderInputPayloadSchema,
  value: unknown,
  path: string,
): readonly string[] {
  if (!isPlainRecord(value)) {
    return [`${path} must be an object.`];
  }
  const issues: string[] = [];
  for (const property of schema.properties ?? []) {
    const propertyPath = `${path}.${property.name}`;
    if (!(property.name in value)) {
      if (property.required) {
        issues.push(`${propertyPath} is required.`);
      }
      continue;
    }
    const propertyValue = value[property.name];
    if (propertyValue === undefined) {
      if (property.required) {
        issues.push(`${propertyPath} is required.`);
      }
      continue;
    }
    issues.push(...validateInputPayload(property.schema, propertyValue, propertyPath));
  }
  return issues;
}

function validateRecordPayload(
  schema: AppBuilderInputPayloadSchema,
  value: unknown,
  path: string,
): readonly string[] {
  if (!isPlainRecord(value)) {
    return [`${path} must be a record object.`];
  }
  return Object.entries(value).flatMap(([key, entry]) =>
    validateInputPayload(schema.valueSchema as AppBuilderInputPayloadSchema, entry, `${path}.${key}`)
  );
}

function validateArrayPayload(
  schema: AppBuilderInputPayloadSchema,
  value: unknown,
  path: string,
): readonly string[] {
  if (!Array.isArray(value)) {
    return [`${path} must be an array.`];
  }
  return value.flatMap((entry, index) =>
    validateInputPayload(schema.items as AppBuilderInputPayloadSchema, entry, `${path}[${index}]`)
  );
}

function isPlainRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readinessStateForNecessity(
  necessity: AppBuilderInputNecessity,
): AppBuilderInputReadinessState {
  switch (necessity) {
    case AppBuilderInputNecessity.Required:
      return AppBuilderInputReadinessState.MissingRequired;
    case AppBuilderInputNecessity.Recommended:
      return AppBuilderInputReadinessState.MissingRecommended;
    case AppBuilderInputNecessity.Optional:
      return AppBuilderInputReadinessState.MissingOptional;
    case AppBuilderInputNecessity.Deferred:
      return AppBuilderInputReadinessState.Deferred;
  }
}

function dependencyReadinessSummary(
  inputContract: AppBuilderInputContractRow,
  dependencyInputFacetIds: readonly AppBuilderInputFacetId[],
  state: AppBuilderInputReadinessState,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
  missingInputFacetIds: readonly AppBuilderInputFacetId[],
): string {
  if (state === AppBuilderInputReadinessState.Satisfied) {
    if (dependencyInputFacetIds.length > 0) {
      return `Input '${inputContract.id}' facets ${dependencyInputFacetIds.join(', ')} are satisfied by ${suppliedInputs.map((input) => input.sourceId).join(', ')}.`;
    }
    return `Input '${inputContract.id}' is satisfied by ${suppliedInputs.map((input) => input.sourceId).join(', ')}.`;
  }
  if (missingInputFacetIds.length > 0) {
    return `Input '${inputContract.id}' is ${state}; missing facets: ${missingInputFacetIds.join(', ')}; accepted sources: ${inputContract.acceptedSourceIds.join(', ')}.`;
  }
  return `Input '${inputContract.id}' is ${state}; accepted sources: ${inputContract.acceptedSourceIds.join(', ')}.`;
}

function sameRowRef(
  left: AppBuilderOntologyRowRef,
  right: AppBuilderOntologyRowRef,
): boolean {
  return left.kind === right.kind && left.domain === right.domain && left.id === right.id;
}

function sumTargets(
  targets: readonly AppBuilderInputReadinessTargetRow[],
  selector: (target: AppBuilderInputReadinessTargetRow) => number,
): number {
  return targets.reduce((sum, target) => sum + selector(target), 0);
}
