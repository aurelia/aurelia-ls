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

export function countBy<TValue>(
  rows: readonly TValue[],
  keyFor: (row: TValue) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const row of rows) {
    const key = keyFor(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
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
      "Resolved framework seed anchors against the live source declaration index.",
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
