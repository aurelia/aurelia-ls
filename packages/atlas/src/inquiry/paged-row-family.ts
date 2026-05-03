import { OutcomeKind, createAnswer, type Answer } from "./answer.js";
import type { Basis } from "./basis.js";
import type { Continuation } from "./continuation.js";
import type { Evidence, OpenSeam } from "./evidence.js";
import type { Inquiry } from "./inquiry.js";
import {
  evidenceLimit,
  pageInfo,
  pageRows,
  type PageRows,
} from "./paging.js";

export type RowEvidence = Evidence | readonly Evidence[];

export interface PagedRowFamilyInit<TRow> {
  /** Stable family id, usually lens:projection. */
  readonly id: string;
  /** Human-facing plural row label for answer summaries. */
  readonly rowLabel: string;
  /** Build evidence for one returned row. The second argument is the absolute row index after filtering. */
  readonly evidenceForRow: (row: TRow, rowIndex: number) => RowEvidence;
  /** Build continuations for one returned page. */
  readonly continuationsForPage: (
    inquiry: Inquiry,
    rows: readonly TRow[],
    nextOffset: number | undefined,
    limit: number,
  ) => readonly Continuation[];
}

export interface PagedRowFamilyAnswerInit<TRow, TValue> {
  /** Inquiry being answered. */
  readonly inquiry: Inquiry;
  /** Filtered, ordered rows for this projection family. */
  readonly rows: readonly TRow[];
  /** Row limit after applying the inquiry budget. */
  readonly limit: number;
  /** Page offset parsed from the inquiry. */
  readonly offset: number;
  /** Basis records spent by this answer. */
  readonly basis: readonly Basis[];
  /** Build the value payload from the current page and row family. */
  readonly value: (page: PageRows<TRow>) => TValue;
  /** Optional row-summary override. */
  readonly summary?: (page: PageRows<TRow>) => string;
  /** Optional outcome override for partial/open row families. */
  readonly outcome?: (
    page: PageRows<TRow>,
    openSeams: readonly OpenSeam[],
  ) => OutcomeKind;
  /** Optional open seam builder for partial/open row families. */
  readonly openSeams?: (
    page: PageRows<TRow>,
    evidence: readonly Evidence[],
    evidenceByRow: readonly (readonly Evidence[])[],
  ) => readonly OpenSeam[];
}

/** Declarative answer envelope for one paged row family. */
export class PagedRowFamily<TRow> {
  readonly id: string;
  readonly rowLabel: string;
  readonly #evidenceForRow: (row: TRow, rowIndex: number) => RowEvidence;
  readonly #continuationsForPage: PagedRowFamilyInit<TRow>["continuationsForPage"];

  constructor(init: PagedRowFamilyInit<TRow>) {
    this.id = init.id;
    this.rowLabel = init.rowLabel;
    this.#evidenceForRow = init.evidenceForRow;
    this.#continuationsForPage = init.continuationsForPage;
  }

  /** Answer one projection by paging rows, building evidence, and wiring continuations. */
  answer<TValue>(
    init: PagedRowFamilyAnswerInit<TRow, TValue>,
  ): Answer<TValue> {
    const page = pageRows(init.rows, init.offset, init.limit);
    const evidenceByRow = page.rows
      .slice(0, evidenceLimit(init.inquiry))
      .map((row, index) =>
        evidenceArray(this.#evidenceForRow(row, init.offset + index)),
      );
    const evidence = evidenceByRow.flat();
    const openSeams = init.openSeams?.(page, evidence, evidenceByRow) ?? [];
    const outcome =
      init.outcome?.(page, openSeams) ??
      (page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit);
    const summary =
      init.summary?.(page) ??
      `Returned ${page.rows.length} of ${init.rows.length} ${this.rowLabel}.`;
    return createAnswer(init.inquiry, outcome, summary, {
      value: init.value(page),
      basis: init.basis,
      evidence,
      openSeams,
      page: pageInfo(
        init.inquiry,
        page.rows.length,
        init.rows.length,
        init.limit,
        page.nextOffset,
      ),
      continuations: this.#continuationsForPage(
        init.inquiry,
        page.rows,
        page.nextOffset,
        init.limit,
      ),
    });
  }
}

function evidenceArray(evidence: RowEvidence): readonly Evidence[] {
  if (Array.isArray(evidence)) {
    return evidence as readonly Evidence[];
  }
  return [evidence as Evidence];
}
