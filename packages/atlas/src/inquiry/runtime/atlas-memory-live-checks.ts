import type { SourceRange } from "../locus.js";
import type { SourceProject } from "../../source/index.js";
import {
  readAtlasSelfAnalysis,
  type AtlasSelfAnalysis,
} from "./self-analysis.js";
import type { ProductArchitectureClassSurfaceRow } from "./product-architecture-analysis.js";
import type { ProductArchitectureSourceReference } from "./product-architecture-source.js";
import type {
  AtlasMemoryAtlasSelfClassCheck,
  AtlasMemoryAtlasSelfFunctionCheck,
  AtlasMemoryAtlasSelfSourceFileCheck,
  AtlasMemoryAuLinkExistsCheck,
  AtlasMemoryLiveCheck,
  AtlasMemoryLiveCheckResult,
  AtlasMemoryProductLargeClassCheck,
  AtlasMemoryRecord,
  AtlasMemorySourceDeclarationExistsCheck,
  AtlasMemorySourceFileExistsCheck,
} from "./atlas-memory-contracts.js";
import {
  atlasMemoryRepoPathExists,
  atlasMemorySourceProjectHasDeclaration,
} from "./atlas-memory-source-helpers.js";

/** Default line threshold for durable semantic-runtime product class pressure. */
export const ATLAS_MEMORY_PRODUCT_LARGE_CLASS_LINE_THRESHOLD = 80;

/** Read atlas.self only when memory records actually contain Atlas-owned pressure checks. */
export function readAtlasMemorySelfAnalysisIfNeeded(
  sourceProject: SourceProject,
  records: readonly AtlasMemoryRecord[],
): AtlasSelfAnalysis | undefined {
  return memoryNeedsAtlasSelfAnalysis(records)
    ? readAtlasSelfAnalysis(sourceProject)
    : undefined;
}

/** Evaluate one durable memory live check against the current source project. */
export function evaluateAtlasMemoryLiveCheck(
  sourceProject: SourceProject,
  productClasses: readonly ProductArchitectureClassSurfaceRow[],
  atlasSelfAnalysis: AtlasSelfAnalysis | undefined,
  check: AtlasMemoryLiveCheck,
): AtlasMemoryLiveCheckResult {
  switch (check.kind) {
    case "product-large-class":
      return evaluateProductLargeClassCheck(sourceProject, productClasses, check);
    case "source-file-exists":
      return evaluateSourceFileExistsCheck(sourceProject, check);
    case "source-declaration-exists":
      return evaluateSourceDeclarationExistsCheck(sourceProject, check);
    case "atlas-self-source-file":
      return evaluateAtlasSelfSourceFileCheck(sourceProject, atlasSelfAnalysis, check);
    case "atlas-self-class":
      return evaluateAtlasSelfClassCheck(sourceProject, atlasSelfAnalysis, check);
    case "atlas-self-function":
      return evaluateAtlasSelfFunctionCheck(sourceProject, atlasSelfAnalysis, check);
    case "auLink-exists":
      return evaluateAuLinkExistsCheck(sourceProject, productClasses, check);
  }
}

function memoryNeedsAtlasSelfAnalysis(
  records: readonly AtlasMemoryRecord[],
): boolean {
  return records.some((record) =>
    (record.liveChecks ?? []).some((check) =>
      check.kind === "atlas-self-source-file" ||
      check.kind === "atlas-self-class" ||
      check.kind === "atlas-self-function",
    ),
  );
}

function evaluateProductLargeClassCheck(
  sourceProject: SourceProject,
  productClasses: readonly ProductArchitectureClassSurfaceRow[],
  check: AtlasMemoryProductLargeClassCheck,
): AtlasMemoryLiveCheckResult {
  const row = productClasses.find((entry) =>
    entry.name === check.className &&
    (check.filePath === undefined || entry.filePath === check.filePath),
  );
  if (row === undefined) {
    return missingProductClassCheck(sourceProject, check);
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

function missingProductClassCheck(
  sourceProject: SourceProject,
  check: AtlasMemoryProductLargeClassCheck,
): AtlasMemoryLiveCheckResult {
  if (
    check.filePath !== undefined &&
    !atlasMemoryRepoPathExists(sourceProject, check.filePath)
  ) {
    return {
      check,
      status: "stale-source",
      summary: `${check.className} source file is missing at ${check.filePath}.`,
    };
  }
  return {
    check,
    status: "resolved",
    summary: `${check.className} is no longer present in product.architecture class surfaces.`,
  };
}

function evaluateSourceFileExistsCheck(
  sourceProject: SourceProject,
  check: AtlasMemorySourceFileExistsCheck,
): AtlasMemoryLiveCheckResult {
  const exists = atlasMemoryRepoPathExists(sourceProject, check.filePath);
  return {
    check,
    status: exists ? "active" : "stale-source",
    summary: exists
      ? `${check.filePath} exists in the current checkout.`
      : `${check.filePath} is missing in the current checkout.`,
  };
}

function evaluateSourceDeclarationExistsCheck(
  sourceProject: SourceProject,
  check: AtlasMemorySourceDeclarationExistsCheck,
): AtlasMemoryLiveCheckResult {
  if (!atlasMemoryRepoPathExists(sourceProject, check.filePath)) {
    return {
      check,
      status: "stale-source",
      summary: `${check.filePath} is missing in the current checkout.`,
    };
  }
  const exists = atlasMemorySourceProjectHasDeclaration(
    sourceProject,
    check.filePath,
    check.symbolName,
  );
  return {
    check,
    status: exists ? "active" : "stale-check",
    summary: exists
      ? `${check.symbolName} exists in ${check.filePath}.`
      : `${check.symbolName} was not found in ${check.filePath}.`,
  };
}

function evaluateAtlasSelfSourceFileCheck(
  sourceProject: SourceProject,
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
    return missingAtlasSelfCheck(sourceProject, check, check.filePath, "Atlas source file");
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
  sourceProject: SourceProject,
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
    return missingAtlasSelfCheck(
      sourceProject,
      check,
      check.filePath,
      `Atlas class ${check.className}`,
    );
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
  sourceProject: SourceProject,
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
    return missingAtlasSelfCheck(
      sourceProject,
      check,
      check.filePath,
      `Atlas function ${check.functionName}`,
    );
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

function evaluateAuLinkExistsCheck(
  sourceProject: SourceProject,
  productClasses: readonly ProductArchitectureClassSurfaceRow[],
  check: AtlasMemoryAuLinkExistsCheck,
): AtlasMemoryLiveCheckResult {
  const row = productClasses.find((entry) =>
    entry.auLinkIds.includes(check.linkId) &&
    (check.symbolName === undefined || entry.name === check.symbolName) &&
    (check.filePath === undefined || entry.filePath === check.filePath),
  );
  if (row !== undefined) {
    return {
      check,
      status: "active",
      summary: `${check.linkId} is present on ${row.name} in ${row.filePath}.`,
      source: row.source,
      productClass: row,
    };
  }
  if (
    check.filePath !== undefined &&
    !atlasMemoryRepoPathExists(sourceProject, check.filePath)
  ) {
    return {
      check,
      status: "stale-source",
      summary: `${check.linkId} source file is missing at ${check.filePath}.`,
    };
  }
  return {
    check,
    status: "stale-check",
    summary: `${check.linkId} was not found in semantic-runtime auLink class surfaces.`,
  };
}

function missingAtlasSelfCheck(
  sourceProject: SourceProject,
  check:
    | AtlasMemoryAtlasSelfSourceFileCheck
    | AtlasMemoryAtlasSelfClassCheck
    | AtlasMemoryAtlasSelfFunctionCheck,
  filePath: string | undefined,
  label: string,
): AtlasMemoryLiveCheckResult {
  if (
    filePath !== undefined &&
    !atlasMemoryRepoPathExists(sourceProject, filePath)
  ) {
    return {
      check,
      status: "stale-source",
      summary: `${label} source file is missing at ${filePath}.`,
    };
  }
  return {
    check,
    status: "resolved",
    summary: `${label} is no longer present in atlas.self analysis.`,
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
