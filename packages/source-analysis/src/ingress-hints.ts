import type { SourceAnalysisFocusKind } from './query-model.js';

export interface SourceAnalysisIngressHintDetail {
  readonly kind: 'input' | 'focus-inference' | 'repair';
  readonly detail: string;
}

export interface SourceAnalysisIngressFocusHints {
  readonly focusKind?: SourceAnalysisFocusKind;
  readonly focusValue?: string;
  readonly packageName?: string;
  readonly reasons: readonly SourceAnalysisIngressHintDetail[];
}

export function deriveFocusHints(
  question: string,
  explicitFocusKind?: SourceAnalysisFocusKind,
  explicitFocusValue?: string,
): SourceAnalysisIngressFocusHints {
  const reasons: SourceAnalysisIngressHintDetail[] = [];
  if (explicitFocusKind && explicitFocusValue) {
    reasons.push({
      kind: 'input',
      detail: `The focus was provided explicitly as ${explicitFocusKind}:${explicitFocusValue}.`,
    });
    return {
      focusKind: explicitFocusKind,
      focusValue: explicitFocusValue,
      packageName: explicitFocusKind === 'package' ? explicitFocusValue : extractPackageName(question),
      reasons,
    };
  }

  const packageName = extractPackageName(question);
  const filePath = extractFilePath(question);
  const typeName = extractTypeName(question);

  if (packageName) {
    reasons.push({
      kind: 'focus-inference',
      detail: `Inferred the package focus "${packageName}" from the question text.`,
    });
    return {
      focusKind: 'package',
      focusValue: packageName,
      packageName,
      reasons,
    };
  }
  if (filePath) {
    reasons.push({
      kind: 'focus-inference',
      detail: `Inferred the file focus "${filePath}" from the question text.`,
    });
    return {
      focusKind: 'file',
      focusValue: filePath,
      reasons,
    };
  }
  if (typeName) {
    reasons.push({
      kind: 'focus-inference',
      detail: `Inferred the type focus "${typeName}" from the question text.`,
    });
    return {
      focusKind: 'type',
      focusValue: typeName,
      reasons,
    };
  }

  return { reasons };
}

export function deriveRepairHints(
  args: Record<string, unknown> | undefined,
  question: string | undefined,
): SourceAnalysisIngressFocusHints {
  const focusKind = asFocusKind(args?.focusKind) ?? inferFocusKindFromArgs(args);
  const focusValue = asString(args?.focusValue)
    ?? asString(args?.packageName)
    ?? extractPackageName(question ?? '')
    ?? extractFilePath(question ?? '')
    ?? extractTypeName(question ?? '');
  const reasons: SourceAnalysisIngressHintDetail[] = [];

  if (focusKind && focusValue) {
    reasons.push({
      kind: 'repair',
      detail: `Recovered ${focusKind}:${focusValue} from the attempted args or fallback question.`,
    });
  }

  return {
    focusKind,
    focusValue,
    packageName: asString(args?.packageName) ?? (focusKind === 'package' ? focusValue : undefined),
    reasons,
  };
}

export function inferFocusKindFromArgs(
  args: Record<string, unknown> | undefined,
): SourceAnalysisFocusKind | undefined {
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
  const packageMatch = question.match(/@[\w.-]+\/[\w.-]+/);
  if (packageMatch) {
    return packageMatch[0];
  }
  return undefined;
}

export function extractFilePath(question: string): string | undefined {
  const fileMatch = question.match(/[A-Za-z0-9_./\\-]+\.(?:cts|mts|ts|tsx|js|mjs|cjs)/);
  return fileMatch ? fileMatch[0].replace(/\\/g, '/') : undefined;
}

export function extractTypeName(question: string): string | undefined {
  const typedMatch = question.match(/\b(?:type|class|interface)\s+([A-Z][A-Za-z0-9_]*)\b/);
  if (typedMatch) {
    return typedMatch[1];
  }

  const backtickMatch = question.match(/`([A-Z][A-Za-z0-9_]*)`/);
  if (backtickMatch) {
    return backtickMatch[1];
  }

  const pascalMatches = (question.match(/\b[A-Z][A-Za-z0-9_]*\b/g) ?? [])
    .filter((match) => match.length > 1);
  return pascalMatches.length === 1 ? pascalMatches[0] : undefined;
}

export function extractRepoPath(question: string): string | undefined {
  const absoluteMatch = question.match(/[A-Za-z]:[\\/][A-Za-z0-9_.\\/ -]+/);
  return absoluteMatch ? absoluteMatch[0].replace(/\\/g, '/') : undefined;
}

export function describeFocusHints(hints: {
  readonly focusKind?: SourceAnalysisFocusKind;
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

export function asFocusKind(value: unknown): SourceAnalysisFocusKind | undefined {
  if (value === 'repo' || value === 'package' || value === 'directory' || value === 'file'
    || value === 'symbol' || value === 'type' || value === 'export' || value === 'claim'
    || value === 'session' || value === 'capability' || value === 'inquiry') {
    return value;
  }
  return undefined;
}
