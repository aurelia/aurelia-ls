import { FRAMEWORK_DISCOVERY_SEEDS } from "../../framework/index.js";
import type {
  SourceProject,
  SourceTargetRow,
} from "../../source/index.js";
import {
  sourceRangeForTarget,
} from "../../source/index.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type BasisTransition,
  type Basis,
} from "../basis.js";
import type { Answer } from "../answer.js";
import type { Inquiry } from "../inquiry.js";
import type { SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  navigationRoute,
  type NavigationRouteClaim,
} from "../navigation.js";
import type { PagedRowFamily } from "../paged-row-family.js";

export { countBy } from "../../collections.js";
export {
  sourceRangeForFileSpanCarrier as sourceRangeForCallSiteEntry,
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
  return navigationRoute(plane, relation, basis, summary, basisTransition);
}

export function frameworkPagedAnswer<
  TValue extends object,
  TRow,
  TKey extends keyof TValue & string,
>(
  inquiry: Inquiry,
  sourceProject: SourceProject,
  rowFamily: PagedRowFamily<TRow>,
  baseValue: TValue,
  rows: readonly TRow[],
  offset: number,
  limit: number,
  key: TKey,
): Answer<TValue> {
  return rowFamily.answer({
    inquiry,
    rows,
    offset,
    limit,
    basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
    value: (page) =>
      ({
        ...baseValue,
        [key]: page.rows,
      }) as TValue,
  });
}
