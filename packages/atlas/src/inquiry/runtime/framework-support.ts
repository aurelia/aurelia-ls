import { FRAMEWORK_DISCOVERY_SEEDS } from "../../framework/index.js";
import type {
  SourceProject,
  SourceTargetRow,
  TypeScriptCallSiteEntry,
} from "../../source/index.js";
import {
  sourceRangeForTarget,
  sourceRangeFromFileSpan,
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

export { countBy } from "../../collections.js";
export {
  sourceRangeForTarget,
  sourceRangeFromFileSpan,
  sourceSpanForNode as sourceSpan,
} from "../../source/index.js";

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

export function requiredSourceRangeForTarget(
  target: SourceTargetRow | undefined,
  message: string,
): SourceRange {
  const source = sourceRangeForTarget(target);
  if (source === null) {
    throw new Error(message);
  }
  return source;
}

export function sourceRangeForCallSiteEntry(
  callSite: TypeScriptCallSiteEntry,
): SourceRange {
  return sourceRangeFromFileSpan(callSite.file.repoPath, callSite.span);
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
