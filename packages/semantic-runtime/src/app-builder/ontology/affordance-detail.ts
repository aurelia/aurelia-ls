import {
  APP_BUILDER_AFFORDANCE_ROWS,
  AppBuilderAffordanceId,
  type AppBuilderAffordanceRow,
} from './affordance.js';
import type { AppBuilderApplicationPatternRow } from './application-pattern.js';
import type { AppBuilderEffectContractRow } from './effect.js';
import {
  appBuilderApplicationPatternsForAffordances,
  appBuilderEffectContractsForAffordances,
  appBuilderFollowUpAffordancesForAffordances,
} from './detail-joins.js';
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
  AppBuilderOntologyRowKind,
  appBuilderOntologyRowRef,
} from './relation.js';

/** Detail request for selected app-building affordances. */
export interface AppBuilderAffordanceDetailRequest {
  /** Include only these affordances; omitted returns compact base rows unless a detail include flag is true. */
  readonly affordanceIds?: readonly AppBuilderAffordanceId[] | null;
  /** Input markers already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before readiness is evaluated. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include full input-readiness rows for each affordance; defaults to true only for selected affordances. */
  readonly includeInputReadiness?: boolean | null;
  /** Include input contract payload/detail rows for each affordance; defaults to true only for selected affordances. */
  readonly includeInputContractDetail?: boolean | null;
  /** Include concrete payload schemas in input contract detail rows; defaults to true only for selected affordances. */
  readonly includePayloadSchemas?: boolean | null;
  /** Include promised effect contract rows; defaults to true only for selected affordances. */
  readonly includeEffectContracts?: boolean | null;
  /** Include associated application design pattern rows; defaults to true only for selected affordances. */
  readonly includeApplicationPatterns?: boolean | null;
  /** Include declared follow-up affordance rows; defaults to true only for selected affordances. */
  readonly includeFollowUps?: boolean | null;
}

/** Read-only detail row for one app-building affordance. */
export interface AppBuilderAffordanceDetailRow {
  /** Selected app-builder affordance row. */
  readonly affordance: AppBuilderAffordanceRow;
  /** Input readiness for this affordance when requested. */
  readonly inputReadiness?: AppBuilderInputReadinessTargetRow;
  /** Payload/schema detail for this affordance's input contracts when requested. */
  readonly inputContractDetails?: readonly AppBuilderInputContractDetailRow[];
  /** Promised effect contracts when requested. */
  readonly effectContracts?: readonly AppBuilderEffectContractRow[];
  /** Associated application design pattern rows when requested. */
  readonly applicationPatterns?: readonly AppBuilderApplicationPatternRow[];
  /** Declared follow-up affordance rows when requested. */
  readonly followUps?: readonly AppBuilderAffordanceRow[];
}

/** Read-only selected-affordance detail for AI workflow negotiation. */
export interface AppBuilderAffordanceDetail {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Selected affordance detail rows. */
  readonly rows: readonly AppBuilderAffordanceDetailRow[];
  /** Issues found while projecting supplied-input readiness. */
  readonly issues: readonly AppBuilderInputReadinessIssue[];
  /** Whether input-readiness rows were included. */
  readonly inputReadinessIncluded: boolean;
  /** Whether input contract detail rows were included. */
  readonly inputContractDetailIncluded: boolean;
  /** Whether modeled payload schemas were included inside input contract detail rows. */
  readonly payloadSchemasIncluded: boolean;
  /** Whether promised effect rows were included. */
  readonly effectContractsIncluded: boolean;
  /** Whether associated application pattern rows were included. */
  readonly applicationPatternsIncluded: boolean;
  /** Whether declared follow-up affordance rows were included. */
  readonly followUpsIncluded: boolean;
  /** Number of supplied input markers considered by readiness. */
  readonly suppliedInputCount: number;
  /** Number of supplied input markers explicitly present before decision-bundle expansion. */
  readonly explicitSuppliedInputCount: number;
  /** Number of request-local decision bundles considered. */
  readonly decisionBundleCount: number;
  /** Number of decisions carried by request-local decision bundles. */
  readonly decisionBundleDecisionCount: number;
}

/** Return selected app-building moves joined to readiness, input detail, effects, and declared follow-ups. */
export function appBuilderAffordanceDetail(
  request: AppBuilderAffordanceDetailRequest = {},
): AppBuilderAffordanceDetail {
  const hasExplicitSelection = appBuilderHasExplicitSelection(request.affordanceIds);
  const includeInputReadiness = appBuilderIncludeDetail(request.includeInputReadiness, hasExplicitSelection);
  const includeInputContractDetail = appBuilderIncludeDetail(request.includeInputContractDetail, hasExplicitSelection);
  const includePayloadSchemas = appBuilderIncludeDetail(request.includePayloadSchemas, hasExplicitSelection);
  const includeEffectContracts = appBuilderIncludeDetail(request.includeEffectContracts, hasExplicitSelection);
  const includeApplicationPatterns = appBuilderIncludeDetail(request.includeApplicationPatterns, hasExplicitSelection);
  const includeFollowUps = appBuilderIncludeDetail(request.includeFollowUps, hasExplicitSelection);
  const affordanceIds = request.affordanceIds == null || request.affordanceIds.length === 0
    ? null
    : new Set(request.affordanceIds);
  const affordances = APP_BUILDER_AFFORDANCE_ROWS.filter((row) =>
    affordanceIds == null || affordanceIds.has(row.id)
  );
  const inputReadiness = includeInputReadiness
    ? appBuilderInputReadiness({
      targetRefs: affordances.map((row) => appBuilderOntologyRowRef(
        AppBuilderOntologyRowKind.Affordance,
        row.id,
      )),
      suppliedInputs: request.suppliedInputs ?? [],
      decisionBundles: request.decisionBundles ?? [],
    })
    : null;
  const readinessByAffordanceId = new Map(
    inputReadiness?.targets.map((row) => [row.targetRef.id, row]) ?? [],
  );
  const rows = affordances.map((affordance): AppBuilderAffordanceDetailRow => {
    const affordanceRows = [affordance];
    return {
      affordance,
      ...(includeInputReadiness
        ? { inputReadiness: readinessByAffordanceId.get(affordance.id) }
        : {}),
      ...(includeInputContractDetail
        ? {
          inputContractDetails: appBuilderInputContractDetail({
            inputContractIds: appBuilderInputContractIdsForDependency(affordance),
            inputFacetSelections: appBuilderInputFacetSelectionsForDependency(affordance),
            includePayloadSchemas,
          }).rows,
        }
        : {}),
      ...(includeEffectContracts
        ? { effectContracts: appBuilderEffectContractsForAffordances(affordanceRows) }
        : {}),
      ...(includeApplicationPatterns
        ? { applicationPatterns: appBuilderApplicationPatternsForAffordances(affordanceRows) }
        : {}),
      ...(includeFollowUps
        ? { followUps: appBuilderFollowUpAffordancesForAffordances(affordanceRows) }
        : {}),
    };
  });
  const effectCount = rows.reduce((sum, row) => sum + (row.effectContracts?.length ?? 0), 0);
  const applicationPatternCount = rows.reduce((sum, row) =>
    sum + (row.applicationPatterns?.length ?? 0), 0);
  const followUpCount = rows.reduce((sum, row) => sum + (row.followUps?.length ?? 0), 0);
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
    effectContractsIncluded: includeEffectContracts,
    applicationPatternsIncluded: includeApplicationPatterns,
    followUpsIncluded: includeFollowUps,
    ...inputCounts,
    displayText: `App-builder affordance detail: ${rows.length} affordance(s), inputReadiness=${includeInputReadiness}, inputContractDetails=${inputContractDetailCount}, effects=${effectCount}, applicationPatterns=${applicationPatternCount}, followUps=${followUpCount}, issues=${issueCount}.`,
  };
}
