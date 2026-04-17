import type { FocusKind } from './inquiry-model.js';
import {
  sanitizePathLikeFocusValue,
  trimTrailingFocusPunctuation,
} from './focus-normalization.js';
import { createNormalizedText, type NormalizedText } from './ingress-normalization.js';

export const INGRESS_CAPTURE_KINDS = [
  'package-name',
  'file-path',
  'type-name',
  'repo-path',
] as const;

export type IngressCaptureKind =
  typeof INGRESS_CAPTURE_KINDS[number];

export interface IngressCapture {
  readonly kind: IngressCaptureKind;
  readonly value: string;
  readonly source: 'question';
  readonly recognizerId: string;
  readonly detail: string;
}

export interface IngressRecognition {
  readonly question: NormalizedText;
  readonly captures: readonly IngressCapture[];
}

interface IngressRecognizerSpec {
  readonly id: string;
  readonly kind: IngressCaptureKind;
  readonly recognize: (question: string) => readonly string[];
  readonly describe: (value: string) => string;
}

export class IngressRecognizerRegistry {
  readonly #specs: readonly IngressRecognizerSpec[];

  constructor(specs: readonly IngressRecognizerSpec[]) {
    this.#specs = specs;
  }

  createRecognition(question: string | undefined): IngressRecognition {
    return {
      question: createNormalizedText(question),
      captures: this.recognizeQuestion(question),
    };
  }

  recognizeQuestion(question: string | undefined): readonly IngressCapture[] {
    if (!question) {
      return [];
    }

    const captures: IngressCapture[] = [];
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

    return filterPathDerivedTypeCaptures(captures);
  }

  findFirst(
    recognition: IngressRecognition | readonly IngressCapture[],
    kind: IngressCaptureKind,
  ): IngressCapture | undefined {
    const captures = Array.isArray(recognition) || !('captures' in recognition)
      ? recognition
      : recognition.captures;
    return captures.find((capture) => capture.kind === kind);
  }
}

export function createDefaultIngressRecognizerRegistry(): IngressRecognizerRegistry {
  return new IngressRecognizerRegistry([
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

export const DEFAULT_INGRESS_RECOGNIZER_REGISTRY =
  createDefaultIngressRecognizerRegistry();

export function captureKindsForFocusKind(
  focusKind: FocusKind,
): readonly IngressCaptureKind[] {
  // TODO: Only a subset of FocusKind currently maps to ingress recognizers.
  // That is another sign the focus union is carrying multiple semantic families:
  // some entries are user-observable subject kinds, others are meta/control
  // anchors that are never recognized directly from source-like text.
  switch (focusKind) {
    case 'package': return ['package-name'];
    case 'file': return ['file-path'];
    case 'type': return ['type-name'];
    case 'repo': return ['repo-path'];
    default: return [];
  }
}

export function extractPackageNames(question: string): readonly string[] {
  return uniqueMatches(question, /@[\w.-]+\/[\w.-]+/g)
    .map((match) => trimTrailingFocusPunctuation(match));
}

export function extractFilePaths(question: string): readonly string[] {
  return uniqueMatches(question, /[A-Za-z0-9_./\\-]+\.(?:cts|mts|ts|tsx|js|mjs|cjs)/g)
    .map((match) => sanitizePathLikeFocusValue(match));
}

export function extractTypeNames(question: string): readonly string[] {
  const direct = [
    ...captureGroupMatches(question, /\b(?:type|class|interface)\s+([A-Z][A-Za-z0-9_]*)\b/g),
    ...captureGroupMatches(question, /`([A-Z][A-Za-z0-9_]*)`/g),
  ];
  if (direct.length > 0) {
    return uniqueStrings(direct);
  }

  const pascalMatches = extractStandalonePascalMatches(question)
    .filter((match) =>
      match.length > 1
      && /[A-Z]/.test(match.slice(1)),
    );
  return pascalMatches.length === 1 ? pascalMatches : [];
}

export function extractRepoPaths(question: string): readonly string[] {
  return uniqueMatches(question, /[A-Za-z]:[\\/][A-Za-z0-9_.\\/ -]+/g)
    .map((match) => sanitizePathLikeFocusValue(match));
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

function extractStandalonePascalMatches(
  question: string,
): readonly string[] {
  const matches: string[] = [];
  const pattern = /\b[A-Z][A-Za-z0-9_]*\b/g;
  for (const match of question.matchAll(pattern)) {
    const value = match[0] ?? '';
    const index = match.index ?? -1;
    if (value.length === 0 || index < 0) {
      continue;
    }

    const previous = index > 0 ? question[index - 1] : '';
    const next = index + value.length < question.length ? question[index + value.length] : '';
    if (previous === '/' || previous === '\\' || next === '/' || next === '\\') {
      continue;
    }

    matches.push(value);
  }

  return uniqueStrings(matches);
}

function filterPathDerivedTypeCaptures(
  captures: readonly IngressCapture[],
): readonly IngressCapture[] {
  const pathSegments = new Set(
    captures
      .filter((capture) => capture.kind === 'repo-path' || capture.kind === 'file-path')
      .flatMap((capture) => capture.value.split(/[\\/._:-]+/))
      .filter((segment) => segment.length > 0),
  );

  if (pathSegments.size === 0) {
    return captures;
  }

  return captures.filter((capture) =>
    capture.kind !== 'type-name' || !pathSegments.has(capture.value),
  );
}
