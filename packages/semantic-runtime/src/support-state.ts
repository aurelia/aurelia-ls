export type SemanticSupportState =
  /** Existing app facts can be observed, but authoring or verification may still be absent. */
  | 'observable'
  /** A semantic plan can be produced without claiming concrete source edits are solved. */
  | 'plannable'
  /** Concrete source edits are modeled for this surface. */
  | 'editable'
  /** Reopened app facts can be compared against expected effects for this surface. */
  | 'verifiable'
  /** Failures can be turned into follow-up repair operations. */
  | 'repairable'
  /** Some required substrate exists, but the product cannot safely promise the full surface. */
  | 'partial'
  /** The surface is not yet modeled enough to guide product behavior. */
  | 'open';

/** Rank support states for minimum-state comparisons without duplicating policy in API/query code. */
export function semanticSupportStateRank(
  state: SemanticSupportState | `${SemanticSupportState}`,
): number {
  switch (state) {
    case 'open':
      return 0;
    case 'partial':
      return 1;
    case 'observable':
      return 2;
    case 'plannable':
      return 3;
    case 'editable':
      return 4;
    case 'verifiable':
      return 5;
    case 'repairable':
      return 6;
  }
}
