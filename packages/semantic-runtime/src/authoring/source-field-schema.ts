export function splitSourceFieldSchemaItems(value: string): readonly string[] {
  return value
    .split(/[,;]|\band\b/iu)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export interface SourceFieldSchemaTypedProperty {
  readonly propertyName: string;
  readonly typeName: string;
}

export interface SourceFieldSchemaLabelCleanOptions {
  readonly select?: boolean;
  readonly boolean?: boolean;
  readonly number?: boolean;
}

export function cleanSourceFieldSchemaLabel(
  item: string,
  options: SourceFieldSchemaLabelCleanOptions,
): string {
  let cleaned = item
    .replace(/\b(field|input|control|column|filter|sort|sortable)\b/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (options.select === true) {
    cleaned = cleaned.replace(/\b(select|dropdown|choice|choices|option|options)\b/giu, ' ');
  }
  if (options.boolean === true) {
    cleaned = cleaned.replace(/\b(toggle|toggles|switch|checkbox|checkboxes|checked)\b/giu, ' ');
  }
  if (options.number === true) {
    cleaned = cleaned.replace(/\b(number|numeric)\b/giu, ' ');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

export function uniqueSourceFieldSchemaPropertyName(
  baseName: string,
  usedPropertyNames: Map<string, number>,
): string {
  const previousCount = usedPropertyNames.get(baseName) ?? 0;
  usedPropertyNames.set(baseName, previousCount + 1);
  return previousCount === 0 ? baseName : `${baseName}${previousCount + 1}`;
}

export function sourceFieldSchemaReadonlyConstructorParameters(
  fields: readonly SourceFieldSchemaTypedProperty[],
): string {
  return fields
    .map((field) => `readonly ${field.propertyName}: ${field.typeName},`)
    .join('\n');
}

export function sourceFieldSchemaReadonlyRecordFields(
  fields: readonly SourceFieldSchemaTypedProperty[],
): string {
  return fields
    .map((field) => `readonly ${field.propertyName}: ${field.typeName};`)
    .join('\n');
}
