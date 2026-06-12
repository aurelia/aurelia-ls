import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { countBy } from "../../collections.js";
import { LensCatalog } from "../lens.js";
import type { SourceProject } from "../../source/index.js";
import type { ProductArchitectureClassSurfaceRow } from "./product-architecture-analysis.js";
import {
  type AtlasMemoryAuLinkAnchor,
  type AtlasMemoryRecord,
  type AtlasMemoryScriptAnchor,
  type AtlasMemoryStorageIssue,
  type AtlasMemoryStoredRecord,
} from "./atlas-memory-contracts.js";
import {
  ATLAS_MEMORY_PRODUCT_LARGE_CLASS_LINE_THRESHOLD,
} from "./atlas-memory-live-checks.js";
import { atlasMemoryProductClassKey } from "./atlas-memory-product-class-key.js";
import {
  atlasMemoryRepoPathExists,
  atlasMemorySourceProjectHasDeclaration,
} from "./atlas-memory-source-helpers.js";

/** Validate durable memory records against live source, lens, and package-script contracts. */
export function atlasMemoryIntegrityIssues(
  sourceProject: SourceProject,
  productClasses: readonly ProductArchitectureClassSurfaceRow[],
  storedRecords: readonly AtlasMemoryStoredRecord[],
): readonly AtlasMemoryStorageIssue[] {
  const records = storedRecords.map((stored) => stored.record);
  const trackedProductClassKeys = trackedProductLargeClassKeys(records);
  return [
    ...duplicateRecordIdIssues(records),
    ...records.flatMap((record) => [
      ...recordDurabilityIssues(record),
      ...anchorIntegrityIssues(sourceProject, productClasses, record),
      ...sourceClassAnchorLiveCheckIssues(
        productClasses,
        trackedProductClassKeys,
        record,
      ),
    ]),
  ];
}

function duplicateRecordIdIssues(
  records: readonly AtlasMemoryRecord[],
): readonly AtlasMemoryStorageIssue[] {
  const counts = countBy(records, (record) => record.id);
  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({
      id: `atlas.memory:record:${id}:duplicate-id`,
      summary: `Memory record id ${id} appears ${count} times; ids must be stable and unique.`,
    }));
}

function recordDurabilityIssues(
  record: AtlasMemoryRecord,
): readonly AtlasMemoryStorageIssue[] {
  if (
    (record.kind === "pressure-frontier" || record.kind === "intentional-shape") &&
    (record.liveChecks ?? []).length === 0
  ) {
    return [
      {
        id: `atlas.memory:record:${record.id}:missing-live-check`,
        summary: `${record.kind} record ${record.id} needs at least one liveCheck so its status is not prose-only.`,
      },
    ];
  }
  return [];
}

function anchorIntegrityIssues(
  sourceProject: SourceProject,
  productClasses: readonly ProductArchitectureClassSurfaceRow[],
  record: AtlasMemoryRecord,
): readonly AtlasMemoryStorageIssue[] {
  return (record.anchors ?? []).flatMap((anchor, index) => {
    if (anchor.kind === "external") {
      return [];
    }
    if (anchor.kind !== "source" && anchor.kind !== "doc" && anchor.kind !== "fixture") {
      return anchor.kind === "lens"
        ? lensAnchorIntegrityIssues(record, anchor.lensId, anchor.projection, index)
        : anchor.kind === "script"
          ? scriptAnchorIntegrityIssues(sourceProject, record, anchor, index)
          : auLinkAnchorIntegrityIssues(productClasses, record, anchor, index);
    }
    const filePath = anchor.kind === "source" ? anchor.filePath : anchor.path;
    const issues: AtlasMemoryStorageIssue[] = [];
    if (!atlasMemoryRepoPathExists(sourceProject, filePath)) {
      issues.push({
        id: `atlas.memory:record:${record.id}:anchor:${index}:missing-path`,
        summary: `Memory record ${record.id} has a ${anchor.kind} anchor pointing at missing path ${filePath}.`,
      });
      return issues;
    }
    if (
      anchor.kind === "source" &&
      anchor.symbolName !== undefined &&
      !atlasMemorySourceProjectHasDeclaration(
        sourceProject,
        anchor.filePath,
        anchor.symbolName,
      )
    ) {
      issues.push({
        id: `atlas.memory:record:${record.id}:anchor:${index}:missing-symbol`,
        summary: `Memory record ${record.id} points at ${anchor.symbolName} in ${anchor.filePath}, but the source project did not find that declaration there.`,
      });
    }
    return issues;
  });
}

function auLinkAnchorIntegrityIssues(
  productClasses: readonly ProductArchitectureClassSurfaceRow[],
  record: AtlasMemoryRecord,
  anchor: AtlasMemoryAuLinkAnchor,
  index: number,
): readonly AtlasMemoryStorageIssue[] {
  const found = productClasses.some((row) =>
    row.auLinkIds.includes(anchor.linkId) &&
    (anchor.symbolName === undefined || row.name === anchor.symbolName),
  );
  return found
    ? []
    : [
      {
        id: `atlas.memory:record:${record.id}:anchor:${index}:unknown-aulink`,
        summary: `Memory record ${record.id} points at auLink ${anchor.linkId}, but product.architecture did not find a matching semantic-runtime decorator placement.`,
      },
    ];
}

function lensAnchorIntegrityIssues(
  record: AtlasMemoryRecord,
  lensId: string,
  projection: string | undefined,
  index: number,
): readonly AtlasMemoryStorageIssue[] {
  const lens = LensCatalog.find((spec) => spec.id === lensId);
  if (lens === undefined) {
    return [
      {
        id: `atlas.memory:record:${record.id}:anchor:${index}:unknown-lens`,
        summary: `Memory record ${record.id} points at unknown lens ${lensId}.`,
      },
    ];
  }
  if (
    projection !== undefined &&
    !lens.projections.some((knownProjection) => knownProjection.id === projection)
  ) {
    return [
      {
        id: `atlas.memory:record:${record.id}:anchor:${index}:unknown-projection`,
        summary: `Memory record ${record.id} points at ${lensId} projection ${projection}, but LensCatalog does not declare that projection.`,
      },
    ];
  }
  return [];
}

function scriptAnchorIntegrityIssues(
  sourceProject: SourceProject,
  record: AtlasMemoryRecord,
  anchor: AtlasMemoryScriptAnchor,
  index: number,
): readonly AtlasMemoryStorageIssue[] {
  const command = recognizedPnpmFilterCommand(anchor.command);
  if (command === undefined) {
    return [];
  }
  const packageJsonPath = packageJsonPathForFilterPackage(command.packageName);
  if (packageJsonPath === undefined) {
    return [
      {
        id: `atlas.memory:record:${record.id}:anchor:${index}:unknown-script-package`,
        summary: `Memory record ${record.id} points at package script ${anchor.command}, but Atlas memory does not know package ${command.packageName}.`,
      },
    ];
  }
  const absolutePackageJsonPath = path.join(sourceProject.repoRoot, packageJsonPath);
  if (!existsSync(absolutePackageJsonPath)) {
    return [
      {
        id: `atlas.memory:record:${record.id}:anchor:${index}:missing-script-package`,
        summary: `Memory record ${record.id} points at package script ${anchor.command}, but ${packageJsonPath} does not exist.`,
      },
    ];
  }
  const scripts = packageScripts(absolutePackageJsonPath);
  if (scripts === undefined) {
    return [
      {
        id: `atlas.memory:record:${record.id}:anchor:${index}:invalid-script-package`,
        summary: `Memory record ${record.id} points at package script ${anchor.command}, but ${packageJsonPath} could not be read as a package manifest.`,
      },
    ];
  }
  return Object.hasOwn(scripts, command.scriptName)
    ? []
    : [
      {
        id: `atlas.memory:record:${record.id}:anchor:${index}:unknown-script`,
        summary: `Memory record ${record.id} points at script ${command.scriptName} in ${command.packageName}, but that package.json script is not declared.`,
      },
    ];
}

function recognizedPnpmFilterCommand(
  command: string,
): { readonly packageName: string; readonly scriptName: string } | undefined {
  const match = /^pnpm --filter ([^\s]+) ([^\s]+)(?:\s|$)/u.exec(command);
  if (match === null) {
    return undefined;
  }
  const [, packageName, scriptName] = match;
  if (packageName === undefined || scriptName === undefined) {
    return undefined;
  }
  return { packageName, scriptName };
}

function packageJsonPathForFilterPackage(packageName: string): string | undefined {
  switch (packageName) {
    case "@aurelia-ls/atlas":
      return "packages/atlas/package.json";
    case "@aurelia-ls/semantic-runtime":
      return "packages/semantic-runtime/package.json";
    case "@aurelia-ls/mcp":
      return "packages/mcp/package.json";
    default:
      return undefined;
  }
}

function packageScripts(
  absolutePackageJsonPath: string,
): Readonly<Record<string, unknown>> | undefined {
  try {
    const parsed = JSON.parse(readFileSync(absolutePackageJsonPath, "utf8")) as unknown;
    return parsed !== null &&
      typeof parsed === "object" &&
      "scripts" in parsed &&
      parsed.scripts !== null &&
      typeof parsed.scripts === "object" &&
      !Array.isArray(parsed.scripts)
      ? parsed.scripts as Readonly<Record<string, unknown>>
      : undefined;
  } catch {
    return undefined;
  }
}

function trackedProductLargeClassKeys(
  records: readonly AtlasMemoryRecord[],
): ReadonlySet<string> {
  return new Set(
    records.flatMap((record) =>
      (record.liveChecks ?? []).flatMap((check) =>
        check.kind === "product-large-class"
          ? [atlasMemoryProductClassKey(check)]
          : [],
      ),
    ),
  );
}

function sourceClassAnchorLiveCheckIssues(
  productClasses: readonly ProductArchitectureClassSurfaceRow[],
  trackedProductClassKeys: ReadonlySet<string>,
  record: AtlasMemoryRecord,
): readonly AtlasMemoryStorageIssue[] {
  if (record.kind !== "pressure-frontier" && record.kind !== "intentional-shape") {
    return [];
  }
  return (record.anchors ?? []).flatMap((anchor, index) => {
    if (anchor.kind !== "source" || anchor.symbolName === undefined) {
      return [];
    }
    const productClass = productClasses.find((row) =>
      row.filePath === anchor.filePath && row.name === anchor.symbolName,
    );
    if (
      productClass === undefined ||
      productClass.lineCount < ATLAS_MEMORY_PRODUCT_LARGE_CLASS_LINE_THRESHOLD ||
      trackedProductClassKeys.has(atlasMemoryProductClassKey(productClass))
    ) {
      return [];
    }
    return [
      {
        id: `atlas.memory:record:${record.id}:anchor:${index}:missing-product-class-check`,
        summary: `${record.kind} record ${record.id} anchors large class ${anchor.symbolName} but no memory record live-checks that product class.`,
      },
    ];
  });
}
