import { uniqueSortedStrings } from "../../collections.js";
import type { Inquiry } from "../inquiry.js";
import { LensId, LensStage, type LensSpec } from "../lens.js";
import { RepoRootLocus, type SourceRange } from "../locus.js";
import type { AtlasSelfAnalysis } from "./self-analysis-contracts.js";

/** Design dimension a contract coherence fact asks the caller to interpret. */
export type SelfContractCoherenceDimension =
  | "answer-surface"
  | "inquiry-axis"
  | "runtime-contract-alignment";

/** Contract surface involved in a coherence fact. */
export type SelfContractCoherenceSubjectKind =
  | "lens"
  | "parameter"
  | "projection";

/** A contract coherence fact meant to guide navigation and judgment, not enforce compatibility. */
export interface SelfContractCoherenceFact {
  /** Stable fact id. */
  readonly id: string;
  /** Lens contract that owns this fact. */
  readonly lensId: LensId;
  /** Broad design dimension the fact puts under review. */
  readonly dimension: SelfContractCoherenceDimension;
  /** Contract surface involved. */
  readonly subjectKind: SelfContractCoherenceSubjectKind;
  /** Projection or parameter id involved when the fact is axis-specific. */
  readonly subjectId: string;
  /** Exact signals that justify asking the coherence question. */
  readonly signals: readonly string[];
  /** Plausible interpretations an agent should distinguish before refactoring. */
  readonly interpretationSpace: readonly string[];
  /** Composable Atlas inquiries that keep the follow-up in the shared API. */
  readonly nextInquiries: readonly Inquiry[];
  /** Source evidence when the fact is runtime-source-backed. */
  readonly source?: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Lens contract joined to runtime implementation and projection branches. */
export interface SelfContractRow {
  /** Stable row id. */
  readonly id: string;
  /** Lens id. */
  readonly lensId: LensId;
  /** Lens family. */
  readonly family: LensSpec["family"];
  /** Lens implementation stage. */
  readonly stage: LensStage;
  /** True when the runtime engine reports an implementation. */
  readonly implemented: boolean;
  /** Runtime answer function when found in the engine switch. */
  readonly implementationFunction: string | null;
  /** Declared projection ids from LensCatalog. */
  readonly declaredProjectionIds: readonly string[];
  /** Projection branch ids observed under the implementation call path. */
  readonly observedProjectionIds: readonly string[];
  /** Declared projections without an observed string-literal runtime branch. */
  readonly unobservedProjectionIds: readonly string[];
  /** Runtime projection branches not declared by the lens contract. */
  readonly extraRuntimeProjectionIds: readonly string[];
  /** Declared lens-local parameter ids from the lens contract. */
  readonly declaredParameterIds: readonly string[];
  /** Parameter ids declared more than once in the same lens contract. */
  readonly duplicateParameterIds: readonly string[];
  /** Navigable facts that invite architectural interpretation. */
  readonly coherenceFacts: readonly SelfContractCoherenceFact[];
  /** Implementation source when found. */
  readonly source?: SourceRange;
  /** Compact row summary. */
  readonly summary: string;
}

/** Build contract rows from LensCatalog, engine reachability, and observed projection branches. */
export class SelfContractReader {
  readonly #lenses: readonly LensSpec[];
  readonly #analysis: AtlasSelfAnalysis;
  readonly #implementedLensIds: ReadonlySet<LensId>;

  constructor(
    lenses: readonly LensSpec[],
    analysis: AtlasSelfAnalysis,
    implementedLensIds: ReadonlySet<LensId>,
  ) {
    this.#lenses = lenses;
    this.#analysis = analysis;
    this.#implementedLensIds = implementedLensIds;
  }

  rows(): readonly SelfContractRow[] {
    return this.#lenses.map((lens) => this.#rowForLens(lens));
  }

  #rowForLens(lens: LensSpec): SelfContractRow {
    const implementation = this.#analysis.lensImplementations.find(
      (row) => row.lensId === lens.id,
    );
    const declaredProjectionIds = lens.projections.map(
      (projection) => projection.id,
    );
    const observedProjectionIds = uniqueSortedStrings(
      this.#analysis.projectionBranches
        .filter((row) => row.lensIds.includes(lens.id))
        .map((row) => row.projection),
    );
    const unobservedProjectionIds = declaredProjectionIds.filter(
      (projection) => !observedProjectionIds.includes(projection),
    );
    const extraRuntimeProjectionIds = observedProjectionIds.filter(
      (projection) => !declaredProjectionIds.includes(projection),
    );
    const declaredParameterIds = (lens.parameters ?? []).map(
      (parameter) => parameter.id,
    );
    const duplicateParameterIds = duplicateSorted(declaredParameterIds);
    const implemented = this.#implementedLensIds.has(lens.id);
    const coherenceFacts = this.#coherenceFacts(
      lens,
      implemented,
      implementation?.source,
      extraRuntimeProjectionIds,
      duplicateParameterIds,
    );
    const parameterSummary =
      duplicateParameterIds.length === 0
        ? `${declaredParameterIds.length} parameter contract(s)`
        : `${declaredParameterIds.length} parameter contract(s) with duplicate id(s): ${duplicateParameterIds.join(
            ", ",
          )}`;

    return {
      id: `atlas-self:contract:${lens.id}`,
      lensId: lens.id,
      family: lens.family,
      stage: lens.stage,
      implemented,
      implementationFunction: implementation?.implementationFunction ?? null,
      declaredProjectionIds,
      observedProjectionIds,
      unobservedProjectionIds,
      extraRuntimeProjectionIds,
      declaredParameterIds,
      duplicateParameterIds,
      coherenceFacts,
      ...(implementation?.source === undefined
        ? {}
        : { source: implementation.source }),
      summary: `${lens.id} declares ${
        declaredProjectionIds.length
      } projection(s), has ${
        observedProjectionIds.length
      } observed runtime branch(es), carries ${parameterSummary}, and ${
        implementation === undefined
          ? "has no engine implementation row"
          : `is answered by ${implementation.implementationFunction}`
      }; ${coherenceFactSummary(coherenceFacts)}.`,
    };
  }

  #coherenceFacts(
    lens: LensSpec,
    implemented: boolean,
    implementationSource: SourceRange | undefined,
    extraRuntimeProjectionIds: readonly string[],
    duplicateParameterIds: readonly string[],
  ): readonly SelfContractCoherenceFact[] {
    return [
      ...this.#implementationStageFacts(lens, implemented, implementationSource),
      ...extraRuntimeProjectionIds.map((projectionId) =>
        this.#projectionFact(lens, projectionId),
      ),
      ...duplicateParameterIds.map((parameterId) =>
        this.#parameterFact(lens, parameterId),
      ),
    ];
  }

  #implementationStageFacts(
    lens: LensSpec,
    implemented: boolean,
    implementationSource: SourceRange | undefined,
  ): readonly SelfContractCoherenceFact[] {
    const expectedImplemented = lens.stage === LensStage.Implemented;
    if (expectedImplemented === implemented) {
      return [];
    }
    return [
      {
        id: `atlas-self:contract-coherence:${lens.id}:implementation-stage`,
        lensId: lens.id,
        dimension: "runtime-contract-alignment",
        subjectKind: "lens",
        subjectId: lens.id,
        signals: [
          `stage:${lens.stage}`,
          `engine-implemented:${String(implemented)}`,
        ],
        interpretationSpace: [
          "The lens stage may be stale relative to the runtime switch.",
          "The runtime switch may be carrying a temporary implementation path.",
          "The ontology may need a stage between contracted and fully implemented.",
        ],
        nextInquiries: [contractInquiry(lens.id)],
        ...(implementationSource === undefined
          ? {}
          : { source: implementationSource }),
        summary: `${lens.id} stage and runtime implementation status disagree; inspect whether this is stale metadata or a missing stage primitive.`,
      },
    ];
  }

  #projectionFact(
    lens: LensSpec,
    projectionId: string,
  ): SelfContractCoherenceFact {
    const branchSource = this.#analysis.projectionBranches.find(
      (row) =>
        row.lensIds.includes(lens.id) && row.projection === projectionId,
    )?.source;
    return {
      id: `atlas-self:contract-coherence:${lens.id}:projection:${projectionId}`,
      lensId: lens.id,
      dimension: "answer-surface",
      subjectKind: "projection",
      subjectId: projectionId,
      signals: [
        `runtime-projection:${projectionId}`,
        "missing:declared-projection",
      ],
      interpretationSpace: [
        "The runtime answer surface may have outgrown the lens contract.",
        "The observed branch may be a helper-local branch rather than a public projection.",
        "The projection taxonomy may be too flat and need a named sub-surface.",
      ],
      nextInquiries: [
        contractInquiry(lens.id),
        projectionInquiry(lens.id, projectionId),
      ],
      ...(branchSource === undefined ? {} : { source: branchSource }),
      summary: `${lens.id} exposes runtime projection ${projectionId} outside the declared lens contract; decide whether to promote, narrow, or relocate that surface.`,
    };
  }

  #parameterFact(
    lens: LensSpec,
    parameterId: string,
  ): SelfContractCoherenceFact {
    return {
      id: `atlas-self:contract-coherence:${lens.id}:parameter:${parameterId}`,
      lensId: lens.id,
      dimension: "inquiry-axis",
      subjectKind: "parameter",
      subjectId: parameterId,
      signals: [`duplicate-parameter:${parameterId}`],
      interpretationSpace: [
        "The same axis may have been declared twice by accident.",
        "Two different axes may be sharing a vague parameter name.",
        "A lens-local filter may need to become a shared inquiry primitive.",
      ],
      nextInquiries: [
        contractInquiry(lens.id),
        parameterInquiry(lens.id, parameterId),
      ],
      summary: `${lens.id} declares parameter ${parameterId} more than once; inspect whether this is duplication, a missing axis name, or a shared primitive trying to surface.`,
    };
  }
}

function contractInquiry(lensId: LensId): Inquiry {
  return {
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "contracts",
    filters: { lensId },
  };
}

function projectionInquiry(lensId: LensId, projectionId: string): Inquiry {
  return {
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "projections",
    filters: { lensId, projectionId },
  };
}

function parameterInquiry(lensId: LensId, parameterId: string): Inquiry {
  return {
    lens: LensId.AtlasSelf,
    locus: RepoRootLocus,
    projection: "contracts",
    filters: { lensId, parameterId },
  };
}

function coherenceFactSummary(
  facts: readonly SelfContractCoherenceFact[],
): string {
  if (facts.length === 0) {
    return "no contract coherence facts";
  }
  return `${facts.length} contract coherence fact(s) across ${uniqueSortedStrings(
    facts.map((fact) => fact.dimension),
  ).join(", ")}`;
}

function duplicateSorted(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }
  return uniqueSortedStrings([...duplicates]);
}
