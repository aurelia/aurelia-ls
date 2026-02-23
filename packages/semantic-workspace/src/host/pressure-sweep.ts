import fs from "node:fs";
import path from "node:path";
import { asDocumentUri, type DocumentUri } from "@aurelia-ls/compiler";
import type {
  PressureObservationAnchor,
  PressureObservationInputSummary,
  PressureScenarioCommandName,
  PressureSurfaceId,
  PressureSweepConfig,
  PressureSweepObservation,
  PressureSweepResult,
  PressureSurfaceSummary,
  SemanticAuthorityCommandInvocation,
  SemanticAuthorityCommandStatus,
  SemanticAuthorityEnvelope,
} from "./types.js";
import type { SourcePosition } from "../types.js";

export interface PressureSweepExecutionOptions {
  readonly runId?: string | null;
  readonly record?: boolean;
}

export type PressureSweepExecutor = (
  invocation: SemanticAuthorityCommandInvocation,
  options?: PressureSweepExecutionOptions,
) => Promise<SemanticAuthorityEnvelope<unknown>>;

export interface PressureSweepInput {
  readonly sessionId: string;
  readonly runId: string;
  readonly workspaceRoot: string;
  readonly sweep: PressureSweepConfig;
  readonly stopOnFailure: boolean;
  readonly execute: PressureSweepExecutor;
  readonly onProgress?: PressureSweepProgressReporter;
}

export interface PressureSweepOutput {
  readonly result: PressureSweepResult;
  readonly stoppedEarly: boolean;
}

export type PressureSweepProgressEvent =
  | {
    readonly kind: "start";
    readonly runId: string;
    readonly corpusId: string;
    readonly workspaceRoot: string;
    readonly totalFiles: number;
  }
  | {
    readonly kind: "file-start";
    readonly runId: string;
    readonly corpusId: string;
    readonly fileIndex: number;
    readonly totalFiles: number;
    readonly filePath: string;
  }
  | {
    readonly kind: "file-complete";
    readonly runId: string;
    readonly corpusId: string;
    readonly fileIndex: number;
    readonly totalFiles: number;
    readonly filePath: string;
    readonly accumulatedObservations: number;
    readonly accumulatedAnomalies: number;
  }
  | {
    readonly kind: "done";
    readonly runId: string;
    readonly corpusId: string;
    readonly totalFiles: number;
    readonly observationCount: number;
    readonly anomalyCount: number;
    readonly stoppedEarly: boolean;
  };

export type PressureSweepProgressReporter = (event: PressureSweepProgressEvent) => void;

interface SurfaceCounters {
  observations: number;
  ok: number;
  degraded: number;
  error: number;
  anomalies: number;
}

interface InvocationPlan {
  readonly surface: PressureSurfaceId;
  readonly command: PressureScenarioCommandName;
  readonly args: unknown;
  readonly anchor: PressureObservationAnchor;
  readonly input: PressureObservationInputSummary;
}

const DEFAULT_SURFACES: readonly PressureSurfaceId[] = [
  "diagnostics",
  "completions",
  "hover",
  "navigation",
  "rename",
  "semanticTokens",
];

const DEFAULT_EXTENSIONS = [".html"] as const;
const DEFAULT_MAX_FILES = 200;
const DEFAULT_EVERY_N = 8;
const DEFAULT_MAX_POSITIONS_PER_FILE = 24;
const DEFAULT_RENAME_MAX_POSITIONS = 6;
const DEFAULT_MAX_OBSERVATIONS = 500;

const IGNORED_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "dist",
  "out",
  "coverage",
  ".turbo",
  ".cache",
  ".pnpm-store",
]);

export async function runPressureSweep(input: PressureSweepInput): Promise<PressureSweepOutput> {
  const surfaces = normalizeSurfaces(input.sweep.surfaces);
  const includeExtensions = normalizeExtensions(input.sweep.traversal?.includeExtensions);
  const maxFiles = normalizeMaxFiles(input.sweep.traversal?.maxFiles);
  const everyN = normalizePositiveInt(input.sweep.sampling?.everyN, DEFAULT_EVERY_N);
  const maxPositionsPerFile = normalizePositiveInt(
    input.sweep.sampling?.maxPositionsPerFile,
    DEFAULT_MAX_POSITIONS_PER_FILE,
  );
  const renameMaxPositionsPerFile = normalizePositiveInt(
    input.sweep.sampling?.renameMaxPositionsPerFile,
    DEFAULT_RENAME_MAX_POSITIONS,
  );
  const includeObservations = input.sweep.output?.includeObservations ?? true;
  const maxObservations = normalizePositiveInt(
    input.sweep.output?.maxObservations,
    DEFAULT_MAX_OBSERVATIONS,
  );
  const corpusId = input.sweep.corpusId?.trim() || path.basename(path.resolve(input.workspaceRoot));
  const files = collectFiles(input.workspaceRoot, includeExtensions, maxFiles);
  const report = input.onProgress;
  report?.({
    kind: "start",
    runId: input.runId,
    corpusId,
    workspaceRoot: path.resolve(input.workspaceRoot),
    totalFiles: files.length,
  });

  const counters = new Map<PressureSurfaceId, SurfaceCounters>();
  for (const surface of surfaces) {
    counters.set(surface, { observations: 0, ok: 0, degraded: 0, error: 0, anomalies: 0 });
  }

  const observations: PressureSweepObservation[] = [];
  let observationsTruncated = false;
  let anomalyCount = 0;
  let stoppedEarly = false;

  for (const [fileIndex, filePath] of files.entries()) {
    if (stoppedEarly) break;
    report?.({
      kind: "file-start",
      runId: input.runId,
      corpusId,
      fileIndex: fileIndex + 1,
      totalFiles: files.length,
      filePath,
    });

    let text: string;
    try {
      text = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }
    const uri = asDocumentUri(filePath);
    await input.execute({
      command: "doc.open",
      args: {
        sessionId: input.sessionId,
        uri,
        text,
      },
    }, { runId: input.runId });

    const perFileInvocations = buildInvocations({
      sessionId: input.sessionId,
      uri,
      text,
      surfaces,
      everyN,
      maxPositionsPerFile,
      renameMaxPositionsPerFile,
    });

    for (const invocation of perFileInvocations) {
      const envelope = await input.execute({
        command: invocation.command,
        args: invocation.args as never,
      }, { runId: input.runId });

      const tags = classifyAnomalies(invocation.surface, envelope);
      const surfaceCounters = counters.get(invocation.surface);
      if (surfaceCounters) {
        surfaceCounters.observations += 1;
        if (envelope.status === "ok") surfaceCounters.ok += 1;
        if (envelope.status === "degraded") surfaceCounters.degraded += 1;
        if (envelope.status === "error") surfaceCounters.error += 1;
        if (tags.length > 0) surfaceCounters.anomalies += 1;
      }

      if (tags.length > 0) {
        anomalyCount += 1;
      }

      if (includeObservations) {
        if (observations.length < maxObservations) {
          observations.push(toObservation({
            corpusId,
            surface: invocation.surface,
            command: invocation.command,
            anchor: invocation.anchor,
            input: invocation.input,
            envelope,
            sessionId: input.sessionId,
            runId: input.runId,
            anomalyTags: tags,
          }));
        } else {
          observationsTruncated = true;
        }
      }

      if (input.stopOnFailure && envelope.status === "error") {
        stoppedEarly = true;
        break;
      }
    }

    await input.execute({
      command: "doc.close",
      args: {
        sessionId: input.sessionId,
        uri,
      },
    }, { runId: input.runId });

    const currentObservations = countersForTotals(counters);
    report?.({
      kind: "file-complete",
      runId: input.runId,
      corpusId,
      fileIndex: fileIndex + 1,
      totalFiles: files.length,
      filePath,
      accumulatedObservations: currentObservations.observationCount,
      accumulatedAnomalies: anomalyCount,
    });
  }

  const surfaceSummaries: PressureSurfaceSummary[] = surfaces.map((surface) => {
    const summary = counters.get(surface) ?? { observations: 0, ok: 0, degraded: 0, error: 0, anomalies: 0 };
    return {
      surface,
      observations: summary.observations,
      ok: summary.ok,
      degraded: summary.degraded,
      error: summary.error,
      anomalies: summary.anomalies,
    };
  });

  const observationCount = surfaceSummaries.reduce((total, summary) => total + summary.observations, 0);
  const result: PressureSweepResult = {
    corpusId,
    mutatedCorpus: input.sweep.mutatedCorpus ?? false,
    traversal: {
      workspaceRoot: path.resolve(input.workspaceRoot),
      crawledFiles: files.length,
      sampledFiles: files.length,
      includeExtensions,
      maxFiles: input.sweep.traversal?.maxFiles ?? null,
    },
    sampling: {
      everyN,
      maxPositionsPerFile,
      renameMaxPositionsPerFile,
    },
    surfaces: surfaceSummaries,
    observationCount,
    anomalyCount,
    observationsTruncated,
    observations,
  };

  report?.({
    kind: "done",
    runId: input.runId,
    corpusId,
    totalFiles: files.length,
    observationCount,
    anomalyCount,
    stoppedEarly,
  });

  return { result, stoppedEarly };
}

function buildInvocations(input: {
  sessionId: string;
  uri: DocumentUri;
  text: string;
  surfaces: readonly PressureSurfaceId[];
  everyN: number;
  maxPositionsPerFile: number;
  renameMaxPositionsPerFile: number;
}): InvocationPlan[] {
  const invocations: InvocationPlan[] = [];
  const sampled = sampleOffsets(input.text, input.everyN, input.maxPositionsPerFile);
  const renameSampled = sampleIdentifierOffsets(
    input.text,
    input.everyN,
    input.renameMaxPositionsPerFile,
  );

  for (const surface of input.surfaces) {
    switch (surface) {
      case "diagnostics": {
        invocations.push({
          surface,
          command: "query.diagnostics",
          args: { sessionId: input.sessionId, uri: input.uri },
          anchor: { uri: input.uri },
          input: { uri: input.uri },
        });
        break;
      }
      case "semanticTokens": {
        invocations.push({
          surface,
          command: "query.semanticTokens",
          args: { sessionId: input.sessionId, uri: input.uri },
          anchor: { uri: input.uri },
          input: { uri: input.uri },
        });
        break;
      }
      case "completions":
      case "hover":
      case "navigation": {
        for (const offset of sampled) {
          const position = offsetToPosition(input.text, offset);
          if (surface === "completions") {
            invocations.push({
              surface,
              command: "query.completions",
              args: { sessionId: input.sessionId, uri: input.uri, position },
              anchor: anchor(input.uri, offset, position),
              input: { uri: input.uri, position },
            });
          } else if (surface === "hover") {
            invocations.push({
              surface,
              command: "query.hover",
              args: { sessionId: input.sessionId, uri: input.uri, position },
              anchor: anchor(input.uri, offset, position),
              input: { uri: input.uri, position },
            });
          } else {
            invocations.push({
              surface,
              command: "query.navigation",
              args: { sessionId: input.sessionId, uri: input.uri, position, mode: "definition" },
              anchor: anchor(input.uri, offset, position),
              input: { uri: input.uri, position, mode: "definition" },
            });
          }
        }
        break;
      }
      case "rename": {
        for (const offset of renameSampled) {
          const position = offsetToPosition(input.text, offset);
          const identifier = extractIdentifierAt(input.text, offset);
          if (!identifier) continue;
          invocations.push({
            surface,
            command: "refactor.rename",
            args: {
              sessionId: input.sessionId,
              request: {
                uri: input.uri,
                position,
                newName: buildRenameTarget(identifier),
              },
            },
            anchor: anchor(input.uri, offset, position),
            input: { uri: input.uri, position },
          });
        }
        break;
      }
      default:
        break;
    }
  }

  return invocations;
}

function collectFiles(
  workspaceRoot: string,
  includeExtensions: readonly string[],
  maxFiles: number,
): string[] {
  const root = path.resolve(workspaceRoot);
  const pending = [root];
  const files: string[] = [];

  while (pending.length > 0 && files.length < maxFiles) {
    const current = pending.pop();
    if (!current) break;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        pending.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!includeExtensions.includes(ext)) continue;
      files.push(fullPath);
      if (files.length >= maxFiles) break;
    }
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function sampleOffsets(text: string, everyN: number, maxPositions: number): number[] {
  const positions = new Set<number>();
  positions.add(0);
  positions.add(text.length);

  for (let index = 0; index < text.length; index += everyN) {
    positions.add(index);
  }

  for (let index = 1; index < text.length; index += 1) {
    const previous = text[index - 1] ?? "";
    const current = text[index] ?? "";
    if (isWhitespace(previous) !== isWhitespace(current)) {
      positions.add(index);
    }
    if (isPunctuation(previous) || isPunctuation(current)) {
      positions.add(index);
    }
  }

  return Array.from(positions)
    .filter((value) => value >= 0 && value <= text.length)
    .sort((a, b) => a - b)
    .slice(0, maxPositions);
}

function sampleIdentifierOffsets(text: string, everyN: number, maxPositions: number): number[] {
  const sampled = sampleOffsets(text, everyN, Math.max(maxPositions * 4, maxPositions));
  const offsets: number[] = [];
  for (const offset of sampled) {
    if (extractIdentifierAt(text, offset)) {
      offsets.push(offset);
      if (offsets.length >= maxPositions) break;
    }
  }
  return offsets;
}

function offsetToPosition(text: string, offset: number): SourcePosition {
  let line = 0;
  let character = 0;
  const limit = Math.max(0, Math.min(offset, text.length));
  for (let index = 0; index < limit; index += 1) {
    if (text[index] === "\n") {
      line += 1;
      character = 0;
    } else {
      character += 1;
    }
  }
  return { line, character };
}

function classifyAnomalies(
  surface: PressureSurfaceId,
  envelope: SemanticAuthorityEnvelope<unknown>,
): string[] {
  const tags: string[] = [];
  if (envelope.status === "error" && envelope.errors.length === 0) {
    tags.push("safety:error-without-errors");
  }
  if (envelope.status === "degraded" && envelope.epistemic.gaps.length === 0) {
    tags.push("epistemic:degraded-without-gaps");
  }
  if (
    envelope.status === "ok"
    && (envelope.epistemic.confidence === "partial"
      || envelope.epistemic.confidence === "low")
  ) {
    tags.push("epistemic:status-confidence-incoherent");
  }
  if (envelope.status === "degraded") {
    for (const gap of envelope.epistemic.gaps) {
      if (!gap.what?.trim()) tags.push("epistemic:gap-missing-what");
      if (!gap.why?.trim()) tags.push("epistemic:gap-missing-why");
      if (!gap.howToClose?.trim()) tags.push("epistemic:gap-missing-howToClose");
    }
  }

  if (!isSurfaceResultShapeValid(surface, envelope.result)) {
    tags.push("surface:malformed-result");
  }

  return dedupe(tags);
}

function isSurfaceResultShapeValid(surface: PressureSurfaceId, result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const value = result as Record<string, unknown>;
  switch (surface) {
    case "diagnostics":
      return "bySurface" in value && "suppressed" in value;
    case "completions":
      return Array.isArray(value.items) && typeof value.isIncomplete === "boolean";
    case "hover":
      return "hover" in value;
    case "navigation":
      return Array.isArray(value.locations) && typeof value.mode === "string";
    case "rename":
      return "edit" in value || "error" in value;
    case "semanticTokens":
      return Array.isArray(value.tokens);
    default:
      return false;
  }
}

function toObservation(input: {
  corpusId: string;
  surface: PressureSurfaceId;
  command: PressureScenarioCommandName;
  anchor: PressureObservationAnchor;
  input: PressureObservationInputSummary;
  envelope: SemanticAuthorityEnvelope<unknown>;
  sessionId: string;
  runId: string;
  anomalyTags: readonly string[];
}): PressureSweepObservation {
  return {
    corpusId: input.corpusId,
    surface: input.surface,
    command: input.command,
    anchor: input.anchor,
    input: input.input,
    status: input.envelope.status,
    epistemic: {
      confidence: input.envelope.epistemic.confidence,
      gapCount: input.envelope.epistemic.gaps.length,
      provenanceRefCount: input.envelope.epistemic.provenanceRefs.length,
    },
    anomalyTags: input.anomalyTags,
    replay: {
      sessionId: input.sessionId,
      runId: input.runId,
      commandId: input.envelope.meta.commandId,
    },
  };
}

function anchor(uri: DocumentUri, offset: number, position: SourcePosition): PressureObservationAnchor {
  return {
    uri,
    offset,
    line: position.line,
    character: position.character,
  };
}

function normalizeSurfaces(input: readonly PressureSurfaceId[] | undefined): readonly PressureSurfaceId[] {
  if (!input || input.length === 0) return DEFAULT_SURFACES;
  return dedupe(input.filter(isPressureSurfaceId));
}

function isPressureSurfaceId(value: string): value is PressureSurfaceId {
  return DEFAULT_SURFACES.includes(value as PressureSurfaceId);
}

function normalizeExtensions(input: readonly string[] | undefined): readonly string[] {
  if (!input || input.length === 0) return [...DEFAULT_EXTENSIONS];
  const normalized = input
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0)
    .map((entry) => entry.startsWith(".") ? entry : `.${entry}`);
  return normalized.length > 0 ? dedupe(normalized) : [...DEFAULT_EXTENSIONS];
}

function normalizeMaxFiles(value: number | undefined): number {
  return normalizePositiveInt(value, DEFAULT_MAX_FILES);
}

function normalizePositiveInt(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const next = Math.floor(value);
  if (next <= 0) return fallback;
  return next;
}

function dedupe<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function countersForTotals(counters: ReadonlyMap<PressureSurfaceId, SurfaceCounters>): {
  observationCount: number;
} {
  let observationCount = 0;
  for (const value of counters.values()) {
    observationCount += value.observations;
  }
  return { observationCount };
}

function isWhitespace(value: string): boolean {
  return value === " " || value === "\n" || value === "\r" || value === "\t";
}

function isPunctuation(value: string): boolean {
  return value === "<"
    || value === ">"
    || value === "="
    || value === "\""
    || value === "'"
    || value === "{"
    || value === "}"
    || value === ":"
    || value === "."
    || value === "$";
}

function buildRenameTarget(identifier: string): string {
  if (identifier.endsWith("Renamed")) {
    return `${identifier}Again`;
  }
  return `${identifier}Renamed`;
}

function extractIdentifierAt(text: string, offset: number): string | null {
  if (text.length === 0) return null;
  const bounded = Math.max(0, Math.min(offset, text.length - 1));
  let start = bounded;
  while (start > 0 && isIdentifierChar(text.charCodeAt(start - 1))) {
    start -= 1;
  }
  let end = bounded;
  while (end < text.length && isIdentifierChar(text.charCodeAt(end))) {
    end += 1;
  }
  if (end <= start) return null;
  return text.slice(start, end);
}

function isIdentifierChar(charCode: number): boolean {
  return (
    (charCode >= 48 && charCode <= 57) // 0-9
    || (charCode >= 65 && charCode <= 90) // A-Z
    || (charCode >= 97 && charCode <= 122) // a-z
    || charCode === 95 // _
    || charCode === 36 // $
  );
}
