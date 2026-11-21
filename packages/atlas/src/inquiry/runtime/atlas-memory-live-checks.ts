import type { SourceRange } from "../locus.js";
import type { SourceProject } from "../../source/index.js";
import {
  readAtlasSelfAnalysis,
  type AtlasSelfAnalysis,
} from "./self-analysis.js";
import type { ProductArchitectureAnalysis } from "./product-architecture-analysis.js";
import type { ProductArchitectureSourceReference } from "./product-architecture-source.js";
import type {
  AtlasMemoryAtlasSelfClassCheck,
  AtlasMemoryAtlasSelfFunctionCheck,
  AtlasMemoryAtlasSelfSourceFileCheck,
  AtlasMemoryAtlasSelfVariableCheck,
  AtlasMemoryAuLinkExistsCheck,
  AtlasMemoryLiveCheck,
  AtlasMemoryLiveCheckResult,
  AtlasMemoryProductLargeClassCheck,
  AtlasMemoryRecord,
  AtlasMemorySourceDeclarationExistsCheck,
  AtlasMemorySourceFileExistsCheck,
} from "./atlas-memory-contracts.js";
import {
  type AtlasMemorySources,
  atlasMemoryRepoPathExists,
  atlasMemoryDeclarationStatus,
} from "./atlas-memory-source-helpers.js";

/** Default line threshold for durable semantic-runtime product class pressure. */
export const ATLAS_MEMORY_PRODUCT_LARGE_CLASS_LINE_THRESHOLD = 80;

/** Read atlas.self only when memory records actually contain Atlas-owned pressure checks. */
export function readAtlasMemorySelfAnalysisIfNeeded(
  sourceProject: SourceProject,
  records: readonly AtlasMemoryRecord[],
): AtlasSelfAnalysis | undefined {
  return memoryNeedsAtlasSelfAnalysis(records)
    ? readAtlasSelfAnalysis(sourceProject, {
      includeSemanticTaxonomyAnalysis: false,
    })
    : undefined;
}

/** Evaluate one durable memory live check against the current source project. */
export function evaluateAtlasMemoryLiveCheck(
  sources: AtlasMemorySources,
  product: ProductArchitectureAnalysis,
  atlasSelfAnalysis: AtlasSelfAnalysis | undefined,
  check: AtlasMemoryLiveCheck,
): AtlasMemoryLiveCheckResult {
  switch (check.kind) {
    case "product-large-class":
      return evaluateProductLargeClassCheck(sources, product, check);
    case "source-file-exists":
      return evaluateSourceFileExistsCheck(sources, check);
    case "source-declaration-exists":
      return evaluateSourceDeclarationExistsCheck(sources, check);
    case "atlas-self-source-file":
      return evaluateAtlasSelfSourceFileCheck(sources, atlasSelfAnalysis, check);
    case "atlas-self-class":
      return evaluateAtlasSelfClassCheck(sources, atlasSelfAnalysis, check);
    case "atlas-self-function":
      return evaluateAtlasSelfFunctionCheck(sources, atlasSelfAnalysis, check);
    case "atlas-self-variable":
      return evaluateAtlasSelfVariableCheck(sources, atlasSelfAnalysis, check);
    case "auLink-exists":
      return evaluateAuLinkExistsCheck(sources, product, check);
  }
}

function memoryNeedsAtlasSelfAnalysis(
  records: readonly AtlasMemoryRecord[],
): boolean {
  return records.some((record) =>
    (record.liveChecks ?? []).some((check) =>
      check.kind === "atlas-self-source-file" ||
      check.kind === "atlas-self-class" ||
      check.kind === "atlas-self-function" ||
      check.kind === "atlas-self-variable",
    ),
  );
}

function evaluateProductLargeClassCheck(
  sources: AtlasMemorySources,
  product: ProductArchitectureAnalysis,
  check: AtlasMemoryProductLargeClassCheck,
): AtlasMemoryLiveCheckResult {
  const matches = product.classSurfaces.filter((entry) =>
    entry.name === check.className &&
    (check.filePath === undefined || entry.filePath === check.filePath),
  );
  if (matches.length > 1) {
    return {
      check,
      status: "stale-check",
      summary: `Multiple class declarations match ${check.className}. Check the class name and file path.`,
    };
  }
  const row = matches[0];
  if (row === undefined) {
    return missingSurfaceCheck(sources, check, check.className, "product.architecture", product.modules, "resolved");
  }
  const lineThreshold =
    check.minLineCount ?? ATLAS_MEMORY_PRODUCT_LARGE_CLASS_LINE_THRESHOLD;
  const methodThreshold = check.minMethodCount ?? 0;
  const active =
    row.lineCount >= lineThreshold && row.methodCount >= methodThreshold;
  return {
    check,
    status: active ? "active" : "resolved",
    summary: active
      ? `${check.className} is still ${row.lineCount} line(s) with ${row.methodCount} method(s).`
      : `${check.className} is below live pressure thresholds at ${row.lineCount} line(s) and ${row.methodCount} method(s).`,
    source: row.source,
    productClass: row,
  };
}

function evaluateSourceFileExistsCheck(
  sources: AtlasMemorySources,
  check: AtlasMemorySourceFileExistsCheck,
): AtlasMemoryLiveCheckResult {
  const exists = atlasMemoryRepoPathExists(sources, check.filePath);
  return {
    check,
    status: exists ? "present" : "stale-source",
    summary: exists
      ? `${check.filePath} exists in the current checkout.`
      : `${check.filePath} is missing in the current checkout.`,
  };
}

function evaluateSourceDeclarationExistsCheck(
  sources: AtlasMemorySources,
  check: AtlasMemorySourceDeclarationExistsCheck,
): AtlasMemoryLiveCheckResult {
  if (!atlasMemoryRepoPathExists(sources, check.filePath)) {
    return {
      check,
      status: "stale-source",
      summary: `${check.filePath} is missing in the current checkout.`,
    };
  }
  const status = atlasMemoryDeclarationStatus(
    sources,
    check.filePath,
    check.symbolName,
  );
  return {
    check,
    status,
    summary: status === "out-of-scope"
      ? `${check.filePath} is outside the declaration index for this source project.`
      : status === "present"
        ? `${check.symbolName} exists in ${check.filePath}.`
        : `${check.symbolName} was not found in ${check.filePath}.`,
  };
}

function evaluateAtlasSelfSourceFileCheck(
  sources: AtlasMemorySources,
  atlasSelfAnalysis: AtlasSelfAnalysis | undefined,
  check: AtlasMemoryAtlasSelfSourceFileCheck,
): AtlasMemoryLiveCheckResult {
  if (atlasSelfAnalysis === undefined) {
    return {
      check,
      status: "stale-check",
      summary: "atlas.self analysis was not available for an atlas-self-source-file live check.",
    };
  }
  const row = atlasSelfAnalysis.sourceFileSurfaces.find((entry) =>
    entry.filePath === check.filePath,
  );
  if (row === undefined) {
    return missingSurfaceCheck(sources, check, check.filePath, "atlas.self", atlasSelfAnalysis.sourceFileSurfaces, "resolved");
  }
  const active =
    row.lineCount >= (check.minLineCount ?? 0) &&
    row.outgoingLocalImportCount >= (check.minOutgoingLocalImportCount ?? 0) &&
    row.incomingLocalImportCount >= (check.minIncomingLocalImportCount ?? 0) &&
    row.crossAreaOutgoingImportCount >= (check.minCrossAreaOutgoingImportCount ?? 0) &&
    (check.moduleShape === undefined || row.moduleShape === check.moduleShape);
  return {
    check,
    status: active ? "active" : "resolved",
    summary: active
      ? `${check.filePath} is still ${row.lineCount} line(s), ${row.moduleShape}, with ${row.outgoingLocalImportCount} outgoing local import(s), ${row.incomingLocalImportCount} incoming local import(s), and ${row.crossAreaOutgoingImportCount} cross-area outgoing import(s).`
      : `${check.filePath} is below atlas.self pressure thresholds at ${row.lineCount} line(s), ${row.moduleShape}, with ${row.outgoingLocalImportCount} outgoing local import(s), ${row.incomingLocalImportCount} incoming local import(s), and ${row.crossAreaOutgoingImportCount} cross-area outgoing import(s).`,
    source: oneBasedSourceFromSourceRange(row.source),
    atlasSelfSourceFile: row,
  };
}

function evaluateAtlasSelfClassCheck(
  sources: AtlasMemorySources,
  atlasSelfAnalysis: AtlasSelfAnalysis | undefined,
  check: AtlasMemoryAtlasSelfClassCheck,
): AtlasMemoryLiveCheckResult {
  if (atlasSelfAnalysis === undefined) {
    return {
      check,
      status: "stale-check",
      summary: "atlas.self analysis was not available for an atlas-self-class live check.",
    };
  }
  const row = atlasSelfAnalysis.classSurfaces.find((entry) =>
    entry.name === check.className &&
    (check.filePath === undefined || entry.filePath === check.filePath),
  );
  if (row === undefined) {
    return missingSurfaceCheck(sources, check, check.className, "atlas.self", atlasSelfAnalysis.sourceFileSurfaces, "resolved");
  }
  const active =
    row.lineCount >= (check.minLineCount ?? 0) &&
    row.methodCount >= (check.minMethodCount ?? 0);
  return {
    check,
    status: active ? "active" : "resolved",
    summary: active
      ? `${check.className} is still ${row.lineCount} line(s) with ${row.methodCount} method(s).`
      : `${check.className} is below atlas.self pressure thresholds at ${row.lineCount} line(s) and ${row.methodCount} method(s).`,
    source: oneBasedSourceFromSourceRange(row.source),
    atlasSelfClass: row,
  };
}

function evaluateAtlasSelfFunctionCheck(
  sources: AtlasMemorySources,
  atlasSelfAnalysis: AtlasSelfAnalysis | undefined,
  check: AtlasMemoryAtlasSelfFunctionCheck,
): AtlasMemoryLiveCheckResult {
  if (atlasSelfAnalysis === undefined) {
    return {
      check,
      status: "stale-check",
      summary: "atlas.self analysis was not available for an atlas-self-function live check.",
    };
  }
  const row = atlasSelfAnalysis.functionSurfaces.find((entry) =>
    entry.name === check.functionName &&
    (check.filePath === undefined || entry.filePath === check.filePath),
  );
  if (row === undefined) {
    return missingSurfaceCheck(sources, check, check.functionName, "atlas.self", atlasSelfAnalysis.sourceFileSurfaces, "resolved");
  }
  const active =
    row.lineCount >= (check.minLineCount ?? 0) &&
    row.callCount >= (check.minCallCount ?? 0);
  return {
    check,
    status: active ? "active" : "resolved",
    summary: active
      ? `${check.functionName} is still ${row.lineCount} line(s) with ${row.callCount} direct call(s).`
      : `${check.functionName} is below atlas.self pressure thresholds at ${row.lineCount} line(s) and ${row.callCount} direct call(s).`,
    source: oneBasedSourceFromSourceRange(row.source),
    atlasSelfFunction: row,
  };
}

function evaluateAtlasSelfVariableCheck(
  sources: AtlasMemorySources,
  atlasSelfAnalysis: AtlasSelfAnalysis | undefined,
  check: AtlasMemoryAtlasSelfVariableCheck,
): AtlasMemoryLiveCheckResult {
  if (atlasSelfAnalysis === undefined) {
    return {
      check,
      status: "stale-check",
      summary: "atlas.self analysis was not available for an atlas-self-variable live check.",
    };
  }
  const row = atlasSelfAnalysis.variableSurfaces.find((entry) =>
    entry.name === check.variableName &&
    (check.filePath === undefined || entry.filePath === check.filePath),
  );
  if (row === undefined) {
    return missingSurfaceCheck(sources, check, check.variableName, "atlas.self", atlasSelfAnalysis.sourceFileSurfaces, "resolved");
  }
  const active =
    row.lineCount >= (check.minLineCount ?? 0) &&
    (row.initializerEntryCount ?? 0) >=
      (check.minInitializerEntryCount ?? 0) &&
    (check.initializerKind === undefined ||
      row.initializerKind === check.initializerKind);
  return {
    check,
    status: active ? "active" : "resolved",
    summary: active
      ? `${check.variableName} is still ${row.lineCount} line(s) with ${row.initializerKind} initializer and ${row.initializerEntryCount ?? 0} initializer entries.`
      : `${check.variableName} is below atlas.self variable thresholds at ${row.lineCount} line(s), ${row.initializerKind} initializer, and ${row.initializerEntryCount ?? 0} initializer entries.`,
    source: oneBasedSourceFromSourceRange(row.source),
    atlasSelfVariable: row,
  };
}

function evaluateAuLinkExistsCheck(
  sources: AtlasMemorySources,
  product: ProductArchitectureAnalysis,
  check: AtlasMemoryAuLinkExistsCheck,
): AtlasMemoryLiveCheckResult {
  const row = product.classSurfaces.find((entry) =>
    entry.auLinkIds.includes(check.linkId) &&
    (check.symbolName === undefined || entry.name === check.symbolName) &&
    (check.filePath === undefined || entry.filePath === check.filePath),
  );
  if (row !== undefined) {
    return {
      check,
      status: "present",
      summary: `${check.linkId} is present on ${row.name} in ${row.filePath}.`,
      source: row.source,
      productClass: row,
    };
  }
  return missingSurfaceCheck(sources, check, check.linkId, "product.architecture", product.modules, "stale-check");
}

/** Only the owner analysis knows which files actually contributed rows to its surfaces. */
function missingSurfaceCheck(
  sources: AtlasMemorySources,
  check: AtlasMemoryLiveCheck,
  label: string,
  analysis: "atlas.self" | "product.architecture",
  files: readonly { readonly filePath: string }[],
  missingStatus: "resolved" | "stale-check",
): AtlasMemoryLiveCheckResult {
  const filePath = check.filePath;
  if (filePath !== undefined && !atlasMemoryRepoPathExists(sources, filePath)) {
    return {
      check,
      status: "stale-source",
      summary: `${label} source file is missing at ${filePath}.`,
    };
  }
  if (filePath === undefined) {
    return {
      check,
      status: "out-of-scope",
      summary: `No ${label} matched in ${analysis}. Supply its source path to establish whether this analysis covered it.`,
    };
  }
  if (!files.some(file => file.filePath === filePath)) {
    return {
      check,
      status: "out-of-scope",
      summary: `${filePath} is present in the checkout and outside the files analyzed by ${analysis}.`,
    };
  }
  return {
    check,
    status: missingStatus,
    summary: `${label} was not found in ${filePath} by ${analysis}.`,
  };
}

function oneBasedSourceFromSourceRange(
  source: SourceRange,
): ProductArchitectureSourceReference {
  return {
    filePath: source.filePath,
    startLine: source.start.line + 1,
    startCharacter: source.start.character + 1,
    endLine: source.end.line + 1,
    endCharacter: source.end.character + 1,
  };
}
