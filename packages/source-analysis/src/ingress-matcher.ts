import type { SourceAnalysisFocusKind } from './query-model.js';
import {
  DEFAULT_SOURCE_ANALYSIS_INGRESS_RECOGNIZER_REGISTRY,
  type SourceAnalysisIngressCapture,
  type SourceAnalysisIngressCaptureKind,
  type SourceAnalysisIngressRecognition,
  type SourceAnalysisIngressRecognizerRegistry,
} from './ingress-recognizers.js';
import {
  createSourceAnalysisNormalizedText,
  normalizePhrase,
  phraseMatches,
  tokenMatches,
  type SourceAnalysisNormalizedText,
} from './ingress-normalization.js';

export const SOURCE_ANALYSIS_INGRESS_RULE_KINDS = [
  'exact-normalized',
  'phrase-any',
  'token-any',
  'focus-allowed',
  'capture-present',
] as const;

export const SOURCE_ANALYSIS_INGRESS_RULE_IMPORTANCE = [
  'required',
  'primary',
  'supporting',
  'negative',
] as const;

export type SourceAnalysisIngressRuleKind =
  typeof SOURCE_ANALYSIS_INGRESS_RULE_KINDS[number];

export type SourceAnalysisIngressRuleImportance =
  typeof SOURCE_ANALYSIS_INGRESS_RULE_IMPORTANCE[number];

export interface SourceAnalysisIngressContext {
  readonly question?: string;
  readonly command?: string;
  readonly familyId?: string;
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly questionText: SourceAnalysisNormalizedText;
  readonly commandText: SourceAnalysisNormalizedText;
  readonly familyText: SourceAnalysisNormalizedText;
  readonly recognition: SourceAnalysisIngressRecognition;
}

interface SourceAnalysisIngressRuleBase<TReasonKind extends string> {
  readonly id: string;
  readonly reasonKind: TReasonKind;
  readonly importance: SourceAnalysisIngressRuleImportance;
  readonly detail: string;
}

export interface SourceAnalysisIngressExactRule<TReasonKind extends string>
  extends SourceAnalysisIngressRuleBase<TReasonKind> {
  readonly kind: 'exact-normalized';
  readonly source: 'command' | 'familyId';
  readonly value: string;
}

export interface SourceAnalysisIngressPhraseRule<TReasonKind extends string>
  extends SourceAnalysisIngressRuleBase<TReasonKind> {
  readonly kind: 'phrase-any';
  readonly source: 'question';
  readonly values: readonly string[];
}

export interface SourceAnalysisIngressTokenRule<TReasonKind extends string>
  extends SourceAnalysisIngressRuleBase<TReasonKind> {
  readonly kind: 'token-any';
  readonly source: 'question' | 'command' | 'familyId';
  readonly values: readonly string[];
}

export interface SourceAnalysisIngressFocusRule<TReasonKind extends string>
  extends SourceAnalysisIngressRuleBase<TReasonKind> {
  readonly kind: 'focus-allowed';
  readonly allowed: readonly SourceAnalysisFocusKind[];
}

export interface SourceAnalysisIngressCaptureRule<TReasonKind extends string>
  extends SourceAnalysisIngressRuleBase<TReasonKind> {
  readonly kind: 'capture-present';
  readonly captureKinds: readonly SourceAnalysisIngressCaptureKind[];
}

export type SourceAnalysisIngressRuleSpec<TReasonKind extends string> =
  | SourceAnalysisIngressExactRule<TReasonKind>
  | SourceAnalysisIngressPhraseRule<TReasonKind>
  | SourceAnalysisIngressTokenRule<TReasonKind>
  | SourceAnalysisIngressFocusRule<TReasonKind>
  | SourceAnalysisIngressCaptureRule<TReasonKind>;

export interface SourceAnalysisIngressMatchTrace<TReasonKind extends string> {
  readonly ruleId: string;
  readonly ruleKind: SourceAnalysisIngressRuleKind;
  readonly reasonKind: TReasonKind;
  readonly importance: SourceAnalysisIngressRuleImportance;
  readonly matched: boolean;
  readonly detail: string;
  readonly term?: string;
  readonly capture?: SourceAnalysisIngressCapture;
}

export interface SourceAnalysisIngressRuleEvaluation<TReasonKind extends string> {
  readonly matched: boolean;
  readonly requiredSatisfied: boolean;
  readonly traces: readonly SourceAnalysisIngressMatchTrace<TReasonKind>[];
  readonly matchedTraces: readonly SourceAnalysisIngressMatchTrace<TReasonKind>[];
  readonly positiveTraces: readonly SourceAnalysisIngressMatchTrace<TReasonKind>[];
  readonly negativeTraces: readonly SourceAnalysisIngressMatchTrace<TReasonKind>[];
}

export interface SourceAnalysisIngressSelectionPolicy<TReasonKind extends string> {
  readonly reasonKindOrder: readonly TReasonKind[];
}

export function createSourceAnalysisIngressContext(
  input: {
    readonly question?: string;
    readonly command?: string;
    readonly familyId?: string;
    readonly focusKind?: SourceAnalysisFocusKind;
  },
  recognizers: SourceAnalysisIngressRecognizerRegistry = DEFAULT_SOURCE_ANALYSIS_INGRESS_RECOGNIZER_REGISTRY,
): SourceAnalysisIngressContext {
  return {
    question: input.question,
    command: input.command,
    familyId: input.familyId,
    focusKind: input.focusKind,
    questionText: createSourceAnalysisNormalizedText(input.question),
    commandText: createSourceAnalysisNormalizedText(input.command),
    familyText: createSourceAnalysisNormalizedText(input.familyId),
    recognition: recognizers.createRecognition(input.question),
  };
}

export function evaluateSourceAnalysisIngressRules<TReasonKind extends string>(
  context: SourceAnalysisIngressContext,
  rules: readonly SourceAnalysisIngressRuleSpec<TReasonKind>[],
): SourceAnalysisIngressRuleEvaluation<TReasonKind> {
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

export function compareSourceAnalysisIngressEvaluations<TReasonKind extends string>(
  left: SourceAnalysisIngressRuleEvaluation<TReasonKind>,
  right: SourceAnalysisIngressRuleEvaluation<TReasonKind>,
  policy: SourceAnalysisIngressSelectionPolicy<TReasonKind>,
): number {
  return compareSelectionKey(selectionKey(left, policy), selectionKey(right, policy));
}

export function rehydrateSourceAnalysisIngressEvaluation<TReasonKind extends string>(
  traces: readonly SourceAnalysisIngressMatchTrace<TReasonKind>[],
  requiredSatisfied: boolean,
): SourceAnalysisIngressRuleEvaluation<TReasonKind> {
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

export function createSourceAnalysisExactRule<TReasonKind extends string>(
  id: string,
  reasonKind: TReasonKind,
  source: 'command' | 'familyId',
  value: string,
  detail: string,
  importance: SourceAnalysisIngressRuleImportance = 'primary',
): SourceAnalysisIngressExactRule<TReasonKind> {
  return { id, kind: 'exact-normalized', reasonKind, source, value, detail, importance };
}

export function createSourceAnalysisPhraseRule<TReasonKind extends string>(
  id: string,
  reasonKind: TReasonKind,
  values: readonly string[],
  detail: string,
  importance: SourceAnalysisIngressRuleImportance = 'primary',
): SourceAnalysisIngressPhraseRule<TReasonKind> {
  return { id, kind: 'phrase-any', reasonKind, source: 'question', values, detail, importance };
}

export function createSourceAnalysisTokenRule<TReasonKind extends string>(
  id: string,
  reasonKind: TReasonKind,
  source: 'question' | 'command' | 'familyId',
  values: readonly string[],
  detail: string,
  importance: SourceAnalysisIngressRuleImportance = 'supporting',
): SourceAnalysisIngressTokenRule<TReasonKind> {
  return { id, kind: 'token-any', reasonKind, source, values, detail, importance };
}

export function createSourceAnalysisFocusRule<TReasonKind extends string>(
  id: string,
  reasonKind: TReasonKind,
  allowed: readonly SourceAnalysisFocusKind[],
  detail: string,
  importance: SourceAnalysisIngressRuleImportance = 'supporting',
): SourceAnalysisIngressFocusRule<TReasonKind> {
  return { id, kind: 'focus-allowed', reasonKind, allowed, detail, importance };
}

export function createSourceAnalysisCaptureRule<TReasonKind extends string>(
  id: string,
  reasonKind: TReasonKind,
  captureKinds: readonly SourceAnalysisIngressCaptureKind[],
  detail: string,
  importance: SourceAnalysisIngressRuleImportance = 'supporting',
): SourceAnalysisIngressCaptureRule<TReasonKind> {
  return { id, kind: 'capture-present', reasonKind, captureKinds, detail, importance };
}

function evaluateRule<TReasonKind extends string>(
  context: SourceAnalysisIngressContext,
  rule: SourceAnalysisIngressRuleSpec<TReasonKind>,
): readonly SourceAnalysisIngressMatchTrace<TReasonKind>[] {
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
  context: SourceAnalysisIngressContext,
  rule: SourceAnalysisIngressExactRule<TReasonKind>,
): readonly SourceAnalysisIngressMatchTrace<TReasonKind>[] {
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
  context: SourceAnalysisIngressContext,
  rule: SourceAnalysisIngressPhraseRule<TReasonKind>,
): readonly SourceAnalysisIngressMatchTrace<TReasonKind>[] {
  const matches = phraseMatches(context.questionText, rule.values);
  return tracesForTerms(rule, matches);
}

function evaluateTokenRule<TReasonKind extends string>(
  context: SourceAnalysisIngressContext,
  rule: SourceAnalysisIngressTokenRule<TReasonKind>,
): readonly SourceAnalysisIngressMatchTrace<TReasonKind>[] {
  const source = rule.source === 'question'
    ? context.questionText
    : rule.source === 'command'
      ? context.commandText
      : context.familyText;
  const matches = tokenMatches(source, rule.values);
  return tracesForTerms(rule, matches);
}

function evaluateFocusRule<TReasonKind extends string>(
  context: SourceAnalysisIngressContext,
  rule: SourceAnalysisIngressFocusRule<TReasonKind>,
): readonly SourceAnalysisIngressMatchTrace<TReasonKind>[] {
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
  context: SourceAnalysisIngressContext,
  rule: SourceAnalysisIngressCaptureRule<TReasonKind>,
): readonly SourceAnalysisIngressMatchTrace<TReasonKind>[] {
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
  rule: SourceAnalysisIngressPhraseRule<TReasonKind> | SourceAnalysisIngressTokenRule<TReasonKind>,
  matches: readonly string[],
): readonly SourceAnalysisIngressMatchTrace<TReasonKind>[] {
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
  evaluation: SourceAnalysisIngressRuleEvaluation<TReasonKind>,
  policy: SourceAnalysisIngressSelectionPolicy<TReasonKind>,
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
  evaluation: SourceAnalysisIngressRuleEvaluation<TReasonKind>,
  reasonKind: TReasonKind,
  importance: readonly SourceAnalysisIngressRuleImportance[],
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
