import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { isRecord } from "../collections.js";
import { errorMessage } from "../errors.js";
import {
  ATLAS_MEMORY_REPO_PATH,
  ATLAS_MEMORY_SCHEMA_VERSION,
  type AtlasMemoryAnchor,
  type AtlasMemoryManifest,
  type AtlasMemoryRecord,
  type AtlasMemoryRecordKind,
  type AtlasMemoryShardReference,
  type AtlasMemoryStorageIssue,
} from "../inquiry/runtime/atlas-memory-contracts.js";
import {
  atlasMemoryShardEntries,
  normalizeAtlasMemoryManifest,
  normalizeAtlasMemoryRecord,
  recordKindValue,
} from "../inquiry/runtime/atlas-memory-normalization.js";
import { normalizeAtlasMemoryRepoPath } from "../inquiry/runtime/atlas-memory-source-helpers.js";
import { findRepoRoot } from "../source/index.js";
import {
  requiredScriptArgumentValue,
  scriptArgumentValue,
} from "./script-output.js";

type MemoryWriteMode = "template" | "list-shards" | "upsert" | "remove";

interface LoadedShard {
  readonly reference: AtlasMemoryShardReference;
  readonly absolutePath: string;
  readonly shard: {
    readonly schemaVersion: typeof ATLAS_MEMORY_SCHEMA_VERSION;
    readonly records: readonly StoredRecordHeader[];
  };
}

interface StoredRecordHeader {
  readonly id: string;
  readonly createdAt?: unknown;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  printUsage();
  process.exit(0);
}

const mode = memoryWriteMode();
const repoRoot = findRepoRoot();
const dryRun = process.argv.includes("--dry-run");

switch (mode) {
  case "template":
    printTemplate();
    break;
  case "list-shards":
    listShards();
    break;
  case "upsert":
    writeWithLock(upsertRecord);
    break;
  case "remove":
    writeWithLock(removeRecord);
    break;
}

/** Serialize read-modify-write across shards, including moves to a different shard. */
function writeWithLock(update: () => void): void {
  if (dryRun) return update();
  const lockPath = path.join(repoRoot, ".temp/atlas/memory-write.lock");
  mkdirSync(path.dirname(lockPath), { recursive: true });
  let lock: number;
  try {
    lock = openSync(lockPath, "wx");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`Atlas memory writer lock at ${lockPath}. Retry after the writer finishes. If it was interrupted, verify the recorded PID has exited before removing the lock.`);
    }
    throw error;
  }
  try {
    writeFileSync(lock, `${process.pid}\n`);
    update();
  } finally {
    closeSync(lock);
    rmSync(lockPath);
  }
}

function printUsage(): void {
  console.log(`atlas-memory-write

Usage:
  pnpm --filter @aurelia-ls/atlas memory:write -- --mode=list-shards
  pnpm --filter @aurelia-ls/atlas memory:write -- --template --id=frontier:example --kind=pressure-frontier --domains=atlas,memory --summary="Example"
  pnpm --filter @aurelia-ls/atlas memory:write -- --record=.temp/example.json --shard=atlas --dry-run
  pnpm --filter @aurelia-ls/atlas memory:write -- --record=.temp/example.json --shard=atlas
  pnpm --filter @aurelia-ls/atlas memory:write -- --mode=remove --id=frontier:example --dry-run

Modes:
  --template          Print one draft memory record.
  --mode=list-shards List writable memory shards.
  --mode=upsert      Upsert --record into the inferred or explicit --shard. This is the default mode.
  --mode=remove      Remove --id from all shards.

Common options:
  --record=<path>    Repository-relative JSON file containing one Atlas memory record.
  --shard=<name>     Shard name, such as template, or repository-relative shard path.
  --dry-run          Print the action and resulting record without writing.
  --domains=<list>   Comma or space separated domains for template mode.
  --auLinkId=<id>    Add an auLink anchor in template mode.
  --symbolName=<n>   Pair the template auLink anchor with a symbol name.
`);
}

function printTemplate(): void {
  const today = dateStamp();
  const auLinkId = scriptArgumentValue("--auLinkId=");
  const symbolName = scriptArgumentValue("--symbolName=");
  const kind = recordKindArgument() ?? "pressure-frontier";
  const anchors: AtlasMemoryAnchor[] = [];
  if (auLinkId !== undefined) {
    anchors.push(symbolName === undefined
      ? {
        kind: "auLink",
        linkId: auLinkId,
        summary: `Framework-shaped semantic-runtime anchor for ${auLinkId}.`,
      }
      : {
        kind: "auLink",
        linkId: auLinkId,
        symbolName,
        summary: `Framework-shaped semantic-runtime anchor for ${auLinkId}.`,
      });
  }
  const record: AtlasMemoryRecord = {
    id: scriptArgumentValue("--id=") ?? "frontier:replace-me",
    kind,
    domains: domainsArgument(),
    summary:
      scriptArgumentValue("--summary=") ??
      "Replace with the durable memory summary future Codex should find.",
    rationale:
      "Replace with why this belongs in queryable memory rather than a transient workbench note.",
    guidance: [
      "Replace with one concrete inspection or reuse move.",
    ],
    nextActionPolicy: kind === "pressure-frontier" ? "proactive" : undefined,
    anchors,
    liveChecks: [],
    createdAt: today,
    updatedAt: today,
  };
  console.log(JSON.stringify(record, null, 2));
}

function listShards(): void {
  const manifest = readManifest();
  for (const shard of manifest.shards) {
    const summary = shard.summary === undefined ? "" : ` - ${shard.summary}`;
    console.log(`${shard.path}${summary}`);
  }
}

function upsertRecord(): void {
  const recordPath = requiredArgument("--record=");
  const record = readRecordDraft(recordPath);
  const manifest = readManifest();
  const loadedShards = readShards(manifest);
  const targetPath = chooseTargetShardPath(manifest.shards, record);
  const today = dateStamp();
  const existing = loadedShards
    .flatMap((loaded) => loaded.shard.records)
    .find((candidate) => candidate.id === record.id);
  const previousCreatedAt = typeof existing?.createdAt === "string" ? existing.createdAt : undefined;
  const nextRecord = recordWithDates(record, previousCreatedAt, today);
  const changed = loadedShards.map((loaded) =>
    loaded.reference.path === targetPath
      ? upsertIntoShard(loaded, nextRecord)
      : removeFromShard(loaded, nextRecord.id),
  );

  const removedElsewhere = changed
    .filter((entry) => entry.reference.path !== targetPath && entry.changed)
    .map((entry) => entry.reference.path);
  const target = changed.find((entry) => entry.reference.path === targetPath);
  if (target === undefined) {
    throw new Error(`Target shard ${targetPath} was not loaded.`);
  }

  if (!dryRun) {
    // A failed cross-shard move can be retried while either copy still exists.
    writeChangedShards([target, ...changed.filter((entry) => entry !== target)]);
  }
  console.log(
    `${dryRun ? "would upsert" : "upserted"} ${nextRecord.id} into ${targetPath}` +
      (removedElsewhere.length === 0 ? "" : ` (moved from ${removedElsewhere.join(", ")})`),
  );
  if (dryRun) {
    console.log(JSON.stringify(nextRecord, null, 2));
  }
}

function removeRecord(): void {
  const recordId = requiredArgument("--id=");
  const manifest = readManifest();
  const changed = readShards(manifest).map((loaded) =>
    removeFromShard(loaded, recordId),
  );
  const changedPaths = changed
    .filter((entry) => entry.changed)
    .map((entry) => entry.reference.path);
  if (changedPaths.length === 0) {
    throw new Error(`No Atlas memory record with id ${recordId} was found.`);
  }
  if (!dryRun) {
    writeChangedShards(changed);
  }
  console.log(`${dryRun ? "would remove" : "removed"} ${recordId} from ${changedPaths.join(", ")}`);
}

function readManifest(): AtlasMemoryManifest {
  const manifestPath = path.join(repoRoot, ATLAS_MEMORY_REPO_PATH);
  const issues: AtlasMemoryStorageIssue[] = [];
  const manifest = normalizeAtlasMemoryManifest(manifestPath, readJsonFile(manifestPath), issues);
  return requireValid(manifest, issues);
}

function readShards(
  manifest: AtlasMemoryManifest,
): readonly LoadedShard[] {
  return manifest.shards.map((reference) => {
    const absolutePath = path.join(repoRoot, reference.path);
    const issues: AtlasMemoryStorageIssue[] = [];
    const entries = atlasMemoryShardEntries(reference.path, readJsonFile(absolutePath), issues);
    const records = requireValid(entries, issues).map((entry, index) => {
      if (!hasStoredRecordId(entry)) {
        throw new Error(`Missing record id at ${reference.path}:${index}.`);
      }
      // Preserve unrelated entries verbatim as JSON values when rewriting this shard.
      return entry;
    });
    return {
      reference,
      absolutePath,
      shard: {
        schemaVersion: ATLAS_MEMORY_SCHEMA_VERSION,
        records,
      },
    };
  });
}

function hasStoredRecordId(value: unknown): value is StoredRecordHeader {
  return isRecord(value) && typeof value.id === "string";
}

function readRecordDraft(recordPath: string): AtlasMemoryRecord {
  const issues: AtlasMemoryStorageIssue[] = [];
  const record = normalizeAtlasMemoryRecord(recordPath, readJsonFile(path.resolve(repoRoot, recordPath)), issues);
  return requireValid(record, issues);
}

function requireValid<T>(value: T | null, issues: readonly AtlasMemoryStorageIssue[]): T {
  if (value === null || issues.length > 0) {
    throw new Error(issues.map((issue) => `${issue.id}: ${issue.summary}`).join("\n"));
  }
  return value;
}

function readJsonFile(filePath: string): unknown {
  if (!existsSync(filePath)) {
    throw new Error(`JSON file does not exist: ${filePath}`);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    throw new Error(`Could not parse ${filePath}: ${errorMessage(error)}`);
  }
}

function chooseTargetShardPath(
  shards: readonly AtlasMemoryShardReference[],
  record: AtlasMemoryRecord,
): string {
  const explicitShard = scriptArgumentValue("--shard=");
  if (explicitShard !== undefined) {
    return resolveShardSpecifier(shards, explicitShard);
  }
  for (const domain of record.domains) {
    const candidate = `packages/atlas/memory/records/${domain}.json`;
    if (shards.some((shard) => shard.path === candidate)) {
      return candidate;
    }
  }
  return resolveShardSpecifier(shards, "product");
}

function resolveShardSpecifier(
  shards: readonly AtlasMemoryShardReference[],
  specifier: string,
): string {
  const normalized = normalizeAtlasMemoryRepoPath(
    specifier.endsWith(".json")
      ? specifier
      : `packages/atlas/memory/records/${specifier}.json`,
  );
  if (!shards.some((shard) => shard.path === normalized)) {
    throw new Error(
      `Unknown Atlas memory shard ${specifier}. Run memory:write -- --mode=list-shards.`,
    );
  }
  return normalized;
}

function upsertIntoShard(
  loaded: LoadedShard,
  record: AtlasMemoryRecord,
): LoadedShard & { readonly changed: boolean } {
  const records = loaded.shard.records.filter((candidate) =>
    candidate.id !== record.id,
  );
  const existingIndex = loaded.shard.records.findIndex((candidate) =>
    candidate.id === record.id,
  );
  if (existingIndex < 0) {
    records.push(record);
  } else {
    records.splice(existingIndex, 0, record);
  }
  return {
    ...loaded,
    changed: true,
    shard: { schemaVersion: ATLAS_MEMORY_SCHEMA_VERSION, records },
  };
}

function removeFromShard(
  loaded: LoadedShard,
  recordId: string,
): LoadedShard & { readonly changed: boolean } {
  const records = loaded.shard.records.filter((candidate) =>
    candidate.id !== recordId,
  );
  return {
    ...loaded,
    changed: records.length !== loaded.shard.records.length,
    shard: { schemaVersion: ATLAS_MEMORY_SCHEMA_VERSION, records },
  };
}

function writeChangedShards(
  shards: readonly (LoadedShard & { readonly changed: boolean })[],
): void {
  for (const loaded of shards) {
    if (loaded.changed) {
      const tempPath = `${loaded.absolutePath}.${process.pid}.tmp`;
      try {
        writeFileSync(tempPath, `${JSON.stringify(loaded.shard, null, 2)}\n`);
        renameSync(tempPath, loaded.absolutePath);
      } finally {
        rmSync(tempPath, { force: true });
      }
    }
  }
}

function recordWithDates(
  record: AtlasMemoryRecord,
  previousCreatedAt: string | undefined,
  today: string,
): AtlasMemoryRecord {
  return {
    id: record.id,
    kind: record.kind,
    domains: record.domains,
    summary: record.summary,
    rationale: record.rationale,
    guidance: record.guidance,
    nextActionPolicy: record.nextActionPolicy,
    anchors: record.anchors,
    liveChecks: record.liveChecks,
    createdAt: previousCreatedAt ?? record.createdAt ?? today,
    updatedAt: today,
  };
}

function memoryWriteMode(): MemoryWriteMode {
  if (process.argv.includes("--template")) {
    return "template";
  }
  return memoryWriteModeValue(scriptArgumentValue("--mode=") ?? "upsert");
}

function memoryWriteModeValue(value: string): MemoryWriteMode {
  switch (value) {
    case "template":
    case "list-shards":
    case "upsert":
    case "remove":
      return value;
    default:
      throw new Error(
        "Use --mode=template, --mode=list-shards, --mode=upsert, or --mode=remove.",
      );
  }
}

function recordKindArgument(): AtlasMemoryRecordKind | undefined {
  const value = scriptArgumentValue("--kind=");
  if (value === undefined) return undefined;
  const kind = recordKindValue(value);
  if (kind === undefined) throw new Error(`Unknown Atlas memory record kind: ${value}.`);
  return kind;
}

function domainsArgument(): readonly string[] {
  const domains =
    scriptArgumentValue("--domains=") ?? scriptArgumentValue("--domain=");
  return domains === undefined
    ? ["atlas", "memory"]
    : domains.split(/[,\s]+/u).map((entry) => entry.trim()).filter(Boolean);
}

function dateStamp(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function requiredArgument(prefix: string): string {
  return requiredScriptArgumentValue(prefix);
}
