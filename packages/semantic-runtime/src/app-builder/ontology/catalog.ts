import {
  APP_BUILDER_AFFORDANCE_ROWS,
  type AppBuilderAffordanceRow,
} from './affordance.js';
import {
  APP_BUILDER_APPLICATION_PATTERN_ROWS,
  type AppBuilderApplicationPatternRow,
} from './application-pattern.js';
import {
  APP_BUILDER_COLLECTION_CONCEPT_ROWS,
  type AppBuilderCollectionConceptRow,
} from './collection.js';
import {
  APP_BUILDER_CONTROL_MANIFEST_ROWS,
  APP_BUILDER_CONTROL_PATTERN_ROWS,
  APP_BUILDER_CONTROL_REALIZATION_POLICY_ROWS,
  type AppBuilderControlManifestRow,
  type AppBuilderControlPatternRow,
  type AppBuilderControlRealizationPolicyRow,
} from './control.js';
import {
  APP_BUILDER_EFFECT_CONTRACT_ROWS,
  type AppBuilderEffectContractRow,
} from './effect.js';
import {
  APP_BUILDER_INPUT_CONTRACT_ROWS,
  APP_BUILDER_INPUT_FACET_ROWS,
  type AppBuilderInputContractRow,
  type AppBuilderInputFacetRow,
} from './input.js';
import {
  APP_BUILDER_POLICY_AXIS_ROWS,
  type AppBuilderPolicyAxisRow,
} from './policy.js';
import {
  appBuilderOntologyRelationRows,
  AppBuilderOntologyRowKind,
  appBuilderOntologyRowRef,
  type AppBuilderOntologyRelationKind,
  type AppBuilderOntologyRelationRow,
  type AppBuilderOntologyRowRef,
} from './relation.js';
import {
  APP_BUILDER_STYLING_MECHANISM_ROWS,
  APP_BUILDER_VISUAL_POLICY_ROWS,
  type AppBuilderStylingMechanismRow,
  type AppBuilderVisualPolicyRow,
} from './style.js';
import {
  AppBuilderOntologyDomain,
  type AppBuilderOntologyReasonAuthority,
  type AppBuilderOntologyStatus,
  type AppBuilderRecommendationStatus,
} from './status.js';
import { appBuilderDefaultingCandidateForTarget } from '../policy/defaulting-candidate-policy.js';

/** Filter request for the read-only app-builder ontology catalog. */
export interface AppBuilderOntologyCatalogRequest {
  /** Include only these row families; empty or omitted means all domains. */
  readonly domains?: readonly AppBuilderOntologyDomain[] | null;
  /** Include only rows with these recommendation statuses. */
  readonly recommendationStatuses?: readonly AppBuilderRecommendationStatus[] | null;
  /** Include only rows whose status has one of these grounding authorities. */
  readonly reasonAuthorities?: readonly AppBuilderOntologyReasonAuthority[] | null;
  /** Include only rows with or without executable source lowering when specified. */
  readonly sourceLoweringImplemented?: boolean | null;
  /** Include only rows currently admitted as local defaulting candidates when specified. */
  readonly defaultingCandidate?: boolean | null;
  /** Include only rows that do or do not require explicit input when specified. */
  readonly requiresExplicitInput?: boolean | null;
  /** Include full ontology row family arrays; defaults to false for compact MCP reads. */
  readonly includeRows?: boolean | null;
  /** Include graph edges between returned rows and their input/effect/follow-up references; defaults to false. */
  readonly includeRelations?: boolean | null;
  /** Include only these ontology graph edge kinds when relations are included. */
  readonly relationKinds?: readonly AppBuilderOntologyRelationKind[] | null;
}

/** Count/status summary for one app-builder ontology row family. */
export interface AppBuilderOntologyDomainSummaryRow {
  /** Ontology row family summarized here. */
  readonly domain: AppBuilderOntologyDomain;
  /** Number of rows currently admitted into this row family. */
  readonly rowCount: number;
  /** Number of rows with executable source-lowering support. */
  readonly sourceLoweringImplementedCount: number;
  /** Number of rows currently admitted as local defaulting candidates. */
  readonly defaultingCandidateCount: number;
  /** Number of rows that require explicit caller, policy, or app-fact input. */
  readonly explicitInputCount: number;
}

/** Read-only app-builder ontology catalog answer. */
export interface AppBuilderOntologyCatalog {
  /** Compact display text suitable for MCP/IDE answer envelopes. */
  readonly displayText: string;
  /** Number of ontology rows matching the requested row filters. */
  readonly rowCount: number;
  /** Number of matching rows with executable source-lowering support. */
  readonly sourceLoweringImplementedCount: number;
  /** Number of relation rows matching the requested row and relation filters. */
  readonly relationCount: number;
  /** Whether full ontology row family arrays are included in this answer. */
  readonly rowsIncluded: boolean;
  /** Whether full relation rows are included in this answer. */
  readonly relationsIncluded: boolean;
  /** Domain summaries for cheap app-builder terrain orientation. */
  readonly domainSummaries: readonly AppBuilderOntologyDomainSummaryRow[];
  /** Required input contracts and input provenance terrain. */
  readonly inputContracts: readonly AppBuilderInputContractRow[];
  /** Fine-grained facets that make input contracts actionable. */
  readonly inputFacets: readonly AppBuilderInputFacetRow[];
  /** App-builder policy axes selected by caller/project/context. */
  readonly policyAxes: readonly AppBuilderPolicyAxisRow[];
  /** Source/effect/verification promises that lowerers should satisfy. */
  readonly effectContracts: readonly AppBuilderEffectContractRow[];
  /** App-building moves; not a starter-profile composition enum. */
  readonly affordances: readonly AppBuilderAffordanceRow[];
  /** Application design pattern rows with honest implementation status. */
  readonly applicationPatterns: readonly AppBuilderApplicationPatternRow[];
  /** Collection source/query/projection/table terrain. */
  readonly collectionConcepts: readonly AppBuilderCollectionConceptRow[];
  /** Native-first and deferred rich control pattern terrain. */
  readonly controlPatterns: readonly AppBuilderControlPatternRow[];
  /** Source-realization policy terrain for inline, wrapper, external, and existing controls. */
  readonly controlRealizationPolicies: readonly AppBuilderControlRealizationPolicyRow[];
  /** Canonical component/control manifest scaffold rows. */
  readonly controlManifests: readonly AppBuilderControlManifestRow[];
  /** Framework/tooling styling mechanisms separated from visual taste. */
  readonly stylingMechanisms: readonly AppBuilderStylingMechanismRow[];
  /** Visual policy rows that describe style-input responsibility. */
  readonly visualPolicies: readonly AppBuilderVisualPolicyRow[];
  /** Typed graph edges that make row dependencies machine-readable. */
  readonly relations: readonly AppBuilderOntologyRelationRow[];
}

/** Build the read-only app-builder ontology catalog without lowering source. */
export function appBuilderOntologyCatalog(
  request: AppBuilderOntologyCatalogRequest = {},
): AppBuilderOntologyCatalog {
  const inputContracts = includeDomain(request, AppBuilderOntologyDomain.Input)
    ? filterStatusRows(AppBuilderOntologyRowKind.InputContract, APP_BUILDER_INPUT_CONTRACT_ROWS, request)
    : [];
  const inputFacets = includeDomain(request, AppBuilderOntologyDomain.Input)
    ? filterStatusRows(AppBuilderOntologyRowKind.InputFacet, APP_BUILDER_INPUT_FACET_ROWS, request)
    : [];
  const effectContracts = includeDomain(request, AppBuilderOntologyDomain.Effect)
    ? filterStatusRows(AppBuilderOntologyRowKind.EffectContract, APP_BUILDER_EFFECT_CONTRACT_ROWS, request)
    : [];
  const policyAxes = includeDomain(request, AppBuilderOntologyDomain.Policy)
    ? filterStatusRows(AppBuilderOntologyRowKind.PolicyAxis, APP_BUILDER_POLICY_AXIS_ROWS, request)
    : [];
  const affordances = includeDomain(request, AppBuilderOntologyDomain.Affordance)
    ? filterStatusRows(AppBuilderOntologyRowKind.Affordance, APP_BUILDER_AFFORDANCE_ROWS, request)
    : [];
  const applicationPatterns = includeDomain(request, AppBuilderOntologyDomain.ApplicationPattern)
    ? filterStatusRows(AppBuilderOntologyRowKind.ApplicationPattern, APP_BUILDER_APPLICATION_PATTERN_ROWS, request)
    : [];
  const collectionConcepts = includeDomain(request, AppBuilderOntologyDomain.Collection)
    ? filterStatusRows(AppBuilderOntologyRowKind.CollectionConcept, APP_BUILDER_COLLECTION_CONCEPT_ROWS, request)
    : [];
  const controlPatterns = includeDomain(request, AppBuilderOntologyDomain.Control)
    ? filterStatusRows(AppBuilderOntologyRowKind.ControlPattern, APP_BUILDER_CONTROL_PATTERN_ROWS, request)
    : [];
  const controlRealizationPolicies = includeDomain(request, AppBuilderOntologyDomain.Control)
    ? filterStatusRows(AppBuilderOntologyRowKind.ControlRealizationPolicy, APP_BUILDER_CONTROL_REALIZATION_POLICY_ROWS, request)
    : [];
  const controlManifests = includeDomain(request, AppBuilderOntologyDomain.Control)
    ? filterStatusRows(AppBuilderOntologyRowKind.ControlManifest, APP_BUILDER_CONTROL_MANIFEST_ROWS, request)
    : [];
  const stylingMechanisms = includeDomain(request, AppBuilderOntologyDomain.Style)
    ? filterStatusRows(AppBuilderOntologyRowKind.StylingMechanism, APP_BUILDER_STYLING_MECHANISM_ROWS, request)
    : [];
  const visualPolicies = includeDomain(request, AppBuilderOntologyDomain.Style)
    ? filterStatusRows(AppBuilderOntologyRowKind.VisualPolicy, APP_BUILDER_VISUAL_POLICY_ROWS, request)
    : [];
  const domainSummaries = [
    includeDomain(request, AppBuilderOntologyDomain.Input)
      ? domainSummary(AppBuilderOntologyDomain.Input, [
        ...rowsWithRefs(AppBuilderOntologyRowKind.InputContract, inputContracts),
        ...rowsWithRefs(AppBuilderOntologyRowKind.InputFacet, inputFacets),
      ])
      : null,
    includeDomain(request, AppBuilderOntologyDomain.Effect)
      ? domainSummary(AppBuilderOntologyDomain.Effect, rowsWithRefs(AppBuilderOntologyRowKind.EffectContract, effectContracts))
      : null,
    includeDomain(request, AppBuilderOntologyDomain.Policy)
      ? domainSummary(AppBuilderOntologyDomain.Policy, rowsWithRefs(AppBuilderOntologyRowKind.PolicyAxis, policyAxes))
      : null,
    includeDomain(request, AppBuilderOntologyDomain.Affordance)
      ? domainSummary(AppBuilderOntologyDomain.Affordance, rowsWithRefs(AppBuilderOntologyRowKind.Affordance, affordances))
      : null,
    includeDomain(request, AppBuilderOntologyDomain.ApplicationPattern)
      ? domainSummary(AppBuilderOntologyDomain.ApplicationPattern, rowsWithRefs(AppBuilderOntologyRowKind.ApplicationPattern, applicationPatterns))
      : null,
    includeDomain(request, AppBuilderOntologyDomain.Collection)
      ? domainSummary(AppBuilderOntologyDomain.Collection, rowsWithRefs(AppBuilderOntologyRowKind.CollectionConcept, collectionConcepts))
      : null,
    includeDomain(request, AppBuilderOntologyDomain.Control)
      ? domainSummary(AppBuilderOntologyDomain.Control, [
        ...rowsWithRefs(AppBuilderOntologyRowKind.ControlPattern, controlPatterns),
        ...rowsWithRefs(AppBuilderOntologyRowKind.ControlRealizationPolicy, controlRealizationPolicies),
        ...rowsWithRefs(AppBuilderOntologyRowKind.ControlManifest, controlManifests),
      ])
      : null,
    includeDomain(request, AppBuilderOntologyDomain.Style)
      ? domainSummary(AppBuilderOntologyDomain.Style, [
        ...rowsWithRefs(AppBuilderOntologyRowKind.StylingMechanism, stylingMechanisms),
        ...rowsWithRefs(AppBuilderOntologyRowKind.VisualPolicy, visualPolicies),
      ])
      : null,
  ].filter((row): row is AppBuilderOntologyDomainSummaryRow => row != null);
  const rowCount = domainSummaries.reduce((sum, row) => sum + row.rowCount, 0);
  const sourceLoweringImplementedCount = domainSummaries.reduce((sum, row) =>
    sum + row.sourceLoweringImplementedCount, 0);
  const rowDetailsIncluded = request.includeRows === true;
  const relationRowsIncluded = shouldIncludeOntologyCatalogRelations(request);
  const matchingRelations = filterRelationRows(appBuilderOntologyRelationRows({
    inputContracts,
    affordances,
    policyAxes,
    applicationPatterns,
    collectionConcepts,
    controlPatterns,
    controlRealizationPolicies,
    controlManifests,
    stylingMechanisms,
    visualPolicies,
  }), request);
  return {
    rowCount,
    sourceLoweringImplementedCount,
    relationCount: matchingRelations.length,
    rowsIncluded: rowDetailsIncluded,
    relationsIncluded: relationRowsIncluded,
    domainSummaries,
    inputContracts: rowDetailsIncluded ? inputContracts : [],
    inputFacets: rowDetailsIncluded ? inputFacets : [],
    policyAxes: rowDetailsIncluded ? policyAxes : [],
    effectContracts: rowDetailsIncluded ? effectContracts : [],
    affordances: rowDetailsIncluded ? affordances : [],
    applicationPatterns: rowDetailsIncluded ? applicationPatterns : [],
    collectionConcepts: rowDetailsIncluded ? collectionConcepts : [],
    controlPatterns: rowDetailsIncluded ? controlPatterns : [],
    controlRealizationPolicies: rowDetailsIncluded ? controlRealizationPolicies : [],
    controlManifests: rowDetailsIncluded ? controlManifests : [],
    stylingMechanisms: rowDetailsIncluded ? stylingMechanisms : [],
    visualPolicies: rowDetailsIncluded ? visualPolicies : [],
    relations: relationRowsIncluded ? matchingRelations : [],
    displayText: `App-builder ontology: ${rowCount} row(s), ${sourceLoweringImplementedCount} source-lowering-implemented row(s), ${matchingRelations.length} relation row(s); rowDetails=${rowDetailsIncluded}; relationRows=${relationRowsIncluded}; readOnly=true; generatedSource=false${hasOntologyCatalogFilters(request) ? '; filtered=true' : ''}.`,
  };
}

function domainSummary(
  domain: AppBuilderOntologyDomain,
  rows: readonly { readonly ref: AppBuilderOntologyRowRef; readonly status: AppBuilderOntologyStatus }[],
): AppBuilderOntologyDomainSummaryRow {
  return {
    domain,
    rowCount: rows.length,
    sourceLoweringImplementedCount: rows.filter((row) => row.status.sourceLoweringImplemented).length,
    defaultingCandidateCount: rows.filter((row) =>
      appBuilderDefaultingCandidateForTarget(row.ref, row.status.recommendationStatus)
    ).length,
    explicitInputCount: rows.filter((row) => row.status.requiresExplicitInput).length,
  };
}

function includeDomain(
  request: AppBuilderOntologyCatalogRequest,
  domain: AppBuilderOntologyDomain,
): boolean {
  return request.domains == null
    || request.domains.length === 0
    || request.domains.includes(domain);
}

function rowsWithRefs<Row extends { readonly id: string; readonly status: AppBuilderOntologyStatus }>(
  kind: AppBuilderOntologyRowKind,
  rows: readonly Row[],
): readonly { readonly ref: AppBuilderOntologyRowRef; readonly status: AppBuilderOntologyStatus }[] {
  return rows.map((row) => ({
    ref: appBuilderOntologyRowRef(kind, row.id),
    status: row.status,
  }));
}

function filterStatusRows<Row extends { readonly id: string; readonly status: AppBuilderOntologyStatus }>(
  kind: AppBuilderOntologyRowKind,
  rows: readonly Row[],
  request: AppBuilderOntologyCatalogRequest,
): Row[] {
  return rows.filter((row) => statusMatches(appBuilderOntologyRowRef(kind, row.id), row.status, request));
}

function statusMatches(
  ref: AppBuilderOntologyRowRef,
  status: AppBuilderOntologyStatus,
  request: AppBuilderOntologyCatalogRequest,
): boolean {
  return (
    (request.recommendationStatuses == null
      || request.recommendationStatuses.length === 0
      || request.recommendationStatuses.includes(status.recommendationStatus))
    && (request.reasonAuthorities == null
      || request.reasonAuthorities.length === 0
      || request.reasonAuthorities.includes(status.reasonAuthority))
    && (request.sourceLoweringImplemented == null
      || status.sourceLoweringImplemented === request.sourceLoweringImplemented)
    && (request.defaultingCandidate == null
      || appBuilderDefaultingCandidateForTarget(ref, status.recommendationStatus) === request.defaultingCandidate)
    && (request.requiresExplicitInput == null || status.requiresExplicitInput === request.requiresExplicitInput)
  );
}

function hasOntologyCatalogFilters(
  request: AppBuilderOntologyCatalogRequest,
): boolean {
  return (request.domains != null && request.domains.length > 0)
    || (request.recommendationStatuses != null && request.recommendationStatuses.length > 0)
    || (request.reasonAuthorities != null && request.reasonAuthorities.length > 0)
    || request.sourceLoweringImplemented != null
    || request.defaultingCandidate != null
    || request.requiresExplicitInput != null
    || (request.relationKinds != null && request.relationKinds.length > 0);
}

function shouldIncludeOntologyCatalogRelations(
  request: AppBuilderOntologyCatalogRequest,
): boolean {
  if (request.includeRelations === false) {
    return false;
  }
  return request.includeRelations === true
    || (request.relationKinds != null && request.relationKinds.length > 0);
}

function filterRelationRows(
  rows: readonly AppBuilderOntologyRelationRow[],
  request: AppBuilderOntologyCatalogRequest,
): readonly AppBuilderOntologyRelationRow[] {
  if (request.relationKinds == null || request.relationKinds.length === 0) {
    return rows;
  }
  return rows.filter((row) => request.relationKinds?.includes(row.relationKind) === true);
}
