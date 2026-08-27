import type { ProductHandle } from '../kernel/handles.js';
import {
  TemplateCompilerNormalizedContainmentRow,
  TemplateCompilerNormalizedOwnershipLedger,
  TemplateCompilerNormalizedOwnershipRow,
  TemplateCompilerNormalizedSiteMismatchKind,
  type TemplateCompilerNormalizedContainmentRelation,
  type TemplateCompilerNormalizedOwnershipRelation,
} from './template-compiler-normalized-site-model.js';

export type TemplateCompilerNormalizedMismatchSink = (
  kind: TemplateCompilerNormalizedSiteMismatchKind,
  relation: string,
  summary: string,
  handles: readonly ProductHandle[],
) => void;

/** Mutable construction ledger; only its immutable GraphExact product escapes validation. */
export class TemplateCompilerNormalizedOwnershipBuilder {
  private readonly ownershipByProduct = new Map<ProductHandle, TemplateCompilerNormalizedOwnershipRow>();
  private readonly containmentKeys = new Set<string>();
  readonly ownership: TemplateCompilerNormalizedOwnershipRow[] = [];
  readonly containment: TemplateCompilerNormalizedContainmentRow[] = [];

  constructor(private readonly mismatch: TemplateCompilerNormalizedMismatchSink) {}

  claim(
    ownerProductHandle: ProductHandle,
    productHandle: ProductHandle,
    relation: TemplateCompilerNormalizedOwnershipRelation,
  ): void {
    const previous = this.ownershipByProduct.get(productHandle) ?? null;
    if (previous != null) {
      this.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.ExclusiveOwnershipConflict,
        relation,
        previous.ownerProductHandle === ownerProductHandle
          ? 'One producer claims the same normalized product more than once.'
          : 'Peer producers claim the same normalized product.',
        [previous.ownerProductHandle, ownerProductHandle, productHandle],
      );
      return;
    }
    const row = new TemplateCompilerNormalizedOwnershipRow(ownerProductHandle, productHandle, relation);
    this.ownershipByProduct.set(productHandle, row);
    this.ownership.push(row);
  }

  contain(
    containerProductHandle: ProductHandle,
    productHandle: ProductHandle,
    relation: TemplateCompilerNormalizedContainmentRelation,
    ordinal: number,
  ): void {
    const key = JSON.stringify([containerProductHandle, productHandle, relation, ordinal]);
    if (this.containmentKeys.has(key)) {
      this.mismatch(
        TemplateCompilerNormalizedSiteMismatchKind.DuplicateReference,
        relation,
        'One ordered containment edge is repeated.',
        [containerProductHandle, productHandle],
      );
      return;
    }
    this.containmentKeys.add(key);
    this.containment.push(new TemplateCompilerNormalizedContainmentRow(
      containerProductHandle,
      productHandle,
      relation,
      ordinal,
    ));
  }

  ownerOf(productHandle: ProductHandle): TemplateCompilerNormalizedOwnershipRow | null {
    return this.ownershipByProduct.get(productHandle) ?? null;
  }

  finish(): TemplateCompilerNormalizedOwnershipLedger {
    return new TemplateCompilerNormalizedOwnershipLedger(this.ownership, this.containment);
  }
}
