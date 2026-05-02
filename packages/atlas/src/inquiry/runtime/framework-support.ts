import ts from "typescript";

import { FRAMEWORK_DISCOVERY_SEEDS } from "../../framework/index.js";
import type {
  SourceFileIdentity,
  SourceProject,
  SourceSpan,
  SourceTargetRow,
  TypeScriptCallSiteEntry,
} from "../../source/index.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type BasisTransition,
  type Basis,
} from "../basis.js";
import { clampBudget } from "../budget.js";
import type { Inquiry } from "../inquiry.js";
import type { SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  type NavigationRouteClaim,
} from "../navigation.js";

export function concreteExportTarget(
  targets: readonly SourceTargetRow[],
): SourceTargetRow | undefined {
  return (
    targets.find(
      (target) =>
        target.declarationKind !== "interface" &&
        target.declarationKind !== "type-alias",
    ) ?? targets[0]
  );
}

export function sourceRangeForTarget(
  target: SourceTargetRow | undefined,
): SourceRange | null {
  if (target?.file === undefined || target.span === undefined) {
    return null;
  }
  return sourceRangeFromFileSpan(target.file.repoPath, target.span);
}

export function sourceRangeForCallSiteEntry(
  callSite: TypeScriptCallSiteEntry,
): SourceRange {
  return sourceRangeFromFileSpan(callSite.file.repoPath, callSite.span);
}

export function sourceRangeFromFileSpan(
  filePath: string,
  span: {
    readonly startLine: number;
    readonly startCharacter: number;
    readonly endLine: number;
    readonly endCharacter: number;
  },
): SourceRange {
  return {
    filePath,
    start: {
      line: span.startLine - 1,
      character: span.startCharacter - 1,
    },
    end: {
      line: span.endLine - 1,
      character: span.endCharacter - 1,
    },
  };
}

export function sourceSpan(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): SourceSpan {
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  const startPosition = sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end);
  return {
    start,
    end,
    startLine: startPosition.line + 1,
    startCharacter: startPosition.character + 1,
    endLine: endPosition.line + 1,
    endCharacter: endPosition.character + 1,
  };
}

export function externalFileIdentity(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
): SourceFileIdentity {
  return {
    absolutePath: sourceFile.fileName,
    repoPath: sourceFile.fileName.replace(/\\/gu, "/") as never,
    packageId:
      sourceProject.packageForFileName(sourceFile.fileName)?.id ?? null,
  };
}

export function pageInfo(
  inquiry: Inquiry,
  returned: number,
  total: number,
  limit: number,
  nextOffset: number | undefined,
) {
  return {
    size: limit,
    cursor: inquiry.page?.cursor,
    returned,
    total,
    ...(nextOffset === undefined ? {} : { nextCursor: String(nextOffset) }),
  };
}

export function pageRows<TValue>(
  rows: readonly TValue[],
  offset: number,
  limit: number,
): { readonly rows: readonly TValue[]; readonly nextOffset?: number } {
  const page = rows.slice(offset, offset + limit);
  const nextOffset =
    offset + page.length < rows.length ? offset + page.length : undefined;
  return {
    rows: page,
    ...(nextOffset === undefined ? {} : { nextOffset }),
  };
}

export function pageOffset(inquiry: Inquiry): number {
  const cursor = inquiry.page?.cursor;
  if (cursor === undefined) {
    return 0;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function evidenceLimit(inquiry: Inquiry): number {
  return clampBudget(inquiry.budget?.evidencePerSubject, 5, 20);
}

export function frameworkDiscoverySeedBasis(): Basis {
  return {
    kind: BasisKind.AtlasContract,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Contract,
    freshness: BasisFreshness.Static,
    summary:
      "Answered from the package-local Aurelia framework discovery seeds.",
    identity: "@aurelia-ls/atlas/framework",
    version: FRAMEWORK_DISCOVERY_SEEDS.schemaVersion,
  };
}

export function sourceIndexBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptProgram,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary:
      "Resolved framework seed anchors against the daemon-prewarmed source declaration index.",
    identity: sourceProject.snapshot().identity,
  };
}

export function checkerBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.TypeScriptChecker,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary:
      "Answered from precomputed TypeScript call hierarchy over framework flow seed declarations.",
    identity: sourceProject.snapshot().identity,
  };
}

export function staticEvaluatorBasis(sourceProject: SourceProject): Basis {
  return {
    kind: BasisKind.StaticEvaluator,
    closure: BasisClosure.Budgeted,
    authority: BasisAuthority.Evaluator,
    freshness: BasisFreshness.Live,
    summary:
      "Answered from Atlas static invocation/effect tracing over checker-selected framework source roots.",
    identity: sourceProject.snapshot().identity,
  };
}

export function route(
  plane: NavigationPlane,
  relation: NavigationRelation,
  basis: readonly BasisKind[],
  summary: string,
  basisTransition?: BasisTransition,
): NavigationRouteClaim {
  return {
    plane,
    relation,
    basis,
    summary,
    ...(basisTransition === undefined ? {} : { basisTransition }),
  };
}
