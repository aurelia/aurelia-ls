import * as ts from "typescript";
import type { BoundaryOutcome } from "../../boundaries/boundary-router.js";
import { BoundaryRouteKind } from "../../model/boundary-routes/boundary-routes.js";
import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import {
  ClosureStatusKind,
  SemanticRuntimeSurfaceKind
} from "../../model/semantic-runtime-handles.js";
import type { QuestionRoute } from "../../query/framing/question-route.js";
import type { WorldFrame } from "../../query/framing/world-frame.js";
import type { RuntimeWorldContextHandoff } from "../../runtime/handoff/world-context-handoff.js";
import { TypeScriptProjectPort } from "../programs/typescript-project-port.js";

export const enum TypedOperationIntentKind {
  ContextualReadout = 1,
  MemberCompletion = 2,
  CrossBoundaryNavigation = 3,
  CrossBoundaryReferences = 4,
  DiagnosticClosure = 5
}

export const enum TypedEnrichmentOutcomeKind {
  TypedEvidence = 1,
  TypedQualified = 2,
  TypedUnavailable = 3,
  RoutedToOwner = 4
}

export const enum TypedUnavailabilityReasonKind {
  NoLiveProject = 1,
  CheckerUnavailable = 2,
  SourceFileMissing = 3,
  TargetNotResolved = 4,
  IntentNotSupported = 5,
  BoundaryOwnerUnavailable = 6
}

export class TypedTargetLocator {
  public constructor(
    public readonly fileName: string,
    public readonly position: number
  ) {}
}

export class TypedEnrichmentRequest {
  public constructor(
    public readonly questionRoute: QuestionRoute,
    public readonly worldFrame: WorldFrame,
    public readonly intent: TypedOperationIntentKind,
    public readonly target: TypedTargetLocator
  ) {}
}

export class TypedEvidenceBundle {
  public readonly surface = SemanticRuntimeSurfaceKind.TypedEnrichmentPort;

  public constructor(
    public readonly anchor: ClaimRouteRef,
    public readonly intent: TypedOperationIntentKind,
    public readonly fileName: string,
    public readonly textSpanStart: number,
    public readonly textSpanLength: number,
    public readonly worldVersion: number,
    public readonly projectGeneration: number,
    public readonly displayText: string,
    public readonly typeText: string,
    public readonly symbolName?: string,
    public readonly documentationText?: string
  ) {}
}

export class TypedEnrichmentOutcome {
  public constructor(
    public readonly kind: TypedEnrichmentOutcomeKind,
    public readonly anchor: ClaimRouteRef,
    public readonly worldVersion: number,
    public readonly closureStatus: ClosureStatusKind,
    public readonly projectGeneration?: number,
    public readonly evidence?: TypedEvidenceBundle,
    public readonly unavailabilityReason?: TypedUnavailabilityReasonKind,
    public readonly boundaryRoute?: BoundaryRouteKind,
    public readonly boundaryOutcome?: BoundaryOutcome,
    public readonly note?: string
  ) {}

  public static typedEvidence(
    evidence: TypedEvidenceBundle
  ): TypedEnrichmentOutcome {
    return new TypedEnrichmentOutcome(
      TypedEnrichmentOutcomeKind.TypedEvidence,
      evidence.anchor,
      evidence.worldVersion,
      ClosureStatusKind.Closed,
      evidence.projectGeneration,
      evidence
    );
  }

  public static typedQualified(
    evidence: TypedEvidenceBundle,
    note: string
  ): TypedEnrichmentOutcome {
    return new TypedEnrichmentOutcome(
      TypedEnrichmentOutcomeKind.TypedQualified,
      evidence.anchor,
      evidence.worldVersion,
      ClosureStatusKind.Qualified,
      evidence.projectGeneration,
      evidence,
      undefined,
      undefined,
      undefined,
      note
    );
  }

  public static typedUnavailable(
    anchor: ClaimRouteRef,
    worldVersion: number,
    reason: TypedUnavailabilityReasonKind,
    projectGeneration?: number,
    note?: string,
    boundaryOutcome?: BoundaryOutcome
  ): TypedEnrichmentOutcome {
    return new TypedEnrichmentOutcome(
      TypedEnrichmentOutcomeKind.TypedUnavailable,
      anchor,
      worldVersion,
      boundaryOutcome?.closureStatus ?? ClosureStatusKind.Open,
      projectGeneration,
      undefined,
      reason,
      boundaryOutcome?.route,
      boundaryOutcome,
      note
    );
  }

  public static routedToOwner(
    anchor: ClaimRouteRef,
    worldVersion: number,
    boundaryRoute: BoundaryRouteKind,
    projectGeneration?: number,
    note?: string
  ): TypedEnrichmentOutcome {
    return new TypedEnrichmentOutcome(
      TypedEnrichmentOutcomeKind.RoutedToOwner,
      anchor,
      worldVersion,
      ClosureStatusKind.Qualified,
      projectGeneration,
      undefined,
      undefined,
      boundaryRoute,
      undefined,
      note
    );
  }

  public withBoundaryOutcome(boundaryOutcome: BoundaryOutcome): TypedEnrichmentOutcome {
    return new TypedEnrichmentOutcome(
      this.kind,
      this.anchor,
      this.worldVersion,
      boundaryOutcome.closureStatus,
      this.projectGeneration,
      this.evidence,
      this.unavailabilityReason,
      boundaryOutcome.route,
      boundaryOutcome,
      this.note
    );
  }
}

export class TypedEnrichmentPort {
  readonly #projectPort: TypeScriptProjectPort;

  public constructor(projectPort: TypeScriptProjectPort = EMPTY_TYPESCRIPT_PROJECT_PORT) {
    this.#projectPort = projectPort;
  }

  public enrich(
    request: TypedEnrichmentRequest,
    worldContext: RuntimeWorldContextHandoff
  ): TypedEnrichmentOutcome {
    if (request.intent === TypedOperationIntentKind.MemberCompletion) {
      return TypedEnrichmentOutcome.routedToOwner(
        request.questionRoute.claimRoute,
        worldContext.worldFrameHandle.version,
        BoundaryRouteKind.CandidateDiscovery,
        undefined,
        "Member completion still hands off to candidate discovery."
      );
    }

    if (request.intent !== TypedOperationIntentKind.ContextualReadout) {
      return TypedEnrichmentOutcome.typedUnavailable(
        request.questionRoute.claimRoute,
        worldContext.worldFrameHandle.version,
        TypedUnavailabilityReasonKind.IntentNotSupported,
        undefined,
        "Only contextual readout is locally closed in the first typed slice."
      );
    }

    const project = this.#projectPort.publishCurrentGeneration();
    if (project === undefined) {
      return TypedEnrichmentOutcome.typedUnavailable(
        request.questionRoute.claimRoute,
        worldContext.worldFrameHandle.version,
        TypedUnavailabilityReasonKind.NoLiveProject,
        undefined,
        "No live TypeScript project is available for the current generation."
      );
    }

    const sourceFile = project.program.getSourceFile(request.target.fileName);
    if (sourceFile === undefined) {
      return TypedEnrichmentOutcome.typedUnavailable(
        request.questionRoute.claimRoute,
        worldContext.worldFrameHandle.version,
        TypedUnavailabilityReasonKind.SourceFileMissing,
        project.generation,
        "The requested typed target file is not part of the live project generation."
      );
    }

    const token = findInnermostNode(sourceFile, request.target.position);
    if (token === undefined) {
      return TypedEnrichmentOutcome.typedUnavailable(
        request.questionRoute.claimRoute,
        worldContext.worldFrameHandle.version,
        TypedUnavailabilityReasonKind.TargetNotResolved,
        project.generation,
        "The requested typed target could not be resolved in the live source file."
      );
    }

    const checker = project.checker;
    const type = checker.getTypeAtLocation(token);
    const quickInfo = project.languageService.getQuickInfoAtPosition(
      request.target.fileName,
      request.target.position
    );

    if (type === undefined) {
      return TypedEnrichmentOutcome.typedUnavailable(
        request.questionRoute.claimRoute,
        worldContext.worldFrameHandle.version,
        TypedUnavailabilityReasonKind.CheckerUnavailable,
        project.generation,
        "The live checker could not resolve typed evidence for the requested target."
      );
    }

    const symbol = resolveSymbol(token, checker);
    const displayText = quickInfo === undefined
      ? createDisplayText(symbol, type, checker)
      : ts.displayPartsToString(quickInfo.displayParts);
    const documentationText = quickInfo === undefined
      ? undefined
      : ts.displayPartsToString(quickInfo.documentation);
    const evidence = new TypedEvidenceBundle(
      request.questionRoute.claimRoute,
      request.intent,
      request.target.fileName,
      quickInfo?.textSpan.start ?? token.getStart(sourceFile),
      quickInfo?.textSpan.length ?? token.getWidth(sourceFile),
      worldContext.worldFrameHandle.version,
      project.generation,
      displayText,
      checker.typeToString(type),
      symbol === undefined ? undefined : checker.symbolToString(symbol),
      documentationText === "" ? undefined : documentationText
    );

    return TypedEnrichmentOutcome.typedEvidence(evidence);
  }
}

const EMPTY_TYPESCRIPT_PROJECT_PORT = new TypeScriptProjectPort();

function createDisplayText(
  symbol: ts.Symbol | undefined,
  type: ts.Type,
  checker: ts.TypeChecker
): string {
  const typeText = checker.typeToString(type);
  if (symbol === undefined) {
    return typeText;
  }

  return `${checker.symbolToString(symbol)}: ${typeText}`;
}

function findInnermostNode(
  node: ts.Node,
  position: number
): ts.Node | undefined {
  if (position < node.getFullStart() || position >= node.getEnd()) {
    return undefined;
  }

  return ts.forEachChild(
    node,
    (child) => findInnermostNode(child, position)
  ) ?? node;
}

function resolveSymbol(
  node: ts.Node,
  checker: ts.TypeChecker
): ts.Symbol | undefined {
  let current: ts.Node | undefined = node;

  while (current !== undefined) {
    const symbol = checker.getSymbolAtLocation(current);
    if (symbol !== undefined) {
      return symbol;
    }

    current = current.parent;
  }

  return undefined;
}
