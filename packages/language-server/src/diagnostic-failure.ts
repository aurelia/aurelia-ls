import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { LSPErrorCodes, ResponseError } from "vscode-languageserver/node";
import {
  diagnosticSystemCode, maximumDiagnosticFailureFrames,
  type AureliaDiagnosticStage, type AureliaSupportDiagnosticFailure,
} from "./diagnostic-failure-protocol.js";

export type DiagnosticFailureFacts = Omit<AureliaSupportDiagnosticFailure, "sequence" | "documentId">;

const maximumCauses = 4;
const maximumStackCharacters = 4096;
// In the installed extension esbuild emits the server as one CommonJS file. Individual ESM modules in a
// development checkout do not have portable bundle coordinates.
const installedBundleFile = typeof __filename === "string" && /[/\\]dist[/\\]server[/\\]main\.cjs$/u.test(__filename)
  ? __filename : null;

let bundleSha256: string | null | undefined;

/** Fingerprint the loaded server on its first unexpected diagnostic fault. */
function installedDiagnosticBundleSha256(): string | null {
  if (installedBundleFile === null) return null;
  if (bundleSha256 !== undefined) return bundleSha256;
  try {
    bundleSha256 = createHash("sha256").update(readFileSync(installedBundleFile)).digest("hex");
  } catch {
    bundleSha256 = null;
  }
  return bundleSha256;
}

function errorType(error: unknown): DiagnosticFailureFacts["errorType"] {
  if (error instanceof ResponseError) return "ResponseError";
  if (error instanceof TypeError) return "TypeError";
  if (error instanceof RangeError) return "RangeError";
  if (error instanceof ReferenceError) return "ReferenceError";
  if (error instanceof SyntaxError) return "SyntaxError";
  return error instanceof Error ? "Error" : "non-error";
}

/** Only publish coordinates when a call site names the loaded bundle itself. */
export function diagnosticBundleFrames(stack: string, bundleFile: string | null): { line: number; column: number }[] {
  if (bundleFile === null) return [];
  const frames: { line: number; column: number }[] = [];
  const file = bundleFile.replaceAll("\\", "/");
  for (const rawLine of stack.split("\n").slice(1)) {
    const line = rawLine.trim().replaceAll("\\", "/");
    if (!line.startsWith("at ")) continue;
    const match = /:(\d+):(\d+)\)?$/u.exec(line);
    if (match === null) continue;
    const location = line.slice(0, match.index);
    if (location !== `at ${file}` && !location.endsWith(`(${file}`)) continue;
    const row = Number(match[1]);
    const column = Number(match[2]);
    if (Number.isSafeInteger(row) && row > 0 && Number.isSafeInteger(column) && column > 0) {
      frames.push({ line: row, column });
      if (frames.length === maximumDiagnosticFailureFrames) break;
    }
  }
  return frames;
}

function localErrorDetail(cause: unknown): string {
  if (!(cause instanceof Error)) {
    if (cause !== null && typeof cause === "object") {
      return "message" in cause && typeof cause.message === "string"
        ? cause.message.slice(0, maximumStackCharacters) : "Thrown object";
    }
    return String(cause).slice(0, maximumStackCharacters);
  }
  if (typeof cause.stack !== "string") return String(cause.message).slice(0, maximumStackCharacters);
  if (cause.stack.length <= maximumStackCharacters) return cause.stack;
  // Keep call sites even when a diagnostic embeds a long generated expression in its error message.
  const firstFrame = cause.stack.indexOf("\n    at ", cause.message.length);
  if (firstFrame < 0 || firstFrame < 1024) return cause.stack.slice(0, maximumStackCharacters);
  return cause.stack.slice(0, 1023) + "…" + cause.stack.slice(firstFrame, firstFrame + maximumStackCharacters - 1024);
}

export function diagnosticRequestFailure(error: unknown, stage: AureliaDiagnosticStage): {
  facts: DiagnosticFailureFacts;
  response: ResponseError<unknown>;
  localDetail: string;
} {
  const response = error instanceof ResponseError ? error : null;
  const code = response?.code ?? LSPErrorCodes.RequestFailed;
  const chain: unknown[] = [error];
  while (chain.length < maximumCauses) {
    const last = chain[chain.length - 1];
    if (!(last instanceof Error) || last.cause === undefined || chain.includes(last.cause)) break;
    chain.push(last.cause);
  }
  const details = chain.map(localErrorDetail);
  const frames = details.slice().reverse().flatMap((detail) => diagnosticBundleFrames(detail, installedBundleFile))
    .slice(0, maximumDiagnosticFailureFrames);
  const systemCode = chain.slice().reverse().map((cause) =>
    cause instanceof Error && "code" in cause ? diagnosticSystemCode(cause.code) : null).find((item) => item !== null) ?? null;
  const data: Omit<DiagnosticFailureFacts, "code" | "occurredAt"> = {
    incidentId: randomUUID(), stage, failureKind: response === null ? "exception" : "response-error",
    errorType: errorType(chain[chain.length - 1]), systemCode, frames, serverBundleSha256: installedDiagnosticBundleSha256(),
  };
  const facts: DiagnosticFailureFacts = {
    ...data, code, occurredAt: new Date().toISOString(),
  };
  const message = response?.message ?? `Aurelia diagnostics failed (incident ${data.incidentId}). See the Aurelia language server output for details.`;
  const originalData: unknown = response?.data;
  // Keep any existing protocol payload (including scalar/null data). Add the correlation only where compatible.
  const canExtendData = originalData !== null && typeof originalData === "object"
    && (Object.getPrototypeOf(originalData) === Object.prototype || Object.getPrototypeOf(originalData) === null)
    && !("aureliaDiagnosticFailure" in originalData);
  return {
    facts,
    response: response !== null && originalData !== undefined && !canExtendData
      ? response
      : new ResponseError(code, message, { ...(canExtendData ? originalData : {}), aureliaDiagnosticFailure: data }),
    localDetail: details.join("\nCaused by: "),
  };
}
