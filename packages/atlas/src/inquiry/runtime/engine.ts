import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
} from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import { OpenSeamKind } from "../evidence.js";
import type { Budget } from "../budget.js";
import type { Inquiry, InquirySubject } from "../inquiry.js";
import { LensId, LensStage, type LensSpec } from "../lens.js";
import { LocusKind, RepoRootLocus, type Locus } from "../locus.js";
import type { SourceProject } from "../../source/index.js";
import {
  answerSelf,
  answerRepoMap,
  answerRepoTerrain,
  answerUnimplementedLens,
} from "./lenses.js";
import {
  answerTsSource,
  answerTsStructure,
  answerTsType,
} from "./ts-lenses.js";
import { answerBridgeAuLink } from "./bridge-lenses.js";
import {
  answerFrameworkDiscovery,
  answerFrameworkLifecycle,
  answerFrameworkRendering,
} from "./framework-lenses.js";
import { answerFrameworkEvaluator } from "./framework-evaluator-lenses.js";
import { answerFrameworkDi } from "./framework-di-lenses.js";
import { answerFrameworkMaterialization } from "./framework-materialization-lenses.js";
import { answerFrameworkAdmission } from "./framework-admission-lenses.js";
import { answerFrameworkCompiler } from "./framework-compiler-lenses.js";
import { answerFrameworkObservation } from "./framework-observation-lenses.js";
import { answerFrameworkResources } from "./framework-resource-lenses.js";
import type { InquiryWorld } from "./world.js";

/** Hot substrate context shared by runtime lens implementations. */
export interface InquiryRuntimeSubstrates {
  /** Source/checker project owned by the daemon process. */
  readonly sourceProject: SourceProject;
}

/** Transport-neutral inquiry input accepted by the runtime API. */
export interface InquiryRuntimeRequest {
  /** Lens id requested by the caller; unknown strings become structured unsupported answers. */
  readonly lens: LensId | string;
  /** Optional locus; omitted or invalid loci normalize to the repo root. */
  readonly locus?: unknown;
  /** Optional subject payload. */
  readonly subject?: unknown;
  /** Lens-local projection id. */
  readonly projection?: string;
  /** Lens-local filters. */
  readonly filters?: Record<string, unknown>;
  /** Shared budget lanes. */
  readonly budget?: unknown;
  /** Optional cursor/page request. */
  readonly page?: unknown;
}

/** Deterministic in-memory inquiry engine over one inquiry world. */
export class InquiryEngine {
  /** Runtime lens ids that have in-memory implementations. */
  readonly #implementedLensIds = new Set<LensId>([
    LensId.RepoMap,
    LensId.RepoTerrain,
    LensId.AtlasSelf,
    LensId.TsSource,
    LensId.TsStructure,
    LensId.TsType,
    LensId.BridgeAuLink,
    LensId.FrameworkDiscovery,
    LensId.FrameworkRendering,
    LensId.FrameworkResources,
    LensId.FrameworkCompiler,
    LensId.FrameworkDi,
    LensId.FrameworkEvaluator,
    LensId.FrameworkMaterialization,
    LensId.FrameworkLifecycle,
    LensId.FrameworkObservation,
    LensId.FrameworkAdmission,
  ]);

  constructor(
    /** Contract world queried by the engine. */
    readonly world: InquiryWorld,
    /** Hot source and analysis substrates shared across lenses. */
    readonly substrates: InquiryRuntimeSubstrates,
  ) {}

  /** Ask one inquiry or transport-shaped request. */
  async ask(input: Inquiry | InquiryRuntimeRequest): Promise<Answer> {
    const normalized = this.normalize(input);
    if (normalized.unknownLens !== undefined) {
      return this.unknownLensAnswer(normalized.inquiry, normalized.unknownLens);
    }

    const spec = this.findLens(normalized.inquiry.lens);
    if (spec === undefined) {
      return this.unknownLensAnswer(
        normalized.inquiry,
        normalized.inquiry.lens,
      );
    }

    const validation = this.validate(normalized.inquiry, spec);
    if (validation !== undefined) {
      return validation;
    }

    switch (normalized.inquiry.lens) {
      case LensId.RepoMap:
        return answerRepoMap(this.world, normalized.inquiry);
      case LensId.RepoTerrain:
        return answerRepoTerrain(this.world, normalized.inquiry);
      case LensId.AtlasSelf:
        return answerSelf(
          this.world,
          normalized.inquiry,
          this.#implementedLensIds,
          this.substrates.sourceProject,
        );
      case LensId.TsSource:
        return answerTsSource(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.TsStructure:
        return answerTsStructure(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.TsType:
        return answerTsType(normalized.inquiry, this.substrates.sourceProject);
      case LensId.BridgeAuLink:
        return answerBridgeAuLink(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.FrameworkDiscovery:
        return answerFrameworkDiscovery(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.FrameworkRendering:
        return answerFrameworkRendering(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.FrameworkResources:
        return answerFrameworkResources(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.FrameworkCompiler:
        return answerFrameworkCompiler(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.FrameworkDi:
        return answerFrameworkDi(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.FrameworkEvaluator:
        return answerFrameworkEvaluator(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.FrameworkMaterialization:
        return answerFrameworkMaterialization(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.FrameworkLifecycle:
        return answerFrameworkLifecycle(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.FrameworkObservation:
        return answerFrameworkObservation(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      case LensId.FrameworkAdmission:
        return answerFrameworkAdmission(
          normalized.inquiry,
          this.substrates.sourceProject,
        );
      default:
        return answerUnimplementedLens(this.world, normalized.inquiry);
    }
  }

  /** Follow a returned continuation by asking its embedded inquiry. */
  async follow(continuation: Continuation): Promise<Answer> {
    return this.ask(continuation.inquiry);
  }

  /** True when a lens id has a runtime implementation. */
  isImplemented(lens: LensId): boolean {
    return this.#implementedLensIds.has(lens);
  }

  /** Lens ids with runtime implementations in this engine. */
  implementedLensIds(): readonly LensId[] {
    return [...this.#implementedLensIds];
  }

  /** Normalize raw input into an inquiry plus any unknown lens marker. */
  private normalize(input: Inquiry | InquiryRuntimeRequest): {
    readonly inquiry: Inquiry;
    readonly unknownLens?: string;
  } {
    const inputLens = String(input.lens);
    const requestedLens = this.parseLensId(inputLens);
    const unknownLens = requestedLens === undefined ? inputLens : undefined;
    const subject =
      unknownLens === undefined
        ? normalizeSubject(input.subject)
        : { requestedLens: unknownLens };

    return {
      inquiry: {
        lens: requestedLens ?? LensId.RepoMap,
        locus: normalizeLocus(input.locus),
        ...(subject === undefined ? {} : { subject }),
        ...(input.projection === undefined
          ? {}
          : { projection: input.projection }),
        ...(input.filters === undefined ? {} : { filters: input.filters }),
        ...(input.budget === undefined
          ? {}
          : { budget: normalizeBudget(input.budget) }),
        ...(input.page === undefined
          ? {}
          : { page: normalizePage(input.page) }),
      },
      ...(unknownLens === undefined ? {} : { unknownLens }),
    };
  }

  /** Parse one lens id against the static world. */
  private parseLensId(lens: string): LensId | undefined {
    return this.world.lenses.some((entry) => entry.id === lens)
      ? (lens as LensId)
      : undefined;
  }

  /** Find one lens spec by id. */
  private findLens(lens: LensId): LensSpec | undefined {
    return this.world.lenses.find((entry) => entry.id === lens);
  }

  /** Validate lens/locus/projection/substrate coherence before running a lens. */
  private validate(inquiry: Inquiry, spec: LensSpec): Answer | undefined {
    if (!spec.supportedLoci.includes(inquiry.locus.kind)) {
      return createAnswer(
        inquiry,
        OutcomeKind.Reroute,
        `Lens ${spec.id} does not support locus ${inquiry.locus.kind}.`,
        {
          basis: [
            contractBasis(
              "Rejected by lens/locus validation before execution.",
            ),
          ],
          openSeams: [
            {
              kind: OpenSeamKind.UnsupportedLocus,
              summary: `Supported loci: ${spec.supportedLoci.join(", ")}`,
            },
          ],
          continuations: [
            surfaceMapContinuation(
              "Inspect lens contracts before choosing a different locus.",
            ),
          ],
        },
      );
    }

    if (
      inquiry.projection !== undefined &&
      !spec.projections.some(
        (projection) => projection.id === inquiry.projection,
      )
    ) {
      return createAnswer(
        inquiry,
        OutcomeKind.Reroute,
        `Lens ${spec.id} does not support projection ${inquiry.projection}.`,
        {
          basis: [
            contractBasis(
              "Rejected by projection validation before execution.",
            ),
          ],
          openSeams: [
            {
              kind: OpenSeamKind.UnsupportedProjection,
              summary: `Supported projections: ${spec.projections
                .map((projection) => projection.id)
                .join(", ")}`,
            },
          ],
          continuations: [
            surfaceMapContinuation(
              "Inspect lens projection contracts before choosing a different projection.",
            ),
          ],
        },
      );
    }

    for (const substrateId of spec.requiredSubstrates) {
      if (
        !this.world.substrates.some((substrate) => substrate.id === substrateId)
      ) {
        return createAnswer(
          inquiry,
          OutcomeKind.Open,
          `Lens ${spec.id} requires missing substrate ${substrateId}.`,
          {
            basis: [
              contractBasis(
                "Rejected by substrate validation before execution.",
              ),
            ],
            openSeams: [
              {
                kind: OpenSeamKind.MissingSubstrate,
                summary: `Required substrate ${substrateId} is not present in the inquiry world.`,
              },
            ],
            continuations: [
              surfaceMapContinuation(
                "Inspect substrate contracts before running this lens.",
              ),
            ],
          },
        );
      }
    }

    if (spec.stage === LensStage.Deprecated) {
      return createAnswer(
        inquiry,
        OutcomeKind.Unsupported,
        `Lens ${spec.id} is deprecated.`,
        {
          basis: [
            contractBasis(
              "Rejected by lens stage validation before execution.",
            ),
          ],
          continuations: [
            surfaceMapContinuation(
              "Inspect active lens contracts before asking another question.",
            ),
          ],
        },
      );
    }

    return undefined;
  }

  /** Build an unsupported answer for an unknown lens id. */
  private unknownLensAnswer(inquiry: Inquiry, unknownLens: string): Answer {
    return createAnswer(
      inquiry,
      OutcomeKind.Unsupported,
      `Unknown inquiry lens '${unknownLens}'.`,
      {
        basis: [
          contractBasis(
            "The requested lens is not part of the Atlas lens catalog.",
          ),
        ],
        openSeams: [
          {
            kind: OpenSeamKind.MissingLens,
            summary: `No lens contract is registered for '${unknownLens}'.`,
          },
        ],
        continuations: [
          surfaceMapContinuation(
            "Inspect the lens catalog before asking another question.",
          ),
        ],
      },
    );
  }
}

/** Normalize unknown transport locus into a contract locus. */
export function normalizeLocus(value: unknown): Locus {
  if (isLocus(value)) {
    return value;
  }
  return RepoRootLocus;
}

/** True when a value has a recognized locus discriminator. */
export function isLocus(value: unknown): value is Locus {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const kind = (value as { readonly kind?: unknown }).kind;
  switch (kind) {
    case LocusKind.Repo:
    case LocusKind.RepoArea:
    case LocusKind.Package:
    case LocusKind.SourceFile:
    case LocusKind.SourceRange:
    case LocusKind.Symbol:
    case LocusKind.Handle:
    case LocusKind.GitTree:
      return true;
    default:
      return false;
  }
}

/** Normalize a transport subject into a value the inquiry envelope can carry. */
function normalizeSubject(value: unknown): InquirySubject | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object") {
    return value as InquirySubject;
  }
  return { value };
}

/** Normalize unknown transport budget into numeric budget lanes. */
function normalizeBudget(value: unknown): Budget | undefined {
  if (value === undefined || value === null || typeof value !== "object") {
    return undefined;
  }
  const source = value as Record<string, unknown>;
  return {
    ...numericBudgetLane(source, "rows"),
    ...numericBudgetLane(source, "groups"),
    ...numericBudgetLane(source, "facts"),
    ...numericBudgetLane(source, "routes"),
    ...numericBudgetLane(source, "evidencePerSubject"),
    ...numericBudgetLane(source, "depth"),
    ...numericBudgetLane(source, "textChars"),
  };
}

/** Normalize unknown transport page input into a page request. */
function normalizePage(
  value: unknown,
): { readonly size?: number; readonly cursor?: string } | undefined {
  if (value === undefined || value === null || typeof value !== "object") {
    return undefined;
  }
  const source = value as Record<string, unknown>;
  const size = source.size;
  const cursor = source.cursor;
  return {
    ...(typeof size === "number" && Number.isFinite(size) ? { size } : {}),
    ...(typeof cursor === "string" ? { cursor } : {}),
  };
}

/** Read one numeric budget lane from a transport object. */
function numericBudgetLane<TKey extends keyof Budget>(
  source: Record<string, unknown>,
  key: TKey,
): Pick<Budget, TKey> | object {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value)
    ? ({ [key]: value } as Pick<Budget, TKey>)
    : {};
}

/** Shared exact Atlas contract basis for engine-level validation answers. */
function contractBasis(summary: string) {
  return {
    kind: BasisKind.AtlasContract,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Contract,
    freshness: BasisFreshness.Static,
    summary,
    identity: "@aurelia-ls/atlas",
  };
}

/** Continuation back to the surface map. */
function surfaceMapContinuation(rationale: string): Continuation {
  return {
    kind: ContinuationKind.SwitchLens,
    priority: ContinuationPriority.Primary,
    rationale,
    inquiry: {
      lens: LensId.RepoMap,
      locus: RepoRootLocus,
      projection: "summary",
    },
  };
}
