import {
  appBuilderOntologyRowRef,
  appBuilderOntologyRowRefKey,
  AppBuilderOntologyRowKind,
  type AppBuilderOntologyRowRef,
  type AppBuilderSuppliedInput,
  type AppBuilderTargetCatalog,
  type AppBuilderInputReadinessResult,
  type AppBuilderSourceLoweringPreflight,
  type AppBuilderSourceLoweringPreflightRow,
  type AppBuilderSourceLoweringPreflightIssue,
  AppBuilderSourceLoweringPreflightIssueKind,
  type AppBuilderSourceLoweringCompositionRequest,
  type AppBuilderSourceLoweringSourcePlan,
  AppBuilderSourceLoweringSourcePlanIssueKind,
  AppBuilderSourceLoweringSurfaceKind,
} from '../app-builder/ontology/index.js';
import {
  AppBuilderAffordanceId,
} from '../app-builder/ontology/affordance.js';
import {
  AppBuilderApplicationPatternId,
} from '../app-builder/ontology/application-pattern.js';
import {
  AppBuilderCollectionConceptId,
} from '../app-builder/ontology/collection.js';
import {
  AppBuilderControlManifestRowId,
  AppBuilderControlPatternId,
  AppBuilderControlRealizationPolicyId,
} from '../app-builder/ontology/control.js';
import {
  AppBuilderEffectContractId,
} from '../app-builder/ontology/effect.js';
import {
  APP_BUILDER_INPUT_CONTRACT_IDS,
  AppBuilderInputContractId,
  AppBuilderInputFacetId,
} from '../app-builder/ontology/input.js';
import {
  AppBuilderPolicyAxisId,
} from '../app-builder/ontology/policy.js';
import {
  AppBuilderStylingMechanismId,
  AppBuilderVisualPolicyId,
} from '../app-builder/ontology/style.js';
import {
  uniqueStrings,
} from '../kernel/collections.js';
import {
  InquiryContinuationCost,
  InquiryContinuationIntent,
  InquiryEvidenceCoverage,
  InquiryEvidenceStaleness,
  InquiryEvidenceState,
  InquirySourcePrecision,
  inquiryContinuationIntents,
} from '../inquiry/continuation-intent.js';
import {
  InquiryContinuationKind,
} from '../inquiry/answer.js';
import {
  SemanticRuntimeAnswerOutcome,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeContinuationRow,
} from './contracts.js';
import {
  mergeSemanticRuntimeContinuationRows,
  semanticRuntimeContinuationMatchesRequestedIntents,
  semanticRuntimeContinuationPageInput,
  semanticRuntimeContinuationWithAppBuilderQueryIntentFilter,
} from './continuation-helpers.js';
import {
  readSemanticRuntimeAppBuilderQueryCatalog,
  SemanticRuntimeAppBuilderQueryKind,
  SemanticRuntimeAppBuilderQueryPosture,
  SemanticRuntimeAppBuilderRequestField,
  SemanticRuntimeAppBuilderSourceTextPolicy,
  type SemanticRuntimeAppBuilderQueryCatalogRow,
  type SemanticRuntimeAppBuilderQueryRequest,
} from './app-builder.js';

type AppBuilderContinuationSeed = {
  readonly kind: InquiryContinuationKind;
  readonly rationale: string;
  readonly targetAppBuilderQuery: SemanticRuntimeAppBuilderQueryRequest;
  readonly intents: readonly InquiryContinuationIntent[];
  readonly evidenceState?: InquiryEvidenceState;
  readonly coverage?: InquiryEvidenceCoverage;
  readonly sourcePrecision?: InquirySourcePrecision;
  readonly staleness?: InquiryEvidenceStaleness;
  readonly cost?: InquiryContinuationCost;
  readonly blockers?: readonly string[];
};

/** Keep preflight author follow-ups compact enough for broad MCP answers. */
const MAX_SOURCE_LOWERING_PREFLIGHT_AUTHOR_CONTINUATIONS = 4;

/** Attach typed next moves to public app-builder answers from one catalog-aware policy point. */
export function withSemanticRuntimeAppBuilderQueryContinuations<TValue>(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<TValue>,
  catalogRow: SemanticRuntimeAppBuilderQueryCatalogRow = appBuilderQueryCatalogRow(query.kind),
): SemanticRuntimeAnswer<TValue> {
  const continuations = semanticRuntimeAppBuilderContinuationRows(query, result, catalogRow);
  if (continuations.length === 0) {
    return result;
  }
  return {
    ...result,
    continuations: mergeSemanticRuntimeContinuationRows(result.continuations ?? [], continuations),
  };
}

/** Apply caller-requested continuation intent filtering after claim/cache materialization. */
export function filterSemanticRuntimeAppBuilderQueryContinuations<TValue>(
  query: Pick<SemanticRuntimeAppBuilderQueryRequest, 'continuationIntents'>,
  result: SemanticRuntimeAnswer<TValue>,
): SemanticRuntimeAnswer<TValue> {
  if (result.continuations == null || result.continuations.length === 0) {
    return result;
  }
  const requestedIntents = inquiryContinuationIntents(query.continuationIntents ?? []);
  if (requestedIntents.length === 0) {
    return result;
  }
  const rows = result.continuations
    .filter((row) => semanticRuntimeContinuationMatchesRequestedIntents(row, requestedIntents))
    .map((row) => semanticRuntimeContinuationWithAppBuilderQueryIntentFilter(row, requestedIntents));
  return {
    ...result,
    continuations: rows,
  };
}

function semanticRuntimeAppBuilderContinuationRows(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  catalogRow: SemanticRuntimeAppBuilderQueryCatalogRow,
): readonly SemanticRuntimeContinuationRow[] {
  const seeds: AppBuilderContinuationSeed[] = [];

  addNextPageContinuation(query, result, catalogRow, seeds);
  addSurfaceContinuations(query, seeds);
  addOntologyContinuations(query, result, seeds);
  addPartContinuations(query, result, seeds);
  addSourceGenerationContinuations(query, result, seeds);

  return mergeSemanticRuntimeContinuationRows([], seeds.map(seedToRow));
}

function addSurfaceContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  seeds: AppBuilderContinuationSeed[],
): void {
  switch (query.kind) {
    case SemanticRuntimeAppBuilderQueryKind.Catalog:
      seeds.push(
        orient(
          'Open the read-only app-builder ontology catalog before choosing source generation.',
          appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.OntologyCatalog),
        ),
        inspect(
          'Open selectable ontology target rows with status and compact input-readiness counts.',
          appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.TargetCatalog, {
            targetCatalog: { includeInputReadiness: true },
          }),
        ),
        verify(
          'Check app-builder registry and source-lowering integrity before trusting generated source paths.',
          appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity),
        ),
      );
      break;
    case SemanticRuntimeAppBuilderQueryKind.OntologyCatalog:
      seeds.push(
        inspect(
          'Open selectable ontology target rows with status and compact input-readiness counts.',
          appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.TargetCatalog, {
            targetCatalog: { includeInputReadiness: true },
          }),
        ),
        inspect(
          'Project blank-slate intake readiness before asking for source-driving payloads.',
          appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputReadiness),
        ),
        inspect(
          'Check app-builder source-lowering preflight before treating source-lowering availability as implementation.',
          appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight),
        ),
        inspect(
          'Inspect app-builder input payload schemas and TBD/deferred facets.',
          appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputContractDetail, {
            inputContractDetail: { includePayloadSchemas: true },
          }),
        ),
      );
      break;
  }
}

function addOntologyContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  switch (query.kind) {
    case SemanticRuntimeAppBuilderQueryKind.TargetCatalog:
      addTargetCatalogContinuations(query, result, seeds);
      break;
    case SemanticRuntimeAppBuilderQueryKind.InputReadiness:
      addInputReadinessContinuations(query, result, seeds);
      break;
    case SemanticRuntimeAppBuilderQueryKind.InputContractDetail:
      addInputContractDetailContinuations(query, result, seeds);
      break;
    case SemanticRuntimeAppBuilderQueryKind.AffordanceDetail:
    case SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail:
    case SemanticRuntimeAppBuilderQueryKind.CollectionConceptDetail:
    case SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail:
    case SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail:
    case SemanticRuntimeAppBuilderQueryKind.EffectContractDetail:
    case SemanticRuntimeAppBuilderQueryKind.PolicyDetail:
    case SemanticRuntimeAppBuilderQueryKind.StyleDetail:
      addDetailGraphContinuations(query, result, seeds);
      break;
    case SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy:
      addRecommendationPolicyContinuations(query, result, seeds);
      break;
    case SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity:
      addCatalogIntegrityContinuations(query, result, seeds);
      break;
    case SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight:
      addDetailGraphContinuations(query, result, seeds);
      addEffectContractDetailContinuation(result.value, seeds);
      addSourceLoweringPreflightPolicyContinuations(result, seeds);
      addSourceLoweringPreflightMissingInputContinuations(result, seeds);
      addSourceLoweringPreflightBlockerContinuations(result, seeds);
      addSourceLoweringPreflightContinuations(query, result, seeds);
      break;
  }
}

function addCatalogIntegrityContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const value = result.value as {
    readonly statusAuditRows?: readonly { readonly targetRef?: unknown }[];
  };
  const targetRefs = uniqueRefs((value.statusAuditRows ?? [])
    .map((row) => row.targetRef)
    .filter(isOntologyRowRef));
  if (targetRefs.length === 0) {
    return;
  }
  seeds.push(
    inspect(
      'Open exact target rows for catalog-integrity status-audit targets.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.TargetCatalog, {
        targetCatalog: {
          targetRefs,
          includeInputReadiness: true,
        },
      }),
    ),
    inspect(
      'Inspect recommendation-policy rows for catalog-integrity status-audit targets.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy, {
        recommendationPolicy: {
          targetRefs,
          includeRows: true,
        },
      }),
    ),
  );
  addDetailContinuationsForRefs(query, targetRefs, seeds, 'Inspect family-specific detail for catalog-integrity status-audit targets.');
}

function addRecommendationPolicyContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const value = result.value as {
    readonly rows?: readonly { readonly targetRef?: unknown }[];
    readonly rowsIncluded?: boolean;
    readonly filteredRowCount?: number;
  };
  if (value.rowsIncluded === false && (value.filteredRowCount ?? 0) > 0) {
    seeds.push(inspect(
      'Request recommendation-policy rows after compact counts identify a policy area worth inspecting.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy, {
        recommendationPolicy: {
          ...(query.recommendationPolicy ?? {}),
          includeRows: true,
        },
        page: query.page,
      }),
    ));
  }
  const targetRefs = (value.rows ?? [])
    .map((row) => row.targetRef)
    .filter(isOntologyRowRef);
  addDetailContinuationsForRefs(query, targetRefs, seeds, 'Inspect family-specific app-builder detail for recommendation-policy rows.');
  if (targetRefs.length > 0) {
    seeds.push(inspect(
      'Check input readiness and source-lowering availability for recommendation-policy rows before treating policy posture as executable output.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight, {
        sourceLoweringPreflight: {
          targetRefs,
          suppliedInputs: suppliedInputsForQuery(query),
        },
      }),
    ));
  }
}

function addTargetCatalogContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const value = result.value as Partial<AppBuilderTargetCatalog>;
  const targetRefs = Array.isArray(value.rows)
    ? value.rows.map((row) => row.targetRef).filter(isOntologyRowRef)
    : [];
  addDetailContinuationsForRefs(query, targetRefs, seeds, 'Inspect family-specific app-builder ontology detail for returned target rows.');
  if (targetRefs.length > 0 && query.targetCatalog?.includeInputReadiness === false) {
    seeds.push(inspect(
      'Project input-readiness rows for the returned target rows.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputReadiness, {
        inputReadiness: {
          targetRefs,
          suppliedInputs: suppliedInputsForQuery(query),
        },
      }),
    ));
  }
  if (targetRefs.length > 0) {
    seeds.push(inspect(
      'Check whether the returned target rows have app-builder source-lowering support, only source-lowering availability, or missing input.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight, {
        sourceLoweringPreflight: {
          targetRefs,
          suppliedInputs: suppliedInputsForQuery(query),
        },
      }),
    ));
  }
}

function addInputReadinessContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const value = result.value as Partial<AppBuilderInputReadinessResult>;
  const targets = value.targets ?? [];
  const targetRefs = targets.map((row) => row.targetRef).filter(isOntologyRowRef);
  const inputContractIds = uniqueStrings(
    targets
      .flatMap((target) => target.inputDependencies.map((dependency) => dependency.inputContract.id))
      .filter(isNonEmptyString),
    'sorted',
  );

  addDetailContinuationsForRefs(query, targetRefs, seeds, 'Inspect family-specific app-builder detail for the readiness targets.');
  if (inputContractIds.length > 0) {
    seeds.push(inspect(
      'Inspect payload schemas and facets for input contracts referenced by readiness.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputContractDetail, {
        inputContractDetail: {
          inputContractIds: inputContractIds as AppBuilderInputContractId[],
          includePayloadSchemas: true,
        },
      }),
    ));
  }
  if (targetRefs.length > 0) {
    seeds.push(inspect(
      'Check source-lowering preflight for the same readiness targets and supplied inputs.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight, {
        sourceLoweringPreflight: {
          targetRefs,
          suppliedInputs: suppliedInputsForQuery(query),
        },
      }),
    ));
  }
}

function addInputContractDetailContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const inputContractIds = uniqueStrings(collectNestedIds(result.value, 'inputContract'), 'sorted');
  const inputFacetIds = uniqueStrings(collectNestedIds(result.value, 'facet'), 'sorted');
  const targetRefs: AppBuilderOntologyRowRef[] = [
    ...inputContractIds.map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputContract, id)),
    ...inputFacetIds.map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, id)),
  ];
  if (targetRefs.length > 0) {
    seeds.push(inspect(
      'Open target rows for the returned input contract and facet payload schemas.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.TargetCatalog, {
        targetCatalog: {
          targetRefs,
          includeInputReadiness: false,
        },
      }),
    ));
  }
  if (inputContractDetailCanOpenSourceLoweringConsumerRows(result.value)) {
    seeds.push(inspect(
      'Inspect which source-lowering targets consume the returned input facets.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputContractDetail, {
        inputContractDetail: {
          ...(query.inputContractDetail ?? {}),
          includeSourceLoweringConsumers: true,
        },
      }),
      InquiryEvidenceState.Inferred,
    ));
  }
  if (inputContractDetailCanOpenSourceLoweringValueSupportRows(result.value)) {
    seeds.push(inspect(
      'Inspect value-level source-lowering support for returned input facets.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputContractDetail, {
        inputContractDetail: {
          ...(query.inputContractDetail ?? {}),
          includeSourceLoweringValueSupport: true,
        },
      }),
      InquiryEvidenceState.Inferred,
    ));
  }
  const consumerTargetRefs = uniqueRefs([
    ...collectInputFacetSourceLoweringConsumerTargetRefs(result.value),
    ...collectInputFacetValueSupportTargetRefs(result.value),
  ]);
  if (consumerTargetRefs.length > 0) {
    seeds.push(inspect(
      'Open target rows for source-lowering targets that consume the returned input facets.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.TargetCatalog, {
        targetCatalog: {
          targetRefs: consumerTargetRefs,
          includeInputReadiness: true,
        },
      }),
      InquiryEvidenceState.Inferred,
    ));
    seeds.push(inspect(
      'Check source-lowering preflight for targets that consume the returned input facets.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight, {
        sourceLoweringPreflight: {
          targetRefs: consumerTargetRefs,
          suppliedInputs: suppliedInputsForQuery(query),
        },
      }),
      InquiryEvidenceState.Inferred,
    ));
  }
  if (query.kind === SemanticRuntimeAppBuilderQueryKind.InputContractDetail) {
    seeds.push(inspect(
      'Project blank-slate intake readiness using the same supplied-input markers.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputReadiness, {
        inputReadiness: {
          suppliedInputs: suppliedInputsForQuery(query),
        },
      }),
    ));
  }
}

function addDetailGraphContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const refs: AppBuilderOntologyRowRef[] = [
    ...collectNestedIds(result.value, 'inputContract').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputContract, id)),
    ...collectNestedIds(result.value, 'inputContractDetails').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputContract, id)),
    ...collectNestedIds(result.value, 'effectContract').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.EffectContract, id)),
    ...collectNestedIds(result.value, 'effectContracts').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.EffectContract, id)),
    ...collectNestedIds(result.value, 'affordance').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.Affordance, id)),
    ...collectNestedIds(result.value, 'affordances').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.Affordance, id)),
    ...collectNestedIds(result.value, 'followUps').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.Affordance, id)),
    ...collectNestedIds(result.value, 'applicationPattern').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, id)),
    ...collectNestedIds(result.value, 'applicationPatterns').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, id)),
    ...collectNestedIds(result.value, 'collectionConcept').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.CollectionConcept, id)),
    ...collectNestedIds(result.value, 'collectionConcepts').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.CollectionConcept, id)),
    ...collectNestedIds(result.value, 'controlPattern').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, id)),
    ...collectNestedIds(result.value, 'controlPatterns').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, id)),
    ...collectNestedIds(result.value, 'realizationPolicies').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlRealizationPolicy, id)),
    ...collectNestedIds(result.value, 'controlManifest').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlManifest, id)),
    ...collectNestedIds(result.value, 'controlManifests').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlManifest, id)),
    ...collectNestedIds(result.value, 'policyAxis').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.PolicyAxis, id)),
    ...collectNestedIds(result.value, 'policyAxes').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.PolicyAxis, id)),
    ...collectNestedIds(result.value, 'stylingMechanism').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.StylingMechanism, id)),
    ...collectNestedIds(result.value, 'stylingMechanisms').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.StylingMechanism, id)),
    ...collectNestedIds(result.value, 'visualPolicy').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.VisualPolicy, id)),
    ...collectNestedIds(result.value, 'visualPolicies').map((id) => appBuilderOntologyRowRef(AppBuilderOntologyRowKind.VisualPolicy, id)),
    ...collectReadinessTargetRefs(result.value),
  ];
  addDetailContinuationsForRefs(query, uniqueRefs(refs), seeds, 'Follow ontology rows referenced by this detail answer.');
}

function addPartContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  switch (query.kind) {
    case SemanticRuntimeAppBuilderQueryKind.PartMenu:
      addPartMenuAuthoringTierContinuations(query, result, seeds);
      if (partMenuHasReturnedParts(result.value)) {
        seeds.push(inspect(
          'Preview source-lowering samples for the same app-builder part selection.',
          appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.PartSourceLoweringPreview, {
            partSourceLoweringPreview: query.partMenu,
            page: semanticRuntimeContinuationPageInput(query),
          }),
          InquiryEvidenceState.Inferred,
        ));
      }
      break;
    case SemanticRuntimeAppBuilderQueryKind.PartSourceLoweringPreview: {
      const invocations = collectPreviewInvocations(result.value);
      for (const invocation of invocations.slice(0, 4)) {
        seeds.push(author(
          `Lower sample invocation for ${String(invocation.partKind)}:${String(invocation.partId)}.`,
          appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.PartSourceInvocation, {
            partSourceInvocation: invocation,
          }),
        ));
      }
      break;
    }
  }
}

function addPartMenuAuthoringTierContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const value = result.value as {
    readonly authoringTierFilteredOutCount?: number;
    readonly authoringTierFilteredOutTiers?: readonly unknown[];
    readonly authoringTierPolicy?: {
      readonly acceptedAuthoringTiers?: readonly unknown[];
    };
  };
  if ((value.authoringTierFilteredOutCount ?? 0) === 0) {
    return;
  }
  const filteredTiers = (value.authoringTierFilteredOutTiers ?? []).filter(isNonEmptyString);
  if (filteredTiers.length === 0) {
    return;
  }
  const requestedTiers = query.partMenu?.authoringTiers ?? value.authoringTierPolicy?.acceptedAuthoringTiers ?? [];
  const authoringTiers = uniqueStrings(
    [...requestedTiers.filter(isNonEmptyString), ...filteredTiers],
    'sorted',
  ) as NonNullable<SemanticRuntimeAppBuilderQueryRequest['partMenu']>['authoringTiers'];
  seeds.push(inspect(
    'Widen the part menu authoring tiers that the current query filtered out deliberately.',
    appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.PartMenu, {
      partMenu: {
        ...(query.partMenu ?? {}),
        authoringTiers,
      },
      page: semanticRuntimeContinuationPageInput(query),
    }),
  ));
}

function partMenuHasReturnedParts(value: unknown): boolean {
  return isRecord(value)
    && Array.isArray(value.parts)
    && value.parts.length > 0;
}

function addSourceLoweringPreflightContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const value = result.value as Partial<AppBuilderSourceLoweringPreflight>;
  const readyRows = (value.rows ?? []).filter((row) => row.canRequestSourceLowering);
  const suppliedInputs = suppliedInputsForQuery(query);
  let added = 0;
  for (const row of readyRows) {
    for (const seed of sourceLoweringPreflightAuthorContinuationsForRow(row, suppliedInputs)) {
      seeds.push(seed);
      added += 1;
      if (added >= MAX_SOURCE_LOWERING_PREFLIGHT_AUTHOR_CONTINUATIONS) {
        return;
      }
    }
  }
}

function sourceLoweringPreflightAuthorContinuationsForRow(
  row: AppBuilderSourceLoweringPreflightRow,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): readonly AppBuilderContinuationSeed[] {
  return [
    sourcePlanPreviewContinuationForPreflightRow(row, suppliedInputs),
    targetInvocationContinuationForPreflightRow(row, suppliedInputs),
    fragmentCompositionContinuationForPreflightRow(row, suppliedInputs),
  ].filter(isAppBuilderContinuationSeed);
}

function sourcePlanPreviewContinuationForPreflightRow(
  row: AppBuilderSourceLoweringPreflightRow,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): AppBuilderContinuationSeed | null {
  if (
    row.targetRef.kind !== AppBuilderOntologyRowKind.ApplicationPattern
    || !canContinueSourceLoweringSurface(row, AppBuilderSourceLoweringSurfaceKind.SourcePlanPreview)
  ) {
    return null;
  }
  switch (row.targetRef.id) {
    case AppBuilderApplicationPatternId.AppShell:
      return author(
        `Lower direct AppShell SourcePlan for ${row.targetRef.kind}:${row.targetRef.id}.`,
        appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan, {
          sourceLoweringSourcePlan: {
            sourceLoweringAppShell: {
              targetRef: row.targetRef,
              suppliedInputs,
            },
          },
        }),
      );
    case AppBuilderApplicationPatternId.RouterBackedListDetail:
      return author(
        `Lower direct router-backed list/detail SourcePlan for ${row.targetRef.kind}:${row.targetRef.id}.`,
        appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan, {
          sourceLoweringSourcePlan: {
            sourceLoweringRouterBackedListDetail: {
              targetRef: row.targetRef,
              suppliedInputs,
            },
          },
        }),
      );
    case AppBuilderApplicationPatternId.DiStateClass:
      return author(
        `Lower direct DI state-class SourcePlan for ${row.targetRef.kind}:${row.targetRef.id}.`,
        appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan, {
          sourceLoweringSourcePlan: {
            sourceLoweringDiStateClass: {
              targetRef: row.targetRef,
              suppliedInputs,
            },
          },
        }),
      );
    case AppBuilderApplicationPatternId.LocalViewModelState:
      return author(
        `Lower direct local view-model state SourcePlan for ${row.targetRef.kind}:${row.targetRef.id}.`,
        appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan, {
          sourceLoweringSourcePlan: {
            sourceLoweringLocalViewModelState: {
              targetRef: row.targetRef,
              suppliedInputs,
            },
          },
        }),
      );
    default:
      return null;
  }
}

function targetInvocationContinuationForPreflightRow(
  row: AppBuilderSourceLoweringPreflightRow,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): AppBuilderContinuationSeed | null {
  if (!canContinueSourceLoweringSurface(row, AppBuilderSourceLoweringSurfaceKind.TargetInvocation)) {
    return null;
  }
  return author(
    `Lower app-builder source fragments for ${row.targetRef.kind}:${row.targetRef.id}.`,
    appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation, {
      sourceLoweringInvocation: {
        targetRef: row.targetRef,
        suppliedInputs,
      },
    }),
  );
}

function fragmentCompositionContinuationForPreflightRow(
  row: AppBuilderSourceLoweringPreflightRow,
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): AppBuilderContinuationSeed | null {
  if (!canContinueSourceLoweringSurface(row, AppBuilderSourceLoweringSurfaceKind.FragmentComposition)) {
    return null;
  }
  return author(
    `Compose app-builder source fragments for ${row.targetRef.kind}:${row.targetRef.id}.`,
    appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition, {
      sourceLoweringComposition: {
        targetRef: row.targetRef,
        suppliedInputs,
      },
    }),
  );
}

function isAppBuilderContinuationSeed(value: AppBuilderContinuationSeed | null): value is AppBuilderContinuationSeed {
  return value != null;
}

function addSourceLoweringPreflightPolicyContinuations(
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const value = result.value as Partial<AppBuilderSourceLoweringPreflight>;
  const targetRefs = uniqueRefs((value.rows ?? [])
    .filter((row) => row.policySatisfaction.required)
    .map((row) => row.targetRef)
    .filter(isOntologyRowRef));
  if (targetRefs.length === 0) {
    return;
  }
  seeds.push(inspect(
    'Inspect recommendation-policy rows for contextual source-lowering targets that need explicit policy satisfaction.',
    appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy, {
      recommendationPolicy: {
        targetRefs,
        policySatisfactionCandidates: true,
        includeRows: true,
      },
    }),
  ));
}

function canContinueSourceLoweringSurface(
  row: AppBuilderSourceLoweringPreflightRow,
  surfaceKind: AppBuilderSourceLoweringSurfaceKind,
): boolean {
  if (!row.canRequestSourceLowering || !row.sourceLoweringSurfaceKinds.includes(surfaceKind)) {
    return false;
  }
  const surfaceSummary = row.sourceLoweringRequestFieldSummary.surfaces.find((surface) =>
    surface.surfaceKind === surfaceKind
  );
  return surfaceSummary == null || surfaceSummary.requiredCount === 0;
}

function addSourceLoweringPreflightMissingInputContinuations(
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const value = result.value as Partial<AppBuilderSourceLoweringPreflight>;
  const missingInputContractIds = uniqueInputContractIds((value.rows ?? [])
    .flatMap((row) => row.inputReadiness.missingRequiredInputContractIds));
  const missingInputFacetIds = uniqueInputFacetIds((value.rows ?? [])
    .flatMap((row) => row.inputReadiness.missingRequiredInputFacetIds));
  if (missingInputContractIds.length === 0 && missingInputFacetIds.length === 0) {
    return;
  }
  seeds.push(inspect(
    'Inspect payload schemas and facets for required inputs missing from source-lowering preflight.',
    appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputContractDetail, {
      inputContractDetail: {
        inputContractIds: missingInputContractIds,
        inputFacetIds: missingInputFacetIds,
        includePayloadSchemas: true,
      },
    }),
    InquiryEvidenceState.Inferred,
    ['Preflight keeps compact rows by default; the continuation opens the exact missing input contracts instead of making app-builder guess.'],
  ));
}

function addSourceLoweringPreflightBlockerContinuations(
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const value = result.value as Partial<AppBuilderSourceLoweringPreflight>;
  const targetRequirementIssues = uniquePreflightIssues([
    ...(value.issues ?? []),
    ...(value.rows ?? []).flatMap((row) => row.targetRequirementIssues),
  ]).filter((issue) =>
    issue.issueKind === AppBuilderSourceLoweringPreflightIssueKind.TargetPayloadRequirement
  );
  if (targetRequirementIssues.length === 0) {
    return;
  }
  if (targetRequirementIssues.some(isDomainFieldTargetRequirementIssue)) {
    seeds.push(inspect(
      'Inspect DomainModel/DomainFields payload schema for target-specific source facts such as numeric range constraints.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputContractDetail, {
        inputContractDetail: {
          inputContractIds: [AppBuilderInputContractId.DomainModel],
          inputFacetIds: [AppBuilderInputFacetId.DomainFields],
          includePayloadSchemas: true,
        },
      }),
      InquiryEvidenceState.Inferred,
      ['Target-specific source facts are finer than coarse input-readiness; preflight issues name the exact fields involved.'],
    ));
  }
  if (targetRequirementIssues.some(isCollectionProjectionTargetRequirementIssue)) {
    seeds.push(inspect(
      'Inspect CollectionProjection payload schemas for table columns and query features before retrying collection-table lowering.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputContractDetail, {
        inputContractDetail: {
          inputContractIds: [AppBuilderInputContractId.CollectionProjection],
          inputFacetIds: [
            AppBuilderInputFacetId.CollectionTableColumns,
            AppBuilderInputFacetId.CollectionQueryFeatures,
          ],
          includePayloadSchemas: true,
        },
      }),
      InquiryEvidenceState.Inferred,
      ['Collection Table lowering accepts basic table projection first; query features require target-specific source facts that preflight reports explicitly.'],
    ));
  }
}

function addSourceGenerationContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  switch (query.kind) {
    case SemanticRuntimeAppBuilderQueryKind.PartSourceInvocation:
      seeds.push(verify(
        'Check app-builder catalog/source-lowering integrity after source-producing work.',
        appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity),
      ));
      break;
    case SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation:
      addSourcePlanWrapperContinuation(query, result.value, seeds);
      addEffectContractDetailContinuation(result.value, seeds);
      addSourceLoweringTargetDetailContinuations(query, result.value, seeds);
      seeds.push(verify(
        'Check app-builder catalog/source-lowering integrity after source-producing work.',
        appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity),
      ));
      break;
    case SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition:
      addSourcePlanWrapperContinuation(query, result.value, seeds);
      addEffectContractDetailContinuation(result.value, seeds);
      addSourceLoweringTargetDetailContinuations(query, result.value, seeds);
      seeds.push(verify(
        'Check app-builder catalog/source-lowering integrity after source-producing work.',
        appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity),
      ));
      break;
    case SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan:
      if (query.kind === SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan) {
        addSourcePlanPlacementContinuations(result, seeds);
      }
      addEffectContractDetailContinuation(result.value, seeds);
      addSourceLoweringTargetDetailContinuations(query, result.value, seeds);
      seeds.push(verify(
        'Check app-builder catalog/source-lowering integrity after source-producing work.',
        appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity),
      ));
      break;
  }
}

function addSourcePlanWrapperContinuation(
  query: SemanticRuntimeAppBuilderQueryRequest,
  value: unknown,
  seeds: AppBuilderContinuationSeed[],
): void {
  if (!sourceLoweringAnswerHasFragments(value)) {
    return;
  }
  switch (query.kind) {
    case SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation:
      seeds.push(author(
        'Wrap these source-lowering invocation fragments in a SourcePlan preview; missing placement is reported as source-placement input.',
        appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan, {
          sourceLoweringSourcePlan: {
            sourceLoweringInvocation: query.sourceLoweringInvocation,
          },
        }),
      ));
      break;
    case SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition:
      seeds.push(author(
        'Wrap these source-lowering composition fragments in a SourcePlan preview; missing placement is reported as source-placement input.',
        appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan, {
          sourceLoweringSourcePlan: {
            sourceLoweringComposition: query.sourceLoweringComposition,
          },
        }),
      ));
      break;
  }
}

function sourceLoweringAnswerHasFragments(value: unknown): boolean {
  return isRecord(value)
    && Array.isArray(value.fragments)
    && value.fragments.length > 0;
}

function addSourcePlanPlacementContinuations(
  result: SemanticRuntimeAnswer<unknown>,
  seeds: AppBuilderContinuationSeed[],
): void {
  const value = result.value as Partial<AppBuilderSourceLoweringSourcePlan>;
  const issueKinds = new Set((value.issues ?? []).map((issue) => issue.issueKind));
  if (
    !issueKinds.has(AppBuilderSourceLoweringSourcePlanIssueKind.MissingRootDir)
    && !issueKinds.has(AppBuilderSourceLoweringSourcePlanIssueKind.MissingTemplatePath)
  ) {
    return;
  }
  seeds.push(
    inspect(
      'Inspect SourcePlan preview placement readiness instead of inventing source root or target file path.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.AffordanceDetail, {
        affordanceDetail: {
          affordanceIds: [AppBuilderAffordanceId.SourcePlanPreview],
        },
      }),
      InquiryEvidenceState.Inferred,
      ['SourcePlan preview placement is SourceRoot plus SourceTargetPath in the app-builder input ontology.'],
    ),
    inspect(
      'Inspect payload schemas for source root and source target path placement input.',
      appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputContractDetail, {
        inputContractDetail: {
          inputContractIds: [AppBuilderInputContractId.SourcePlacement],
          inputFacetIds: [
            AppBuilderInputFacetId.SourceRoot,
            AppBuilderInputFacetId.SourceTargetPath,
          ],
        },
      }),
      InquiryEvidenceState.Inferred,
    ),
  );
}

function addEffectContractDetailContinuation(
  value: unknown,
  seeds: AppBuilderContinuationSeed[],
): void {
  const effectContractIds = collectNestedStringValues(value, 'effectContractIds');
  if (effectContractIds.length === 0) {
    return;
  }
  seeds.push(inspect(
    'Inspect effect contract witnesses promised by this source-starting preview.',
    appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.EffectContractDetail, {
      effectContractDetail: {
        effectContractIds: effectContractIds as AppBuilderEffectContractId[],
      },
    }),
    InquiryEvidenceState.Inferred,
  ));
}

function addSourceLoweringTargetDetailContinuations(
  query: SemanticRuntimeAppBuilderQueryRequest,
  value: unknown,
  seeds: AppBuilderContinuationSeed[],
): void {
  const targetRefs = collectNestedOntologyRowRefs(value, 'sourceLoweringTargetRefs');
  if (targetRefs.length === 0) {
    return;
  }
  addDetailContinuationsForRefs(
    query,
    targetRefs,
    seeds,
    'Inspect app-builder ontology rows exercised by this source-starting preview.',
  );
}

function addNextPageContinuation(
  query: SemanticRuntimeAppBuilderQueryRequest,
  result: SemanticRuntimeAnswer<unknown>,
  catalogRow: SemanticRuntimeAppBuilderQueryCatalogRow,
  seeds: AppBuilderContinuationSeed[],
): void {
  if (
    !catalogRow.acceptedRequestFields.includes(SemanticRuntimeAppBuilderRequestField.Page)
    || result.page?.nextCursor == null
  ) {
    return;
  }
  seeds.push({
    kind: InquiryContinuationKind.NextPage,
    rationale: 'Continue paging this app-builder query with the next cursor.',
    targetAppBuilderQuery: {
      ...publicAppBuilderQueryBase(query),
      page: {
        ...(query.page ?? {}),
        cursor: result.page.nextCursor,
        size: result.page.size,
      },
    },
    intents: [InquiryContinuationIntent.Inspect],
    cost: InquiryContinuationCost.Free,
    evidenceState: InquiryEvidenceState.NotRequired,
    coverage: InquiryEvidenceCoverage.PartialKnownGaps,
    sourcePrecision: InquirySourcePrecision.NotRequired,
    staleness: InquiryEvidenceStaleness.CurrentEpoch,
  });
}

function addDetailContinuationsForRefs(
  sourceQuery: SemanticRuntimeAppBuilderQueryRequest,
  refs: readonly AppBuilderOntologyRowRef[],
  seeds: AppBuilderContinuationSeed[],
  rationale: string,
): void {
  const grouped = groupRefsByKind(refs);
  const suppliedInputs = suppliedInputsForQuery(sourceQuery);
  for (const [kind, ids] of grouped) {
    const targetQuery = detailQueryForRowKind(kind, ids, suppliedInputs);
    if (targetQuery == null) {
      continue;
    }
    seeds.push(inspect(rationale, targetQuery));
  }
}

function detailQueryForRowKind(
  kind: AppBuilderOntologyRowKind,
  ids: readonly string[],
  suppliedInputs: readonly AppBuilderSuppliedInput[],
): SemanticRuntimeAppBuilderQueryRequest | null {
  switch (kind) {
    case AppBuilderOntologyRowKind.InputContract:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputContractDetail, {
        inputContractDetail: {
          inputContractIds: ids as AppBuilderInputContractId[],
          includePayloadSchemas: true,
        },
      });
    case AppBuilderOntologyRowKind.InputFacet:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.InputContractDetail, {
        inputContractDetail: {
          inputFacetIds: ids as AppBuilderInputFacetId[],
          includePayloadSchemas: true,
        },
      });
    case AppBuilderOntologyRowKind.PolicyAxis:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.PolicyDetail, {
        policyDetail: {
          policyAxisIds: ids as AppBuilderPolicyAxisId[],
          suppliedInputs,
        },
      });
    case AppBuilderOntologyRowKind.EffectContract:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.EffectContractDetail, {
        effectContractDetail: {
          effectContractIds: ids as AppBuilderEffectContractId[],
          suppliedInputs,
        },
      });
    case AppBuilderOntologyRowKind.Affordance:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.AffordanceDetail, {
        affordanceDetail: {
          affordanceIds: ids as AppBuilderAffordanceId[],
          suppliedInputs,
        },
      });
    case AppBuilderOntologyRowKind.ApplicationPattern:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail, {
        applicationPatternDetail: {
          applicationPatternIds: ids as AppBuilderApplicationPatternId[],
          suppliedInputs,
        },
      });
    case AppBuilderOntologyRowKind.CollectionConcept:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.CollectionConceptDetail, {
        collectionConceptDetail: {
          collectionConceptIds: ids as AppBuilderCollectionConceptId[],
          suppliedInputs,
        },
      });
    case AppBuilderOntologyRowKind.ControlPattern:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail, {
        controlPatternDetail: {
          controlPatternIds: ids as AppBuilderControlPatternId[],
          suppliedInputs,
        },
      });
    case AppBuilderOntologyRowKind.ControlRealizationPolicy:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail, {
        controlPatternDetail: {
          controlRealizationPolicyIds: ids as AppBuilderControlRealizationPolicyId[],
          suppliedInputs,
        },
      });
    case AppBuilderOntologyRowKind.ControlManifest:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail, {
        controlManifestDetail: {
          controlManifestIds: ids as AppBuilderControlManifestRowId[],
          suppliedInputs,
        },
      });
    case AppBuilderOntologyRowKind.StylingMechanism:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.StyleDetail, {
        styleDetail: {
          stylingMechanismIds: ids as AppBuilderStylingMechanismId[],
          suppliedInputs,
        },
      });
    case AppBuilderOntologyRowKind.VisualPolicy:
      return appBuilderQuery(SemanticRuntimeAppBuilderQueryKind.StyleDetail, {
        styleDetail: {
          visualPolicyIds: ids as AppBuilderVisualPolicyId[],
          suppliedInputs,
        },
      });
  }
}

function orient(
  rationale: string,
  targetAppBuilderQuery: SemanticRuntimeAppBuilderQueryRequest,
): AppBuilderContinuationSeed {
  return seed(rationale, targetAppBuilderQuery, [InquiryContinuationIntent.Orient, InquiryContinuationIntent.Inspect]);
}

function inspect(
  rationale: string,
  targetAppBuilderQuery: SemanticRuntimeAppBuilderQueryRequest,
  evidenceState: InquiryEvidenceState = InquiryEvidenceState.NotRequired,
  blockers: readonly string[] = [],
): AppBuilderContinuationSeed {
  return {
    ...seed(rationale, targetAppBuilderQuery, [InquiryContinuationIntent.Inspect], evidenceState),
    blockers,
  };
}

function author(
  rationale: string,
  targetAppBuilderQuery: SemanticRuntimeAppBuilderQueryRequest,
): AppBuilderContinuationSeed {
  return seed(rationale, targetAppBuilderQuery, [InquiryContinuationIntent.Author], InquiryEvidenceState.Inferred);
}

function verify(
  rationale: string,
  targetAppBuilderQuery: SemanticRuntimeAppBuilderQueryRequest,
): AppBuilderContinuationSeed {
  return seed(rationale, targetAppBuilderQuery, [InquiryContinuationIntent.Verify]);
}

function seed(
  rationale: string,
  targetAppBuilderQuery: SemanticRuntimeAppBuilderQueryRequest,
  intents: readonly InquiryContinuationIntent[],
  evidenceState: InquiryEvidenceState = InquiryEvidenceState.NotRequired,
): AppBuilderContinuationSeed {
  return {
    kind: InquiryContinuationKind.FollowQuery,
    rationale,
    targetAppBuilderQuery,
    intents,
    evidenceState,
  };
}

function seedToRow(seed: AppBuilderContinuationSeed): SemanticRuntimeContinuationRow {
  const targetRow = appBuilderQueryCatalogRow(seed.targetAppBuilderQuery.kind);
  return {
    kind: seed.kind,
    rationale: seed.rationale,
    targetAppBuilderQueryKind: seed.targetAppBuilderQuery.kind,
    targetAppBuilderQuery: seed.targetAppBuilderQuery,
    intents: seed.intents,
    cost: seed.cost ?? costForAppBuilderQuery(targetRow),
    evidence: {
      evidenceState: seed.evidenceState ?? evidenceStateForAppBuilderQuery(targetRow),
      coverage: seed.coverage ?? InquiryEvidenceCoverage.PartialKnownGaps,
      sourcePrecision: seed.sourcePrecision ?? InquirySourcePrecision.NotRequired,
      staleness: seed.staleness ?? InquiryEvidenceStaleness.CurrentEpoch,
    },
    blockers: seed.blockers ?? [],
  };
}

function costForAppBuilderQuery(
  row: SemanticRuntimeAppBuilderQueryCatalogRow,
): InquiryContinuationCost {
  if (row.sourceTextPolicy === SemanticRuntimeAppBuilderSourceTextPolicy.GeneratedSourcePlan) {
    return InquiryContinuationCost.Deep;
  }
  if (row.sourceTextPolicy === SemanticRuntimeAppBuilderSourceTextPolicy.GeneratedSourceFragments) {
    return InquiryContinuationCost.ProjectionOnly;
  }
  switch (row.posture) {
    case SemanticRuntimeAppBuilderQueryPosture.SurfaceMap:
    case SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel:
    case SemanticRuntimeAppBuilderQueryPosture.IntegrityProbe:
      return InquiryContinuationCost.Free;
    case SemanticRuntimeAppBuilderQueryPosture.SourceLoweringSurface:
    case SemanticRuntimeAppBuilderQueryPosture.PartSourceSubstrate:
      return InquiryContinuationCost.ProjectionOnly;
  }
}

function evidenceStateForAppBuilderQuery(
  row: SemanticRuntimeAppBuilderQueryCatalogRow,
): InquiryEvidenceState {
  return row.posture === SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel
    || row.posture === SemanticRuntimeAppBuilderQueryPosture.SurfaceMap
    ? InquiryEvidenceState.NotRequired
    : InquiryEvidenceState.Inferred;
}

function appBuilderQuery(
  kind: SemanticRuntimeAppBuilderQueryKind,
  fields: Partial<SemanticRuntimeAppBuilderQueryRequest> = {},
): SemanticRuntimeAppBuilderQueryRequest {
  return {
    ...fields,
    kind,
  };
}

function appBuilderQueryCatalogRow(
  kind: SemanticRuntimeAppBuilderQueryKind | `${SemanticRuntimeAppBuilderQueryKind}`,
): SemanticRuntimeAppBuilderQueryCatalogRow {
  const row = readSemanticRuntimeAppBuilderQueryCatalog({ queryKind: kind }).rows[0];
  if (row == null) {
    throw new Error(`Unsupported app-builder query kind '${String(kind)}'.`);
  }
  return row;
}

function appBuilderQueryKind(
  kind: SemanticRuntimeAppBuilderQueryKind | `${SemanticRuntimeAppBuilderQueryKind}`,
): SemanticRuntimeAppBuilderQueryKind {
  return appBuilderQueryCatalogRow(kind).queryKind;
}

function publicAppBuilderQueryBase(
  query: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAppBuilderQueryRequest {
  const kind = appBuilderQueryKind(query.kind);
  switch (kind) {
    case SemanticRuntimeAppBuilderQueryKind.Catalog:
    case SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity:
    case SemanticRuntimeAppBuilderQueryKind.OntologyCatalog:
      return appBuilderQuery(kind, {
        inquiryProfile: query.inquiryProfile,
        ontologyCatalog: kind === SemanticRuntimeAppBuilderQueryKind.OntologyCatalog
          ? query.ontologyCatalog
          : undefined,
      });
    case SemanticRuntimeAppBuilderQueryKind.PartMenu:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, partMenu: query.partMenu });
    case SemanticRuntimeAppBuilderQueryKind.InputReadiness:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, inputReadiness: query.inputReadiness });
    case SemanticRuntimeAppBuilderQueryKind.InputContractDetail:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, inputContractDetail: query.inputContractDetail });
    case SemanticRuntimeAppBuilderQueryKind.AffordanceDetail:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, affordanceDetail: query.affordanceDetail });
    case SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, applicationPatternDetail: query.applicationPatternDetail });
    case SemanticRuntimeAppBuilderQueryKind.CollectionConceptDetail:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, collectionConceptDetail: query.collectionConceptDetail });
    case SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, controlManifestDetail: query.controlManifestDetail });
    case SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, controlPatternDetail: query.controlPatternDetail });
    case SemanticRuntimeAppBuilderQueryKind.EffectContractDetail:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, effectContractDetail: query.effectContractDetail });
    case SemanticRuntimeAppBuilderQueryKind.PolicyDetail:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, policyDetail: query.policyDetail });
    case SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, recommendationPolicy: query.recommendationPolicy });
    case SemanticRuntimeAppBuilderQueryKind.StyleDetail:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, styleDetail: query.styleDetail });
    case SemanticRuntimeAppBuilderQueryKind.TargetCatalog:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, targetCatalog: query.targetCatalog });
    case SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, sourceLoweringPreflight: query.sourceLoweringPreflight });
    case SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, sourceLoweringInvocation: query.sourceLoweringInvocation });
    case SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, sourceLoweringComposition: query.sourceLoweringComposition });
    case SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, sourceLoweringSourcePlan: query.sourceLoweringSourcePlan });
    case SemanticRuntimeAppBuilderQueryKind.PartSourceLoweringPreview:
      return appBuilderQuery(kind, {
        inquiryProfile: query.inquiryProfile,
        partSourceLoweringPreview: query.partSourceLoweringPreview,
        partMenu: query.partMenu,
      });
    case SemanticRuntimeAppBuilderQueryKind.PartSourceInvocation:
      return appBuilderQuery(kind, { inquiryProfile: query.inquiryProfile, partSourceInvocation: query.partSourceInvocation });
  }
}

function suppliedInputsForQuery(
  query: SemanticRuntimeAppBuilderQueryRequest,
): readonly AppBuilderSuppliedInput[] {
  const suppliedInputs: AppBuilderSuppliedInput[] = [];
  collectSuppliedInputs(suppliedInputs, query.inputReadiness?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.targetCatalog?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.affordanceDetail?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.applicationPatternDetail?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.collectionConceptDetail?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.controlPatternDetail?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.effectContractDetail?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.policyDetail?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.styleDetail?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.sourceLoweringPreflight?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.sourceLoweringInvocation?.suppliedInputs);
  collectCompositionSuppliedInputs(suppliedInputs, query.sourceLoweringComposition);
  collectSuppliedInputs(suppliedInputs, query.sourceLoweringSourcePlan?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.sourceLoweringSourcePlan?.sourceLoweringAppShell?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.sourceLoweringSourcePlan?.sourceLoweringRouterBackedListDetail?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.sourceLoweringSourcePlan?.sourceLoweringDiStateClass?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.sourceLoweringSourcePlan?.sourceLoweringLocalViewModelState?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.sourceLoweringSourcePlan?.sourceLoweringInvocation?.suppliedInputs);
  collectCompositionSuppliedInputs(suppliedInputs, query.sourceLoweringSourcePlan?.sourceLoweringComposition);
  collectSuppliedInputs(suppliedInputs, query.sourceLoweringSourcePlan?.sourceLoweringComponentPair?.suppliedInputs);
  collectSuppliedInputs(suppliedInputs, query.sourceLoweringSourcePlan?.sourceLoweringComponentPair?.sourceLoweringLocalViewModelState?.suppliedInputs);
  collectCompositionSuppliedInputs(suppliedInputs, query.sourceLoweringSourcePlan?.sourceLoweringComponentPair?.sourceLoweringComposition);
  for (const invocation of query.sourceLoweringSourcePlan?.sourceLoweringComponentPair?.sourceLoweringTemplateInvocations ?? []) {
    collectSuppliedInputs(suppliedInputs, invocation.suppliedInputs);
  }
  for (const invocation of query.sourceLoweringSourcePlan?.sourceLoweringComponentPair?.sourceLoweringClassMemberInvocations ?? []) {
    collectSuppliedInputs(suppliedInputs, invocation.suppliedInputs);
  }
  return suppliedInputs;
}

function collectCompositionSuppliedInputs(
  target: AppBuilderSuppliedInput[],
  composition: AppBuilderSourceLoweringCompositionRequest | null | undefined,
): void {
  if (composition == null) {
    return;
  }
  collectSuppliedInputs(target, composition.suppliedInputs);
  collectCompositionSuppliedInputs(target, composition.fulfilledContentComposition);
  for (const childComposition of composition.childCompositions ?? []) {
    collectCompositionSuppliedInputs(target, childComposition);
  }
}

function collectSuppliedInputs(
  target: AppBuilderSuppliedInput[],
  values: readonly AppBuilderSuppliedInput[] | null | undefined,
): void {
  if (values == null) {
    return;
  }
  target.push(...values);
}

function groupRefsByKind(
  refs: readonly AppBuilderOntologyRowRef[],
): ReadonlyMap<AppBuilderOntologyRowKind, readonly string[]> {
  const grouped = new Map<AppBuilderOntologyRowKind, string[]>();
  for (const rowRef of uniqueRefs(refs)) {
    const ids = grouped.get(rowRef.kind) ?? [];
    grouped.set(rowRef.kind, [...ids, rowRef.id]);
  }
  return grouped;
}

function uniqueRefs(
  refs: readonly AppBuilderOntologyRowRef[],
): readonly AppBuilderOntologyRowRef[] {
  const seen = new Set<string>();
  const rows: AppBuilderOntologyRowRef[] = [];
  for (const rowRef of refs) {
    const key = appBuilderOntologyRowRefKey(rowRef);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push(rowRef);
  }
  return rows;
}

function uniquePreflightIssues(
  issues: readonly AppBuilderSourceLoweringPreflightIssue[],
): readonly AppBuilderSourceLoweringPreflightIssue[] {
  const seen = new Set<string>();
  const rows: AppBuilderSourceLoweringPreflightIssue[] = [];
  for (const issue of issues) {
    const key = [
      issue.issueKind,
      issue.targetRef == null ? '' : appBuilderOntologyRowRefKey(issue.targetRef),
      issue.summary,
      JSON.stringify(issue.fieldNames ?? []),
      JSON.stringify(issue.columnHeaders ?? []),
      JSON.stringify(issue.collectionFeatureIds ?? []),
    ].join('\u0000');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push(issue);
  }
  return rows;
}

function uniqueInputContractIds(
  values: readonly string[],
): readonly AppBuilderInputContractId[] {
  const supported = new Set<string>(APP_BUILDER_INPUT_CONTRACT_IDS);
  return uniqueStrings(values.filter((value) => supported.has(value)), 'sorted') as AppBuilderInputContractId[];
}

function uniqueInputFacetIds(
  values: readonly AppBuilderInputFacetId[],
): readonly AppBuilderInputFacetId[] {
  return uniqueStrings(values, 'sorted') as AppBuilderInputFacetId[];
}

function isDomainFieldTargetRequirementIssue(
  issue: AppBuilderSourceLoweringPreflightIssue,
): boolean {
  return issue.numericConstraintIssue != null
    || (issue.targetRef?.kind === AppBuilderOntologyRowKind.ControlPattern
      && issue.targetRef.id === AppBuilderControlPatternId.NativeRangeInput);
}

function isCollectionProjectionTargetRequirementIssue(
  issue: AppBuilderSourceLoweringPreflightIssue,
): boolean {
  return issue.collectionFeatureIds != null && issue.collectionFeatureIds.length > 0
    || issue.columnHeaders != null && issue.columnHeaders.length > 0
    || (issue.targetRef?.kind === AppBuilderOntologyRowKind.ApplicationPattern
      && issue.targetRef.id === AppBuilderApplicationPatternId.CollectionTable);
}

function uniqueRowKinds(
  refs: readonly AppBuilderOntologyRowRef[],
): readonly AppBuilderOntologyRowKind[] {
  return [...new Set(refs.map((row) => row.kind))].sort();
}

function collectReadinessTargetRefs(value: unknown): readonly AppBuilderOntologyRowRef[] {
  const refs: AppBuilderOntologyRowRef[] = [];
  walkRecords(value, (record) => {
    if (isOntologyRowRef(record.targetRef)) {
      refs.push(record.targetRef);
    }
  });
  return uniqueRefs(refs);
}

function inputContractDetailCanOpenSourceLoweringConsumerRows(value: unknown): boolean {
  return isRecord(value)
    && value.sourceLoweringConsumersIncluded !== true
    && typeof value.sourceLoweringConsumerFacetCount === 'number'
    && value.sourceLoweringConsumerFacetCount > 0;
}

function inputContractDetailCanOpenSourceLoweringValueSupportRows(value: unknown): boolean {
  return isRecord(value)
    && value.sourceLoweringValueSupportIncluded !== true
    && typeof value.sourceLoweringValueSupportRowCount === 'number'
    && value.sourceLoweringValueSupportRowCount > 0;
}

function collectInputFacetSourceLoweringConsumerTargetRefs(value: unknown): readonly AppBuilderOntologyRowRef[] {
  const refs: AppBuilderOntologyRowRef[] = [];
  walkRecords(value, (record) => {
    const rows = record.sourceLoweringConsumerRows;
    if (!Array.isArray(rows)) {
      return;
    }
    for (const row of rows) {
      if (isRecord(row) && isOntologyRowRef(row.targetRef)) {
        refs.push(row.targetRef);
      }
    }
  });
  return uniqueRefs(refs);
}

function collectInputFacetValueSupportTargetRefs(value: unknown): readonly AppBuilderOntologyRowRef[] {
  const refs: AppBuilderOntologyRowRef[] = [];
  walkRecords(value, (record) => {
    const rows = record.sourceLoweringValueSupportRows;
    if (!Array.isArray(rows)) {
      return;
    }
    for (const row of rows) {
      if (!isRecord(row) || !Array.isArray(row.targetRefs)) {
        continue;
      }
      refs.push(...row.targetRefs.filter(isOntologyRowRef));
    }
  });
  return uniqueRefs(refs);
}

function collectNestedOntologyRowRefs(value: unknown, key: string): readonly AppBuilderOntologyRowRef[] {
  const refs: AppBuilderOntologyRowRef[] = [];
  walkRecords(value, (record) => {
    const nested = record[key];
    if (Array.isArray(nested)) {
      refs.push(...nested.filter(isOntologyRowRef));
      return;
    }
    if (isOntologyRowRef(nested)) {
      refs.push(nested);
    }
  });
  return uniqueRefs(refs);
}

function collectNestedIds(value: unknown, key: string): readonly string[] {
  const ids: string[] = [];
  walkRecords(value, (record) => {
    const nested = record[key];
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const id = idFromRecord(item);
        if (id != null) {
          ids.push(id);
        }
      }
      return;
    }
    const id = idFromRecord(nested);
    if (id != null) {
      ids.push(id);
    }
  });
  return uniqueStrings(ids, 'sorted');
}

function collectNestedStringValues(value: unknown, key: string): readonly string[] {
  const values: string[] = [];
  walkRecords(value, (record) => {
    const nested = record[key];
    if (Array.isArray(nested)) {
      for (const item of nested) {
        if (isNonEmptyString(item)) {
          values.push(item);
        }
      }
      return;
    }
    if (isNonEmptyString(nested)) {
      values.push(nested);
    }
  });
  return uniqueStrings(values, 'sorted');
}

function collectPreviewInvocations(value: unknown): readonly NonNullable<SemanticRuntimeAppBuilderQueryRequest['partSourceInvocation']>[] {
  const invocations: NonNullable<SemanticRuntimeAppBuilderQueryRequest['partSourceInvocation']>[] = [];
  walkRecords(value, (record) => {
    const invocation = record.invocation;
    if (isRecord(invocation) && typeof invocation.partKind === 'string' && typeof invocation.partId === 'string') {
      invocations.push(invocation as unknown as NonNullable<SemanticRuntimeAppBuilderQueryRequest['partSourceInvocation']>);
    }
  });
  return invocations;
}

function idFromRecord(value: unknown): string | null {
  return isRecord(value) && isNonEmptyString(value.id) ? value.id : null;
}

function walkRecords(
  value: unknown,
  visit: (record: Readonly<Record<string, unknown>>) => void,
): void {
  if (!isRecord(value)) {
    return;
  }
  visit(value);
  for (const nested of Object.values(value)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        walkRecords(item, visit);
      }
      continue;
    }
    if (isRecord(nested)) {
      walkRecords(nested, visit);
    }
  }
}

function isOntologyRowRef(value: unknown): value is AppBuilderOntologyRowRef {
  return isRecord(value)
    && Object.values(AppBuilderOntologyRowKind).includes(value.kind as AppBuilderOntologyRowKind)
    && isNonEmptyString(value.domain)
    && isNonEmptyString(value.id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
