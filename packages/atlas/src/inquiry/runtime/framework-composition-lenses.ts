import {
  FrameworkRelationshipClosure,
  FrameworkRelationshipEvidenceBasis,
  FrameworkRelationshipFamily,
  FrameworkRelationshipMechanism,
  FrameworkRelationshipPhase,
  FrameworkRelationshipRelation,
  type FrameworkRelationshipEndpoint,
} from "../../framework/relationships.js";
import { readFrameworkDiIndex } from "../../framework/di-index.js";
import {
  readAuLinkModel,
  type AuLinkAnchorRow,
  type SourceProject,
} from "../../source/index.js";
import { createAnswer, OutcomeKind, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
import type { Continuation } from "../continuation.js";
import {
  SEMANTIC_COMPOSITION_SCHEMA_VERSION,
  type SemanticActorRow,
  type SemanticClaim,
  type SemanticCompositionValue,
  type SemanticEntityRef,
} from "../composition.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import type { SourceRange } from "../locus.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { pageOffset, rowLimit } from "../paging.js";
import {
  FrameworkRowContinuationBuilder,
  nextPageContinuation,
  projectionContinuation,
} from "./framework-continuation-core.js";
import { readFrameworkCompilerRelationships } from "./framework-compiler-lenses.js";
import { readFrameworkExpressionRelationships } from "./framework-expression-relationships.js";
import {
  frameworkStructuralRelationshipProjection,
  readFrameworkStructuralRelationships,
} from "./framework-structural-relationships.js";
import {
  frameworkEmulationValue,
  readFrameworkEmulationObligations,
  type FrameworkEmulationFilters,
  type FrameworkEmulationObligationRow,
  type FrameworkEmulationViewValue,
} from "./framework-emulation-view.js";
import { type FrameworkDiscoveryFilters } from "./framework-filters.js";
import { stringFiltersFromRecord } from "./lens-filter-utils.js";
import {
  type FrameworkLifecycleFilters,
  readFrameworkLifecycleRelationships,
} from "./framework-lifecycle-lenses.js";
import { readFrameworkMaterializationIndex } from "./framework-materialization-lenses.js";
import {
  readFrameworkObservationRelationships,
  type FrameworkObservationFilters,
} from "./framework-observation-lenses.js";
import { readFrameworkRouterAnalysis } from "./framework-router-analysis.js";
import { routerRelationshipsFromFlowRows } from "./framework-router-relationships.js";
import {
  readFrameworkRenderingRelationships,
  type FrameworkRenderingRelationshipFilters,
} from "./framework-rendering-relationships.js";
import {
  checkerBasis,
  countBy,
  sourceIndexBasis,
  sourceRangeFromFileSpan,
} from "./framework-support.js";

const DEFAULT_FRAMEWORK_ACTOR_NAMES = [
  "Aurelia",
  "Container",
  "TemplateCompiler",
  "Rendering",
  "Controller",
] as const;

interface FrameworkCompositionFilters extends FrameworkDiscoveryFilters {
  readonly actorName?: string;
  readonly family?: string;
  readonly predicate?: string;
  readonly relation?: string;
  readonly mechanism?: string;
  readonly phase?: string;
  readonly emulationLayer?: string;
  readonly emulationMode?: string;
  readonly obligationKind?: string;
  readonly targetName?: string;
}

interface RelationshipClaimDraft {
  readonly id: string;
  readonly family?: FrameworkRelationshipFamily;
  readonly relation: FrameworkRelationshipRelation;
  readonly mechanism?: FrameworkRelationshipMechanism;
  readonly phase?: FrameworkRelationshipPhase;
  readonly packageId?: string;
  readonly packageName?: string;
  readonly from: FrameworkRelationshipEndpoint;
  readonly to: FrameworkRelationshipEndpoint;
  readonly source?: SourceRange;
  readonly sourceRowId?: string;
  readonly evidenceBasis?: FrameworkRelationshipEvidenceBasis;
  readonly closure?: FrameworkRelationshipClosure;
  readonly summary: string;
}

const COMPOSITION_ACTOR_ROW_FAMILY = new PagedRowFamily<SemanticActorRow>({
  id: "framework.composition:actors",
  rowLabel: "framework composition actor row(s)",
  evidenceForRow: evidenceForActor,
  continuationsForPage: actorContinuations,
});

const COMPOSITION_CLAIM_ROW_FAMILY = new PagedRowFamily<SemanticClaim>({
  id: "framework.composition:claims",
  rowLabel: "framework composition claim row(s)",
  evidenceForRow: evidenceForClaim,
  continuationsForPage: claimContinuations,
});

const EMULATION_OBLIGATION_ROW_FAMILY =
  new PagedRowFamily<FrameworkEmulationObligationRow>({
    id: "framework.composition:emulation",
    rowLabel: "framework emulation obligation row(s)",
    evidenceForRow: evidenceForEmulationObligation,
    continuationsForPage: emulationObligationContinuations,
  });

/** Answer actor-centered framework composition inquiries. */
export function answerFrameworkComposition(
  inquiry: Inquiry,
  sourceProject: SourceProject,
): Answer<SemanticCompositionValue | FrameworkEmulationViewValue> {
  const projection = inquiry.projection ?? "summary";
  const filters = compositionFiltersFromInquiry(inquiry);
  const limit = rowLimit(inquiry);
  const offset = pageOffset(inquiry);
  const basis = compositionBasis(sourceProject);

  if (projection === "emulation") {
    const emulationFilters = emulationFiltersFromInquiry(inquiry);
    const rows = readFrameworkEmulationObligations(
      sourceProject,
      emulationFilters,
    );
    const value = frameworkEmulationValue(rows);
    if (isEmulationOverviewInquiry(inquiry, emulationFilters)) {
      return createAnswer(
        inquiry,
        rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `${emulationSummaryPrefix(rows.length, value)}. Ask for a mode/layer slice or row budget to expand rows.`,
        {
          value,
          basis,
          evidence: [],
          continuations: emulationOverviewContinuations(inquiry),
        },
      );
    }
    return EMULATION_OBLIGATION_ROW_FAMILY.answer({
      inquiry,
      rows,
      offset,
      limit,
      basis,
      value: (page) => ({ ...value, obligations: page.rows }),
      summary: (page) =>
        `${emulationSummaryPrefix(rows.length, value)}; returned ${page.rows.length}.`,
    });
  }

  const queryTerms = compositionQueryTerms(filters);
  const claims = readFrameworkCompositionClaims(
    sourceProject,
    filters,
    queryTerms,
  );
  const actors = actorRowsForClaims(claims);
  const baseValue = compositionValue(queryTerms, actors, claims);

  if (projection === "actors") {
    return COMPOSITION_ACTOR_ROW_FAMILY.answer({
      inquiry,
      rows: actors,
      offset,
      limit,
      basis,
      value: (page) => ({ ...baseValue, actors: page.rows }),
    });
  }

  if (projection === "claims") {
    return COMPOSITION_CLAIM_ROW_FAMILY.answer({
      inquiry,
      rows: claims,
      offset,
      limit,
      basis,
      value: (page) => ({ ...baseValue, claims: page.rows }),
    });
  }

  return COMPOSITION_CLAIM_ROW_FAMILY.answer({
    inquiry,
    rows: claims,
    offset,
    limit: Math.min(limit, 20),
    basis,
    value: (page) => ({
      ...baseValue,
      actors: actors.slice(0, Math.min(actors.length, 20)),
      claims: page.rows,
    }),
    summary: (page) =>
      `Framework composition has ${actors.length} actor(s) and ${claims.length} signed claim(s); returned ${page.rows.length} claim row(s).`,
  });
}

function emulationSummaryPrefix(
  rowCount: number,
  value: FrameworkEmulationViewValue,
): string {
  const provisionalTypechecker =
    value.interpretationStatuses["provisional-typechecker-handoff"] ?? 0;
  const provisionalText =
    provisionalTypechecker === 0
      ? ""
      : `, including ${provisionalTypechecker} provisional TypeChecker handoff row(s)`;
  return `Framework emulation view has ${rowCount} obligation row(s), ${value.handoffCount} handoff/virtualization row(s)${provisionalText}`;
}

function readFrameworkCompositionClaims(
  sourceProject: SourceProject,
  filters: FrameworkCompositionFilters,
  queryTerms: readonly string[],
): readonly SemanticClaim[] {
  const readerFilters = readerFiltersForComposition(filters, queryTerms);
  const claims = uniqueClaims([
    ...readAuLinkModel(sourceProject, {}).anchors.map(claimFromAuLinkAnchor),
    ...readFrameworkDiIndex(sourceProject).relationships.map((row) =>
      claimFromRelationship(row, LensId.FrameworkDi, "relationships", [
        BasisKind.TypeScriptChecker,
      ]),
    ),
    ...readFrameworkMaterializationIndex(
      sourceProject,
      readerFilters,
    ).relationships.map((row) =>
      claimFromRelationship(
        relationshipDraft(row, FrameworkRelationshipFamily.Materialization),
        LensId.FrameworkMaterialization,
        "relationships",
        [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      ),
    ),
    ...readFrameworkCompilerRelationships(sourceProject, readerFilters).map(
      (row) =>
        claimFromRelationship(
          relationshipDraft(row, FrameworkRelationshipFamily.Compiler),
          LensId.FrameworkCompiler,
          "relationships",
          [BasisKind.TypeScriptChecker],
        ),
    ),
    ...readFrameworkExpressionRelationships(sourceProject, readerFilters).map(
      (row) =>
        claimFromRelationship(
          relationshipDraft(row, FrameworkRelationshipFamily.Expression),
          LensId.FrameworkDiscovery,
          "expression-entities",
          [BasisKind.TypeScriptChecker],
        ),
    ),
    ...readFrameworkStructuralRelationships(sourceProject, readerFilters).map(
      (row) =>
        claimFromRelationship(
          relationshipDraft(row, row.family),
          LensId.FrameworkDiscovery,
          frameworkStructuralRelationshipProjection(row.family),
          [BasisKind.TypeScriptChecker],
        ),
    ),
    ...routerRelationshipsFromFlowRows(
      readFrameworkRouterAnalysis(sourceProject).flows,
      readerFilters,
    ).map((row) =>
      claimFromRelationship(
        relationshipDraft(row, FrameworkRelationshipFamily.Router),
        LensId.FrameworkRouter,
        "relationships",
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      ),
    ),
    ...readFrameworkRenderingRelationships(
      sourceProject,
      readerFilters,
    )
      .filter(
        (row) =>
          row.relation !== FrameworkRelationshipRelation.LooksUpObserver &&
          row.relation !== FrameworkRelationshipRelation.ConfiguresObservation,
      )
      .map((row) =>
        claimFromRelationship(
          relationshipDraft(row, FrameworkRelationshipFamily.Rendering),
          LensId.FrameworkRendering,
          "relationships",
          [BasisKind.SourceText, BasisKind.TypeScriptChecker],
        ),
      ),
    ...readFrameworkLifecycleRelationships(
      sourceProject,
      readerFilters as FrameworkLifecycleFilters,
    ).map((row) =>
      claimFromRelationship(
        relationshipDraft(row, FrameworkRelationshipFamily.Lifecycle),
        LensId.FrameworkLifecycle,
        "relationships",
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      ),
    ),
    ...readFrameworkObservationRelationships(
      sourceProject,
      readerFilters as FrameworkObservationFilters,
    ).map((row) =>
      claimFromRelationship(
        relationshipDraft(row, FrameworkRelationshipFamily.Observation),
        LensId.FrameworkObservation,
        "relationships",
        [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      ),
    ),
  ]);
  return claims.filter((claim) =>
    compositionClaimMatches(claim, filters, queryTerms),
  );
}

function readerFiltersForComposition(
  filters: FrameworkCompositionFilters,
  queryTerms: readonly string[],
): FrameworkRenderingRelationshipFilters {
  const query =
    filters.query ??
    filters.actorName ??
    filters.symbolName ??
    (queryTerms.length === 1 ? queryTerms[0] : undefined);
  return {
    ...filters,
    ...(filters.predicate === undefined
      ? {}
      : { relation: filters.predicate }),
    ...(query === undefined ? {} : { query }),
  };
}

function relationshipDraft(
  row: RelationshipClaimDraft,
  family: FrameworkRelationshipFamily,
): RelationshipClaimDraft {
  return {
    ...row,
    family: row.family ?? family,
  };
}

function claimFromRelationship(
  row: RelationshipClaimDraft,
  sourceLens: LensId,
  sourceProjection: string,
  basis: readonly BasisKind[],
): SemanticClaim {
  return {
    id: `framework-claim:${sourceLens}:${row.id}`,
    family: row.family ?? "framework",
    predicate: row.relation,
    ...(row.mechanism === undefined ? {} : { mechanism: row.mechanism }),
    ...(row.phase === undefined ? {} : { phase: row.phase }),
    ...(row.packageId === undefined ? {} : { packageId: row.packageId }),
    ...(row.packageName === undefined ? {} : { packageName: row.packageName }),
    subject: entityRefFromEndpoint(row.from),
    object: entityRefFromEndpoint(row.to),
    sourceLens,
    sourceProjection,
    basis,
    ...(row.closure === undefined ? {} : { closure: row.closure }),
    ...(row.source === undefined ? {} : { source: row.source }),
    sourceRowId: row.sourceRowId ?? row.id,
    summary: row.summary,
  };
}

function claimFromAuLinkAnchor(row: AuLinkAnchorRow): SemanticClaim {
  const productSource = sourceRangeFromFileSpan(
    row.file.repoPath,
    row.target.span,
  );
  const frameworkCandidate = row.frameworkTarget.candidates[0];
  const frameworkSource =
    frameworkCandidate === undefined
      ? undefined
      : sourceRangeFromFileSpan(
          frameworkCandidate.file.repoPath,
          frameworkCandidate.span,
        );
  const objectName = frameworkCandidate?.symbolName ?? row.symbolName;
  return {
    id: `framework-claim:${LensId.BridgeAuLink}:${row.id}`,
    family: "bridge",
    predicate: "mirrors-framework-target",
    mechanism: "aulink",
    phase: "semantic-mapping",
    packageId: row.packageId,
    subject: {
      id: entityId("product-class", row.target.name ?? row.symbolName, "semantic-runtime"),
      kind: row.target.kind,
      name: row.target.name ?? row.symbolName,
      packageId: "semantic-runtime",
      source: productSource,
      aliases:
        row.target.name === null || row.target.name === row.symbolName
          ? []
          : [row.symbolName],
    },
    object: {
      id: entityId("framework-symbol", objectName, row.packageId),
      kind: frameworkCandidate?.kind ?? "framework-target",
      name: objectName,
      packageId: row.packageId,
      ...(frameworkSource === undefined ? {} : { source: frameworkSource }),
      aliases:
        objectName === row.symbolName ? [] : [row.symbolName],
    },
    sourceLens: LensId.BridgeAuLink,
    sourceProjection: "anchors",
    basis: [BasisKind.AuLink, BasisKind.TypeScriptChecker],
    closure: row.frameworkTarget.status,
    source: productSource,
    sourceRowId: row.id,
    summary: `${row.target.name ?? row.symbolName} mirrors ${row.linkId} through auLink.`,
  };
}

function entityRefFromEndpoint(
  endpoint: FrameworkRelationshipEndpoint,
): SemanticEntityRef {
  return {
    id: entityId(endpoint.kind, endpoint.name, endpoint.packageId),
    kind: endpoint.kind,
    name: endpoint.name,
    ...(endpoint.packageId === undefined
      ? {}
      : { packageId: endpoint.packageId }),
    ...(endpoint.packageName === undefined
      ? {}
      : { packageName: endpoint.packageName }),
    ...(endpoint.source === undefined ? {} : { source: endpoint.source }),
    aliases: endpoint.resourceName === undefined || endpoint.resourceName === null
      ? []
      : [endpoint.resourceName],
  };
}

function actorRowsForClaims(
  claims: readonly SemanticClaim[],
): readonly SemanticActorRow[] {
  const actors = new Map<string, SemanticEntityRef>();
  for (const claim of claims) {
    actors.set(claim.subject.id, mergeEntity(actors.get(claim.subject.id), claim.subject));
    actors.set(claim.object.id, mergeEntity(actors.get(claim.object.id), claim.object));
  }
  return [...actors.values()]
    .map((actor) => {
      const actorClaims = claims.filter((claim) => claimTouchesActor(claim, actor));
      const auLinkIds = actorClaims
        .filter((claim) => claim.sourceLens === LensId.BridgeAuLink)
        .map((claim) => claim.object.packageId === undefined
          ? claim.object.name
          : `${claim.object.packageId}:${claim.object.name}`);
      return {
        ...actor,
        claimCount: actorClaims.length,
        claimFamilies: countBy(actorClaims, (claim) => claim.family),
        auLinkIds: [...new Set(auLinkIds)].sort(),
        summary: `${actor.name} participates in ${actorClaims.length} signed framework composition claim(s).`,
      };
    })
    .sort(
      (left, right) =>
        right.claimCount - left.claimCount ||
        left.name.localeCompare(right.name) ||
        left.kind.localeCompare(right.kind),
    );
}

function mergeEntity(
  current: SemanticEntityRef | undefined,
  next: SemanticEntityRef,
): SemanticEntityRef {
  if (current === undefined) {
    return next;
  }
  return {
    ...current,
    source: current.source ?? next.source,
    aliases: [...new Set([...(current.aliases ?? []), ...(next.aliases ?? [])])],
  };
}

function compositionValue(
  queryTerms: readonly string[],
  actors: readonly SemanticActorRow[],
  claims: readonly SemanticClaim[],
): SemanticCompositionValue {
  return {
    schemaVersion: SEMANTIC_COMPOSITION_SCHEMA_VERSION,
    queryTerms,
    actorCount: actors.length,
    claimCount: claims.length,
    claimFamilies: countBy(claims, (claim) => claim.family),
    predicates: countBy(claims, (claim) => claim.predicate),
    phases: countBy(
      claims.filter((claim) => claim.phase !== undefined),
      (claim) => claim.phase as string,
    ),
  };
}

function compositionClaimMatches(
  claim: SemanticClaim,
  filters: FrameworkCompositionFilters,
  queryTerms: readonly string[],
): boolean {
  return (
    (filters.packageId === undefined ||
      claim.packageId === filters.packageId ||
      claim.subject.packageId === filters.packageId ||
      claim.object.packageId === filters.packageId) &&
    (filters.family === undefined || claim.family === filters.family) &&
    (filters.predicate === undefined ||
      claim.predicate === filters.predicate) &&
    (filters.relation === undefined || claim.predicate === filters.relation) &&
    (filters.mechanism === undefined ||
      claim.mechanism === filters.mechanism) &&
    (filters.phase === undefined || claim.phase === filters.phase) &&
    (queryTerms.length === 0 ||
      queryTerms.some((term) => claimMatchesTerm(claim, term)))
  );
}

function claimMatchesTerm(claim: SemanticClaim, term: string): boolean {
  return (
    entityMatchesTerm(claim.subject, term) ||
    entityMatchesTerm(claim.object, term) ||
    claim.summary.includes(term) ||
    claim.predicate.includes(term) ||
    claim.family.includes(term)
  );
}

function entityMatchesTerm(entity: SemanticEntityRef, term: string): boolean {
  return (
    entity.name.includes(term) ||
    entity.kind.includes(term) ||
    entity.packageId?.includes(term) === true ||
    entity.aliases?.some((alias) => alias.includes(term)) === true
  );
}

function compositionQueryTerms(
  filters: FrameworkCompositionFilters,
): readonly string[] {
  const terms = [
    filters.actorName,
    filters.symbolName,
    filters.query,
  ].filter((term): term is string => term !== undefined && term.length > 0);
  if (terms.length > 0) {
    return terms;
  }
  return hasStructuredCompositionFilter(filters) ? [] : DEFAULT_FRAMEWORK_ACTOR_NAMES;
}

function hasStructuredCompositionFilter(filters: FrameworkCompositionFilters): boolean {
  return filters.packageId !== undefined ||
    filters.family !== undefined ||
    filters.predicate !== undefined ||
    filters.relation !== undefined ||
    filters.mechanism !== undefined ||
    filters.phase !== undefined ||
    filters.targetName !== undefined;
}

function compositionFiltersFromInquiry(
  inquiry: Inquiry,
): FrameworkCompositionFilters {
  return {
    ...frameworkCompositionFiltersFromRecord(inquiry.subject),
    ...frameworkCompositionFiltersFromRecord(inquiry.filters),
  };
}

function emulationFiltersFromInquiry(
  inquiry: Inquiry,
): FrameworkEmulationFilters {
  return {
    ...frameworkCompositionFiltersFromRecord(inquiry.subject),
    ...frameworkCompositionFiltersFromRecord(inquiry.filters),
    ...emulationOnlyFiltersFromRecord(inquiry.subject),
    ...emulationOnlyFiltersFromRecord(inquiry.filters),
  };
}

const frameworkCompositionFilterKeys = [
  "packageId",
  "symbolName",
  "actorName",
  "family",
  "predicate",
  "relation",
  "mechanism",
  "phase",
  "query",
] as const satisfies readonly (keyof FrameworkCompositionFilters & string)[];

function frameworkCompositionFiltersFromRecord(
  value: unknown,
): FrameworkCompositionFilters {
  return stringFiltersFromRecord<FrameworkCompositionFilters>(
    value,
    frameworkCompositionFilterKeys,
  );
}

function emulationOnlyFiltersFromRecord(value: unknown): FrameworkEmulationFilters {
  return stringFiltersFromRecord<FrameworkEmulationFilters>(
    value,
    frameworkEmulationFilterKeys,
  );
}

const frameworkEmulationFilterKeys = [
  "emulationLayer",
  "emulationMode",
  "obligationKind",
  "targetName",
] as const satisfies readonly (keyof FrameworkEmulationFilters & string)[];

function isEmulationOverviewInquiry(
  inquiry: Inquiry,
  filters: FrameworkEmulationFilters,
): boolean {
  return (
    inquiry.budget?.rows === undefined &&
    inquiry.page === undefined &&
    filters.packageId === undefined &&
    filters.resourceKind === undefined &&
    filters.query === undefined &&
    filters.emulationLayer === undefined &&
    filters.emulationMode === undefined &&
    filters.obligationKind === undefined &&
    filters.targetName === undefined
  );
}

function evidenceForActor(row: SemanticActorRow): Evidence {
  return {
    id: row.id,
    kind: EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    ...(row.source === undefined ? {} : { source: row.source }),
    data: row,
  };
}

function evidenceForClaim(row: SemanticClaim): Evidence {
  return {
    id: row.id,
    kind:
      row.sourceLens === LensId.BridgeAuLink
        ? EvidenceKind.AuLinkAnchor
        : EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Strong,
    summary: row.summary,
    ...(row.source === undefined ? {} : { source: row.source }),
    data: row,
  };
}

function evidenceForEmulationObligation(
  row: FrameworkEmulationObligationRow,
): Evidence {
  return {
    id: row.id,
    kind:
      row.mode === "typescript-handoff" || row.mode === "virtualized-runtime"
        ? EvidenceKind.OpenSeam
        : EvidenceKind.TypeFact,
    role: EvidenceRole.Subject,
    confidence:
      row.closure === "exact"
        ? EvidenceConfidence.Exact
        : row.closure === "open"
          ? EvidenceConfidence.Unknown
          : EvidenceConfidence.Strong,
    summary: row.summary,
    ...(row.source === undefined ? {} : { source: row.source }),
    data: row,
  };
}

function actorContinuations(
  inquiry: Inquiry,
  rows: readonly SemanticActorRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.composition:actors:next-page",
        "Continue framework composition actor rows.",
        nextOffset,
        limit,
      ),
    );
  }
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForActor(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.composition:actors",
      index,
      evidence,
    );
    if (row.source !== undefined) {
      continuations.push(
        builder.source(
          "source",
          row.source,
          "Inspect source behind this composition actor.",
          "Source behind a framework composition actor.",
        ),
      );
    }
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.composition:actors:claims:${index}`,
        "claims",
        "Inspect signed claims touching this actor.",
        {
          filters: { actorName: row.name },
          evidence,
          basis: [BasisKind.AuLink, BasisKind.TypeScriptChecker],
        },
      ),
    );
  }
  return continuations;
}

function emulationOverviewContinuations(inquiry: Inquiry): readonly Continuation[] {
  return [
    projectionContinuation(
      inquiry,
      "framework.composition:emulation:ecmascript-evaluation",
      "emulation",
      "Inspect obligations owned by ECMAScript evaluation and DI world spending.",
      {
        filters: { emulationMode: "ecmascript-evaluation" },
        basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      },
    ),
    projectionContinuation(
      inquiry,
      "framework.composition:emulation:semantic-runtime-emulator",
      "emulation",
      "Inspect obligations where semantic-runtime should faithfully emulate framework behavior.",
      {
        filters: { emulationMode: "semantic-runtime-emulator" },
        basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      },
    ),
    projectionContinuation(
      inquiry,
      "framework.composition:emulation:virtualized-runtime",
      "emulation",
      "Inspect built-in template-controller obligations that need virtualized runtime modeling.",
      {
        filters: { emulationMode: "virtualized-runtime" },
        basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      },
    ),
    projectionContinuation(
      inquiry,
      "framework.composition:emulation:typescript-handoff",
      "emulation",
      "Inspect binding and observation obligations that hand off to TypeChecker-backed modeling.",
      {
        filters: { emulationMode: "typescript-handoff" },
        basis: [BasisKind.TypeScriptChecker],
      },
    ),
    projectionContinuation(
      inquiry,
      "framework.composition:emulation:template-compiler",
      "emulation",
      "Inspect obligations touching TemplateCompiler.",
      {
        filters: { targetName: "TemplateCompiler" },
        basis: [BasisKind.StaticEvaluator, BasisKind.TypeScriptChecker],
      },
    ),
  ];
}

function emulationObligationContinuations(
  inquiry: Inquiry,
  rows: readonly FrameworkEmulationObligationRow[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.composition:emulation:next-page",
        "Continue framework emulation obligation rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.composition:emulation:actors",
      "actors",
      "Inspect framework actors that the emulation obligations reference.",
      { basis: [BasisKind.AuLink, BasisKind.TypeScriptChecker] },
    ),
  );
  for (const [index, row] of rows.slice(0, 3).entries()) {
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.composition:emulation",
      index,
    );
    if (row.source !== undefined) {
      continuations.push(
        builder.source(
          "source",
          row.source,
          "Inspect source behind this emulation obligation.",
          "Source behind a semantic-runtime emulation obligation.",
        ),
      );
    }
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.composition:emulation:owner:${index}`,
        row.sourceProjection,
        "Inspect the framework projection that owns this obligation.",
        {
          lens: row.sourceLens,
          filters: row.detailFilters,
          basis: row.basis,
        },
      ),
    );
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.composition:emulation:bridge:${index}`,
        "anchors",
        "Look for auLink bridge anchors for this framework target.",
        {
          lens: LensId.BridgeAuLink,
          filters: { symbolName: row.targetName },
          basis: [BasisKind.AuLink, BasisKind.TypeScriptChecker],
        },
      ),
    );
  }
  return continuations;
}

function claimContinuations(
  inquiry: Inquiry,
  rows: readonly SemanticClaim[],
  nextOffset: number | undefined,
  limit: number,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  if (nextOffset !== undefined) {
    continuations.push(
      nextPageContinuation(
        inquiry,
        "framework.composition:claims:next-page",
        "Continue framework composition claim rows.",
        nextOffset,
        limit,
      ),
    );
  }
  continuations.push(
    projectionContinuation(
      inquiry,
      "framework.composition:actors",
      "actors",
      "Inspect actors in this induced composition graph.",
      { basis: [BasisKind.AuLink, BasisKind.TypeScriptChecker] },
    ),
  );
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const evidence = evidenceForClaim(row);
    const builder = new FrameworkRowContinuationBuilder(
      inquiry,
      "framework.composition:claims",
      index,
      evidence,
    );
    if (row.source !== undefined) {
      continuations.push(
        builder.source(
          "source",
          row.source,
          "Inspect source behind this composition claim.",
          "Source behind a framework composition claim.",
        ),
      );
    }
    continuations.push(
      projectionContinuation(
        inquiry,
        `framework.composition:claims:owner:${index}`,
        row.sourceProjection,
        "Inspect the source lens projection that owns this claim.",
        {
          lens: row.sourceLens as LensId,
          filters: sourceFiltersForClaim(row),
          evidence,
          basis: row.basis,
        },
      ),
    );
  }
  return continuations;
}

function sourceFiltersForClaim(row: SemanticClaim): Inquiry["filters"] {
  if (row.sourceLens === LensId.BridgeAuLink) {
    return { symbolName: row.object.aliases?.[0] ?? row.object.name };
  }
  return {
    ...(row.packageId === undefined ? {} : { packageId: row.packageId }),
    relation: row.predicate,
    ...(row.mechanism === undefined ? {} : { mechanism: row.mechanism }),
    ...(row.phase === undefined ? {} : { phase: row.phase }),
    query: row.subject.name,
  };
}

function uniqueClaims(
  claims: readonly SemanticClaim[],
): readonly SemanticClaim[] {
  const byKey = new Map<string, SemanticClaim>();
  for (const claim of claims) {
    const key = [
      claim.family,
      claim.predicate,
      claim.subject.id,
      claim.object.id,
      claim.source?.filePath,
      claim.source?.start.line,
      claim.source?.start.character,
    ].join(":");
    if (!byKey.has(key)) {
      byKey.set(key, claim);
    }
  }
  return [...byKey.values()].sort(
    (left, right) =>
      left.family.localeCompare(right.family) ||
      left.predicate.localeCompare(right.predicate) ||
      left.subject.name.localeCompare(right.subject.name) ||
      left.object.name.localeCompare(right.object.name),
  );
}

function claimTouchesActor(
  claim: SemanticClaim,
  actor: SemanticEntityRef,
): boolean {
  return claim.subject.id === actor.id || claim.object.id === actor.id;
}

function entityId(
  kind: string,
  name: string,
  packageId: string | undefined,
): string {
  return `entity:${packageId ?? "repo"}:${kind}:${name}`;
}

function compositionBasis(sourceProject: SourceProject): readonly Basis[] {
  return [
    sourceIndexBasis(sourceProject),
    checkerBasis(sourceProject),
    {
      kind: BasisKind.AuLink,
      closure: BasisClosure.Exact,
      authority: BasisAuthority.Product,
      freshness: BasisFreshness.Live,
      identity: sourceProject.snapshot().identity,
      summary:
        "Product-to-framework auLink anchors joined into framework composition claims.",
    },
  ];
}
