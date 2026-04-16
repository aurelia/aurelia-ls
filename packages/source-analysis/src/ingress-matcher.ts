import type { FocusKind } from './inquiry-model.js';
import {
  DEFAULT_INGRESS_RECOGNIZER_REGISTRY,
  type IngressCapture,
  type IngressCaptureKind,
  type IngressRecognition,
  type IngressRecognizerRegistry,
} from './ingress-recognizers.js';
import {
  createNormalizedText,
  normalizePhrase,
  phraseMatches,
  tokenMatches,
  type NormalizedText,
} from './ingress-normalization.js';

export const INGRESS_RULE_KINDS = [
  'exact-normalized',
  'phrase-any',
  'token-any',
  'focus-allowed',
  'capture-present',
] as const;

export const INGRESS_RULE_IMPORTANCE = [
  'required',
  'primary',
  'supporting',
  'negative',
] as const;

export type IngressRuleKind =
  typeof INGRESS_RULE_KINDS[number];

export type IngressRuleImportance =
  typeof INGRESS_RULE_IMPORTANCE[number];

export interface IngressContext {
  readonly question?: string;
  readonly command?: string;
  readonly familyId?: string;
  readonly focusKind?: FocusKind;
  readonly questionText: NormalizedText;
  readonly commandText: NormalizedText;
  readonly familyText: NormalizedText;
  readonly recognition: IngressRecognition;
}

interface IngressRuleBase<TReasonKind extends string> {
  readonly id: string;
  readonly reasonKind: TReasonKind;
  readonly importance: IngressRuleImportance;
  readonly detail: string;
}

export interface IngressExactRule<TReasonKind extends string>
  extends IngressRuleBase<TReasonKind> {
  readonly kind: 'exact-normalized';
  readonly source: 'command' | 'familyId';
  readonly value: string;
}

export interface IngressPhraseRule<TReasonKind extends string>
  extends IngressRuleBase<TReasonKind> {
  readonly kind: 'phrase-any';
  readonly source: 'question';
  readonly values: readonly string[];
}

export interface IngressTokenRule<TReasonKind extends string>
  extends IngressRuleBase<TReasonKind> {
  readonly kind: 'token-any';
  readonly source: 'question' | 'command' | 'familyId';
  readonly values: readonly string[];
}

export interface IngressFocusRule<TReasonKind extends string>
  extends IngressRuleBase<TReasonKind> {
  readonly kind: 'focus-allowed';
  readonly allowed: readonly FocusKind[];
}

export interface IngressCaptureRule<TReasonKind extends string>
  extends IngressRuleBase<TReasonKind> {
  readonly kind: 'capture-present';
  readonly captureKinds: readonly IngressCaptureKind[];
}

export type IngressRuleSpec<TReasonKind extends string> =
  | IngressExactRule<TReasonKind>
  | IngressPhraseRule<TReasonKind>
  | IngressTokenRule<TReasonKind>
  | IngressFocusRule<TReasonKind>
  | IngressCaptureRule<TReasonKind>;

export interface IngressMatchTrace<TReasonKind extends string> {
  readonly ruleId: string;
  readonly ruleKind: IngressRuleKind;
  readonly reasonKind: TReasonKind;
  readonly importance: IngressRuleImportance;
  readonly matched: boolean;
  readonly detail: string;
  readonly term?: string;
  readonly capture?: IngressCapture;
}

export interface IngressRuleEvaluation<TReasonKind extends string> {
  readonly matched: boolean;
  readonly requiredSatisfied: boolean;
  readonly traces: readonly IngressMatchTrace<TReasonKind>[];
  readonly matchedTraces: readonly IngressMatchTrace<TReasonKind>[];
  readonly positiveTraces: readonly IngressMatchTrace<TReasonKind>[];
  readonly negativeTraces: readonly IngressMatchTrace<TReasonKind>[];
}

export interface IngressSelectionPolicy<TReasonKind extends string> {
  readonly reasonKindOrder: readonly TReasonKind[];
}

export function createIngressContext(
  input: {
    readonly question?: string;
    readonly command?: string;
    readonly familyId?: string;
    readonly focusKind?: FocusKind;
  },
  recognizers: IngressRecognizerRegistry = DEFAULT_INGRESS_RECOGNIZER_REGISTRY,
): IngressContext {
  return {
    question: input.question,
    command: input.command,
    familyId: input.familyId,
    focusKind: input.focusKind,
    questionText: createNormalizedText(input.question),
    commandText: createNormalizedText(input.command),
    familyText: createNormalizedText(input.familyId),
    recognition: recognizers.createRecognition(input.question),
  };
}

export function evaluateIngressRules<TReasonKind extends string>(
  context: IngressContext,
  rules: readonly IngressRuleSpec<TReasonKind>[],
): IngressRuleEvaluation<TReasonKind> {
  const traces = rules.flatMap((rule) => evaluateRule(context, rule));
  const matchedTraces = traces.filter((trace) => trace.matched);
  const positiveTraces = matchedTraces.filter((trace) => trace.importance !== 'negative');
  const negativeTraces = matchedTraces.filter((trace) => trace.importance === 'negative');
  const requiredRules = rules.filter((rule) => rule.importance === 'required');
  const requiredSatisfied = requiredRules.every((rule) =>
    matchedTraces.some((trace) => trace.ruleId === rule.id),
  );

  return {
    matched: requiredSatisfied && positiveTraces.length > 0,
    requiredSatisfied,
    traces,
    matchedTraces,
    positiveTraces,
    negativeTraces,
  };
}

export function compareIngressEvaluations<TReasonKind extends string>(
  left: IngressRuleEvaluation<TReasonKind>,
  right: IngressRuleEvaluation<TReasonKind>,
  policy: IngressSelectionPolicy<TReasonKind>,
): number {
  return compareSelectionKey(selectionKey(left, policy), selectionKey(right, policy));
}

export function rehydrateIngressEvaluation<TReasonKind extends string>(
  traces: readonly IngressMatchTrace<TReasonKind>[],
  requiredSatisfied: boolean,
): IngressRuleEvaluation<TReasonKind> {
  const matchedTraces = traces.filter((trace) => trace.matched);
  const positiveTraces = matchedTraces.filter((trace) => trace.importance !== 'negative');
  const negativeTraces = matchedTraces.filter((trace) => trace.importance === 'negative');
  return {
    matched: requiredSatisfied && positiveTraces.length > 0,
    requiredSatisfied,
    traces,
    matchedTraces,
    positiveTraces,
    negativeTraces,
  };
}

export function createExactRule<TReasonKind extends string>(
  id: string,
  reasonKind: TReasonKind,
  source: 'command' | 'familyId',
  value: string,
  detail: string,
  importance: IngressRuleImportance = 'primary',
): IngressExactRule<TReasonKind> {
  return { id, kind: 'exact-normalized', reasonKind, source, value, detail, importance };
}

export function createPhraseRule<TReasonKind extends string>(
  id: string,
  reasonKind: TReasonKind,
  values: readonly string[],
  detail: string,
  importance: IngressRuleImportance = 'primary',
): IngressPhraseRule<TReasonKind> {
  return { id, kind: 'phrase-any', reasonKind, source: 'question', values, detail, importance };
}

export function createTokenRule<TReasonKind extends string>(
  id: string,
  reasonKind: TReasonKind,
  source: 'question' | 'command' | 'familyId',
  values: readonly string[],
  detail: string,
  importance: IngressRuleImportance = 'supporting',
): IngressTokenRule<TReasonKind> {
  return { id, kind: 'token-any', reasonKind, source, values, detail, importance };
}

export function createFocusRule<TReasonKind extends string>(
  id: string,
  reasonKind: TReasonKind,
  allowed: readonly FocusKind[],
  detail: string,
  importance: IngressRuleImportance = 'supporting',
): IngressFocusRule<TReasonKind> {
  return { id, kind: 'focus-allowed', reasonKind, allowed, detail, importance };
}

export function createCaptureRule<TReasonKind extends string>(
  id: string,
  reasonKind: TReasonKind,
  captureKinds: readonly IngressCaptureKind[],
  detail: string,
  importance: IngressRuleImportance = 'supporting',
): IngressCaptureRule<TReasonKind> {
  return { id, kind: 'capture-present', reasonKind, captureKinds, detail, importance };
}

function evaluateRule<TReasonKind extends string>(
  context: IngressContext,
  rule: IngressRuleSpec<TReasonKind>,
): readonly IngressMatchTrace<TReasonKind>[] {
  switch (rule.kind) {
    case 'exact-normalized': return evaluateExactRule(context, rule);
    case 'phrase-any': return evaluatePhraseRule(context, rule);
    case 'token-any': return evaluateTokenRule(context, rule);
    case 'focus-allowed': return evaluateFocusRule(context, rule);
    case 'capture-present': return evaluateCaptureRule(context, rule);
    default: return assertNever(rule);
  }
}

function evaluateExactRule<TReasonKind extends string>(
  context: IngressContext,
  rule: IngressExactRule<TReasonKind>,
): readonly IngressMatchTrace<TReasonKind>[] {
  const source = rule.source === 'command'
    ? context.commandText
    : context.familyText;
  const expected = normalizePhrase(rule.value);
  const matched = source.normalized.length > 0 && source.normalized === expected;
  return [{
    ruleId: rule.id,
    ruleKind: rule.kind,
    reasonKind: rule.reasonKind,
    importance: rule.importance,
    matched,
    detail: matched ? rule.detail : `${rule.detail} No exact match closed.`,
    ...(matched ? { term: rule.value } : {}),
  }];
}

function evaluatePhraseRule<TReasonKind extends string>(
  context: IngressContext,
  rule: IngressPhraseRule<TReasonKind>,
): readonly IngressMatchTrace<TReasonKind>[] {
  const matches = phraseMatches(context.questionText, rule.values);
  return tracesForTerms(rule, matches);
}

function evaluateTokenRule<TReasonKind extends string>(
  context: IngressContext,
  rule: IngressTokenRule<TReasonKind>,
): readonly IngressMatchTrace<TReasonKind>[] {
  const source = rule.source === 'question'
    ? context.questionText
    : rule.source === 'command'
      ? context.commandText
      : context.familyText;
  const matches = tokenMatches(source, rule.values);
  return tracesForTerms(rule, matches);
}

function evaluateFocusRule<TReasonKind extends string>(
  context: IngressContext,
  rule: IngressFocusRule<TReasonKind>,
): readonly IngressMatchTrace<TReasonKind>[] {
  const matched = context.focusKind !== undefined && rule.allowed.includes(context.focusKind);
  return [{
    ruleId: rule.id,
    ruleKind: rule.kind,
    reasonKind: rule.reasonKind,
    importance: rule.importance,
    matched,
    detail: matched
      ? rule.detail
      : `${rule.detail} No compatible focus kind was present.`,
    ...(matched && context.focusKind ? { term: context.focusKind } : {}),
  }];
}

function evaluateCaptureRule<TReasonKind extends string>(
  context: IngressContext,
  rule: IngressCaptureRule<TReasonKind>,
): readonly IngressMatchTrace<TReasonKind>[] {
  const captures = context.recognition.captures
    .filter((capture) => rule.captureKinds.includes(capture.kind));
  if (captures.length === 0) {
    return [{
      ruleId: rule.id,
      ruleKind: rule.kind,
      reasonKind: rule.reasonKind,
      importance: rule.importance,
      matched: false,
      detail: `${rule.detail} No matching capture was recognized.`,
    }];
  }

  return captures.map((capture) => ({
    ruleId: rule.id,
    ruleKind: rule.kind,
    reasonKind: rule.reasonKind,
    importance: rule.importance,
    matched: true,
    detail: rule.detail,
    term: capture.value,
    capture,
  }));
}

function tracesForTerms<TReasonKind extends string>(
  rule: IngressPhraseRule<TReasonKind> | IngressTokenRule<TReasonKind>,
  matches: readonly string[],
): readonly IngressMatchTrace<TReasonKind>[] {
  if (matches.length === 0) {
    return [{
      ruleId: rule.id,
      ruleKind: rule.kind,
      reasonKind: rule.reasonKind,
      importance: rule.importance,
      matched: false,
      detail: `${rule.detail} No terms matched.`,
    }];
  }

  return matches.map((term) => ({
    ruleId: rule.id,
    ruleKind: rule.kind,
    reasonKind: rule.reasonKind,
    importance: rule.importance,
    matched: true,
    detail: rule.detail,
    term,
  }));
}

function selectionKey<TReasonKind extends string>(
  evaluation: IngressRuleEvaluation<TReasonKind>,
  policy: IngressSelectionPolicy<TReasonKind>,
): readonly number[] {
  const required = evaluation.requiredSatisfied ? 1 : 0;
  const primary = policy.reasonKindOrder.map((reasonKind) =>
    countMatched(evaluation, reasonKind, ['required', 'primary']),
  );
  const supporting = policy.reasonKindOrder.map((reasonKind) =>
    countMatched(evaluation, reasonKind, ['supporting']),
  );
  const negative = policy.reasonKindOrder.map((reasonKind) =>
    -countMatched(evaluation, reasonKind, ['negative']),
  );

  return [
    required,
    ...primary,
    ...supporting,
    ...negative,
    evaluation.positiveTraces.length,
    -evaluation.negativeTraces.length,
  ];
}

function countMatched<TReasonKind extends string>(
  evaluation: IngressRuleEvaluation<TReasonKind>,
  reasonKind: TReasonKind,
  importance: readonly IngressRuleImportance[],
): number {
  return evaluation.matchedTraces.filter((trace) =>
    trace.reasonKind === reasonKind && importance.includes(trace.importance),
  ).length;
}

function compareSelectionKey(
  left: readonly number[],
  right: readonly number[],
): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled ingress rule: ${JSON.stringify(value)}`);
}
