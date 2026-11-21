import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

import { countBy } from "../../collections.js";
import { errorMessage } from "../../errors.js";
import {
  readProductArchitectureAnalysis,
  type ProductArchitectureAnalysis,
} from "./product-architecture-analysis.js";
import { sourceRangeForSourceFileNode, type SourceProject } from "../../source/index.js";
import type { AtlasSelfAnalysis } from "./self-analysis.js";
import {
  ATLAS_MEMORY_REPO_PATH,
  ATLAS_MEMORY_SCHEMA_VERSION,
  type AtlasMemoryAnalysis,
  type AtlasMemoryComputedStatus,
  type AtlasMemoryDatabase,
  type AtlasMemoryLiveCheckResult,
  type AtlasMemoryRecordKind,
  type AtlasMemoryRecordRow,
  type AtlasMemoryRollup,
  type AtlasMemoryShardReference,
  type AtlasMemoryStorageIssue,
  type AtlasMemoryStoredRecord,
  type AtlasMemoryStoreRead,
} from "./atlas-memory-contracts.js";
import {
  evaluateAtlasMemoryLiveCheck,
  readAtlasMemorySelfAnalysisIfNeeded,
} from "./atlas-memory-live-checks.js";
import { atlasMemoryIntegrityIssues } from "./atlas-memory-integrity.js";
import { readAtlasMemorySources, type AtlasMemorySources } from "./atlas-memory-source-helpers.js";
import {
  normalizeAtlasMemoryManifest,
  normalizeAtlasMemoryRecord,
  atlasMemoryShardEntries,
} from "./atlas-memory-normalization.js";

export function staleAtlasMemoryRecordRows(
  rows: readonly AtlasMemoryRecordRow[],
): readonly AtlasMemoryRecordRow[] {
  return rows.filter((row) =>
    row.status === "resolved" ||
    row.status === "stale-source" ||
    row.status === "stale-check",
  );
}

const emptyDatabase: AtlasMemoryDatabase = {
  schemaVersion: ATLAS_MEMORY_SCHEMA_VERSION,
  records: [],
};

/** Build the memory analysis by joining durable JSON records with live source facts. */
export function readAtlasMemoryAnalysis(
  sourceProject: SourceProject,
): AtlasMemoryAnalysis {
  const store = readAtlasMemoryStore(sourceProject);
  const sources = readAtlasMemorySources(sourceProject);
  const records = store.database.records.map((stored) => stored.record);
  const atlasSelfAnalysis = readAtlasMemorySelfAnalysisIfNeeded(
    sourceProject,
    records,
  );
  let product: ProductArchitectureAnalysis | undefined;
  const readProduct = () => product ??= readProductArchitectureAnalysis(sourceProject, {
    includeCallSites: false,
    includeSymbols: false,
    includeKernelRecords: false,
  });
  const rows = store.database.records.map((stored) =>
    memoryRecordRow(
      sources,
      readProduct,
      atlasSelfAnalysis,
      stored,
    ),
  );
  const integrity = atlasMemoryIntegrityIssues(sources, readProduct, records);
  const issues = [...store.issues, ...integrity.issues];
  return {
    version: ATLAS_MEMORY_SCHEMA_VERSION,
    storagePath: store.storagePath,
    storageExists: store.storageExists,
    records: rows,
    scopeGaps: integrity.scopeGaps,
    rollup: memoryRollup(rows, issues),
    issues,
  };
}

/** Read and validate the durable JSON store without hiding malformed records. */
export function readAtlasMemoryStore(
  sourceProject: SourceProject,
): AtlasMemoryStoreRead {
  const storagePath = path.join(sourceProject.repoRoot, ATLAS_MEMORY_REPO_PATH);
  if (!existsSync(storagePath)) {
    return {
      storagePath,
      storageExists: false,
      database: emptyDatabase,
      issues: [
        {
          id: "atlas.memory:missing-store",
          summary: `No Atlas memory store exists at ${ATLAS_MEMORY_REPO_PATH}.`,
        },
      ],
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(storagePath, "utf8")) as unknown;
    return readAtlasMemoryManifest(sourceProject, storagePath, parsed);
  } catch (error) {
    return {
      storagePath,
      storageExists: true,
      database: emptyDatabase,
      issues: [
        {
          id: "atlas.memory:invalid-json",
          summary: `Atlas memory store could not be parsed: ${errorMessage(error)}.`,
        },
      ],
    };
  }
}

function readAtlasMemoryManifest(
  sourceProject: SourceProject,
  storagePath: string,
  value: unknown,
): AtlasMemoryStoreRead {
  const issues: AtlasMemoryStorageIssue[] = [];
  const manifest = normalizeAtlasMemoryManifest(storagePath, value, issues);
  if (manifest === null) {
    return {
      storagePath,
      storageExists: true,
      database: emptyDatabase,
      issues,
    };
  }
  const shardRead = readAtlasMemoryShards(sourceProject, manifest.shards);
  return {
    storagePath,
    storageExists: true,
    database: {
      schemaVersion: ATLAS_MEMORY_SCHEMA_VERSION,
      records: shardRead.records,
    },
    issues: [...issues, ...shardRead.issues],
  };
}

function readAtlasMemoryShards(
  sourceProject: SourceProject,
  shards: readonly AtlasMemoryShardReference[],
): {
  readonly records: readonly AtlasMemoryStoredRecord[];
  readonly issues: readonly AtlasMemoryStorageIssue[];
} {
  const records: AtlasMemoryStoredRecord[] = [];
  const issues: AtlasMemoryStorageIssue[] = [];
  for (const shard of shards) {
    const shardPath = path.join(sourceProject.repoRoot, shard.path);
    if (!existsSync(shardPath)) {
      issues.push({
        id: `atlas.memory:shard:${shard.path}:missing`,
        summary: `Atlas memory shard is missing at ${shard.path}.`,
      });
      continue;
    }
    try {
      const raw = readFileSync(shardPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      const entries = atlasMemoryShardEntries(shard.path, parsed, issues);
      const json = ts.parseJsonText(shard.path, raw);
      const array = jsonProperty(json.statements[0]?.expression, "records")?.initializer;
      let shardIndex = 0;
      for (const [rawIndex, entry] of entries.entries()) {
        const record = normalizeAtlasMemoryRecord(`${shard.path}:${rawIndex}`, entry, issues);
        if (record === null) continue;
        const node = array && ts.isArrayLiteralExpression(array) ? array.elements[rawIndex] : undefined;
        const id = jsonProperty(node, "id");
        records.push({
          record,
          shardPath: shard.path,
          shardIndex: shardIndex++,
          shardLine: id && json.getLineAndCharacterOfPosition(id.name.getStart(json)).line + 1,
          storageSource: node && sourceRangeForSourceFileNode(shard.path, json, node),
        });
      }
    } catch (error) {
      issues.push({
        id: `atlas.memory:shard:${shard.path}:invalid-json`,
        summary: `Atlas memory shard ${shard.path} could not be parsed: ${errorMessage(error)}.`,
      });
    }
  }
  return { records, issues };
}

function jsonProperty(node: ts.Node | undefined, name: string): ts.PropertyAssignment | undefined {
  if (node === undefined || !ts.isObjectLiteralExpression(node)) return undefined;
  // JSON.parse uses the last value for a repeated property.
  return node.properties.findLast((p): p is ts.PropertyAssignment =>
    ts.isPropertyAssignment(p) && ts.isStringLiteral(p.name) && p.name.text === name,
  );
}

function memoryRecordRow(
  sources: AtlasMemorySources,
  readProduct: () => ProductArchitectureAnalysis,
  atlasSelfAnalysis: AtlasSelfAnalysis | undefined,
  stored: AtlasMemoryStoredRecord,
): AtlasMemoryRecordRow {
  const { record } = stored;
  const liveChecks = (record.liveChecks ?? []).map((check) =>
    evaluateAtlasMemoryLiveCheck(
      sources,
      readProduct,
      atlasSelfAnalysis,
      check,
    ),
  );
  const status = computedRecordStatus(record.kind, liveChecks);
  return {
    id: record.id,
    record,
    shardPath: stored.shardPath,
    shardIndex: stored.shardIndex,
    shardLine: stored.shardLine,
    storageSource: stored.storageSource,
    kind: record.kind,
    domains: record.domains,
    status,
    liveChecks,
    summary: record.summary,
  };
}

function computedRecordStatus(
  kind: AtlasMemoryRecordKind,
  checks: readonly AtlasMemoryLiveCheckResult[],
): AtlasMemoryComputedStatus {
  if (checks.length === 0) {
    return "reference";
  }
  if (checks.some((check) => check.status === "stale-source")) {
    return "stale-source";
  }
  if (checks.some((check) => check.status === "stale-check")) {
    return "stale-check";
  }
  if (checks.some((check) => check.status === "active")) {
    switch (kind) {
      case "pressure-frontier":
        return "active";
      case "intentional-shape":
        return "intentional-live";
      case "decision":
      case "doc-shard":
      case "reuse-guide":
        return "reference";
    }
  }
  // A measured pressure remains live. An unresolved input prevents a negative conclusion.
  if (checks.some((check) => check.status === "out-of-scope")) {
    return "out-of-scope";
  }
  if (checks.some((check) => check.status === "present")) {
    switch (kind) {
      case "intentional-shape":
        return "intentional-live";
      case "decision":
      case "doc-shard":
      case "reuse-guide":
        return "reference";
      case "pressure-frontier":
        return checks.some((check) => check.status === "resolved")
          ? "resolved"
          : "reference";
    }
  }
  return "resolved";
}

export function memoryRollup(
  records: readonly AtlasMemoryRecordRow[],
  issues: readonly AtlasMemoryStorageIssue[],
): AtlasMemoryRollup {
  return {
    recordCount: records.length,
    byKind: countBy(records, (row) => row.kind),
    byStatus: countBy(records, (row) => row.status),
    storageIssueCount: issues.length,
  };
}
