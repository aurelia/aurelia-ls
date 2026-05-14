export function fillSourceTemplate(
  template: string,
  values: Readonly<Record<string, string>>,
): string {
  const usedKeys = new Set<string>();
  const text = template.replace(/__([A-Z0-9_]+)__/g, (placeholder, key: string) => {
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

export function sourceText(text: string): string {
  return text.replace(/\r\n/g, '\n');
}
