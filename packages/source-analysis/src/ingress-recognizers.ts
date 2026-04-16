import type { SourceAnalysisFocusKind } from './query-model.js';
import { createSourceAnalysisNormalizedText, type SourceAnalysisNormalizedText } from './ingress-normalization.js';

export const SOURCE_ANALYSIS_INGRESS_CAPTURE_KINDS = [
  'package-name',
  'file-path',
  'type-name',
  'repo-path',
] as const;

export type SourceAnalysisIngressCaptureKind =
  typeof SOURCE_ANALYSIS_INGRESS_CAPTURE_KINDS[number];

export interface SourceAnalysisIngressCapture {
  readonly kind: SourceAnalysisIngressCaptureKind;
  readonly value: string;
  readonly source: 'question';
  readonly recognizerId: string;
  readonly detail: string;
}

export interface SourceAnalysisIngressRecognition {
  readonly question: SourceAnalysisNormalizedText;
  readonly captures: readonly SourceAnalysisIngressCapture[];
}

interface SourceAnalysisIngressRecognizerSpec {
  readonly id: string;
  readonly kind: SourceAnalysisIngressCaptureKind;
  readonly recognize: (question: string) => readonly string[];
  readonly describe: (value: string) => string;
}

export class SourceAnalysisIngressRecognizerRegistry {
  readonly #specs: readonly SourceAnalysisIngressRecognizerSpec[];

  constructor(specs: readonly SourceAnalysisIngressRecognizerSpec[]) {
    this.#specs = specs;
  }

  createRecognition(question: string | undefined): SourceAnalysisIngressRecognition {
    return {
      question: createSourceAnalysisNormalizedText(question),
      captures: this.recognizeQuestion(question),
    };
  }

  recognizeQuestion(question: string | undefined): readonly SourceAnalysisIngressCapture[] {
    if (!question) {
      return [];
    }

    const captures: SourceAnalysisIngressCapture[] = [];
    const seen = new Set<string>();

    for (const spec of this.#specs) {
      for (const value of spec.recognize(question)) {
        const key = `${spec.kind}:${value}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        captures.push({
          kind: spec.kind,
          value,
          source: 'question',
          recognizerId: spec.id,
          detail: spec.describe(value),
        });
      }
    }

    return captures;
  }

  findFirst(
    recognition: SourceAnalysisIngressRecognition | readonly SourceAnalysisIngressCapture[],
    kind: SourceAnalysisIngressCaptureKind,
  ): SourceAnalysisIngressCapture | undefined {
    const captures = Array.isArray(recognition) || !('captures' in recognition)
      ? recognition
      : recognition.captures;
    return captures.find((capture) => capture.kind === kind);
  }
}

export function createDefaultSourceAnalysisIngressRecognizerRegistry(): SourceAnalysisIngressRecognizerRegistry {
  return new SourceAnalysisIngressRecognizerRegistry([
    {
      id: 'package-name',
      kind: 'package-name',
      recognize: extractPackageNames,
      describe: (value) => `Recognized package name "${value}" from the question.`,
    },
    {
      id: 'file-path',
      kind: 'file-path',
      recognize: extractFilePaths,
      describe: (value) => `Recognized file path "${value}" from the question.`,
    },
    {
      id: 'type-name',
      kind: 'type-name',
      recognize: extractTypeNames,
      describe: (value) => `Recognized type name "${value}" from the question.`,
    },
    {
      id: 'repo-path',
      kind: 'repo-path',
      recognize: extractRepoPaths,
      describe: (value) => `Recognized repo path "${value}" from the question.`,
    },
  ]);
}

export const DEFAULT_SOURCE_ANALYSIS_INGRESS_RECOGNIZER_REGISTRY =
  createDefaultSourceAnalysisIngressRecognizerRegistry();

export function captureKindsForFocusKind(
  focusKind: SourceAnalysisFocusKind,
): readonly SourceAnalysisIngressCaptureKind[] {
  switch (focusKind) {
    case 'package': return ['package-name'];
    case 'file': return ['file-path'];
    case 'type': return ['type-name'];
    case 'repo': return ['repo-path'];
    default: return [];
  }
}

export function extractPackageNames(question: string): readonly string[] {
  return uniqueMatches(question, /@[\w.-]+\/[\w.-]+/g);
}

export function extractFilePaths(question: string): readonly string[] {
  return uniqueMatches(question, /[A-Za-z0-9_./\\-]+\.(?:cts|mts|ts|tsx|js|mjs|cjs)/g)
    .map((match) => match.replace(/\\/g, '/'));
}

export function extractTypeNames(question: string): readonly string[] {
  const direct = [
    ...captureGroupMatches(question, /\b(?:type|class|interface)\s+([A-Z][A-Za-z0-9_]*)\b/g),
    ...captureGroupMatches(question, /`([A-Z][A-Za-z0-9_]*)`/g),
  ];
  if (direct.length > 0) {
    return uniqueStrings(direct);
  }

  const pascalMatches = uniqueMatches(question, /\b[A-Z][A-Za-z0-9_]*\b/g)
    .filter((match) =>
      match.length > 1
      && /[A-Z]/.test(match.slice(1)),
    );
  return pascalMatches.length === 1 ? pascalMatches : [];
}

export function extractRepoPaths(question: string): readonly string[] {
  return uniqueMatches(question, /[A-Za-z]:[\\/][A-Za-z0-9_.\\/ -]+/g)
    .map((match) => match.replace(/\\/g, '/'));
}

function uniqueMatches(
  value: string,
  pattern: RegExp,
): readonly string[] {
  return uniqueStrings(Array.from(value.matchAll(pattern), (match) => match[0] ?? ''));
}

function captureGroupMatches(
  value: string,
  pattern: RegExp,
): readonly string[] {
  return uniqueStrings(Array.from(value.matchAll(pattern), (match) => match[1] ?? ''));
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return values.filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);
}
