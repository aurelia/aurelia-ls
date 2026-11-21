import { isRecord } from "../../collections.js";
import { normalizeAtlasMemoryRepoPath } from "./atlas-memory-source-helpers.js";
import {
  ATLAS_MEMORY_SCHEMA_VERSION,
  type AtlasMemoryAnchor,
  type AtlasMemoryAtlasSelfSourceFileCheck,
  type AtlasMemoryAtlasSelfVariableCheck,
  type AtlasMemoryLiveCheck,
  type AtlasMemoryManifest,
  type AtlasMemoryRecord,
  type AtlasMemoryRecordKind,
  type AtlasMemoryShardReference,
  type AtlasMemoryStorageIssue,
} from "./atlas-memory-contracts.js";
import type { AtlasSelfSourceFileModuleShape } from "./self-analysis.js";

/** Normalize the root Atlas memory manifest and report malformed shard references. */
export function normalizeAtlasMemoryManifest(
  storagePath: string,
  value: unknown,
  issues: AtlasMemoryStorageIssue[],
): AtlasMemoryManifest | null {
  if (!isRecord(value)) {
    issues.push({
      id: "atlas.memory:invalid-manifest",
      summary: "Atlas memory manifest root must be an object.",
    });
    return null;
  }
  if (value.schemaVersion !== ATLAS_MEMORY_SCHEMA_VERSION) {
    issues.push({
      id: "atlas.memory:schema-version",
      summary: `Expected schemaVersion ${ATLAS_MEMORY_SCHEMA_VERSION}.`,
    });
  }
  if (!Array.isArray(value.shards)) {
    issues.push({
      id: "atlas.memory:manifest-shards",
      summary: `Atlas memory manifest ${storagePath} must declare a shards array.`,
    });
    return null;
  }
  const shards: AtlasMemoryShardReference[] = [];
  const seenPaths = new Set<string>();
  for (const [index, entry] of value.shards.entries()) {
    const shard = normalizeShardReference(entry);
    if (shard === null) {
      issues.push({
        id: `atlas.memory:manifest-shard:${index}`,
        summary: `Atlas memory manifest shard ${index} is not valid.`,
      });
    } else if (seenPaths.has(shard.path)) {
      issues.push({
        id: `atlas.memory:manifest-shard:${index}:duplicate-path`,
        summary: `Atlas memory manifest lists ${shard.path} more than once.`,
      });
    } else {
      seenPaths.add(shard.path);
      shards.push(shard);
    }
  }
  return {
    schemaVersion: ATLAS_MEMORY_SCHEMA_VERSION,
    shards,
  };
}

/** Validate the shard envelope before reading records by their authored array index. */
export function atlasMemoryShardEntries(
  shardPath: string,
  value: unknown,
  issues: AtlasMemoryStorageIssue[],
): readonly unknown[] {
  if (!isRecord(value)) {
    issues.push({
      id: `atlas.memory:shard:${shardPath}:invalid`,
      summary: `Atlas memory shard ${shardPath} root must be an object.`,
    });
    return [];
  }
  if (value.schemaVersion !== ATLAS_MEMORY_SCHEMA_VERSION) {
    issues.push({
      id: `atlas.memory:shard:${shardPath}:schema-version`,
      summary: `Atlas memory shard ${shardPath} expected schemaVersion ${ATLAS_MEMORY_SCHEMA_VERSION}.`,
    });
  }
  if (!Array.isArray(value.records)) {
    issues.push({
      id: `atlas.memory:shard:${shardPath}:records`,
      summary: `Atlas memory shard ${shardPath} records must be an array.`,
    });
    return [];
  }

  return value.records;
}

function normalizeShardReference(
  value: unknown,
): AtlasMemoryShardReference | null {
  if (!isRecord(value)) {
    return null;
  }
  const shardPath = stringFieldValue(value, "path");
  return shardPath === undefined
    ? null
    : {
      path: normalizeAtlasMemoryRepoPath(shardPath),
      summary: stringFieldValue(value, "summary"),
    };
}

export function normalizeAtlasMemoryRecord(
  index: number | string,
  value: unknown,
  issues: AtlasMemoryStorageIssue[],
): AtlasMemoryRecord | null {
  if (!isRecord(value)) {
    issues.push(recordIssue(index, "Record must be an object."));
    return null;
  }
  const id = stringFieldValue(value, "id");
  const kind = recordKindValue(value.kind);
  const summary = stringFieldValue(value, "summary");
  if (id === undefined || kind === undefined || summary === undefined) {
    issues.push(
      recordIssue(index, "Record requires string id, known kind, and summary."),
    );
    return null;
  }
  if (value.archived !== undefined && typeof value.archived !== "boolean") {
    issues.push(recordIssue(id, "archived must be a boolean."));
    return null;
  }
  // Older v1 records used "hidden" to take a record out of current guidance.
  const legacyPolicy = value.nextActionPolicy;
  if (legacyPolicy !== undefined && legacyPolicy !== "hidden" && legacyPolicy !== "when-touched" && legacyPolicy !== "proactive") {
    issues.push(recordIssue(id, "Unknown nextActionPolicy."));
    return null;
  }
  const liveChecks = normalizeLiveChecks(value.liveChecks, id, issues);
  if ((kind === "pressure-frontier" || kind === "intentional-shape") && liveChecks.length === 0) {
    issues.push({
      id: `atlas.memory:record:${id}:missing-live-check`,
      summary: `${kind} record ${id} needs at least one liveCheck to compute its status.`,
    });
  }

  return {
    id,
    kind,
    domains: stringArrayValue(value.domains),
    summary,
    rationale: stringFieldValue(value, "rationale"),
    guidance: optionalStringArrayValue(value.guidance),
    archived: value.archived ?? (legacyPolicy === "hidden" ? true : undefined),
    anchors: normalizeAnchors(value.anchors, id, issues),
    liveChecks,
    createdAt: stringFieldValue(value, "createdAt"),
    updatedAt: stringFieldValue(value, "updatedAt"),
  };
}

function normalizeAnchors(
  value: unknown,
  recordId: string,
  issues: AtlasMemoryStorageIssue[],
): readonly AtlasMemoryAnchor[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push(recordIssue(recordId, "anchors must be an array."));
    return [];
  }
  const anchors: AtlasMemoryAnchor[] = [];
  for (const [index, entry] of value.entries()) {
    if (isRecord(entry) && entry.kind === "lens") {
      const unknown = Object.keys(entry).filter(key => !lensAnchorFields.has(key));
      if (unknown.length > 0 || (entry.filters !== undefined && !isRecord(entry.filters))) {
        issues.push(recordIssue(recordId,
          `anchors[${index}] has an invalid lens selection (${unknown.join(", ") || "filters"}). Use projection and a filters object.`));
        continue;
      }
    }
    const anchor = normalizeAnchor(entry);
    if (anchor === null) {
      issues.push(recordIssue(recordId, `anchors[${index}] is not valid.`));
    } else {
      anchors.push(anchor);
    }
  }
  return anchors;
}

const lensAnchorFields = new Set(["kind", "lensId", "projection", "filters", "summary"]);

function normalizeAnchor(value: unknown): AtlasMemoryAnchor | null {
  if (!isRecord(value)) {
    return null;
  }
  switch (value.kind) {
    case "source": {
      const filePath = stringFieldValue(value, "filePath");
      return filePath === undefined
        ? null
        : {
          kind: "source",
          filePath: normalizeAtlasMemoryRepoPath(filePath),
          symbolName: stringFieldValue(value, "symbolName"),
          line: numberFieldValue(value, "line"),
          summary: stringFieldValue(value, "summary"),
        };
    }
    case "lens": {
      const lensId = stringFieldValue(value, "lensId");
      return lensId === undefined
        ? null
        : {
          kind: "lens",
          lensId,
          projection: stringFieldValue(value, "projection"),
          filters: isRecord(value.filters) ? value.filters : undefined,
          summary: stringFieldValue(value, "summary"),
        };
    }
    case "script": {
      const command = stringFieldValue(value, "command");
      return command === undefined
        ? null
        : {
          kind: "script",
          command,
          summary: stringFieldValue(value, "summary"),
        };
    }
    case "doc": {
      const docPath = stringFieldValue(value, "path");
      return docPath === undefined
        ? null
        : {
          kind: "doc",
          path: normalizeAtlasMemoryRepoPath(docPath),
          heading: stringFieldValue(value, "heading"),
          summary: stringFieldValue(value, "summary"),
        };
    }
    case "fixture": {
      const fixturePath = stringFieldValue(value, "path");
      return fixturePath === undefined
        ? null
        : {
          kind: "fixture",
          path: normalizeAtlasMemoryRepoPath(fixturePath),
          scenario: stringFieldValue(value, "scenario"),
          summary: stringFieldValue(value, "summary"),
        };
    }
    case "auLink": {
      const linkId = stringFieldValue(value, "linkId");
      return linkId === undefined
        ? null
        : {
          kind: "auLink",
          linkId,
          symbolName: stringFieldValue(value, "symbolName"),
          summary: stringFieldValue(value, "summary"),
        };
    }
    case "external": {
      const url = stringFieldValue(value, "url");
      return url === undefined
        ? null
        : {
          kind: "external",
          url,
          summary: stringFieldValue(value, "summary"),
        };
    }
    default:
      return null;
  }
}

function normalizeLiveChecks(
  value: unknown,
  recordId: string,
  issues: AtlasMemoryStorageIssue[],
): readonly AtlasMemoryLiveCheck[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push(recordIssue(recordId, "liveChecks must be an array."));
    return [];
  }
  const checks: AtlasMemoryLiveCheck[] = [];
  for (const [index, entry] of value.entries()) {
    const check = normalizeLiveCheck(entry);
    if (check === null) {
      issues.push(recordIssue(recordId, `liveChecks[${index}] is not valid.`));
    } else {
      checks.push(check);
    }
  }
  return checks;
}

function normalizeLiveCheck(value: unknown): AtlasMemoryLiveCheck | null {
  if (!isRecord(value)) {
    return null;
  }
  switch (value.kind) {
    case "product-large-class": {
      const className = stringFieldValue(value, "className");
      return className === undefined
        ? null
        : {
          kind: "product-large-class",
          className,
          filePath: normalizeOptionalRepoPath(stringFieldValue(value, "filePath")),
          minLineCount: numberFieldValue(value, "minLineCount"),
          minMethodCount: numberFieldValue(value, "minMethodCount"),
        };
    }
    case "source-file-exists": {
      const filePath = stringFieldValue(value, "filePath");
      return filePath === undefined
        ? null
        : {
          kind: "source-file-exists",
          filePath: normalizeAtlasMemoryRepoPath(filePath),
        };
    }
    case "source-declaration-exists": {
      const filePath = stringFieldValue(value, "filePath");
      const symbolName = stringFieldValue(value, "symbolName");
      return filePath === undefined || symbolName === undefined
        ? null
        : {
          kind: "source-declaration-exists",
          filePath: normalizeAtlasMemoryRepoPath(filePath),
          symbolName,
        };
    }
    case "atlas-self-source-file": {
      const filePath = stringFieldValue(value, "filePath");
      return filePath === undefined
        ? null
        : atlasSelfSourceFileCheck(value, filePath);
    }
    case "atlas-self-class": {
      const className = stringFieldValue(value, "className");
      return className === undefined
        ? null
        : {
          kind: "atlas-self-class",
          className,
          filePath: normalizeOptionalRepoPath(stringFieldValue(value, "filePath")),
          minLineCount: numberFieldValue(value, "minLineCount"),
          minMethodCount: numberFieldValue(value, "minMethodCount"),
        };
    }
    case "atlas-self-function": {
      const functionName = stringFieldValue(value, "functionName");
      return functionName === undefined
        ? null
        : {
          kind: "atlas-self-function",
          functionName,
          filePath: normalizeOptionalRepoPath(stringFieldValue(value, "filePath")),
          minLineCount: numberFieldValue(value, "minLineCount"),
          minCallCount: numberFieldValue(value, "minCallCount"),
        };
    }
    case "atlas-self-variable": {
      const variableName = stringFieldValue(value, "variableName");
      return variableName === undefined
        ? null
        : atlasSelfVariableCheck(value, variableName);
    }
    case "auLink-exists": {
      const linkId = stringFieldValue(value, "linkId");
      return linkId === undefined
        ? null
        : {
          kind: "auLink-exists",
          linkId,
          symbolName: stringFieldValue(value, "symbolName"),
          filePath: normalizeOptionalRepoPath(stringFieldValue(value, "filePath")),
        };
    }
    default:
      return null;
  }
}

function atlasSelfVariableCheck(
  value: Record<string, unknown>,
  variableName: string,
): AtlasMemoryAtlasSelfVariableCheck {
  return {
    kind: "atlas-self-variable",
    variableName,
    filePath: normalizeOptionalRepoPath(stringFieldValue(value, "filePath")),
    minLineCount: numberFieldValue(value, "minLineCount"),
    minInitializerEntryCount: numberFieldValue(
      value,
      "minInitializerEntryCount",
    ),
    initializerKind: atlasSelfVariableInitializerKindValue(value.initializerKind),
  };
}

function atlasSelfSourceFileCheck(
  value: Record<string, unknown>,
  filePath: string,
): AtlasMemoryAtlasSelfSourceFileCheck {
  return {
    kind: "atlas-self-source-file",
    filePath: normalizeAtlasMemoryRepoPath(filePath),
    minLineCount: numberFieldValue(value, "minLineCount"),
    minOutgoingLocalImportCount: numberFieldValue(
      value,
      "minOutgoingLocalImportCount",
    ),
    minIncomingLocalImportCount: numberFieldValue(
      value,
      "minIncomingLocalImportCount",
    ),
    minCrossAreaOutgoingImportCount: numberFieldValue(
      value,
      "minCrossAreaOutgoingImportCount",
    ),
    moduleShape: atlasSelfSourceFileModuleShapeValue(value.moduleShape),
  };
}

export function recordKindValue(value: unknown): AtlasMemoryRecordKind | undefined {
  switch (value) {
    case "pressure-frontier":
    case "intentional-shape":
    case "reuse-guide":
    case "decision":
    case "doc-shard":
      return value;
    default:
      return undefined;
  }
}

function atlasSelfVariableInitializerKindValue(
  value: unknown,
): AtlasMemoryAtlasSelfVariableCheck["initializerKind"] | undefined {
  switch (value) {
    case "array-literal":
    case "object-literal":
    case "function-like":
    case "call":
    case "new":
    case "literal":
    case "identifier":
    case "property-access":
    case "none":
    case "other":
      return value;
    default:
      return undefined;
  }
}

function atlasSelfSourceFileModuleShapeValue(
  value: unknown,
): AtlasSelfSourceFileModuleShape | undefined {
  switch (value) {
    case "barrel":
    case "catalog":
    case "contract":
    case "implementation":
    case "mixed":
      return value;
    default:
      return undefined;
  }
}

function stringFieldValue(
  source: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberFieldValue(
  source: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function stringArrayValue(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string =>
      typeof entry === "string" && entry.length > 0,
    )
    : [];
}

function optionalStringArrayValue(
  value: unknown,
): readonly string[] | undefined {
  const strings = stringArrayValue(value);
  return strings.length === 0 ? undefined : strings;
}

function normalizeOptionalRepoPath(value: string | undefined): string | undefined {
  return value === undefined ? undefined : normalizeAtlasMemoryRepoPath(value);
}

function recordIssue(
  indexOrId: number | string,
  summary: string,
): AtlasMemoryStorageIssue {
  return {
    id: `atlas.memory:record:${indexOrId}`,
    summary,
  };
}
