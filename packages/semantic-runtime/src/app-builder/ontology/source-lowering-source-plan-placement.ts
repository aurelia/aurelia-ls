import { normalizedSourceInputText } from '../../source-plan/source-template.js';
import {
  AppBuilderInputContractId,
  AppBuilderInputFacetId,
  AppBuilderSuppliedInputSource,
} from './input.js';
import type { AppBuilderSuppliedInput } from './input-readiness.js';
import type { AppBuilderOntologyRowRef } from './relation.js';
import {
  appBuilderSourceLoweringSourceRootPayloads,
  appBuilderSourceLoweringSourceTargetPathPayloads,
} from './source-lowering-inputs.js';
import {
  AppBuilderSourceLoweringSourcePlanIssueKind,
  type AppBuilderSourceLoweringSourcePlanIssue,
  type AppBuilderSourceLoweringSourcePlanRequest,
} from './source-lowering-source-plan-contracts.js';
import {
  appBuilderSuppliedInputsWithDecisionBundles,
  appBuilderSuppliedInputsWithDecisionBundlesForTarget,
  type AppBuilderDecisionBundle,
} from '../policy/decision-bundle.js';

/** Resolved SourcePlan placement transport plus source-placement facet conflicts. */
export interface AppBuilderSourcePlanPlacement {
  readonly rootDir: string | null;
  readonly templatePath: string | null;
  readonly sourceTargetPath: string | null;
  readonly rootDirMissing: boolean;
  readonly templatePathMissing: boolean;
  readonly sourceTargetPathMissing: boolean;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
}

/** Resolve direct transport fields and supplied SourcePlacement facets for one SourcePlan request. */
export function sourcePlanPlacement(
  request: AppBuilderSourceLoweringSourcePlanRequest,
  requirements: {
    readonly requireTemplatePath: boolean;
    readonly requireSourceTargetPath: boolean;
  },
): AppBuilderSourcePlanPlacement {
  const suppliedInputs = sourcePlanPlacementSuppliedInputs(request);
  const root = resolvePlacementFacet(
    normalizedSourceInputText(request.rootDir),
    appBuilderSourceLoweringSourceRootPayloads(suppliedInputs).map(normalizedSourceInputText),
    AppBuilderInputFacetId.SourceRoot,
    AppBuilderSourceLoweringSourcePlanIssueKind.ConflictingSourceRoot,
    'rootDir',
  );
  const sourceTargetPathPayloads = appBuilderSourceLoweringSourceTargetPathPayloads(suppliedInputs)
    .map(normalizedSourceInputText);
  const templatePath = resolvePlacementFacet(
    normalizedSourceInputText(request.templatePath),
    requirements.requireSourceTargetPath ? [] : sourceTargetPathPayloads,
    AppBuilderInputFacetId.SourceTargetPath,
    AppBuilderSourceLoweringSourcePlanIssueKind.ConflictingSourceTargetPath,
    'templatePath',
  );
  const sourceTargetPath = resolvePlacementFacet(
    normalizedSourceInputText(request.sourceTargetPath),
    sourceTargetPathPayloads,
    AppBuilderInputFacetId.SourceTargetPath,
    AppBuilderSourceLoweringSourcePlanIssueKind.ConflictingSourceTargetPath,
    'sourceTargetPath',
  );
  return {
    rootDir: root.value,
    templatePath: requirements.requireTemplatePath ? templatePath.value : null,
    sourceTargetPath: sourceTargetPath.value,
    rootDirMissing: root.missing,
    templatePathMissing: requirements.requireTemplatePath && templatePath.missing,
    sourceTargetPathMissing: requirements.requireSourceTargetPath && sourceTargetPath.missing,
    issues: [
      ...root.issues,
      ...(requirements.requireTemplatePath ? templatePath.issues : []),
      ...(requirements.requireSourceTargetPath ? sourceTargetPath.issues : []),
    ],
  };
}

/** Convert missing placement facts into SourcePlan issue rows after conflict resolution. */
export function sourcePlanMissingPlacementIssues(
  placement: AppBuilderSourcePlanPlacement,
): readonly AppBuilderSourceLoweringSourcePlanIssue[] {
  return [
    ...(placement.rootDirMissing
      ? [{
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingRootDir,
          inputFacetId: AppBuilderInputFacetId.SourceRoot,
          summary: 'App-builder SourcePlan preview requires rootDir or a supplied SourceRoot facet; app-builder will not invent project placement.',
        }]
      : []),
    ...(placement.sourceTargetPathMissing
      ? [{
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingSourceTargetPath,
          inputFacetId: AppBuilderInputFacetId.SourceTargetPath,
          summary: 'Direct SourcePlan preview requires a supplied SourceTargetPath facet for non-template source artifacts; app-builder will not invent target filenames.',
        }]
      : []),
    ...(placement.templatePathMissing
      ? [{
          issueKind: AppBuilderSourceLoweringSourcePlanIssueKind.MissingTemplatePath,
          inputFacetId: AppBuilderInputFacetId.SourceTargetPath,
          summary: 'App-builder SourcePlan preview requires templatePath or a supplied SourceTargetPath facet; app-builder will not invent target filenames.',
        }]
      : []),
  ];
}

export function sourcePlanPlacementSuppliedInputs(
  request: AppBuilderSourceLoweringSourcePlanRequest,
): readonly AppBuilderSuppliedInput[] {
  return appBuilderSuppliedInputsWithDecisionBundles(
    sourcePlanPlacementExplicitSuppliedInputs(request),
    sourcePlanPlacementDecisionBundles(request),
  );
}

function sourcePlanPlacementExplicitSuppliedInputs(
  request: AppBuilderSourceLoweringSourcePlanRequest,
): readonly AppBuilderSuppliedInput[] {
  return [
    ...(request.suppliedInputs ?? []),
    ...(request.sourceLoweringAppShell?.suppliedInputs ?? []),
    ...(request.sourceLoweringApplicationAssembly?.suppliedInputs ?? []),
    ...((request.sourceLoweringApplicationAssembly?.routeAreas ?? [])
      .flatMap((routeArea) => routeArea.suppliedInputs ?? [])),
    ...(request.sourceLoweringRouterBackedListDetail?.suppliedInputs ?? []),
    ...(request.sourceLoweringDiStateClass?.suppliedInputs ?? []),
    ...(request.sourceLoweringLocalViewModelState?.suppliedInputs ?? []),
    ...(request.sourceLoweringComponentPair?.suppliedInputs ?? []),
  ];
}

export function sourcePlanAllExplicitSuppliedInputs(
  request: AppBuilderSourceLoweringSourcePlanRequest,
): readonly AppBuilderSuppliedInput[] {
  return [
    ...sourcePlanPlacementExplicitSuppliedInputs(request),
    ...(request.sourceLoweringInvocation?.suppliedInputs ?? []),
    ...(request.sourceLoweringComposition?.suppliedInputs ?? []),
    ...(request.sourceLoweringComponentPair?.sourceLoweringComposition?.suppliedInputs ?? []),
    ...((request.sourceLoweringComponentPair?.sourceLoweringTemplateInvocations ?? [])
      .flatMap((invocation) => invocation.suppliedInputs ?? [])),
    ...(request.sourceLoweringComponentPair?.sourceLoweringLocalViewModelState?.suppliedInputs ?? []),
    ...((request.sourceLoweringComponentPair?.sourceLoweringClassMemberInvocations ?? [])
      .flatMap((invocation) => invocation.suppliedInputs ?? [])),
  ];
}

function sourcePlanPlacementDecisionBundles(
  request: AppBuilderSourceLoweringSourcePlanRequest,
): readonly AppBuilderDecisionBundle[] {
  return [
    ...(request.decisionBundles ?? []),
    ...(request.sourceLoweringAppShell?.decisionBundles ?? []),
    ...(request.sourceLoweringApplicationAssembly?.decisionBundles ?? []),
    ...((request.sourceLoweringApplicationAssembly?.routeAreas ?? [])
      .flatMap((routeArea) => routeArea.decisionBundles ?? [])),
    ...(request.sourceLoweringRouterBackedListDetail?.decisionBundles ?? []),
    ...(request.sourceLoweringDiStateClass?.decisionBundles ?? []),
    ...(request.sourceLoweringLocalViewModelState?.decisionBundles ?? []),
    ...(request.sourceLoweringComponentPair?.decisionBundles ?? []),
  ];
}

export function sourcePlanAllDecisionBundles(
  request: AppBuilderSourceLoweringSourcePlanRequest,
): readonly AppBuilderDecisionBundle[] {
  return [
    ...sourcePlanPlacementDecisionBundles(request),
    ...(request.sourceLoweringInvocation?.decisionBundles ?? []),
    ...(request.sourceLoweringComposition?.decisionBundles ?? []),
    ...(request.sourceLoweringComponentPair?.sourceLoweringComposition?.decisionBundles ?? []),
    ...((request.sourceLoweringComponentPair?.sourceLoweringTemplateInvocations ?? [])
      .flatMap((invocation) => invocation.decisionBundles ?? [])),
    ...(request.sourceLoweringComponentPair?.sourceLoweringLocalViewModelState?.decisionBundles ?? []),
    ...((request.sourceLoweringComponentPair?.sourceLoweringClassMemberInvocations ?? [])
      .flatMap((invocation) => invocation.decisionBundles ?? [])),
  ];
}

export function sourcePlanDirectSuppliedInputs(
  request: AppBuilderSourceLoweringSourcePlanRequest,
  rootDir: string | null,
  targetRef: AppBuilderOntologyRowRef | null,
  directSuppliedInputs: readonly AppBuilderSuppliedInput[],
  directDecisionBundles: readonly AppBuilderDecisionBundle[],
  sourceSummary: string,
): readonly AppBuilderSuppliedInput[] {
  const explicitSuppliedInputs = [
    ...(request.suppliedInputs ?? []),
    ...directSuppliedInputs,
  ];
  const decisionBundles = [
    ...(request.decisionBundles ?? []),
    ...directDecisionBundles,
  ];
  const suppliedInputs = targetRef == null
    ? appBuilderSuppliedInputsWithDecisionBundles(explicitSuppliedInputs, decisionBundles)
    : appBuilderSuppliedInputsWithDecisionBundlesForTarget(explicitSuppliedInputs, decisionBundles, targetRef);
  if (rootDir == null || appBuilderSourceLoweringSourceRootPayloads(suppliedInputs).includes(rootDir)) {
    return suppliedInputs;
  }
  return [
    ...suppliedInputs,
    {
      inputContractId: AppBuilderInputContractId.SourcePlacement,
      sourceId: AppBuilderSuppliedInputSource.ExplicitCallerInput,
      ...(targetRef == null ? {} : { targetRefs: [targetRef] }),
      facetPayloads: [{
        inputFacetId: AppBuilderInputFacetId.SourceRoot,
        value: rootDir,
      }],
      summary: `SourceRoot synthesized from direct rootDir transport for ${sourceSummary}.`,
    },
  ];
}

function resolvePlacementFacet(
  directValue: string | null,
  suppliedValues: readonly (string | null)[],
  inputFacetId: AppBuilderInputFacetId,
  conflictIssueKind: AppBuilderSourceLoweringSourcePlanIssueKind,
  transportFieldName: string,
): {
  readonly value: string | null;
  readonly missing: boolean;
  readonly issues: readonly AppBuilderSourceLoweringSourcePlanIssue[];
} {
  const candidates = [
    ...(directValue == null ? [] : [directValue]),
    ...suppliedValues.filter((value): value is string => value != null),
  ];
  const uniqueCandidates = [...new Set(candidates)];
  if (uniqueCandidates.length === 0) {
    return {
      value: null,
      missing: true,
      issues: [],
    };
  }
  if (uniqueCandidates.length > 1) {
    return {
      value: null,
      missing: false,
      issues: [{
        issueKind: conflictIssueKind,
        inputFacetId,
        summary: `SourcePlan preview received conflicting ${transportFieldName}/${inputFacetId} placement values: ${uniqueCandidates.join(', ')}.`,
      }],
    };
  }
  const value = uniqueCandidates[0];
  return {
    value: value ?? null,
    missing: false,
    issues: [],
  };
}
