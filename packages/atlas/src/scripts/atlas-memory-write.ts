import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { isRecord } from "../collections.js";
import { errorMessage } from "../errors.js";
import {
  ATLAS_MEMORY_REPO_PATH,
  ATLAS_MEMORY_SCHEMA_VERSION,
  atlasMemoryNextActionPolicyValue,
  type AtlasMemoryAnchor,
  type AtlasMemoryManifest,
  type AtlasMemoryRecord,
  type AtlasMemoryRecordKind,
  type AtlasMemoryShard,
  type AtlasMemoryShardReference,
} from "../inquiry/runtime/atlas-memory-contracts.js";
import { findRepoRoot } from "../source/index.js";
import {
  requiredScriptArgumentValue,
  scriptArgumentValue,
} from "./script-output.js";

type MemoryWriteMode = "template" | "list-shards" | "upsert" | "remove";

interface LoadedShard {
  readonly reference: AtlasMemoryShardReference;
  readonly absolutePath: string;
  readonly shard: AtlasMemoryShard;
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
    upsertRecord();
    break;
  case "remove":
    removeRecord();
    break;
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
  const nextRecord = recordWithDates(record, existing?.createdAt, today);
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

  console.log(
    `${dryRun ? "would upsert" : "upserted"} ${nextRecord.id} into ${targetPath}` +
      (removedElsewhere.length === 0
        ? ""
        : `; removed duplicate from ${removedElsewhere.join(", ")}`),
  );
  if (dryRun) {
    console.log(JSON.stringify(nextRecord, null, 2));
    return;
  }
  writeChangedShards(changed);
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
  console.log(
    `${dryRun ? "would remove" : "removed"} ${recordId} from ${changedPaths.join(", ")}`,
  );
  if (!dryRun) {
    writeChangedShards(changed);
  }
}

function readManifest(): AtlasMemoryManifest {
  const manifestPath = path.join(repoRoot, ATLAS_MEMORY_REPO_PATH);
  const parsed = readJsonFile(manifestPath);
  if (!isRecord(parsed) || parsed.schemaVersion !== ATLAS_MEMORY_SCHEMA_VERSION) {
    throw new Error(
      `Atlas memory manifest must use schemaVersion ${ATLAS_MEMORY_SCHEMA_VERSION}.`,
    );
  }
  if (!Array.isArray(parsed.shards)) {
    throw new Error("Atlas memory manifest must declare a shards array.");
  }
  return {
    schemaVersion: ATLAS_MEMORY_SCHEMA_VERSION,
    shards: parsed.shards.map((entry, index) => shardReference(entry, index)),
  };
}

function readShards(
  manifest: AtlasMemoryManifest,
): readonly LoadedShard[] {
  return manifest.shards.map((reference) => {
    const absolutePath = path.join(repoRoot, reference.path);
    const parsed = readJsonFile(absolutePath);
    if (!isRecord(parsed) || parsed.schemaVersion !== ATLAS_MEMORY_SCHEMA_VERSION) {
      throw new Error(
        `Atlas memory shard ${reference.path} must use schemaVersion ${ATLAS_MEMORY_SCHEMA_VERSION}.`,
      );
    }
    if (!Array.isArray(parsed.records)) {
      throw new Error(`Atlas memory shard ${reference.path} must declare records.`);
    }
    return {
      reference,
      absolutePath,
      shard: {
        schemaVersion: ATLAS_MEMORY_SCHEMA_VERSION,
        records: parsed.records.map((entry, index) =>
          memoryRecord(entry, `${reference.path}:${index}`),
        ),
      },
    };
  });
}

function readRecordDraft(recordPath: string): AtlasMemoryRecord {
  return memoryRecord(
    readJsonFile(path.resolve(repoRoot, recordPath)),
    recordPath,
  );
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

function shardReference(
  value: unknown,
  index: number,
): AtlasMemoryShardReference {
  if (!isRecord(value) || typeof value.path !== "string") {
    throw new Error(`Atlas memory manifest shard ${index} must have a path.`);
  }
  return {
    path: normalizeRepoPath(value.path),
    summary: typeof value.summary === "string" ? value.summary : undefined,
  };
}

function memoryRecord(
  value: unknown,
  context: string,
): AtlasMemoryRecord {
  if (!isRecord(value)) {
    throw new Error(`Atlas memory record ${context} must be an object.`);
  }
  if (
    typeof value.id !== "string" ||
    typeof value.summary !== "string" ||
    !isRecordKind(value.kind)
  ) {
    throw new Error(
      `Atlas memory record ${context} requires string id, known kind, and summary.`,
    );
  }
  return {
    id: value.id,
    kind: value.kind,
    domains: stringArray(value.domains),
    summary: value.summary,
    rationale: stringValue(value.rationale),
    guidance: stringArrayOrUndefined(value.guidance),
    nextActionPolicy: atlasMemoryNextActionPolicyValue(value.nextActionPolicy),
    anchors: Array.isArray(value.anchors) ? value.anchors as [] : undefined,
    liveChecks: Array.isArray(value.liveChecks)
      ? value.liveChecks as []
      : undefined,
    createdAt: stringValue(value.createdAt),
    updatedAt: stringValue(value.updatedAt),
  };
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
  const normalized = normalizeRepoPath(
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
      writeFileSync(
        loaded.absolutePath,
        `${JSON.stringify(loaded.shard, null, 2)}\n`,
      );
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
    createdAt: record.createdAt ?? previousCreatedAt ?? today,
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
  return value === undefined
    ? undefined
    : isRecordKind(value)
      ? value
      : undefined;
}

function isRecordKind(value: unknown): value is AtlasMemoryRecordKind {
  return (
    value === "pressure-frontier" ||
    value === "intentional-shape" ||
    value === "reuse-guide" ||
    value === "decision" ||
    value === "doc-shard"
  );
}

function domainsArgument(): readonly string[] {
  const domains =
    scriptArgumentValue("--domains=") ?? scriptArgumentValue("--domain=");
  return domains === undefined
    ? ["atlas", "memory"]
    : domains.split(/[,\s]+/u).map((entry) => entry.trim()).filter(Boolean);
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function stringArrayOrUndefined(value: unknown): readonly string[] | undefined {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeRepoPath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.?\//u, "");
}

function dateStamp(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function requiredArgument(prefix: string): string {
  return requiredScriptArgumentValue(prefix);
}
