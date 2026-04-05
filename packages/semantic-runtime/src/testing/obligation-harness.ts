import { deepStrictEqual } from "node:assert/strict";
import type {
  ClosureStatusKind,
  ReentryAreaKind,
  SemanticRuntimeSurfaceKind,
  SemanticRuntimeVerificationPocketKind,
  VerificationBasisKind,
  VerificationProofClassKind
} from "../model/semantic-runtime-handles.js";
import type {
  SemanticRuntimeTraceCaptureRequest,
  SemanticRuntimeTraceEvent
} from "../runtime/introspection/runtime-introspection.js";

export interface SemanticRuntimeTraceCapture {
  readonly request: SemanticRuntimeTraceCaptureRequest;
  readonly events: readonly SemanticRuntimeTraceEvent[];
}

export interface SemanticRuntimeProofRecord<TExpected, TActual = TExpected> {
  readonly pocket: SemanticRuntimeVerificationPocketKind;
  readonly proofClass: VerificationProofClassKind;
  readonly verificationBasis: VerificationBasisKind;
  readonly surfaceRefs: readonly SemanticRuntimeSurfaceKind[];
  readonly semanticTerritoryRefs: readonly [];
  readonly closureStatusPressure: ClosureStatusKind;
  readonly likelyReentryArea: ReentryAreaKind;
  readonly expected: TExpected;
  readonly actual: TActual;
  readonly traceCapture: SemanticRuntimeTraceCapture;
}

export class SemanticRuntimeProofError<
  TExpected,
  TActual = TExpected
> extends Error {
  public readonly proofRecord: SemanticRuntimeProofRecord<TExpected, TActual>;

  public constructor(proofRecord: SemanticRuntimeProofRecord<TExpected, TActual>) {
    super("Semantic runtime proof failed.");
    this.name = "SemanticRuntimeProofError";
    this.proofRecord = proofRecord;
  }
}

export function createProofRecord<TExpected, TActual = TExpected>(
  proofRecord: Omit<SemanticRuntimeProofRecord<TExpected, TActual>, "semanticTerritoryRefs"> & {
    readonly semanticTerritoryRefs?: readonly [];
  }
): SemanticRuntimeProofRecord<TExpected, TActual> {
  return Object.freeze({
    ...proofRecord,
    semanticTerritoryRefs: proofRecord.semanticTerritoryRefs ?? []
  });
}

export function assertProofRecord<TExpected, TActual = TExpected>(
  proofRecord: SemanticRuntimeProofRecord<TExpected, TActual>
): SemanticRuntimeProofRecord<TExpected, TActual> {
  try {
    deepStrictEqual(proofRecord.actual, proofRecord.expected);
    return proofRecord;
  } catch {
    throw new SemanticRuntimeProofError(proofRecord);
  }
}
