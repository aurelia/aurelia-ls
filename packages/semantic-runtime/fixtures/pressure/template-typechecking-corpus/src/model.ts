export interface CorpusChild {
  readonly id: string;
  readonly label: string;
}

export interface CorpusItem {
  readonly id: string;
  label: string;
  readonly score: number;
  readonly enabled: boolean;
  readonly children: readonly CorpusChild[];
}

export interface CorpusPair {
  readonly label: string;
  readonly count: number;
}

export type CorpusStatus = 'ready' | 'blocked';

export const corpusItems: readonly CorpusItem[] = [
  {
    id: 'first',
    label: 'First',
    score: 4,
    enabled: true,
    children: [{ id: 'first-child', label: 'First child' }],
  },
  {
    id: 'second',
    label: 'Second',
    score: 2,
    enabled: false,
    children: [{ id: 'second-child', label: 'Second child' }],
  },
];
