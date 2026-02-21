import type { NormalizedPath, TextSpan } from "../compiler.js";

export type RecognitionSource = "decorator" | "define";

export interface RecognizedBindingCommand {
  readonly name: string;
  readonly className: string;
  readonly file: NormalizedPath;
  readonly source: RecognitionSource;
  readonly declarationSpan?: TextSpan;
  readonly nameSpan?: TextSpan;
}

export interface RecognizedAttributePattern {
  readonly pattern: string;
  readonly symbols: string;
  readonly className: string;
  readonly file: NormalizedPath;
  readonly source: RecognitionSource;
  readonly declarationSpan?: TextSpan;
  readonly patternSpan?: TextSpan;
  readonly symbolsSpan?: TextSpan;
}

export function sortAndDedupeBindingCommands(
  commands: readonly RecognizedBindingCommand[],
): RecognizedBindingCommand[] {
  const sorted = [...commands].sort(compareBindingCommandRecognition);
  const deduped: RecognizedBindingCommand[] = [];
  let previousKey: string | null = null;

  for (const command of sorted) {
    const key = bindingCommandKey(command);
    if (key === previousKey) {
      continue;
    }
    deduped.push(command);
    previousKey = key;
  }

  return deduped;
}

export function sortAndDedupeAttributePatterns(
  patterns: readonly RecognizedAttributePattern[],
): RecognizedAttributePattern[] {
  const sorted = [...patterns].sort(compareAttributePatternRecognition);
  const deduped: RecognizedAttributePattern[] = [];
  let previousKey: string | null = null;

  for (const pattern of sorted) {
    const key = attributePatternKey(pattern);
    if (key === previousKey) {
      continue;
    }
    deduped.push(pattern);
    previousKey = key;
  }

  return deduped;
}

export function compareBindingCommandRecognition(
  left: RecognizedBindingCommand,
  right: RecognizedBindingCommand,
): number {
  return bindingCommandKey(left).localeCompare(bindingCommandKey(right));
}

export function compareAttributePatternRecognition(
  left: RecognizedAttributePattern,
  right: RecognizedAttributePattern,
): number {
  return attributePatternKey(left).localeCompare(attributePatternKey(right));
}

function bindingCommandKey(recognition: RecognizedBindingCommand): string {
  const nameSpan = recognition.nameSpan;
  return [
    recognition.name,
    recognition.file,
    recognition.className,
    recognition.source,
    recognition.declarationSpan?.start ?? "",
    recognition.declarationSpan?.end ?? "",
    nameSpan?.start ?? "",
    nameSpan?.end ?? "",
  ].join("|");
}

function attributePatternKey(recognition: RecognizedAttributePattern): string {
  const patternSpan = recognition.patternSpan;
  const symbolsSpan = recognition.symbolsSpan;
  return [
    recognition.pattern,
    recognition.symbols,
    recognition.file,
    recognition.className,
    recognition.source,
    recognition.declarationSpan?.start ?? "",
    recognition.declarationSpan?.end ?? "",
    patternSpan?.start ?? "",
    patternSpan?.end ?? "",
    symbolsSpan?.start ?? "",
    symbolsSpan?.end ?? "",
  ].join("|");
}
