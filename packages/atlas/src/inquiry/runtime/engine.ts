import path from "node:path";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import {
  atlasContractBasis as contractBasis,
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
} from "../basis.js";
import {
  ContinuationKind,
  type Continuation,
} from "../continuation.js";
import { OpenSeamKind } from "../evidence.js";
import { mergeBudget, type Budget } from "../budget.js";
import type { Inquiry, InquirySubject } from "../inquiry.js";
import { LensId, LensRegistry, LensStage, type LensSpec } from "../lens.js";
import { LocusKind, RepoRootLocus, type Locus } from "../locus.js";
import { normalizeFileKey, type SourceProject } from "../../source/index.js";
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
import { answerFrameworkApi } from "./framework-api-lenses.js";
import { answerFrameworkEvaluator } from "./framework-evaluator-lenses.js";
import { answerFrameworkDi } from "./framework-di-lenses.js";
import { answerFrameworkMaterialization } from "./framework-materialization-lenses.js";
import { answerFrameworkAdmission } from "./framework-admission-lenses.js";
import { answerFrameworkCompiler } from "./framework-compiler-lenses.js";
import { answerFrameworkComposition } from "./framework-composition-lenses.js";
import { answerFrameworkCapabilities } from "./framework-capability-lenses.js";
import { answerFrameworkObservation } from "./framework-observation-lenses.js";
import { answerFrameworkResources } from "./framework-resource-lenses.js";
import { answerFrameworkErrors } from "./framework-error-lenses.js";
import { answerProductVocabulary } from "./product-vocabulary-lenses.js";
import { answerProductArchitecture } from "./product-architecture-lenses.js";
import { answerWorkspaceArchitecture } from "./workspace-architecture-lenses.js";
import { answerPluginArchitecture } from "./plugin-architecture-lenses.js";
import { answerFrameworkRouter } from "./framework-router-lenses.js";
import { answerFrameworkCorpus } from "./framework-corpus-lenses.js";
import { answerAtlasMemory } from "./atlas-memory-lenses.js";
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
  /** Omission selects the repository root. An invalid explicit locus yields a reroute. */
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
  readonly #registry = new LensRegistry();

  constructor(
    /** Contract world queried by the engine. */
    readonly world: InquiryWorld,
    /** Hot source and analysis substrates shared across lenses. */
    readonly substrates: InquiryRuntimeSubstrates,
  ) {
    const runtimeLensAnswerers: Partial<Record<LensId, (inquiry: Inquiry, project: SourceProject) => Answer>> = {
      [LensId.RepoMap]: inquiry => answerRepoMap(world, inquiry),
      [LensId.RepoTerrain]: inquiry => answerRepoTerrain(world, inquiry),
      [LensId.AtlasSelf]: (inquiry, project) => answerSelf(world, inquiry, new Set(this.implementedLensIds()), project),
      [LensId.AtlasMemory]: answerAtlasMemory,
      [LensId.TsSource]: answerTsSource,
      [LensId.TsStructure]: answerTsStructure,
      [LensId.TsType]: answerTsType,
      [LensId.ProductVocabulary]: answerProductVocabulary,
      [LensId.ProductArchitecture]: answerProductArchitecture,
      [LensId.WorkspaceArchitecture]: answerWorkspaceArchitecture,
      [LensId.PluginArchitecture]: answerPluginArchitecture,
      [LensId.BridgeAuLink]: answerBridgeAuLink,
      [LensId.FrameworkDiscovery]: answerFrameworkDiscovery,
      [LensId.FrameworkApi]: answerFrameworkApi,
      [LensId.FrameworkRendering]: answerFrameworkRendering,
      [LensId.FrameworkResources]: answerFrameworkResources,
      [LensId.FrameworkCompiler]: answerFrameworkCompiler,
      [LensId.FrameworkDi]: answerFrameworkDi,
      [LensId.FrameworkEvaluator]: answerFrameworkEvaluator,
      [LensId.FrameworkMaterialization]: answerFrameworkMaterialization,
      [LensId.FrameworkLifecycle]: answerFrameworkLifecycle,
      [LensId.FrameworkObservation]: answerFrameworkObservation,
      [LensId.FrameworkRouter]: answerFrameworkRouter,
      [LensId.FrameworkErrors]: answerFrameworkErrors,
      [LensId.FrameworkAdmission]: answerFrameworkAdmission,
      [LensId.FrameworkComposition]: answerFrameworkComposition,
      [LensId.FrameworkCapabilities]: answerFrameworkCapabilities,
      [LensId.FrameworkCorpus]: answerFrameworkCorpus,
    };
    for (const spec of world.lenses) {
      const answer = runtimeLensAnswerers[spec.id];
      if (answer !== undefined) {
        this.#registry.register({ spec, answer: inquiry => answer(inquiry, substrates.sourceProject) });
      }
    }
  }

  /** Ask one inquiry or transport-shaped request. */
  async ask(input: Inquiry | InquiryRuntimeRequest): Promise<Answer> {
    const spec = this.world.lenses.find(lens => lens.id === input.lens);
    const inquiry = this.normalize(input, spec);
    if (spec === undefined) {
      return this.unknownLensAnswer(inquiry, String(input.lens));
    }
    if (input.locus !== undefined && !isLocus(input.locus)) {
      return invalidSelection(inquiry, "The supplied locus is incomplete or has an unrecognized kind.");
    }
    const validation = this.validate(inquiry, spec);
    if (validation !== undefined) {
      return validation;
    }
    const selected = this.resolveScope(inquiry, spec);
    if ("outcome" in selected) return selected;
    const implementation = this.#registry.find(spec.id);
    return implementation === undefined
      ? answerUnimplementedLens(this.world, selected)
      : implementation.answer(selected);
  }

  /** Follow a returned continuation by asking its embedded inquiry. */
  async follow(continuation: Continuation): Promise<Answer> {
    return this.ask(continuation.inquiry);
  }

  /** True when a lens id has a runtime implementation. */
  isImplemented(lens: LensId): boolean {
    return this.#registry.find(lens) !== undefined;
  }

  /** Lens ids with runtime implementations in this engine. */
  implementedLensIds(): readonly LensId[] {
    return this.#registry.implementedSpecs.map(spec => spec.id);
  }

  /** Normalize a request using the defaults advertised by the selected lens and projection. */
  private normalize(input: InquiryRuntimeRequest, spec: LensSpec | undefined): Inquiry {
    const projection = spec?.projections.find(entry => entry.id === input.projection);
    return {
      lens: spec?.id ?? LensId.RepoMap,
      locus: normalizeLocus(input.locus),
      subject: spec === undefined ? { requestedLens: String(input.lens) } : normalizeSubject(input.subject),
      projection: input.projection,
      filters: input.filters,
      budget: mergeBudget(mergeBudget(spec?.defaultBudget, projection?.defaultBudget), normalizeBudget(input.budget)),
      page: normalizePage(input.page),
    };
  }

  private resolveScope(inquiry: Inquiry, spec: LensSpec): Inquiry | Answer {
    const locus = inquiry.locus;
    const project = this.substrates.sourceProject;
    if (locus.kind === LocusKind.Repo && locus.root !== undefined &&
        normalizeFileKey(path.resolve(project.repoRoot, locus.root)) !== normalizeFileKey(project.repoRoot)) {
      return invalidSelection(inquiry, "The requested repository root differs from the active source project.");
    }
    if (locus.kind !== LocusKind.Package) return inquiry;
    const rootKey = locus.relativePath === undefined
      ? undefined : normalizeFileKey(path.resolve(project.repoRoot, locus.relativePath));
    const packages = project.summary().packages.filter(pkg =>
      (locus.packageId === undefined || pkg.id === locus.packageId) &&
      (locus.packageName === undefined || pkg.packageName === locus.packageName) &&
      (rootKey === undefined || normalizeFileKey(path.resolve(project.repoRoot, pkg.rootPath)) === rootKey),
    );
    if (packages.length !== 1) {
      const summary = packages.length === 0
        ? "No admitted package matches all supplied package selectors."
        : "Multiple admitted packages match this selector. Supply the package ID or root path.";
      return createAnswer(inquiry, packages.length === 0 ? OutcomeKind.NoClaim : OutcomeKind.Ambiguous, summary, {
        basis: [{ kind: BasisKind.TypeScriptProgram, closure: BasisClosure.Exact, authority: BasisAuthority.Checker,
          freshness: BasisFreshness.Live, summary: "Compared selectors with the active source project's admitted packages." }],
        openSeams: [{ kind: OpenSeamKind.InsufficientBasis, summary }],
        continuations: [{
          kind: ContinuationKind.SwitchLens,
          rationale: "Inspect the admitted package roots and IDs.",
          inquiry: { lens: LensId.WorkspaceArchitecture, locus: RepoRootLocus, projection: "packages" },
        }],
      });
    }
    const { id: packageId, packageName, rootPath } = packages[0]!;
    const acceptsPackageFilter = spec.parameters?.some(parameter => parameter.id === "packageId");
    if (acceptsPackageFilter && inquiry.filters?.packageId !== undefined && inquiry.filters.packageId !== packageId) {
      return invalidSelection(inquiry, "The package locus and packageId filter select different packages.");
    }
    return {
      ...inquiry,
      locus: { kind: LocusKind.Package, packageId, packageName, relativePath: rootPath },
      filters: acceptsPackageFilter ? { ...inquiry.filters, packageId } : inquiry.filters,
    };
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

/** Validate the address before a lens dereferences it or starts a source scan. */
export function isLocus(value: unknown): value is Locus {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const fields = value as Record<string, unknown>;
  switch (fields.kind) {
    case LocusKind.Repo:
      return fields.root === undefined || nonEmptyString(fields.root);
    case LocusKind.RepoArea:
      return nonEmptyString(fields.areaId);
    case LocusKind.Package:
      return [fields.packageId, fields.packageName, fields.relativePath].some(nonEmptyString) &&
        [fields.packageId, fields.packageName, fields.relativePath].every(v => v === undefined || nonEmptyString(v));
    case LocusKind.SourceFile:
      return nonEmptyString(fields.filePath);
    case LocusKind.SourceRange:
      return isSourceRange(fields.range);
    case LocusKind.Symbol:
      return nonEmptyString(fields.name) && (fields.filePath === undefined || nonEmptyString(fields.filePath)) &&
        (fields.packageName === undefined || nonEmptyString(fields.packageName));
    case LocusKind.Handle:
      return typeof fields.handle === "object" && fields.handle !== null &&
        ["namespace", "kind", "id"].every(key => nonEmptyString((fields.handle as Record<string, unknown>)[key]));
    case LocusKind.GitTree:
      return nonEmptyString(fields.treeish) && (fields.inner === undefined || isLocus(fields.inner));
    default:
      return false;
  }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSourceRange(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const { filePath, start, end } = value as Record<string, unknown>;
  function isPosition(position: unknown): position is { line: number; character: number } {
    if (position === null || typeof position !== "object") return false;
    const { line, character } = position as Record<string, unknown>;
    return typeof line === "number" && Number.isSafeInteger(line) && line >= 0 &&
      typeof character === "number" && Number.isSafeInteger(character) && character >= 0;
  }
  return nonEmptyString(filePath) && isPosition(start) && isPosition(end) &&
    (start.line < end.line || (start.line === end.line && start.character <= end.character));
}

function invalidSelection(inquiry: Inquiry, summary: string): Answer {
  return createAnswer(inquiry, OutcomeKind.Reroute, summary, {
    basis: [contractBasis("Validated the requested address before dispatch.")],
    openSeams: [{ kind: OpenSeamKind.UnsupportedLocus, summary }],
    continuations: [surfaceMapContinuation("Inspect supported loci and select the intended owner.")],
  });
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
    ...numericBudgetLane(source, "members"),
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
    size: typeof size === "number" && Number.isFinite(size) ? size : undefined,
    cursor: typeof cursor === "string" ? cursor : undefined,
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

/** Continuation back to the surface map. */
function surfaceMapContinuation(rationale: string): Continuation {
  return {
    kind: ContinuationKind.SwitchLens,
    rationale,
    inquiry: {
      lens: LensId.RepoMap,
      locus: RepoRootLocus,
      projection: "summary",
    },
  };
}
