export function fillSourceTemplate(
  template: string,
  values: Readonly<Record<string, string>>,
): string {
  const usedKeys = new Set<string>();
  const text = template.replace(/__([A-Z0-9_]+?)__/g, (placeholder, key: string) => {
    const value = values[key];
    if (!Object.hasOwn(values, key) || value == null) {
      throw new Error(`Source template placeholder ${placeholder} has no value.`);
    }
    usedKeys.add(key);
    return value;
  });
  const unusedKeys = Object.keys(values).filter((key) => !usedKeys.has(key));
  if (unusedKeys.length > 0) {
    throw new Error(`Source template values were not used: ${unusedKeys.join(', ')}`);
  }
  return text;
}

export function sourceTemplateValuesUsedBy(
  template: string,
  values: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const usedValues: Record<string, string> = {};
  for (const match of template.matchAll(/__([A-Z0-9_]+?)__/g)) {
    const key = match[1]!;
    if (Object.hasOwn(usedValues, key)) {
      continue;
    }
    if (!Object.hasOwn(values, key)) {
      throw new Error(`Source template placeholder __${key}__ has no value.`);
    }
    usedValues[key] = values[key]!;
  }
  return usedValues;
}

export function sourceText(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

/** Normalize caller-supplied source text input by trimming whitespace and treating empty text as absent. */
export function normalizedSourceInputText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}

/** Emit a single-quoted TypeScript string literal for small generated source fragments. */
export function singleQuotedTypeScriptStringLiteralText(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function indentSourceLines(text: string, indent: string): string {
  return text.split('\n').map((line) => line.length === 0 ? '' : `${indent}${line}`).join('\n');
}
