import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { countBy } from "../../collections.js";
import { errorMessage } from "../../errors.js";
import {
  readProductArchitectureAnalysis,
  type ProductArchitectureClassSurfaceRow,
} from "./product-architecture-analysis.js";
import type { SourceProject } from "../../source/index.js";
import type { AtlasSelfAnalysis } from "./self-analysis.js";
import {
  ATLAS_MEMORY_REPO_PATH,
  ATLAS_MEMORY_SCHEMA_VERSION,
  atlasMemoryEffectiveNextActionPolicy,
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
  type AtlasMemoryUntrackedProductClassFrontier,
} from "./atlas-memory-contracts.js";
import {
  ATLAS_MEMORY_PRODUCT_LARGE_CLASS_LINE_THRESHOLD,
  evaluateAtlasMemoryLiveCheck,
  readAtlasMemorySelfAnalysisIfNeeded,
} from "./atlas-memory-live-checks.js";
import { atlasMemoryIntegrityIssues } from "./atlas-memory-integrity.js";
import { atlasMemoryProductClassKey } from "./atlas-memory-product-class-key.js";
import {
  normalizeAtlasMemoryManifest,
  normalizeAtlasMemoryShard,
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
  const records = store.database.records.map((stored) => stored.record);
  const atlasSelfAnalysis = readAtlasMemorySelfAnalysisIfNeeded(
    sourceProject,
    records,
  );
  const productArchitecture = readProductArchitectureAnalysis(sourceProject, {
    includeCallSites: false,
    includeSymbols: false,
    includeKernelRecords: false,
  });
  const rows = store.database.records.map((stored) =>
    memoryRecordRow(
      sourceProject,
      productArchitecture.classSurfaces,
      atlasSelfAnalysis,
      stored,
    ),
  );
  const untrackedProductClassFrontiers =
    untrackedProductLargeClassFrontiers(productArchitecture.classSurfaces, rows);
  const issues = [
    ...store.issues,
    ...atlasMemoryIntegrityIssues(
      sourceProject,
      productArchitecture.classSurfaces,
      store.database.records,
    ),
  ];
  return {
    version: ATLAS_MEMORY_SCHEMA_VERSION,
    storagePath: store.storagePath,
    storageExists: store.storageExists,
    records: rows,
    untrackedProductClassFrontiers,
    rollup: memoryRollup(rows, untrackedProductClassFrontiers, issues),
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
      const idLines = recordIdLines(raw);
      const shardRecords = normalizeAtlasMemoryShard(
        shard.path,
        parsed,
        issues,
      ).records;
      records.push(...shardRecords.map((record, shardIndex) => ({
        record,
        shardPath: shard.path,
        shardIndex,
        shardLine: takeFirstLine(idLines, record.id),
      })));
    } catch (error) {
      issues.push({
        id: `atlas.memory:shard:${shard.path}:invalid-json`,
        summary: `Atlas memory shard ${shard.path} could not be parsed: ${errorMessage(error)}.`,
      });
    }
  }
  return { records, issues };
}

function recordIdLines(raw: string): Map<string, number[]> {
  const lines = raw.split(/\r?\n/u);
  const byId = new Map<string, number[]>();
  for (const [index, line] of lines.entries()) {
    const match = /"id"\s*:\s*"([^"]+)"/u.exec(line);
    const id = match?.[1];
    if (id === undefined) {
      continue;
    }
    const existing = byId.get(id);
    if (existing === undefined) {
      byId.set(id, [index + 1]);
    } else {
      existing.push(index + 1);
    }
  }
  return byId;
}

function takeFirstLine(
  byId: Map<string, number[]>,
  recordId: string,
): number | undefined {
  const lines = byId.get(recordId);
  return lines?.shift();
}

function memoryRecordRow(
  sourceProject: SourceProject,
  productClasses: readonly ProductArchitectureClassSurfaceRow[],
  atlasSelfAnalysis: AtlasSelfAnalysis | undefined,
  stored: AtlasMemoryStoredRecord,
): AtlasMemoryRecordRow {
  const { record } = stored;
  const liveChecks = (record.liveChecks ?? []).map((check) =>
    evaluateAtlasMemoryLiveCheck(
      sourceProject,
      productClasses,
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
    kind: record.kind,
    domains: record.domains,
    status,
    nextActionPolicy: atlasMemoryEffectiveNextActionPolicy(record),
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
  return "resolved";
}

function untrackedProductLargeClassFrontiers(
  productClasses: readonly ProductArchitectureClassSurfaceRow[],
  rows: readonly AtlasMemoryRecordRow[],
): readonly AtlasMemoryUntrackedProductClassFrontier[] {
  const tracked = new Set(
    rows.flatMap((row) =>
      row.liveChecks.flatMap((result) =>
        result.check.kind === "product-large-class" && result.status === "active"
          ? [atlasMemoryProductClassKey(result.check)]
          : [],
      ),
    ),
  );
  return productClasses
    .filter((row) =>
      row.lineCount >= ATLAS_MEMORY_PRODUCT_LARGE_CLASS_LINE_THRESHOLD
    )
    .filter((row) => !tracked.has(atlasMemoryProductClassKey(row)))
    .sort((left, right) =>
      right.methodCount - left.methodCount ||
      right.lineCount - left.lineCount ||
      left.filePath.localeCompare(right.filePath) ||
      left.name.localeCompare(right.name),
    )
    .map((row) => ({
      id: `atlas.memory:untracked-product-class:${row.filePath}:${row.name}`,
      className: row.name,
      filePath: row.filePath,
      area: row.area,
      domains: ["semantic-runtime", "product-architecture", row.area],
      methodCount: row.methodCount,
      propertyCount: row.propertyCount,
      lineCount: row.lineCount,
      surfaceRole: row.surfaceRole,
      surfaceRoleReason: row.surfaceRoleReason,
      source: row.source,
      summary: `${row.name} is an untracked ${row.surfaceRole} with ${row.methodCount} method(s), ${row.propertyCount} property/accessor(s), and ${row.lineCount} line(s).`,
    }));
}

function memoryRollup(
  records: readonly AtlasMemoryRecordRow[],
  untrackedProductClassFrontiers: readonly AtlasMemoryUntrackedProductClassFrontier[],
  issues: readonly AtlasMemoryStorageIssue[],
): AtlasMemoryRollup {
  return {
    recordCount: records.length,
    byKind: countBy(records, (row) => row.kind),
    byStatus: countBy(records, (row) => row.status),
    untrackedProductClassFrontierCount: untrackedProductClassFrontiers.length,
    untrackedProductClassFrontiersByArea: countBy(
      untrackedProductClassFrontiers,
      (row) => row.area,
    ),
    untrackedProductClassFrontiersBySurfaceRole: countBy(
      untrackedProductClassFrontiers,
      (row) => row.surfaceRole,
    ),
    storageIssueCount: issues.length,
  };
}
