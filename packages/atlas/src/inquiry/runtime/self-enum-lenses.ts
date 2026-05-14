import type { Answer } from "../answer.js";
import {
  EvidenceConfidence,
  EvidenceKind,
  EvidenceRole,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import type {
  AtlasSelfAnalysis,
  AtlasSelfEnumMappingRow,
  AtlasSelfEnumReferenceRow,
  AtlasSelfEnumRow,
  AtlasSelfEnumValueOccurrenceRow,
  AtlasSelfEnumValueSpaceRow,
} from "./self-analysis.js";
import {
  inquiryBooleanFilter,
  inquiryLowerStringFilter,
  inquiryStringFilter,
} from "./lens-filter-utils.js";
import {
  answerSelfRowProjection,
  selfSourceBasis,
} from "./self-row-projection.js";

type SelfEnumProjectionValue = Readonly<{
  enums?: readonly AtlasSelfEnumRow[];
  enumReferences?: readonly AtlasSelfEnumReferenceRow[];
  enumValueSpaces?: readonly AtlasSelfEnumValueSpaceRow[];
  enumValueOccurrences?: readonly AtlasSelfEnumValueOccurrenceRow[];
  enumMappings?: readonly AtlasSelfEnumMappingRow[];
}>;

export function answerSelfEnumProjection<TValue extends SelfEnumProjectionValue>(
  inquiry: Inquiry,
  value: TValue,
  analysis: AtlasSelfAnalysis,
): Answer<TValue> {
  const rows = filterEnums(analysis.enums, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:enums",
    rows,
    valueWithRows: (pageRows) => ({ ...value, enums: pageRows }),
    rowNoun: "Atlas enum declaration row(s)",
    basisSummary:
      "Read enum declarations and Enum.Member references through the hot TypeScript Program.",
    evidenceForRow: evidenceForEnum,
    nextPageId: "atlas.self:enums:next-page",
    nextPageRationale: "Continue Atlas enum declaration rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect enum ${row.name}.`,
    }),
  });
}

export function answerSelfEnumReferencesProjection<
  TValue extends SelfEnumProjectionValue,
>(
  inquiry: Inquiry,
  value: TValue,
  analysis: AtlasSelfAnalysis,
): Answer<TValue> {
  const rows = filterEnumReferences(analysis.enumReferences, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:enum-references",
    rows,
    valueWithRows: (pageRows) => ({ ...value, enumReferences: pageRows }),
    rowNoun: "Atlas enum reference row(s)",
    basisSummary:
      "Read exact Enum.Member reference sites through the package-scoped TypeScript enum usage index.",
    evidenceForRow: evidenceForEnumReference,
    nextPageId: "atlas.self:enum-references:next-page",
    nextPageRationale: "Continue Atlas enum reference rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect enum reference ${row.enumName}.${row.memberName}.`,
    }),
  });
}

export function answerSelfEnumValueSpacesProjection<
  TValue extends SelfEnumProjectionValue,
>(
  inquiry: Inquiry,
  value: TValue,
  analysis: AtlasSelfAnalysis,
): Answer<TValue> {
  const rows = filterEnumValueSpaces(analysis.enumValueSpaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:enum-value-spaces",
    rows,
    valueWithRows: (pageRows) => ({ ...value, enumValueSpaces: pageRows }),
    rowNoun: "Atlas enum value-space row(s)",
    basisSummary:
      "Read enum member values and raw literal overlaps through the package-scoped TypeScript enum usage index.",
    evidenceForRow: evidenceForEnumValueSpace,
    nextPageId: "atlas.self:enum-value-spaces:next-page",
    nextPageRationale: "Continue Atlas enum value-space rows.",
    inspectionForRow: (row) =>
      row.firstSource === undefined
        ? undefined
        : {
            id: row.id,
            source: row.firstSource,
            summary: `Inspect first raw value occurrence for ${JSON.stringify(row.value)}.`,
          },
  });
}

export function answerSelfEnumValueOccurrencesProjection<
  TValue extends SelfEnumProjectionValue,
>(
  inquiry: Inquiry,
  value: TValue,
  analysis: AtlasSelfAnalysis,
): Answer<TValue> {
  const rows = filterEnumValueOccurrences(
    analysis.enumValueOccurrences,
    inquiry,
  );
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:enum-value-occurrences",
    rows,
    valueWithRows: (pageRows) => ({
      ...value,
      enumValueOccurrences: pageRows,
    }),
    rowNoun: "Atlas enum raw value occurrence row(s)",
    basisSummary:
      "Read exact raw literal occurrences whose values overlap enum member values through the package-scoped TypeScript enum usage index.",
    evidenceForRow: evidenceForEnumValueOccurrence,
    nextPageId: "atlas.self:enum-value-occurrences:next-page",
    nextPageRationale: "Continue Atlas enum raw value occurrence rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect raw enum-like literal ${row.text}.`,
    }),
  });
}

export function answerSelfEnumMappingsProjection<
  TValue extends SelfEnumProjectionValue,
>(
  inquiry: Inquiry,
  value: TValue,
  analysis: AtlasSelfAnalysis,
): Answer<TValue> {
  const rows = filterEnumMappings(analysis.enumMappings, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:enum-mappings",
    rows,
    valueWithRows: (pageRows) => ({ ...value, enumMappings: pageRows }),
    rowNoun: "Atlas enum mapping row(s)",
    basisSummary:
      "Read exact enum-to-enum translation evidence through the package-scoped TypeScript enum usage index.",
    evidenceForRow: evidenceForEnumMapping,
    nextPageId: "atlas.self:enum-mappings:next-page",
    nextPageRationale: "Continue Atlas enum mapping rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect enum mapping ${row.fromEnumName}.${row.fromMemberName} to ${row.toEnumName}.${row.toMemberName}.`,
    }),
  });
}

function filterEnums(
  rows: readonly AtlasSelfEnumRow[],
  inquiry: Inquiry,
): readonly AtlasSelfEnumRow[] {
  const packageId = inquiryStringFilter(inquiry, "packageId");
  const enumName = inquiryStringFilter(inquiry, "enumName");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (enumName !== undefined && row.name !== enumName) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      row.packageId.toLowerCase().includes(query) ||
      row.source.filePath.toLowerCase().includes(query) ||
      row.members.some(
        (member) =>
          member.name.toLowerCase().includes(query) ||
          String(member.value ?? "")
            .toLowerCase()
            .includes(query),
      )
    );
  });
}

function filterEnumReferences(
  rows: readonly AtlasSelfEnumReferenceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfEnumReferenceRow[] {
  const enumName = inquiryStringFilter(inquiry, "enumName");
  const memberName = inquiryStringFilter(inquiry, "memberName");
  const role = inquiryStringFilter(inquiry, "role");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (enumName !== undefined && row.enumName !== enumName) {
      return false;
    }
    if (memberName !== undefined && row.memberName !== memberName) {
      return false;
    }
    if (role !== undefined && row.role !== role) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.enumName.toLowerCase().includes(query) ||
      row.memberName.toLowerCase().includes(query) ||
      row.role.toLowerCase().includes(query) ||
      row.expressionText.toLowerCase().includes(query) ||
      (row.containingFunction?.toLowerCase().includes(query) ?? false) ||
      (row.containingClass?.toLowerCase().includes(query) ?? false) ||
      row.source.filePath.toLowerCase().includes(query)
    );
  });
}

function filterEnumValueSpaces(
  rows: readonly AtlasSelfEnumValueSpaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfEnumValueSpaceRow[] {
  const enumName = inquiryStringFilter(inquiry, "enumName");
  const memberName = inquiryStringFilter(inquiry, "memberName");
  const value = inquiryStringFilter(inquiry, "value");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (enumName !== undefined && !row.enumNames.includes(enumName)) {
      return false;
    }
    if (
      memberName !== undefined &&
      !row.memberNames.some((name) => name.endsWith(`.${memberName}`))
    ) {
      return false;
    }
    if (value !== undefined && String(row.value) !== value) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      String(row.value).toLowerCase().includes(query) ||
      row.enumNames.some((name) => name.toLowerCase().includes(query)) ||
      row.memberNames.some((name) => name.toLowerCase().includes(query)) ||
      row.sourceFiles.some((file) => file.toLowerCase().includes(query))
    );
  });
}

function filterEnumValueOccurrences(
  rows: readonly AtlasSelfEnumValueOccurrenceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfEnumValueOccurrenceRow[] {
  const enumName = inquiryStringFilter(inquiry, "enumName");
  const memberName = inquiryStringFilter(inquiry, "memberName");
  const role = inquiryStringFilter(inquiry, "role");
  const value = inquiryStringFilter(inquiry, "value");
  const contextualOnly = inquiryBooleanFilter(inquiry, "contextualOnly");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (
      enumName !== undefined &&
      !row.memberNames.some((name) => name.startsWith(`${enumName}.`))
    ) {
      return false;
    }
    if (
      memberName !== undefined &&
      !row.memberNames.some((name) => name.endsWith(`.${memberName}`))
    ) {
      return false;
    }
    if (role !== undefined && row.role !== role) {
      return false;
    }
    if (value !== undefined && String(row.value) !== value) {
      return false;
    }
    if (
      contextualOnly === true &&
      row.contextualMemberNames.length === 0
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.text.toLowerCase().includes(query) ||
      String(row.value).toLowerCase().includes(query) ||
      row.role.toLowerCase().includes(query) ||
      row.memberNames.some((name) => name.toLowerCase().includes(query)) ||
      row.contextualMemberNames.some((name) =>
        name.toLowerCase().includes(query),
      ) ||
      row.source.filePath.toLowerCase().includes(query)
    );
  });
}

function filterEnumMappings(
  rows: readonly AtlasSelfEnumMappingRow[],
  inquiry: Inquiry,
): readonly AtlasSelfEnumMappingRow[] {
  const enumName = inquiryStringFilter(inquiry, "enumName");
  const fromEnum = inquiryStringFilter(inquiry, "fromEnum");
  const toEnum = inquiryStringFilter(inquiry, "toEnum");
  const memberName = inquiryStringFilter(inquiry, "memberName");
  const carrier = inquiryStringFilter(inquiry, "carrier");
  const relation = inquiryStringFilter(inquiry, "enumRelation");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (
      enumName !== undefined &&
      row.fromEnumName !== enumName &&
      row.toEnumName !== enumName
    ) {
      return false;
    }
    if (fromEnum !== undefined && row.fromEnumName !== fromEnum) {
      return false;
    }
    if (toEnum !== undefined && row.toEnumName !== toEnum) {
      return false;
    }
    if (
      memberName !== undefined &&
      row.fromMemberName !== memberName &&
      row.toMemberName !== memberName
    ) {
      return false;
    }
    if (carrier !== undefined && row.carrier !== carrier) {
      return false;
    }
    if (relation !== undefined && row.relation !== relation) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.fromEnumName.toLowerCase().includes(query) ||
      row.toEnumName.toLowerCase().includes(query) ||
      row.fromMemberName.toLowerCase().includes(query) ||
      row.toMemberName.toLowerCase().includes(query) ||
      row.carrier.toLowerCase().includes(query) ||
      row.expressionText.toLowerCase().includes(query) ||
      row.source.filePath.toLowerCase().includes(query)
    );
  });
}

function evidenceForEnum(row: AtlasSelfEnumRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Enum declaration and local reference counts are AST-derived.",
    ),
    source: row.source,
    data: {
      enumName: row.name,
      memberCount: row.memberCount,
      referencedMemberCount: row.referencedMemberCount,
      unreferencedMemberCount: row.unreferencedMemberCount,
      literalReuseCount: row.literalReuseCount,
      translationInCount: row.translationInCount,
      translationOutCount: row.translationOutCount,
    },
  };
}

function evidenceForEnumReference(row: AtlasSelfEnumReferenceRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Enum reference rows are AST-derived and resolved against the TypeChecker-backed enum usage index.",
    ),
    source: row.source,
    data: row,
  };
}

function evidenceForEnumValueSpace(row: AtlasSelfEnumValueSpaceRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Enum value-space rows are derived from enum member values and raw literal overlap.",
    ),
    source: row.firstSource,
    data: row,
  };
}

function evidenceForEnumValueOccurrence(
  row: AtlasSelfEnumValueOccurrenceRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Enum raw value occurrence rows are exact literal sites joined to enum value-space overlap and checker-backed contextual narrowing.",
    ),
    source: row.source,
    data: row,
  };
}

function evidenceForEnumMapping(row: AtlasSelfEnumMappingRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Enum mapping rows are exact local translation edges from the enum usage index.",
    ),
    source: row.source,
    data: row,
  };
}
