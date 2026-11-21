import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { countBy } from "../../collections.js";
import { OpenSeamKind, type OpenSeam } from "../evidence.js";
import { LensCatalog } from "../lens.js";
import type { ProductArchitectureAnalysis, ProductArchitectureClassSurfaceRow } from "./product-architecture-analysis.js";
import {
  type AtlasMemoryAuLinkAnchor,
  type AtlasMemoryAnalysis,
  type AtlasMemoryDocAnchor,
  type AtlasMemoryRecord,
  type AtlasMemoryScriptAnchor,
  type AtlasMemoryStorageIssue,
} from "./atlas-memory-contracts.js";
import {
  ATLAS_MEMORY_PRODUCT_LARGE_CLASS_LINE_THRESHOLD,
} from "./atlas-memory-live-checks.js";
import { atlasMemoryProductClassKey } from "./atlas-memory-product-class-key.js";
import {
  type AtlasMemorySources,
  atlasMemoryRepoPathExists,
  atlasMemoryDeclarationStatus,
} from "./atlas-memory-source-helpers.js";

/** Validate durable memory records against live source, lens, and package-script contracts. */
export function atlasMemoryIntegrityIssues(
  sources: AtlasMemorySources,
  product: ProductArchitectureAnalysis,
  records: readonly AtlasMemoryRecord[],
  trackedProductClassKeys: ReadonlySet<string>,
): Pick<AtlasMemoryAnalysis, "issues" | "scopeGaps"> {
  const issues = [...duplicateRecordIdIssues(records)];
  const scopeGaps: Array<OpenSeam & { recordId: string }> = [];
  for (const record of records) {
    for (const finding of anchorIntegrityIssues(sources, product, record)) {
      if ("kind" in finding) scopeGaps.push({ ...finding, recordId: record.id });
      else issues.push(finding);
    }
    issues.push(...sourceClassAnchorLiveCheckIssues(product.classSurfaces, trackedProductClassKeys, record));
  }
  return { issues, scopeGaps };
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

function anchorIntegrityIssues(
  sources: AtlasMemorySources,
  product: ProductArchitectureAnalysis,
  record: AtlasMemoryRecord,
): readonly (AtlasMemoryStorageIssue | OpenSeam)[] {
  return (record.anchors ?? []).flatMap<AtlasMemoryStorageIssue | OpenSeam>((anchor, index) => {
    if (anchor.kind === "external") {
      return [];
    }
    if (anchor.kind !== "source" && anchor.kind !== "doc" && anchor.kind !== "fixture") {
      return anchor.kind === "lens"
        ? lensAnchorIntegrityIssues(record, anchor.lensId, anchor.projection, index)
        : anchor.kind === "script"
          ? scriptAnchorIntegrityIssues(sources, record, anchor, index)
          : auLinkAnchorIntegrityIssues(sources, product, record, anchor, index);
    }
    const filePath = anchor.kind === "source" ? anchor.filePath : anchor.path;
    const issues: AtlasMemoryStorageIssue[] = [];
    if (!atlasMemoryRepoPathExists(sources, filePath)) {
      issues.push({
        id: `atlas.memory:record:${record.id}:anchor:${index}:missing-path`,
        summary: `Memory record ${record.id} has a ${anchor.kind} anchor pointing at missing path ${filePath}.`,
      });
      return issues;
    }
    if (anchor.kind === "source" && anchor.symbolName !== undefined) {
      const status = atlasMemoryDeclarationStatus(sources, anchor.filePath, anchor.symbolName);
      if (status === "out-of-scope") return [{
        kind: OpenSeamKind.InsufficientBasis,
        id: `atlas.memory:record:${record.id}:anchor:${index}:out-of-scope`,
        summary: `Checking ${anchor.symbolName} for ${record.id} requires admitting ${anchor.filePath} to the declaration index.`,
      }];
      if (status === "stale-check") issues.push({
        id: `atlas.memory:record:${record.id}:anchor:${index}:missing-symbol`,
        summary: `Memory record ${record.id} points at ${anchor.symbolName} in ${anchor.filePath}, but the source project did not find that declaration there.`,
      });
    }
    if (anchor.kind === "doc") {
      issues.push(...docAnchorHeadingIssues(sources, record, anchor, index));
    }
    return issues;
  });
}

function docAnchorHeadingIssues(
  sources: AtlasMemorySources,
  record: AtlasMemoryRecord,
  anchor: AtlasMemoryDocAnchor,
  index: number,
): readonly AtlasMemoryStorageIssue[] {
  if (anchor.heading === undefined) {
    return [];
  }
  let text: string;
  try {
    text = readFileSync(path.join(sources.project.repoRoot, anchor.path), "utf8");
  } catch {
    return [{
      id: `atlas.memory:record:${record.id}:anchor:${index}:unreadable-doc`,
      summary: `Memory record ${record.id} cites a heading in ${anchor.path}, but its text could not be read.`,
    }];
  }
  const wanted = anchor.heading.trim().toLowerCase();
  const found = text.split(/\r?\n/u).some((line) => {
    const match = /^#{1,6} +(.*)$/u.exec(line);
    return match?.[1] !== undefined && match[1].trim().toLowerCase() === wanted;
  });
  return found
    ? []
    : [
      {
        id: `atlas.memory:record:${record.id}:anchor:${index}:missing-doc-heading`,
        summary: `Memory record ${record.id} cites heading '${anchor.heading}' in ${anchor.path}, but no markdown heading with that text exists there; update the heading or drop it.`,
      },
    ];
}

function auLinkAnchorIntegrityIssues(
  sources: AtlasMemorySources,
  product: ProductArchitectureAnalysis,
  record: AtlasMemoryRecord,
  anchor: AtlasMemoryAuLinkAnchor,
  index: number,
): readonly (AtlasMemoryStorageIssue | OpenSeam)[] {
  const found = product.classSurfaces.some((row) =>
    row.auLinkIds.includes(anchor.linkId) &&
    (anchor.symbolName === undefined || row.name === anchor.symbolName),
  );
  if (found) return [];
  const excludedPlacement = record.liveChecks?.find(check =>
    check.kind === "auLink-exists" && check.linkId === anchor.linkId &&
    (anchor.symbolName === undefined || anchor.symbolName === check.symbolName) &&
    check.filePath !== undefined && !product.modules.some(row => row.filePath === check.filePath) &&
    atlasMemoryRepoPathExists(sources, check.filePath),
  );
  if (product.modules.length === 0 || excludedPlacement !== undefined) return [{
    kind: OpenSeamKind.InsufficientBasis,
    id: `atlas.memory:record:${record.id}:anchor:${index}:out-of-scope`,
    summary: `Checking auLink ${anchor.linkId} for ${record.id} requires admitting ${excludedPlacement?.filePath ?? "semantic-runtime source"} to product.architecture.`,
  }];
  return [{
    id: `atlas.memory:record:${record.id}:anchor:${index}:unknown-aulink`,
    summary: `Memory record ${record.id} points at auLink ${anchor.linkId}, but product.architecture did not find a matching semantic-runtime decorator placement.`,
  }];
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
  sources: AtlasMemorySources,
  record: AtlasMemoryRecord,
  anchor: AtlasMemoryScriptAnchor,
  index: number,
): readonly AtlasMemoryStorageIssue[] {
  const issue = packageScriptAnchorIssue(sources.project.repoRoot, anchor.command);
  return issue === undefined ? [] : [{
    id: `atlas.memory:record:${record.id}:anchor:${index}:${issue.kind}`,
    summary: `Memory record ${record.id}: ${issue.summary}`,
  }];
}

/** Check package scripts that Atlas can resolve from an exact pnpm --filter command. */
export function packageScriptAnchorIssue(
  repoRoot: string,
  text: string,
): { readonly kind: string; readonly summary: string } | undefined {
  const command = recognizedPnpmFilterCommand(text);
  if (command === undefined) return undefined;
  const packageJsonPath = packageJsonPathForFilterPackage(command.packageName);
  if (packageJsonPath === undefined) {
    return { kind: "unknown-script-package", summary: `No package manifest mapping for ${command.packageName} in ${text}.` };
  }
  const absolutePath = path.join(repoRoot, packageJsonPath);
  if (!existsSync(absolutePath)) {
    return { kind: "missing-script-package", summary: `Missing ${packageJsonPath} for ${text}.` };
  }
  const scripts = packageScripts(absolutePath);
  if (scripts === undefined) {
    return { kind: "invalid-script-package", summary: `Could not read scripts from ${packageJsonPath} for ${text}.` };
  }
  if (!Object.hasOwn(scripts, command.scriptName)) {
    return { kind: "unknown-script", summary: `Script ${command.scriptName} is absent from ${packageJsonPath}.` };
  }
  return undefined;
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
    case "@aurelia-ls/patterns":
      return "packages/patterns/package.json";
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
