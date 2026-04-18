import {
  type FocusKind,
  isFocusKind,
} from './inquiry-model.js';
import {
  DEFAULT_INGRESS_RECOGNIZER_REGISTRY,
  captureKindsForFocusKinds,
  extractFilePaths,
  extractPackageNames,
  extractRepoPaths,
  extractTypeNames,
  isIngressRecognizableFocusKind,
  type IngressCapture,
  type IngressRecognition,
  type IngressRecognizerRegistry,
} from './ingress-recognizers.js';

export interface IngressHintDetail {
  readonly kind: 'input' | 'focus-inference' | 'repair';
  readonly detail: string;
}

export interface IngressFocusHints {
  readonly focusKind?: FocusKind;
  readonly focusValue?: string;
  readonly packageName?: string;
  readonly recognition: IngressRecognition;
  readonly reasons: readonly IngressHintDetail[];
}

export function deriveFocusHints(
  question: string,
  explicitFocusKind?: FocusKind,
  explicitFocusValue?: string,
  recognizers: IngressRecognizerRegistry = DEFAULT_INGRESS_RECOGNIZER_REGISTRY,
): IngressFocusHints {
  // TODO: Ingress still collapses multi-target declaration questions onto one
  // inferred focus. Once the answer layer can carry multiple focused targets
  // honestly, retain more than one recognized symbol/type capture instead of
  // choosing the first compatible focus family.
  const recognition = recognizers.createRecognition(question);
  const reasons: IngressHintDetail[] = [];

  if (explicitFocusKind && explicitFocusValue) {
    reasons.push({
      kind: 'input',
      detail: `The focus was provided explicitly as ${explicitFocusKind}:${explicitFocusValue}.`,
    });
    return {
      focusKind: explicitFocusKind,
      focusValue: explicitFocusValue,
      packageName: explicitFocusKind === 'package' ? explicitFocusValue : extractPackageName(question),
      recognition,
      reasons,
    };
  }

  const packageCapture = recognizers.findFirst(recognition, 'package-name');
  if (packageCapture) {
    reasons.push({
      kind: 'focus-inference',
      detail: packageCapture.detail,
    });
    return {
      focusKind: 'package',
      focusValue: packageCapture.value,
      packageName: packageCapture.value,
      recognition,
      reasons,
    };
  }

  const fileCapture = recognizers.findFirst(recognition, 'file-path');
  if (fileCapture) {
    reasons.push({
      kind: 'focus-inference',
      detail: fileCapture.detail,
    });
    return {
      focusKind: 'file',
      focusValue: fileCapture.value,
      recognition,
      reasons,
    };
  }

  const exportCapture = recognizers.findFirst(recognition, 'export-name');
  if (exportCapture) {
    reasons.push({
      kind: 'focus-inference',
      detail: exportCapture.detail,
    });
    return {
      focusKind: 'export',
      focusValue: exportCapture.value,
      recognition,
      reasons,
    };
  }

  const typeCapture = recognizers.findFirst(recognition, 'type-name');
  if (typeCapture) {
    reasons.push({
      kind: 'focus-inference',
      detail: typeCapture.detail,
    });
    return {
      focusKind: 'type',
      focusValue: typeCapture.value,
      recognition,
      reasons,
    };
  }

  const symbolCapture = recognizers.findFirst(recognition, 'symbol-name');
  if (symbolCapture) {
    reasons.push({
      kind: 'focus-inference',
      detail: symbolCapture.detail,
    });
    return {
      focusKind: 'symbol',
      focusValue: symbolCapture.value,
      recognition,
      reasons,
    };
  }

  const repoCapture = recognizers.findFirst(recognition, 'repo-path');
  if (repoCapture) {
    reasons.push({
      kind: 'focus-inference',
      detail: repoCapture.detail,
    });
    return {
      focusKind: 'repo',
      focusValue: repoCapture.value,
      recognition,
      reasons,
    };
  }

  return { recognition, reasons };
}

export function deriveRepairHints(
  args: Record<string, unknown> | undefined,
  question: string | undefined,
  recognizers: IngressRecognizerRegistry = DEFAULT_INGRESS_RECOGNIZER_REGISTRY,
): IngressFocusHints {
  const recognition = recognizers.createRecognition(question);
  const explicitFocusKind = asFocusKind(args?.focusKind) ?? inferFocusKindFromArgs(args);
  const explicitFocusValue = asString(args?.focusValue) ?? asString(args?.packageName);
  if (explicitFocusKind && explicitFocusValue) {
    return {
      focusKind: explicitFocusKind,
      focusValue: explicitFocusValue,
      packageName: asString(args?.packageName) ?? (explicitFocusKind === 'package' ? explicitFocusValue : undefined),
      recognition,
      reasons: [{
        kind: 'repair',
        detail: `Recovered ${explicitFocusKind}:${explicitFocusValue} from the attempted args.`,
      }],
    };
  }

  const inferred = deriveFocusHints(question ?? '', undefined, undefined, recognizers);
  if (inferred.focusKind && inferred.focusValue) {
    return {
      ...inferred,
      recognition,
      reasons: [{
        kind: 'repair',
        detail: `Recovered ${inferred.focusKind}:${inferred.focusValue} from the fallback question.`,
      }],
    };
  }

  return {
    recognition,
    reasons: [],
  };
}

export function inferFocusKindFromArgs(
  args: Record<string, unknown> | undefined,
): FocusKind | undefined {
  if (!args) {
    return undefined;
  }
  if (asFocusKind(args.focusKind)) {
    return asFocusKind(args.focusKind);
  }
  if (typeof args.packageName === 'string') {
    return 'package';
  }
  if (typeof args.focusValue === 'string' && /\.([cm]?ts|tsx)$/i.test(args.focusValue)) {
    return 'file';
  }
  return undefined;
}

export function extractPackageName(question: string): string | undefined {
  return extractPackageNames(question)[0];
}

export function extractFilePath(question: string): string | undefined {
  return extractFilePaths(question)[0];
}

export function extractTypeName(question: string): string | undefined {
  return extractTypeNames(question)[0];
}

export function extractRepoPath(question: string): string | undefined {
  return extractRepoPaths(question)[0];
}

export function describeFocusHints(hints: {
  readonly focusKind?: FocusKind;
  readonly focusValue?: string;
}): string {
  if (!hints.focusKind || !hints.focusValue) {
    return 'none';
  }
  return `${hints.focusKind}:${hints.focusValue}`;
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function asFocusKind(value: unknown): FocusKind | undefined {
  return isFocusKind(value) ? value : undefined;
}

export function supportsRecognizedFocus(
  focusKind: FocusKind,
  recognition: IngressRecognition | readonly IngressCapture[],
): boolean {
  if (!isIngressRecognizableFocusKind(focusKind)) {
    return false;
  }
  const captures = Array.isArray(recognition) || !('captures' in recognition)
    ? recognition
    : recognition.captures;
  const captureKinds = captureKindsForFocusKinds([focusKind]);
  return captures.some((capture) => captureKinds.includes(capture.kind));
}
