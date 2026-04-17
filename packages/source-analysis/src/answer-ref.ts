import { FOCUS_KINDS } from './inquiry-model.js';

export const ANSWER_REF_KINDS = [
  ...FOCUS_KINDS,
  'subsystem',
] as const;

export type AnswerRefKind =
  typeof ANSWER_REF_KINDS[number];

export interface AnswerRef {
  readonly kind: AnswerRefKind;
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
}
