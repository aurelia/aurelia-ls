import {
  kebabSourceName,
  sourceNameWords,
  titleSourceName,
} from './source-name.js';

export interface SourceOptionSchemaGroup {
  readonly key: string | null;
  readonly options: readonly SourceOptionSchemaOption[];
}

export interface SourceOptionSchemaOption {
  readonly value: string;
  readonly label: string;
}

export function sourceOptionSchemaGroups(
  value?: string | null,
): readonly SourceOptionSchemaGroup[] {
  const trimmed = normalizedSourceOptionsParameterValue(value) ?? '';
  if (trimmed.length === 0) {
    return [];
  }
  return trimmed
    .split(/[;\n]+/u)
    .map(sourceOptionSchemaGroup)
    .filter((group): group is SourceOptionSchemaGroup => group != null);
}

export function normalizedSourceOptionsParameterValue(
  value?: string | null,
): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}

export function sourceOptionSchemaGroupForField<TField>(
  field: TField,
  groups: readonly SourceOptionSchemaGroup[],
  fields: readonly TField[],
  fieldHasOptionDomain: (field: TField) => boolean,
  optionDomainFieldKeys: (field: TField) => readonly string[],
): SourceOptionSchemaGroup | null {
  const optionFields = fields.filter(fieldHasOptionDomain);
  const keyedGroups = groups.filter((group) => group.key != null);
  for (const group of keyedGroups) {
    if (sourceOptionSchemaGroupMatchesField(group, field, optionDomainFieldKeys)) {
      return group;
    }
  }
  const unkeyedGroups = groups.filter((group) => group.key == null);
  return optionFields.length === 1 && unkeyedGroups.length === 1
    ? unkeyedGroups[0]!
    : null;
}

export function sourceOptionSchemaLiteralSearchValues(value: string): readonly string[] {
  return uniqueStrings(
    sourceOptionSchemaGroups(value)
      .flatMap((group) => group.options)
      .map((option) => sourceStringLiteral(option.value)),
  );
}

export function sourceStringLiteral(value: string): string {
  return `'${value.replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`;
}

export function sourceOptionDomainKey(value: string): string {
  return kebabSourceName(sourceNameWords(value)).replace(/-/gu, '');
}

function sourceOptionSchemaGroupMatchesField<TField>(
  group: SourceOptionSchemaGroup,
  field: TField,
  optionDomainFieldKeys: (field: TField) => readonly string[],
): boolean {
  const groupKey = sourceOptionDomainKey(group.key ?? '');
  return groupKey.length > 0
    && optionDomainFieldKeys(field).some((key) => sourceOptionDomainKey(key) === groupKey);
}

function sourceOptionSchemaGroup(rawGroup: string): SourceOptionSchemaGroup | null {
  const trimmed = rawGroup.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const separatorIndex = trimmed.indexOf(':');
  const key = separatorIndex >= 0
    ? trimmed.slice(0, separatorIndex).trim()
    : null;
  const optionSource = separatorIndex >= 0
    ? trimmed.slice(separatorIndex + 1)
    : trimmed;
  const options = uniqueOptions(
    optionSource
      .split(/[,|]|\band\b/iu)
      .map(sourceOptionSchemaOption)
      .filter((option): option is SourceOptionSchemaOption => option != null),
  );
  return options.length === 0
    ? null
    : {
      key: key == null || key.length === 0 ? null : key,
      options,
    };
}

function sourceOptionSchemaOption(rawOption: string): SourceOptionSchemaOption | null {
  const cleaned = rawOption
    .trim()
    .replace(/^['"`]+|['"`]+$/gu, '')
    .trim();
  if (cleaned.length === 0) {
    return null;
  }
  const words = sourceOptionSchemaWords(cleaned);
  return {
    value: kebabSourceName(words),
    label: sourceOptionSchemaLabel(cleaned, words),
  };
}

function sourceOptionSchemaWords(value: string): readonly string[] {
  const normalized = value
    .replace(/\btype\s*script\b/giu, 'typescript')
    .replace(/\bjava\s*script\b/giu, 'javascript')
    .replace(/(^|[^a-z0-9])c#(?=$|[^a-z0-9])/giu, '$1csharp')
    .replace(/(^|[^a-z0-9])f#(?=$|[^a-z0-9])/giu, '$1fsharp')
    .replace(/(^|[^a-z0-9])c\+\+(?=$|[^a-z0-9])/giu, '$1cplusplus');
  return sourceNameWords(normalized);
}

function sourceOptionSchemaLabel(
  rawValue: string,
  words: readonly string[],
): string {
  const normalized = rawValue.trim().toLowerCase();
  switch (normalized) {
    case 'c#':
      return 'C#';
    case 'f#':
      return 'F#';
    case 'c++':
      return 'C++';
    default:
      return titleSourceName(words);
  }
}

function uniqueOptions(
  options: readonly SourceOptionSchemaOption[],
): readonly SourceOptionSchemaOption[] {
  const unique: SourceOptionSchemaOption[] = [];
  const seen = new Set<string>();
  for (const option of options) {
    if (!seen.has(option.value)) {
      seen.add(option.value);
      unique.push(option);
    }
  }
  return unique;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      unique.push(value);
    }
  }
  return unique;
}
