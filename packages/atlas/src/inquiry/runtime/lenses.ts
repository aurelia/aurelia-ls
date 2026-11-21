import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  atlasContractBasis as contractBasis,
  BasisClosure,
  BasisKind,
} from "../basis.js";
import {
  ContinuationKind,
} from "../continuation.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  OpenSeamKind,
  type Evidence,
  type OpenSeam,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId, LensStage } from "../lens.js";
import { LocusKind, RepoRootLocus } from "../locus.js";
import { createSurfaceMap, type InquirySurfaceMap } from "../surface-map.js";
import { RepoAreaId, RepoAreaStatus } from "../terrain.js";
import type {
  SourceProject,
  TypeScriptEnumRawValueRoleSelection,
} from "../../source/index.js";
import {
  ATLAS_SELF_STANDARD_ENUM_CONTEXT_ROLES,
  readAtlasSelfAnalysis,
  type AtlasSelfAnalysis,
  type AtlasSelfAnalysisOptions,
} from "./self-analysis.js";
import {
  answerSelfEnumMappingsProjection,
  answerSelfEnumProjection,
  answerSelfEnumReferencesProjection,
  answerSelfEnumValueOccurrencesProjection,
  answerSelfEnumValueSpacesProjection,
} from "./self-enum-lenses.js";
import { answerSelfPhaseProfileProjection } from "./self-phase-profile-lenses.js";
import {
  buildSelfBaseValue,
  type SelfValue,
} from "./self-value.js";
import { selfSourceBasis } from "./self-row-projection.js";
import {
  answerSelfAxisPressureProjection,
  answerSelfClassesProjection,
  answerSelfContractStringsProjection,
  answerSelfFunctionControlFlowShapesProjection,
  answerSelfFunctionShapesProjection,
  answerSelfFunctionWrappersProjection,
  answerSelfFunctionsProjection,
  answerSelfRelationshipSurfaceProjection,
  answerSelfRowSurfaceProjection,
  answerSelfSourceFilesProjection,
  answerSelfStringProjection,
  answerSelfVariablesProjection,
} from "./self-source-surface-lenses.js";
import {
  answerSelfContinuationsProjection,
  answerSelfContractsProjection,
  answerSelfModulesProjection,
  answerSelfProjectionBranchesProjection,
  answerSelfSemanticRoutesProjection,
  answerSelfSubstrateSurfacesProjection,
} from "./self-topology-lenses.js";
import {
  inquiryBooleanFilter,
  inquiryBooleanFilterOrDefault,
  inquiryNumberFilter,
  inquiryStringFilter,
} from "./lens-filter-utils.js";
import type { InquiryWorld } from "./world.js";

/** Summary returned by the repo.terrain runtime lens. */
export interface RepoTerrainValue {
  /** Total terrain areas known to Atlas. */
  readonly totalAreas: number;
  /** Active terrain areas that currently shape semantic inquiry. */
  readonly activeAreas: number;
  /** Deferred terrain areas intentionally excluded from current semantic inquiry. */
  readonly deferredAreas: number;
  /** External terrain areas that should not be edited by Atlas work. */
  readonly externalAreas: number;
  /** Terrain rows returned by this projection. */
  readonly areas: InquiryWorld["terrain"];
}

/** Answer the repo.map lens from the static inquiry world. */
export function answerRepoMap(
  world: InquiryWorld,
  inquiry: Inquiry,
): Answer<InquirySurfaceMap> {
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    "Returned the Atlas surface map.",
    {
      value: createSurfaceMap(world),
      basis: [contractBasis("Answered from the in-memory contract world.")],
      evidence: world.evidence,
    },
  );
}

/** Answer the repo.terrain lens from static terrain declarations. */
export function answerRepoTerrain(
  world: InquiryWorld,
  inquiry: Inquiry,
): Answer<RepoTerrainValue> {
  const locus = inquiry.locus;
  const areas = locus.kind === LocusKind.RepoArea
    ? world.terrain.filter(area => area.id === locus.areaId)
    : world.terrain;
  const value: RepoTerrainValue = {
    totalAreas: areas.length,
    activeAreas: areas.filter(area => area.status === RepoAreaStatus.Active).length,
    deferredAreas: areas.filter(area => area.status === RepoAreaStatus.Deferred).length,
    externalAreas: areas.filter(area => area.status === RepoAreaStatus.External).length,
    areas,
  };

  return createAnswer(
    inquiry,
    areas.length > 0 ? OutcomeKind.Hit : OutcomeKind.Miss,
    `Returned ${areas.length} repository terrain area(s).`,
    {
      value,
      basis: [
        contractBasis("Answered from the static repository terrain contract."),
      ],
      evidence: [
        {
          id: "repo.terrain:areas",
          kind: EvidenceKind.MaintenanceSignal,
          role: EvidenceRole.Subject,
          confidence: EvidenceConfidence.Exact,
          summary: "Repository terrain rows are static declarations in Atlas.",
        },
      ],
      continuations: [
        {
          id: "repo.terrain:map",
          kind: ContinuationKind.SwitchLens,
          rationale: "Return to the full inquiry surface map.",
          inquiry: {
            lens: LensId.RepoMap,
            locus: RepoRootLocus,
            projection: "summary",
          },
        },
      ],
    },
  );
}

/** Answer the atlas.self lens from contract-world status. */
export function answerSelf(
  world: InquiryWorld,
  inquiry: Inquiry,
  implementedLensIds: ReadonlySet<LensId>,
  sourceProject: SourceProject,
): Answer<SelfValue> {
  const locus = inquiry.locus;
  if ((locus.kind === LocusKind.Package && locus.packageId !== RepoAreaId.Atlas) ||
      (locus.kind === LocusKind.RepoArea && locus.areaId !== RepoAreaId.Atlas)) {
    return createAnswer(inquiry, OutcomeKind.NoClaim, "Self analysis describes the Atlas package.", {
      basis: [contractBasis("The selected package or area is outside Atlas self analysis.")],
      continuations: [{
        kind: ContinuationKind.SwitchLens,
        rationale: "Inspect the selected package or area through the TypeScript structure lens.",
        inquiry: { lens: LensId.TsStructure, locus, projection: "module-graph" },
      }],
    });
  }
  const projection = inquiry.projection ?? "summary";
  const disabled = projection !== "phase-profile" && projection !== "summary" && atlasSelfProjectionNeedsSemanticTaxonomyAnalysis(inquiry) &&
    inquiryBooleanFilter(inquiry, "includeSemanticTaxonomyAnalysis") === false
    ? "includeSemanticTaxonomyAnalysis"
    : atlasSelfProjectionNeedsFunctionBodyAnalysis(inquiry) && inquiryBooleanFilter(inquiry, "includeFunctionBodyAnalysis") === false
      ? "includeFunctionBodyAnalysis"
      : undefined;
  if (disabled !== undefined) {
    const summary = `The requested ${projection} projection requires the disabled ${disabled} pass.`;
    return createAnswer(inquiry, OutcomeKind.NoClaim, summary, {
      basis: [contractBasis("The execution filter excludes the requested analysis.")],
      openSeams: [{ kind: OpenSeamKind.InsufficientBasis, summary }],
      continuations: [{
        kind: ContinuationKind.Reroute,
        rationale: `Run ${projection} with the required analysis enabled.`,
        inquiry: { ...inquiry, filters: { ...inquiry.filters, [disabled]: true } },
      }],
    });
  }
  return new AtlasSelfAnswerer(
    world,
    inquiry,
    implementedLensIds,
    sourceProject,
  ).answer();
}

class AtlasSelfAnswerer {
  readonly #world: InquiryWorld;
  readonly #inquiry: Inquiry;
  readonly #implementedLensIds: ReadonlySet<LensId>;
  readonly #unimplemented: readonly { readonly id: LensId }[];
  readonly #analysis: AtlasSelfAnalysis;
  readonly #value: SelfValue;

  constructor(
    world: InquiryWorld,
    inquiry: Inquiry,
    implementedLensIds: ReadonlySet<LensId>,
    sourceProject: SourceProject,
  ) {
    this.#world = world;
    this.#inquiry = inquiry;
    this.#implementedLensIds = implementedLensIds;
    this.#unimplemented = world.lenses.filter(
      (lens) =>
        lens.stage === LensStage.Contracted && !implementedLensIds.has(lens.id),
    );
    this.#analysis = readAtlasSelfAnalysis(
      sourceProject,
      atlasSelfAnalysisOptionsForInquiry(inquiry),
    );
    this.#value = buildSelfBaseValue(
      world,
      implementedLensIds,
      sourceProject,
      this.#unimplemented,
      this.#analysis,
      inquiryBooleanFilterOrDefault(inquiry, "includeSourceProject", false),
      atlasSelfValueNeedsTaxonomy(inquiry) && inquiryBooleanFilter(inquiry, "includeSemanticTaxonomyAnalysis") !== false,
    );
  }

  answer(): Answer<SelfValue> {
    switch (this.#inquiry.projection ?? "summary") {
      case "contracts":
        return answerSelfContractsProjection(
          this.#world,
          this.#inquiry,
          this.#value,
          this.#analysis,
          this.#implementedLensIds,
        );
      case "projections":
        return answerSelfProjectionBranchesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "continuations":
        return answerSelfContinuationsProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "semantic-routes":
        return answerSelfSemanticRoutesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "modules":
        return answerSelfModulesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "substrate-surfaces":
        return answerSelfSubstrateSurfacesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "contract-strings":
        return answerSelfContractStringsProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "enums":
        return answerSelfEnumProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "enum-references":
        return answerSelfEnumReferencesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "enum-value-spaces":
        return answerSelfEnumValueSpacesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "enum-value-occurrences":
        return answerSelfEnumValueOccurrencesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "enum-mappings":
        return answerSelfEnumMappingsProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "strings":
        return answerSelfStringProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "relationship-surfaces":
        return answerSelfRelationshipSurfaceProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "axis-pressure":
        return answerSelfAxisPressureProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "phase-profile":
        return answerSelfPhaseProfileProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "row-surfaces":
        return answerSelfRowSurfaceProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "classes":
        return answerSelfClassesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "source-files":
        return answerSelfSourceFilesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "functions":
        return answerSelfFunctionsProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "variables":
        return answerSelfVariablesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "function-shapes":
        return answerSelfFunctionShapesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "function-control-flow-shapes":
        return answerSelfFunctionControlFlowShapesProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "function-wrappers":
        return answerSelfFunctionWrappersProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "taxonomy":
        return answerSelfTaxonomyProjection(
          this.#inquiry,
          this.#value,
          this.#analysis,
        );
      case "summary":
      default:
        return answerSelfSummaryProjection(
          this.#world,
          this.#inquiry,
          this.#value,
          this.#analysis,
          this.#openSeams(),
        );
    }
  }

  #openSeams(): readonly OpenSeam[] {
    return selfOpenSeams(this.#unimplemented);
  }
}

function atlasSelfAnalysisOptionsForInquiry(
  inquiry: Inquiry,
): AtlasSelfAnalysisOptions {
  return {
    enumRawValueContextRoles: enumRawValueContextRolesForInquiry(inquiry),
    includeFunctionBodyAnalysis: inquiryBooleanFilter(inquiry, "includeFunctionBodyAnalysis") ?? atlasSelfProjectionNeedsFunctionBodyAnalysis(inquiry),
    includeSemanticTaxonomyAnalysis: inquiryBooleanFilter(inquiry, "includeSemanticTaxonomyAnalysis") ?? atlasSelfProjectionNeedsSemanticTaxonomyAnalysis(inquiry),
  };
}

function atlasSelfValueNeedsTaxonomy(inquiry: Inquiry): boolean {
  const projection = inquiry.projection ?? "summary";
  return projection === "summary" || projection === "taxonomy";
}

function atlasSelfProjectionNeedsSemanticTaxonomyAnalysis(
  inquiry: Inquiry,
): boolean {
  switch (inquiry.projection ?? "summary") {
    case "summary":
    case "taxonomy":
    case "contracts":
    case "projections":
    case "continuations":
    case "semantic-routes":
    case "contract-strings":
    case "enums":
    case "enum-references":
    case "enum-value-spaces":
    case "enum-value-occurrences":
    case "enum-mappings":
    case "strings":
    case "axis-pressure":
    case "phase-profile":
      return true;
    default:
      return false;
  }
}

function atlasSelfProjectionNeedsFunctionBodyAnalysis(
  inquiry: Inquiry,
): boolean {
  const projection = inquiry.projection ?? "summary";
  if (
    projection === "function-shapes" ||
    projection === "function-control-flow-shapes"
  ) {
    return true;
  }
  if (projection !== "functions") {
    return false;
  }
  const orderBy = inquiryStringFilter(inquiry, "orderBy");
  return inquiryStringFilter(inquiry, "bodyFingerprint") !== undefined ||
    inquiryStringFilter(inquiry, "bodyShapeFingerprint") !== undefined ||
    inquiryStringFilter(inquiry, "switchTopologyFingerprint") !== undefined ||
    inquiryNumberFilter(inquiry, "minSwitchTopologyCount") !== undefined ||
    orderBy === "bodyFingerprint" ||
    orderBy === "bodyShapeFingerprint" ||
    orderBy === "switchTopologyCount" ||
    orderBy === "switchTopologyFingerprint";
}

function enumRawValueContextRolesForInquiry(
  inquiry: Inquiry,
): TypeScriptEnumRawValueRoleSelection {
  const filters = inquiry.filters as Record<string, unknown> | undefined;
  if (filters?.enumContext === "all") {
    return "all";
  }
  if (filters?.enumContext === "none") {
    return "none";
  }
  if (filters?.enumContext === "standard") {
    return ATLAS_SELF_STANDARD_ENUM_CONTEXT_ROLES;
  }
  const projection = inquiry.projection ?? "summary";
  if (projection === "enum-value-occurrences" && filters?.role === "call-argument") {
    return "all";
  }
  if (projection === "phase-profile") {
    const query = typeof filters?.query === "string" ? filters.query : "";
    return query.includes("call-argument") || query.includes("getResolvedSignature.call-expression")
      ? "all"
      : ATLAS_SELF_STANDARD_ENUM_CONTEXT_ROLES;
  }
  return ATLAS_SELF_STANDARD_ENUM_CONTEXT_ROLES;
}

function selfOpenSeams(
  unimplemented: readonly { readonly id: LensId }[],
): readonly OpenSeam[] {
  return unimplemented.map((lens) => ({
    id: `atlas.self:lens:${lens.id}`,
    kind: OpenSeamKind.MissingLens,
    summary: `Lens ${lens.id} has a static contract but no runtime implementation yet.`,
    basis: contractBasis(
      "Observed while inspecting the in-memory lens registry.",
    ),
  }));
}

function answerSelfSummaryProjection(
  world: InquiryWorld,
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
  openSeams: readonly OpenSeam[],
): Answer<SelfValue> {
  const seams = value.taxonomy ? openSeams : [...openSeams, {
    kind: OpenSeamKind.InsufficientBasis,
    summary: "The semantic taxonomy pass was disabled. Enable includeSemanticTaxonomyAnalysis to inspect its counts.",
  }];
  return createAnswer(
    inquiry,
    seams.length === 0 ? OutcomeKind.Hit : OutcomeKind.Partial,
    `Returned Atlas self status with ${value.implementedLensIds.length} implemented lens(es) and ${value.unimplementedContractedLenses} missing contracted implementation(s). ${value.taxonomy ? "Includes source-backed taxonomy." : "Taxonomy was not collected."}`,
    {
      value,
      basis: [
        contractBasis(
          "Answered from the in-memory lens registry and static catalogs.",
        ),
        selfSourceBasis(
          "Read Atlas source declarations through the hot TypeScript Program.",
        ),
      ],
      evidence: [
        ...world.evidence,
        ...(value.taxonomy ? [selfAnalysisEvidence(
          analysis,
          "atlas.self:taxonomy",
          "Atlas self-analysis derived enums, string literals, and relationship-like row surfaces.",
        )] : []),
      ],
      openSeams: seams,
    },
  );
}

function answerSelfTaxonomyProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  return createAnswer(
    inquiry,
    OutcomeKind.Hit,
    "Returned compact Atlas self taxonomy rollup.",
    {
      value,
      basis: [
        selfSourceBasis(
          "Read Atlas source declarations through the hot TypeScript Program.",
        ),
      ],
      evidence: [
        selfAnalysisEvidence(
          analysis,
          "atlas.self:taxonomy",
          "Atlas self taxonomy rollup is source-backed.",
        ),
      ],
    },
  );
}

function selfAnalysisEvidence(
  analysis: AtlasSelfAnalysis,
  id: string,
  summary: string,
): Evidence {
  return {
    id,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary,
    basis: selfSourceBasis(
      "Atlas self-analysis was derived from the hot TypeScript Program.",
    ),
    data: {
      version: analysis.version,
      sourceFileCount: analysis.sourceFileCount,
      rollup: analysis.rollup,
    },
  };
}

/** Build an unsupported answer for cataloged lenses without runtime implementation. */
export function answerUnimplementedLens(
  world: InquiryWorld,
  inquiry: Inquiry,
): Answer {
  const spec = world.lenses.find((lens) => lens.id === inquiry.lens);
  const requiredSubstrates = spec?.requiredSubstrates ?? [];

  return createAnswer(
    inquiry,
    OutcomeKind.Unsupported,
    `Lens ${inquiry.lens} is cataloged but not implemented yet.`,
    {
      basis: [
        {
          kind: BasisKind.Unsupported,
          closure: BasisClosure.Unsupported,
          summary:
            "This lens is part of the inquiry catalog but does not have a runtime implementation yet.",
          limitations: [
            `Required substrates: ${requiredSubstrates.join(", ")}`,
          ],
        },
      ],
      openSeams: [
        {
          kind: OpenSeamKind.MissingLens,
          summary: `The runtime has no implementation of ${inquiry.lens}.`,
        },
      ],
      continuations: [
        {
          id: `${inquiry.lens}:map`,
          kind: ContinuationKind.SwitchLens,
          rationale:
            "Inspect the available inquiry contracts.",
          inquiry: {
            lens: LensId.RepoMap,
            locus: RepoRootLocus,
            projection: "summary",
          },
        },
      ],
    },
  );
}

/** Return true when the selected locus is rooted at the whole repo or one terrain area. */
export function isRepoLikeLocus(kind: LocusKind): boolean {
  return (
    kind === LocusKind.Repo ||
    kind === LocusKind.RepoArea ||
    kind === LocusKind.Package
  );
}
