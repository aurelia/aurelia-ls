export interface ExpressionChild {
  readonly id: string;
  readonly label: string;
}

export interface ExpressionItem {
  readonly id: string;
  label: string;
  readonly active: boolean;
  readonly score: number;
  readonly children: readonly ExpressionChild[];
}

export interface ExpressionGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly ExpressionItem[];
}

export const expressionItems: readonly ExpressionItem[] = [
  {
    id: 'first',
    label: 'First item',
    active: true,
    score: 4,
    children: [{ id: 'first-child', label: 'First child' }],
  },
  {
    id: 'second',
    label: 'Second item',
    active: false,
    score: 2,
    children: [{ id: 'second-child', label: 'Second child' }],
  },
];

export const expressionGroups: readonly ExpressionGroup[] = [
  { id: 'all', label: 'All items', items: expressionItems },
];
