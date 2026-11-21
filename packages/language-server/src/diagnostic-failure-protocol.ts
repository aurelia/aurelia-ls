const stages = ["session", "document", "configuration", "ownership", "analysis", "mapping"] as const;
export type AureliaDiagnosticStage = typeof stages[number];

const errorTypes = ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "ResponseError", "non-error"] as const;
const systemCodes = [
  "EACCES", "EPERM", "ENOENT", "ENOTDIR", "EISDIR", "EBUSY", "EMFILE", "ENFILE", "EIO",
  "ENOMEM", "ENOSPC", "ERR_OUT_OF_MEMORY", "ERR_WORKER_OUT_OF_MEMORY", "MODULE_NOT_FOUND",
  "ERR_MODULE_NOT_FOUND", "ERR_PACKAGE_PATH_NOT_EXPORTED", "ERR_REQUIRE_ESM",
] as const;

interface AureliaDiagnosticFailureIdentity {
  readonly incidentId: string;
  readonly stage: AureliaDiagnosticStage;
  readonly failureKind: "exception" | "response-error";
}

interface AureliaDiagnosticFailureCause {
  /** The deepest retained cause, classified without exposing error.name or its message. */
  readonly errorType: typeof errorTypes[number];
  readonly systemCode: typeof systemCodes[number] | null;
  /** SHA-256 of the installed server bundle containing the frame coordinates. Older snapshots omit this field. */
  readonly serverBundleSha256?: string | null;
  /** Line and column in the installed dist/server/main.cjs, deepest cause first. */
  readonly frames: readonly { readonly line: number; readonly column: number }[];
}

/** Older servers sent the correlation identity alone. */
export type AureliaDiagnosticFailureData = AureliaDiagnosticFailureIdentity & Partial<AureliaDiagnosticFailureCause>;

export interface AureliaSupportDiagnosticFailure extends AureliaDiagnosticFailureIdentity, AureliaDiagnosticFailureCause {
  readonly sequence: number;
  readonly documentId: string | null;
  readonly occurredAt: string;
  readonly code: number;
}

export const maximumDiagnosticFailureFrames = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isMember<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function diagnosticSystemCode(value: unknown): AureliaSupportDiagnosticFailure["systemCode"] {
  return isMember(value, systemCodes) ? value : null;
}

function diagnosticFailureIdentity(value: unknown): AureliaDiagnosticFailureIdentity | null {
  if (!isRecord(value)
    || typeof value.incidentId !== "string" || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u.test(value.incidentId)
    || !isMember(value.stage, stages)
    || (value.failureKind !== "exception" && value.failureKind !== "response-error")) return null;
  return { incidentId: value.incidentId, stage: value.stage, failureKind: value.failureKind };
}

export function readAureliaDiagnosticFailureData(data: unknown): AureliaDiagnosticFailureData | null {
  if (!isRecord(data) || !isRecord(data.aureliaDiagnosticFailure)) return null;
  const failure = data.aureliaDiagnosticFailure;
  const identity = diagnosticFailureIdentity(failure);
  if (identity === null) return null;
  if (!("errorType" in failure || "systemCode" in failure || "frames" in failure || "serverBundleSha256" in failure)) return identity;
  const cause = diagnosticFailureCause(failure);
  return cause === null ? null : { ...identity, ...cause };
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function diagnosticFailureCause(value: Record<string, unknown>): AureliaDiagnosticFailureCause | null {
  const serverBundleSha256 = value.serverBundleSha256 ?? null;
  if (!isMember(value.errorType, errorTypes)
    || (value.systemCode !== null && !isMember(value.systemCode, systemCodes))
    || (serverBundleSha256 !== null && (typeof serverBundleSha256 !== "string" || !/^[a-f\d]{64}$/u.test(serverBundleSha256)))
    || !Array.isArray(value.frames) || value.frames.length > maximumDiagnosticFailureFrames) return null;
  const frames: { line: number; column: number }[] = [];
  for (const frame of value.frames) {
    if (!isRecord(frame) || !positiveInteger(frame.line) || !positiveInteger(frame.column)) return null;
    frames.push({ line: frame.line, column: frame.column });
  }
  return { errorType: value.errorType, systemCode: value.systemCode, serverBundleSha256, frames };
}

/** Project only the bounded public fields, including when a server override supplies the snapshot. */
export function readAureliaSupportDiagnosticFailure(value: unknown): AureliaSupportDiagnosticFailure | null {
  if (!isRecord(value)) return null;
  const identity = diagnosticFailureIdentity(value);
  const cause = diagnosticFailureCause(value);
  if (identity === null || cause === null || !positiveInteger(value.sequence)
    || (value.documentId !== null && (typeof value.documentId !== "string" || !/^document:[\da-f]{20}$/u.test(value.documentId)))
    || typeof value.occurredAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value.occurredAt)
    || typeof value.code !== "number" || !Number.isSafeInteger(value.code)) return null;
  return { ...identity, ...cause, sequence: value.sequence, documentId: value.documentId, occurredAt: value.occurredAt,
    code: value.code };
}
