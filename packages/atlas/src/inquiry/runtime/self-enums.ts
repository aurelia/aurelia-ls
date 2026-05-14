import { countByMap } from "../../collections.js";
import { sourceRangeFromFileSpan } from "../../source/index.js";
import type {
  TypeScriptEnumMemberReferenceRow,
  TypeScriptEnumTranslationCarrier,
  TypeScriptEnumTranslationEdgeRow,
  TypeScriptEnumTranslationEvidence,
  TypeScriptEnumTranslationRelation,
  TypeScriptEnumUsageIndex,
  TypeScriptEnumValueOccurrenceRow,
  TypeScriptEnumValueSpaceRow,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";

/** Enum member plus local use pressure. */
export interface AtlasSelfEnumMemberRow {
  /** Member name. */
  readonly name: string;
  /** Member initializer text/value when static. */
  readonly value: string | number | null;
  /** Property-access references such as EnumName.Member outside the declaration. */
  readonly referenceCount: number;
  /** String literal occurrences that duplicate this member's string value in a checker-backed enum context. */
  readonly literalReuseCount: number;
  /** Enum-to-enum translation edges that read from this member. */
  readonly translationOutCount: number;
  /** Enum-to-enum translation edges that target this member. */
  readonly translationInCount: number;
  /** Exact member declaration source. */
  readonly source: SourceRange;
}

/** Enum declaration row. */
export interface AtlasSelfEnumRow {
  /** Stable row id. */
  readonly id: string;
  /** Package that owns the enum declaration. */
  readonly packageId: string;
  /** Enum declaration name. */
  readonly name: string;
  /** True when the enum is exported from its source module. */
  readonly exported: boolean;
  /** True when declared as a const enum. */
  readonly constEnum: boolean;
  /** Number of enum members. */
  readonly memberCount: number;
  /** Members with at least one property-access reference. */
  readonly referencedMemberCount: number;
  /** Members with no property-access reference. */
  readonly unreferencedMemberCount: number;
  /** String literal occurrences that duplicate string-valued member values in checker-backed enum contexts. */
  readonly literalReuseCount: number;
  /** Enum-to-enum translation edges that read from this enum. */
  readonly translationOutCount: number;
  /** Enum-to-enum translation edges that target this enum. */
  readonly translationInCount: number;
  /** Exact enum declaration source. */
  readonly source: SourceRange;
  /** Member rows. */
  readonly members: readonly AtlasSelfEnumMemberRow[];
  /** Compact row summary. */
  readonly summary: string;
}

/** Exact Enum.Member use site from the package-scoped enum usage index. */
export interface AtlasSelfEnumReferenceRow {
  readonly id: string;
  readonly enumName: string;
  readonly memberName: string;
  readonly role: string;
  readonly expressionText: string;
  readonly containingFunction: string | null;
  readonly containingClass: string | null;
  readonly source: SourceRange;
  readonly summary: string;
}

/** Enum value-space row showing raw-value overlap and shared member values. */
export interface AtlasSelfEnumValueSpaceRow {
  readonly id: string;
  readonly value: string | number;
  readonly valueKind: "number" | "string";
  readonly enumNames: readonly string[];
  readonly memberNames: readonly string[];
  readonly memberReferenceCount: number;
  readonly rawValueOccurrenceCount: number;
  readonly sourceFiles: readonly string[];
  readonly firstSource?: SourceRange;
  readonly summary: string;
}

/** Exact raw literal occurrence whose value overlaps at least one enum member value. */
export interface AtlasSelfEnumValueOccurrenceRow {
  readonly id: string;
  readonly value: string | number;
  readonly valueKind: "number" | "string";
  readonly role: string;
  readonly text: string;
  readonly memberNames: readonly string[];
  readonly contextualMemberNames: readonly string[];
  readonly source: SourceRange;
  readonly summary: string;
}

/** Exact enum-to-enum translation edge. */
export interface AtlasSelfEnumMappingRow {
  readonly id: string;
  readonly fromEnumName: string;
  readonly fromMemberName: string;
  readonly toEnumName: string;
  readonly toMemberName: string;
  readonly carrier: TypeScriptEnumTranslationCarrier;
  readonly relation: TypeScriptEnumTranslationRelation;
  readonly evidence: TypeScriptEnumTranslationEvidence;
  readonly expressionText: string;
  readonly source: SourceRange;
  readonly summary: string;
}

/** Atlas-facing enum rows derived from the source-level enum usage substrate. */
export interface AtlasSelfEnumAnalysis {
  readonly enums: readonly AtlasSelfEnumRow[];
  readonly enumReferences: readonly AtlasSelfEnumReferenceRow[];
  readonly enumValueSpaces: readonly AtlasSelfEnumValueSpaceRow[];
  readonly enumValueOccurrences: readonly AtlasSelfEnumValueOccurrenceRow[];
  readonly enumMappings: readonly AtlasSelfEnumMappingRow[];
}

/** Project the TypeScript enum usage index into Atlas self-analysis rows. */
export function buildAtlasSelfEnumAnalysis(
  index: TypeScriptEnumUsageIndex,
): AtlasSelfEnumAnalysis {
  return {
    enums: atlasEnumRows(index),
    enumReferences: atlasEnumReferenceRows(index.memberReferences),
    enumValueSpaces: atlasEnumValueSpaceRows(index.valueSpaces, index),
    enumValueOccurrences: atlasEnumValueOccurrenceRows(
      index.valueOccurrences,
      index,
    ),
    enumMappings: atlasEnumMappingRows(index.translationEdges),
  };
}

export function enumMemberValueByName(
  rows: readonly AtlasSelfEnumRow[],
  enumName: string,
): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  for (const row of rows) {
    if (row.name !== enumName) {
      continue;
    }
    for (const member of row.members) {
      if (typeof member.value === "string") {
        values.set(member.name, member.value);
      }
    }
  }
  return values;
}

export function enumMemberNameByValue(
  rows: readonly AtlasSelfEnumRow[],
  enumName: string,
): ReadonlyMap<string, string> {
  const names = new Map<string, string>();
  for (const row of rows) {
    if (row.name !== enumName) {
      continue;
    }
    for (const member of row.members) {
      if (typeof member.value === "string") {
        names.set(member.value, member.name);
      }
    }
  }
  return names;
}

function atlasEnumRows(
  index: TypeScriptEnumUsageIndex,
): readonly AtlasSelfEnumRow[] {
  const mappingsIn = countByMap(index.translationEdges, (row) => row.toMemberKey);
  const mappingsOut = countByMap(
    index.translationEdges,
    (row) => row.fromMemberKey,
  );
  return index.enumDeclarations.map((row) => {
    const members = row.members.map((member) => ({
      name: member.memberName,
      value: member.value,
      referenceCount: member.referenceCount,
      literalReuseCount: member.rawValueOccurrenceCount,
      translationOutCount: mappingsOut.get(member.key) ?? 0,
      translationInCount: mappingsIn.get(member.key) ?? 0,
      source: sourceRangeFromFileSpan(member.file.repoPath, member.span),
    }));
    const literalReuseCount = members.reduce(
      (sum, member) => sum + member.literalReuseCount,
      0,
    );
    return {
      id: `atlas-self:enum:${row.packageId}:${row.file.repoPath}:${row.enumName}`,
      packageId: row.packageId,
      name: row.enumName,
      exported: row.exported,
      constEnum: row.constEnum,
      memberCount: row.memberCount,
      referencedMemberCount: row.referencedMemberCount,
      unreferencedMemberCount: row.unreferencedMemberCount,
      literalReuseCount,
      translationOutCount: row.translationOutCount,
      translationInCount: row.translationInCount,
      source: sourceRangeFromFileSpan(row.file.repoPath, row.span),
      members,
      summary: `${row.enumName} declares ${row.memberCount} member(s); ${row.unreferencedMemberCount} member(s) have no Enum.Member reference, ${literalReuseCount} contextual raw value occurrence(s) overlap its values, and ${row.translationInCount + row.translationOutCount} translation edge(s) touch it.`,
    };
  });
}

function atlasEnumReferenceRows(
  rows: readonly TypeScriptEnumMemberReferenceRow[],
): readonly AtlasSelfEnumReferenceRow[] {
  return rows.map((row) => ({
    id: `atlas-self:enum-reference:${row.id}`,
    enumName: row.enumName,
    memberName: row.memberName,
    role: row.role,
    expressionText: row.expressionText,
    containingFunction: row.containingFunction,
    containingClass: row.containingClass,
    source: sourceRangeFromFileSpan(row.file.repoPath, row.span),
    summary: `${row.enumName}.${row.memberName} is referenced as ${row.role}.`,
  }));
}

function atlasEnumValueSpaceRows(
  rows: readonly TypeScriptEnumValueSpaceRow[],
  index: TypeScriptEnumUsageIndex,
): readonly AtlasSelfEnumValueSpaceRow[] {
  const memberNamesByKey = enumMemberNamesByKey(index);
  return rows.map((row) => ({
    id: `atlas-self:enum-value-space:${row.valueKey}`,
    value: row.value,
    valueKind: row.valueKind,
    enumNames: row.enumNames,
    memberNames: row.memberKeys.map((key) => memberNamesByKey.get(key) ?? key),
    memberReferenceCount: row.memberReferenceCount,
    rawValueOccurrenceCount: row.rawValueOccurrenceCount,
    sourceFiles: row.sourceFiles,
    firstSource: row.firstOccurrence === undefined
      ? undefined
      : sourceRangeFromFileSpan(
        row.firstOccurrence.file.repoPath,
        row.firstOccurrence.span,
      ),
    summary: row.summary,
  }));
}

function atlasEnumValueOccurrenceRows(
  rows: readonly TypeScriptEnumValueOccurrenceRow[],
  index: TypeScriptEnumUsageIndex,
): readonly AtlasSelfEnumValueOccurrenceRow[] {
  const memberNamesByKey = enumMemberNamesByKey(index);
  return rows.map((row) => {
    const memberNames = row.memberKeys.map(
      (key) => memberNamesByKey.get(key) ?? key,
    );
    const contextualMemberNames = row.contextualMemberKeys.map(
      (key) => memberNamesByKey.get(key) ?? key,
    );
    const contextualSummary =
      contextualMemberNames.length === 0
        ? "no checker-backed enum context"
        : `context narrows to ${contextualMemberNames.join(", ")}`;
    return {
      id: `atlas-self:enum-value-occurrence:${row.id}`,
      value: row.value,
      valueKind: row.valueKind,
      role: row.role,
      text: row.text,
      memberNames,
      contextualMemberNames,
      source: sourceRangeFromFileSpan(row.file.repoPath, row.span),
      summary: `${row.text} overlaps ${memberNames.join(", ")} as ${row.role}; ${contextualSummary}.`,
    };
  });
}

function atlasEnumMappingRows(
  rows: readonly TypeScriptEnumTranslationEdgeRow[],
): readonly AtlasSelfEnumMappingRow[] {
  return rows.map((row) => ({
    id: `atlas-self:enum-mapping:${row.id}`,
    fromEnumName: row.fromEnumName,
    fromMemberName: row.fromMemberName,
    toEnumName: row.toEnumName,
    toMemberName: row.toMemberName,
    carrier: row.carrier,
    relation: row.relation,
    evidence: row.evidence,
    expressionText: row.expressionText,
    source: sourceRangeFromFileSpan(row.file.repoPath, row.span),
    summary: row.summary,
  }));
}

function enumMemberNamesByKey(
  index: TypeScriptEnumUsageIndex,
): ReadonlyMap<string, string> {
  return new Map(
    index.enumDeclarations.flatMap((enumRow) =>
      enumRow.members.map((member) => [
        member.key,
        `${member.enumName}.${member.memberName}`,
      ]),
    ),
  );
}
