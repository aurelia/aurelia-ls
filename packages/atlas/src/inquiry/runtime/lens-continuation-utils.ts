import { BasisKind } from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, type SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
} from "../navigation.js";

export interface SourceInspectionContinuationOptions {
  readonly id?: string;
  readonly priority?: ContinuationPriority;
  readonly rationale: string;
  readonly routeSummary: string;
  readonly basis?: readonly BasisKind[];
}

export interface NextPageContinuationOptions {
  readonly id?: string;
  readonly priority?: ContinuationPriority;
  readonly rationale: string;
  readonly routeSummary: string;
  readonly basis?: readonly BasisKind[];
}

export function sourceInspectionContinuations(
  source: SourceRange | undefined,
  options: SourceInspectionContinuationOptions,
): readonly Continuation[] {
  return source === undefined
    ? []
    : [sourceInspectionContinuation(source, options)];
}

export function sourceInspectionContinuation(
  source: SourceRange,
  options: SourceInspectionContinuationOptions,
): Continuation {
  return {
    id: options.id,
    kind: ContinuationKind.InspectEvidence,
    priority: options.priority ?? ContinuationPriority.Secondary,
    rationale: options.rationale,
    inquiry: {
      lens: LensId.TsSource,
      locus: { kind: LocusKind.SourceRange, range: source },
      projection: "text",
    },
    route: {
      plane: NavigationPlane.Inspection,
      relation: NavigationRelation.SourceFor,
      basis: options.basis ?? [BasisKind.SourceText, BasisKind.TypeScriptProgram],
      summary: options.routeSummary,
    },
  };
}

export function sourceForRow<TSource>(
  row: unknown,
): TSource | undefined {
  if (typeof row !== "object" || row === null) {
    return undefined;
  }
  return (row as { readonly source?: TSource }).source;
}

export function optionalNextPageContinuation(
  inquiry: Inquiry,
  nextOffset: number | undefined,
  limit: number,
  options: NextPageContinuationOptions,
): readonly Continuation[] {
  if (nextOffset === undefined) {
    return [];
  }
  return [
    {
      id: options.id,
      kind: ContinuationKind.NextPage,
      priority: options.priority ?? ContinuationPriority.Primary,
      rationale: options.rationale,
      inquiry: {
        ...inquiry,
        page: { size: limit, cursor: String(nextOffset) },
      },
      route: {
        plane: NavigationPlane.Addressing,
        relation: NavigationRelation.NextPageOf,
        basis: options.basis ?? [BasisKind.TypeScriptProgram],
        summary: options.routeSummary,
      },
    },
  ];
}
