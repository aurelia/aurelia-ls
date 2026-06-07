import type { AppBuilderAffordanceRow } from './affordance.js';
import type { AppBuilderApplicationPatternRow } from './application-pattern.js';
import {
  APP_BUILDER_COLLECTION_CONCEPT_ROWS,
  AppBuilderCollectionConceptId,
  type AppBuilderCollectionFeatureRow,
  type AppBuilderCollectionConceptRow,
} from './collection.js';
import type {
  AppBuilderControlManifestRow,
  AppBuilderControlPatternRow,
} from './control.js';
import {
  appBuilderAffordancesForApplicationPatterns,
  appBuilderApplicationPatternsForCollectionConcept,
  appBuilderCollectionFeaturesForCollectionConcepts,
  appBuilderControlManifestsForApplicationPatterns,
  appBuilderControlPatternsForApplicationPatterns,
  appBuilderStylingMechanismsForApplicationPatterns,
  appBuilderVisualPoliciesForApplicationPatterns,
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
import type {
  AppBuilderStylingMechanismRow,
  AppBuilderVisualPolicyRow,
} from './style.js';

/** Detail request for selected app-builder collection concepts. */
export interface AppBuilderCollectionConceptDetailRequest {
  /** Include only these collection concepts; omitted returns compact base rows unless a detail include flag is true. */
  readonly collectionConceptIds?: readonly AppBuilderCollectionConceptId[] | null;
  /** Input markers already supplied by caller, AI, app facts, policy, or public presets. */
  readonly suppliedInputs?: readonly AppBuilderSuppliedInput[] | null;
  /** Request-local decision bundles expanded into supplied input markers before readiness is evaluated. */
  readonly decisionBundles?: readonly AppBuilderDecisionBundle[] | null;
  /** Include full input-readiness rows for each collection concept; defaults to true only for selected concepts. */
  readonly includeInputReadiness?: boolean | null;
  /** Include input contract payload/detail rows for each collection concept; defaults to true only for selected concepts. */
  readonly includeInputContractDetail?: boolean | null;
  /** Include concrete payload schemas in input contract detail rows; defaults to true only for selected concepts. */
  readonly includePayloadSchemas?: boolean | null;
  /** Include application patterns that coordinate each collection concept; defaults to true only for selected concepts. */
  readonly includeApplicationPatterns?: boolean | null;
  /** Include caller-selectable collection feature descriptors that point at each concept; defaults to true only for selected concepts. */
  readonly includeCollectionFeatures?: boolean | null;
  /** Include control patterns coordinated through those application patterns; defaults to true only for selected concepts. */
  readonly includeControlPatterns?: boolean | null;
  /** Include control/component manifest rows coordinated through those application patterns; defaults to true only for selected concepts. */
  readonly includeControlManifests?: boolean | null;
  /** Include styling mechanism rows coordinated through those application patterns; defaults to true only for selected concepts. */
  readonly includeStylingMechanisms?: boolean | null;
  /** Include visual policy rows coordinated through those application patterns; defaults to true only for selected concepts. */
  readonly includeVisualPolicies?: boolean | null;
  /** Include affordance rows associated with those application patterns; defaults to true only for selected concepts. */
  readonly includeAffordances?: boolean | null;
}

/** Read-only detail row for one collection source/query/projection/table concept. */
export interface AppBuilderCollectionConceptDetailRow {
  /** Selected collection concept row. */
  readonly collectionConcept: AppBuilderCollectionConceptRow;
  /** Input readiness for this collection concept when requested. */
  readonly inputReadiness?: AppBuilderInputReadinessTargetRow;
  /** Payload/schema detail for this collection concept's input contracts when requested. */
  readonly inputContractDetails?: readonly AppBuilderInputContractDetailRow[];
  /** Application patterns that coordinate this collection concept when requested. */
  readonly applicationPatterns?: readonly AppBuilderApplicationPatternRow[];
  /** Caller-selectable collection feature descriptors that point at this concept when requested. */
  readonly collectionFeatures?: readonly AppBuilderCollectionFeatureRow[];
  /** Control patterns coordinated by those application patterns when requested. */
  readonly controlPatterns?: readonly AppBuilderControlPatternRow[];
  /** Control/component manifest rows coordinated by those application patterns when requested. */
  readonly controlManifests?: readonly AppBuilderControlManifestRow[];
  /** Styling mechanisms coordinated by those application patterns when requested. */
  readonly stylingMechanisms?: readonly AppBuilderStylingMechanismRow[];
  /** Visual policies coordinated by those application patterns when requested. */
  readonly visualPolicies?: readonly AppBuilderVisualPolicyRow[];
  /** App-building moves associated with those application patterns when requested. */
  readonly affordances?: readonly AppBuilderAffordanceRow[];
}

/** Read-only selected-collection detail for AI workflow negotiation. */
export interface AppBuilderCollectionConceptDetail {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Selected collection concept detail rows. */
  readonly rows: readonly AppBuilderCollectionConceptDetailRow[];
  /** Issues found while projecting supplied-input readiness. */
  readonly issues: readonly AppBuilderInputReadinessIssue[];
  /** Whether input-readiness rows were included. */
  readonly inputReadinessIncluded: boolean;
  /** Whether input contract detail rows were included. */
  readonly inputContractDetailIncluded: boolean;
  /** Whether modeled payload schemas were included inside input contract detail rows. */
  readonly payloadSchemasIncluded: boolean;
  /** Whether associated application pattern rows were included. */
  readonly applicationPatternsIncluded: boolean;
  /** Whether collection feature descriptor rows were included. */
  readonly collectionFeaturesIncluded: boolean;
  /** Whether coordinated control pattern rows were included. */
  readonly controlPatternsIncluded: boolean;
  /** Whether coordinated control/component manifest rows were included. */
  readonly controlManifestsIncluded: boolean;
  /** Whether coordinated styling mechanism rows were included. */
  readonly stylingMechanismsIncluded: boolean;
  /** Whether coordinated visual policy rows were included. */
  readonly visualPoliciesIncluded: boolean;
  /** Whether associated affordance rows were included. */
  readonly affordancesIncluded: boolean;
  /** Number of supplied input markers considered by readiness. */
  readonly suppliedInputCount: number;
  /** Number of supplied input markers explicitly present before decision-bundle expansion. */
  readonly explicitSuppliedInputCount: number;
  /** Number of request-local decision bundles considered. */
  readonly decisionBundleCount: number;
  /** Number of decisions carried by request-local decision bundles. */
  readonly decisionBundleDecisionCount: number;
}

/** Return selected collection concepts joined to readiness, input detail, coordinating patterns, and related concept rows. */
export function appBuilderCollectionConceptDetail(
  request: AppBuilderCollectionConceptDetailRequest = {},
): AppBuilderCollectionConceptDetail {
  const hasExplicitSelection = appBuilderHasExplicitSelection(request.collectionConceptIds);
  const includeInputReadiness = appBuilderIncludeDetail(request.includeInputReadiness, hasExplicitSelection);
  const includeInputContractDetail = appBuilderIncludeDetail(request.includeInputContractDetail, hasExplicitSelection);
  const includePayloadSchemas = appBuilderIncludeDetail(request.includePayloadSchemas, hasExplicitSelection);
  const includeApplicationPatterns = appBuilderIncludeDetail(request.includeApplicationPatterns, hasExplicitSelection);
  const includeCollectionFeatures = appBuilderIncludeDetail(request.includeCollectionFeatures, hasExplicitSelection);
  const includeControlPatterns = appBuilderIncludeDetail(request.includeControlPatterns, hasExplicitSelection);
  const includeControlManifests = appBuilderIncludeDetail(request.includeControlManifests, hasExplicitSelection);
  const includeStylingMechanisms = appBuilderIncludeDetail(request.includeStylingMechanisms, hasExplicitSelection);
  const includeVisualPolicies = appBuilderIncludeDetail(request.includeVisualPolicies, hasExplicitSelection);
  const includeAffordances = appBuilderIncludeDetail(request.includeAffordances, hasExplicitSelection);
  const collectionConceptIds = request.collectionConceptIds == null || request.collectionConceptIds.length === 0
    ? null
    : new Set(request.collectionConceptIds);
  const collectionConcepts = APP_BUILDER_COLLECTION_CONCEPT_ROWS.filter((row) =>
    collectionConceptIds == null || collectionConceptIds.has(row.id)
  );
  const inputReadiness = includeInputReadiness
    ? appBuilderInputReadiness({
      targetRefs: collectionConcepts.map((row) => appBuilderOntologyRowRef(
        AppBuilderOntologyRowKind.CollectionConcept,
        row.id,
      )),
      suppliedInputs: request.suppliedInputs ?? [],
      decisionBundles: request.decisionBundles ?? [],
    })
    : null;
  const readinessByCollectionConceptId = new Map(
    inputReadiness?.targets.map((row) => [row.targetRef.id, row]) ?? [],
  );
  const rows = collectionConcepts.map((collectionConcept): AppBuilderCollectionConceptDetailRow => {
    const applicationPatterns = appBuilderApplicationPatternsForCollectionConcept(collectionConcept);
    return {
      collectionConcept,
      ...(includeInputReadiness
        ? { inputReadiness: readinessByCollectionConceptId.get(collectionConcept.id) }
        : {}),
      ...(includeInputContractDetail
        ? {
          inputContractDetails: appBuilderInputContractDetail({
            inputContractIds: appBuilderInputContractIdsForDependency(collectionConcept),
            inputFacetSelections: appBuilderInputFacetSelectionsForDependency(collectionConcept),
            includePayloadSchemas,
          }).rows,
        }
        : {}),
      ...(includeApplicationPatterns ? { applicationPatterns } : {}),
      ...(includeCollectionFeatures
        ? { collectionFeatures: appBuilderCollectionFeaturesForCollectionConcepts([collectionConcept]) }
        : {}),
      ...(includeControlPatterns
        ? {
          controlPatterns: appBuilderControlPatternsForApplicationPatterns(applicationPatterns),
        }
        : {}),
      ...(includeControlManifests
        ? {
          controlManifests: appBuilderControlManifestsForApplicationPatterns(applicationPatterns),
        }
        : {}),
      ...(includeStylingMechanisms
        ? {
          stylingMechanisms: appBuilderStylingMechanismsForApplicationPatterns(applicationPatterns),
        }
        : {}),
      ...(includeVisualPolicies
        ? {
          visualPolicies: appBuilderVisualPoliciesForApplicationPatterns(applicationPatterns),
        }
        : {}),
      ...(includeAffordances
        ? {
          affordances: appBuilderAffordancesForApplicationPatterns(applicationPatterns),
        }
        : {}),
    };
  });
  const inputContractDetailCount = rows.reduce((sum, row) =>
    sum + (row.inputContractDetails?.length ?? 0), 0);
  const applicationPatternCount = rows.reduce((sum, row) =>
    sum + (row.applicationPatterns?.length ?? 0), 0);
  const collectionFeatureCount = rows.reduce((sum, row) => sum + (row.collectionFeatures?.length ?? 0), 0);
  const controlPatternCount = rows.reduce((sum, row) => sum + (row.controlPatterns?.length ?? 0), 0);
  const controlManifestCount = rows.reduce((sum, row) => sum + (row.controlManifests?.length ?? 0), 0);
  const stylingMechanismCount = rows.reduce((sum, row) => sum + (row.stylingMechanisms?.length ?? 0), 0);
  const visualPolicyCount = rows.reduce((sum, row) => sum + (row.visualPolicies?.length ?? 0), 0);
  const affordanceCount = rows.reduce((sum, row) => sum + (row.affordances?.length ?? 0), 0);
  const issueCount = inputReadiness?.issues.length ?? 0;
  const inputCounts = appBuilderDecisionBundleInputCounts(request.suppliedInputs, request.decisionBundles);
  return {
    rows,
    issues: inputReadiness?.issues ?? [],
    inputReadinessIncluded: includeInputReadiness,
    inputContractDetailIncluded: includeInputContractDetail,
    payloadSchemasIncluded: includePayloadSchemas,
    applicationPatternsIncluded: includeApplicationPatterns,
    collectionFeaturesIncluded: includeCollectionFeatures,
    controlPatternsIncluded: includeControlPatterns,
    controlManifestsIncluded: includeControlManifests,
    stylingMechanismsIncluded: includeStylingMechanisms,
    visualPoliciesIncluded: includeVisualPolicies,
    affordancesIncluded: includeAffordances,
    ...inputCounts,
    displayText: `App-builder collection concept detail: ${rows.length} collection concept(s), inputReadiness=${includeInputReadiness}, inputContractDetails=${inputContractDetailCount}, applicationPatterns=${applicationPatternCount}, collectionFeatures=${collectionFeatureCount}, controlPatterns=${controlPatternCount}, controlManifests=${controlManifestCount}, stylingMechanisms=${stylingMechanismCount}, visualPolicies=${visualPolicyCount}, affordances=${affordanceCount}, issues=${issueCount}.`,
  };
}
