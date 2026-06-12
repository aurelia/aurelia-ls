import {
  appBuilderInputContractDetail,
  type AppBuilderInputContractDetailRow,
} from './input-contract-detail.js';
import {
  appBuilderInputReadiness,
  type AppBuilderInputReadinessIssue,
  type AppBuilderInputReadinessTargetRow,
  type AppBuilderSuppliedInput,
} from './input-readiness.js';
import {
  appBuilderInputContractIdsForDependency,
  appBuilderInputFacetSelectionsForDependency,
} from './input.js';
import {
  appBuilderDecisionBundleInputCounts,
  type AppBuilderDecisionBundle,
} from '../policy/decision-bundle.js';
import {
  appBuilderHasExplicitSelection,
  appBuilderIncludeDetail,
} from './detail-helpers.js';
import {
  APP_BUILDER_POLICY_AXIS_ROWS,
  AppBuilderPolicyAxisId,
  type AppBuilderPolicyAxisRow,
} from './policy.js';
import {
  AppBuilderOntologyRowKind,
  appBuilderOntologyRowRef,
} from './relation.js';

/** Detail request for selected app-builder policy axes. */
export interface AppBuilderPolicyDetailRequest {
  /** Include only these policy axes; omitted returns compact base rows unless a detail include flag is true. */
  readonly policyAxisIds?: readonly AppBuilderPolicyAxisId[] | null;
  /** Input markers already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before readiness is evaluated. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include full input-readiness rows for each policy axis; defaults to true only for selected policy axes. */
  readonly includeInputReadiness?: boolean | null;
  /** Include input contract payload/detail rows for each policy axis; defaults to true only for selected policy axes. */
  readonly includeInputContractDetail?: boolean | null;
  /** Include concrete payload schemas in input contract detail rows; defaults to true only for selected policy axes. */
  readonly includePayloadSchemas?: boolean | null;
}

/** Read-only detail row for one app-builder policy axis. */
export interface AppBuilderPolicyDetailRow {
  /** Selected policy axis row. */
  readonly policyAxis: AppBuilderPolicyAxisRow;
  /** Input readiness for this policy axis when requested. */
  readonly inputReadiness?: AppBuilderInputReadinessTargetRow;
  /** Payload/schema detail for this policy axis's input contracts when requested. */
  readonly inputContractDetails?: readonly AppBuilderInputContractDetailRow[];
}

/** Read-only selected-policy detail for AI workflow negotiation. */
export interface AppBuilderPolicyDetail {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Selected policy-axis detail rows. */
  readonly rows: readonly AppBuilderPolicyDetailRow[];
  /** Issues found while projecting supplied-input readiness. */
  readonly issues: readonly AppBuilderInputReadinessIssue[];
  /** Whether input-readiness rows were included. */
  readonly inputReadinessIncluded: boolean;
  /** Whether input contract detail rows were included. */
  readonly inputContractDetailIncluded: boolean;
  /** Whether modeled payload schemas were included inside input contract detail rows. */
  readonly payloadSchemasIncluded: boolean;
  /** Number of supplied input markers considered by readiness. */
  readonly suppliedInputCount: number;
  /** Number of supplied input markers explicitly present before decision-bundle expansion. */
  readonly explicitSuppliedInputCount: number;
  /** Number of request-local decision bundles considered. */
  readonly decisionBundleCount: number;
  /** Number of decisions carried by request-local decision bundles. */
  readonly decisionBundleDecisionCount: number;
}

/** Return selected policy axes joined to readiness and input-contract detail without selecting policy. */
export function appBuilderPolicyDetail(
  request: AppBuilderPolicyDetailRequest = {},
): AppBuilderPolicyDetail {
  const hasExplicitSelection = appBuilderHasExplicitSelection(request.policyAxisIds);
  const includeInputReadiness = appBuilderIncludeDetail(request.includeInputReadiness, hasExplicitSelection);
  const includeInputContractDetail = appBuilderIncludeDetail(request.includeInputContractDetail, hasExplicitSelection);
  const includePayloadSchemas = appBuilderIncludeDetail(request.includePayloadSchemas, hasExplicitSelection);
  const policyAxisIds = request.policyAxisIds == null || request.policyAxisIds.length === 0
    ? null
    : new Set(request.policyAxisIds);
  const policyAxes = APP_BUILDER_POLICY_AXIS_ROWS.filter((row) =>
    policyAxisIds == null || policyAxisIds.has(row.id)
  );
  const inputReadiness = includeInputReadiness
    ? appBuilderInputReadiness({
      targetRefs: policyAxes.map((row) => appBuilderOntologyRowRef(
        AppBuilderOntologyRowKind.PolicyAxis,
        row.id,
      )),
      suppliedInputs: request.suppliedInputs ?? [],
      decisionBundles: request.decisionBundles ?? [],
    })
    : null;
  const readinessByPolicyAxisId = new Map(
    inputReadiness?.targets.map((row) => [row.targetRef.id, row]) ?? [],
  );
  const rows = policyAxes.map((policyAxis): AppBuilderPolicyDetailRow => ({
    policyAxis,
    ...(includeInputReadiness
      ? { inputReadiness: readinessByPolicyAxisId.get(policyAxis.id) }
      : {}),
    ...(includeInputContractDetail
      ? {
        inputContractDetails: appBuilderInputContractDetail({
          inputContractIds: appBuilderInputContractIdsForDependency(policyAxis),
          inputFacetSelections: appBuilderInputFacetSelectionsForDependency(policyAxis),
          includePayloadSchemas,
        }).rows,
      }
      : {}),
  }));
  const inputContractDetailCount = rows.reduce((sum, row) =>
    sum + (row.inputContractDetails?.length ?? 0), 0);
  const issueCount = inputReadiness?.issues.length ?? 0;
  const inputCounts = appBuilderDecisionBundleInputCounts(request.suppliedInputs, request.decisionBundles);
  return {
    rows,
    issues: inputReadiness?.issues ?? [],
    inputReadinessIncluded: includeInputReadiness,
    inputContractDetailIncluded: includeInputContractDetail,
    payloadSchemasIncluded: includePayloadSchemas,
    ...inputCounts,
    displayText: `App-builder policy detail: ${rows.length} policy axis row(s), inputReadiness=${includeInputReadiness}, inputContractDetails=${inputContractDetailCount}, issues=${issueCount}.`,
  };
}
