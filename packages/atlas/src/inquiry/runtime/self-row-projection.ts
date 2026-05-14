import type { Answer } from "../answer.js";
import {
  BasisAuthority,
  BasisClosure,
  BasisFreshness,
  BasisKind,
  type Basis,
} from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import type { Evidence } from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import type { SourceRange } from "../locus.js";
import {
  NavigationPlane,
  NavigationRelation,
  navigationRoute,
} from "../navigation.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { pageOffset, rowLimit } from "../paging.js";
import {
  optionalNextPageContinuation,
  sourceInspectionContinuation,
} from "./lens-continuation-utils.js";

export interface SelfRowInspectionSubject {
  readonly id: string;
  readonly source?: SourceRange;
  readonly summary: string;
}

export interface SelfRowProjectionOptions<TRow, TValue> {
  readonly familyId: string;
  readonly rows: readonly TRow[];
  readonly valueWithRows: (rows: readonly TRow[]) => TValue;
  readonly rowNoun: string;
  readonly basis?: readonly Basis[];
  readonly basisSummary?: string;
  readonly evidenceForRow: (row: TRow) => Evidence;
  readonly nextPageId: string;
  readonly nextPageRationale: string;
  readonly inspectionForRow: (
    row: TRow,
  ) =>
    | SelfRowInspectionSubject
    | readonly SelfRowInspectionSubject[]
    | undefined;
  readonly extraContinuationsForPage?: (
    inquiry: Inquiry,
    rows: readonly TRow[],
    nextOffset: number | undefined,
    limit: number,
  ) => readonly Continuation[];
}

export function answerSelfRowProjection<TRow, TValue>(
  inquiry: Inquiry,
  options: SelfRowProjectionOptions<TRow, TValue>,
): Answer<TValue> {
  const limit = rowLimit(inquiry);
  const rowFamily = new PagedRowFamily<TRow>({
    id: options.familyId,
    rowLabel: options.rowNoun,
    evidenceForRow: options.evidenceForRow,
    continuationsForPage: (inquiry, rows, nextOffset, limit) => [
      ...selfRowContinuations(
        inquiry,
        rows.flatMap((row) => {
          const subjects = options.inspectionForRow(row);
          if (subjects === undefined) {
            return [];
          }
          return Array.isArray(subjects) ? subjects : [subjects];
        }),
        nextOffset,
        limit,
        options.nextPageId,
        options.nextPageRationale,
      ),
      ...(options.extraContinuationsForPage?.(
        inquiry,
        rows,
        nextOffset,
        limit,
      ) ?? []),
    ],
  });
  return rowFamily.answer({
    inquiry,
    rows: options.rows,
    limit,
    offset: pageOffset(inquiry),
    basis:
      options.basis ??
      [
        selfSourceBasis(
          options.basisSummary ??
            "Read Atlas self-analysis rows through the hot TypeScript Program.",
        ),
      ],
    value: (page) => options.valueWithRows(page.rows),
  });
}

export function atlasProjectionContinuation(
  inquiry: Inquiry,
  id: string,
  projection: string,
  rationale: string,
): Continuation {
  return {
    id,
    kind: ContinuationKind.SwitchProjection,
    priority: ContinuationPriority.Secondary,
    rationale,
    inquiry: {
      ...inquiry,
      projection,
      page: undefined,
    },
    route: navigationRoute(
      NavigationPlane.Addressing,
      NavigationRelation.ProjectionOf,
      [BasisKind.TypeScriptProgram, BasisKind.AtlasContract],
      rationale,
    ),
  };
}

export function selfSourceBasis(summary: string): Basis {
  return {
    kind: BasisKind.TypeScriptProgram,
    closure: BasisClosure.Exact,
    authority: BasisAuthority.Checker,
    freshness: BasisFreshness.Live,
    summary,
    identity: "@aurelia-ls/atlas",
  };
}

function selfRowContinuations(
  inquiry: Inquiry,
  rows: readonly SelfRowInspectionSubject[],
  nextOffset: number | undefined,
  limit: number,
  nextPageId: string,
  nextPageRationale: string,
): readonly Continuation[] {
  const continuations: Continuation[] = [];
  continuations.push(
    ...optionalNextPageContinuation(inquiry, nextOffset, limit, {
      id: nextPageId,
      rationale: nextPageRationale,
      routeSummary: nextPageRationale,
    }),
  );
  for (const row of rows.filter((entry) => entry.source !== undefined).slice(0, 3)) {
    if (row.source === undefined) {
      continue;
    }
    continuations.push(
      sourceInspectionContinuation(row.source, {
        id: `${row.id}:source`,
        rationale: row.summary,
        routeSummary: "Inspect source behind Atlas self-analysis row.",
        basis: [BasisKind.TypeScriptProgram],
      }),
    );
  }
  continuations.push(
    atlasProjectionContinuation(
      inquiry,
      "atlas.self:taxonomy",
      "taxonomy",
      "Return to the compact self-taxonomy rollup.",
    ),
  );
  return continuations;
}
