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
  AtlasSelfAxisPressureRow,
  AtlasSelfClassSurfaceRow,
  AtlasSelfContractStringRow,
  AtlasSelfFunctionControlFlowShapeGroupRow,
  AtlasSelfFunctionShapeGroupRow,
  AtlasSelfFunctionSurfaceRow,
  AtlasSelfFunctionWrapperRow,
  AtlasSelfRelationshipSurfaceRow,
  AtlasSelfRowSurfaceRow,
  AtlasSelfSourceFileSurfaceRow,
  AtlasSelfStringLiteralRow,
  AtlasSelfVariableSurfaceRow,
} from "./self-analysis.js";
import {
  inquiryBooleanFilter,
  inquiryBooleanFilterOrDefault,
  inquiryLowerStringFilter,
  inquiryNumberFilter,
  inquiryStringFilter,
} from "./lens-filter-utils.js";
import {
  answerSelfRowProjection,
  selfSourceBasis,
} from "./self-row-projection.js";
import type { SelfValue } from "./self-value.js";
import { orderClassSurfaceRows } from "./class-surface-order.js";
import { compareNullableStrings } from "../../collections.js";


export function answerSelfContractStringsProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterContractStrings(analysis.contractStrings, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:contract-strings",
    rows,
    valueWithRows: (pageRows) => ({ ...value, contractStrings: pageRows }),
    rowNoun: "Atlas contract string row(s)",
    basisSummary:
      "Classified contract-bearing string literals through the hot TypeScript Program.",
    evidenceForRow: evidenceForContractString,
    nextPageId: "atlas.self:contract-strings:next-page",
    nextPageRationale: "Continue Atlas contract string rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.firstSource,
      summary: `Inspect contract string ${JSON.stringify(row.value)}.`,
    }),
  });
}





export function answerSelfStringProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterStrings(analysis.strings, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:strings",
    rows,
    valueWithRows: (pageRows) => ({ ...value, strings: pageRows }),
    rowNoun: "Atlas string literal row(s)",
    basisSummary:
      "Read string literal occurrences through the hot TypeScript Program.",
    evidenceForRow: evidenceForStringLiteral,
    nextPageId: "atlas.self:strings:next-page",
    nextPageRationale: "Continue Atlas string literal rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.firstSource,
      summary: `Inspect first occurrence of string literal ${JSON.stringify(
        row.value,
      )}.`,
    }),
  });
}





export function answerSelfRelationshipSurfaceProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  return answerSelfRelationshipRows(
    inquiry,
    value,
    filterRelationshipSurfaces(analysis.relationshipSurfaces, inquiry),
  );
}





export function answerSelfRowSurfaceProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterRowSurfaces(analysis.rowSurfaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:row-surfaces",
    rows,
    valueWithRows: (pageRows) => ({ ...value, rowSurfaces: pageRows }),
    rowNoun: "Atlas row surface row(s)",
    basisSummary:
      "Read structural interface/type row surfaces through the hot TypeScript Program.",
    evidenceForRow: evidenceForRowSurface,
    nextPageId: "atlas.self:row-surfaces:next-page",
    nextPageRationale: "Continue Atlas row surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect row surface ${row.name}.`,
    }),
  });
}





export function answerSelfClassesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterAtlasSelfClassSurfaces(analysis.classSurfaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:classes",
    rows,
    valueWithRows: (pageRows) => ({ ...value, classSurfaces: pageRows }),
    rowNoun: "Atlas class surface row(s)",
    basisSummary:
      "Read class declarations, methods, fields, heritage, and constructor surfaces through the hot TypeScript Program.",
    evidenceForRow: evidenceForAtlasSelfClassSurface,
    nextPageId: "atlas.self:classes:next-page",
    nextPageRationale: "Continue Atlas class surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect class surface ${row.name}.`,
    }),
  });
}





export function answerSelfSourceFilesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterSourceFileSurfaces(analysis.sourceFileSurfaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:source-files",
    rows,
    valueWithRows: (pageRows) => ({ ...value, sourceFileSurfaces: pageRows }),
    rowNoun: "Atlas source file surface row(s)",
    basisSummary:
      "Read source file size, statement, import, export, and declaration pressure through the hot TypeScript Program.",
    evidenceForRow: evidenceForSourceFileSurface,
    nextPageId: "atlas.self:source-files:next-page",
    nextPageRationale: "Continue Atlas source file surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect source file ${row.filePath}.`,
    }),
  });
}





export function answerSelfFunctionsProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterAtlasSelfFunctionSurfaces(analysis.functionSurfaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:functions",
    rows,
    valueWithRows: (pageRows) => ({ ...value, functionSurfaces: pageRows }),
    rowNoun: "Atlas function surface row(s)",
    basisSummary:
      "Read top-level function and class-method declarations through the hot TypeScript Program.",
    evidenceForRow: evidenceForAtlasSelfFunctionSurface,
    nextPageId: "atlas.self:functions:next-page",
    nextPageRationale: "Continue Atlas function surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect function surface ${row.name}.`,
    }),
  });
}

export function answerSelfVariablesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterAtlasSelfVariableSurfaces(analysis.variableSurfaces, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:variables",
    rows,
    valueWithRows: (pageRows) => ({ ...value, variableSurfaces: pageRows }),
    rowNoun: "Atlas top-level variable surface row(s)",
    basisSummary:
      "Read top-level variable declarations through the hot TypeScript Program.",
    evidenceForRow: evidenceForAtlasSelfVariableSurface,
    nextPageId: "atlas.self:variables:next-page",
    nextPageRationale: "Continue Atlas top-level variable surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect variable surface ${row.name}.`,
    }),
  });
}





export function answerSelfFunctionShapesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterAtlasSelfFunctionShapeGroups(analysis.functionShapeGroups, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:function-shapes",
    rows,
    valueWithRows: (pageRows) => ({ ...value, functionShapeGroups: pageRows }),
    rowNoun: "Atlas repeated function body-shape group(s)",
    basisSummary:
      "Read repeated function body shapes through canonical AST/control-flow fingerprints, independent of helper names.",
    evidenceForRow: evidenceForAtlasSelfFunctionShapeGroup,
    nextPageId: "atlas.self:function-shapes:next-page",
    nextPageRationale: "Continue repeated Atlas function body-shape groups.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect first function in repeated body-shape group ${row.bodyShapeFingerprint}.`,
    }),
  });
}

export function answerSelfFunctionControlFlowShapesProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterAtlasSelfFunctionControlFlowShapeGroups(
    analysis.functionControlFlowShapeGroups,
    inquiry,
  );
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:function-control-flow-shapes",
    rows,
    valueWithRows: (pageRows) => ({
      ...value,
      functionControlFlowShapeGroups: pageRows,
    }),
    rowNoun: "Atlas shared switch-topology function group(s)",
    basisSummary:
      "Read shared function switch-dispatch topology through canonical structural fingerprints.",
    evidenceForRow: evidenceForAtlasSelfFunctionControlFlowShapeGroup,
    nextPageId: "atlas.self:function-control-flow-shapes:next-page",
    nextPageRationale: "Continue Atlas shared switch-topology function groups.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect first function in switch-topology group ${row.switchTopologyFingerprint}.`,
    }),
  });
}

export function answerSelfFunctionWrappersProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterAtlasSelfFunctionWrappers(analysis.functionWrapperRows, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:function-wrappers",
    rows,
    valueWithRows: (pageRows) => ({ ...value, functionWrapperRows: pageRows }),
    rowNoun: "Atlas shallow function wrapper row(s)",
    basisSummary:
      "Read function bodies that only return one constructor or call expression, with local incoming-call counts.",
    evidenceForRow: evidenceForAtlasSelfFunctionWrapper,
    nextPageId: "atlas.self:function-wrappers:next-page",
    nextPageRationale: "Continue shallow Atlas function wrapper rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect shallow function wrapper ${row.name}.`,
    }),
  });
}





function answerSelfRelationshipRows(
  inquiry: Inquiry,
  value: SelfValue,
  rows: readonly AtlasSelfRelationshipSurfaceRow[],
): Answer<SelfValue> {
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:relationship-surfaces",
    rows,
    valueWithRows: (pageRows) => ({ ...value, relationshipSurfaces: pageRows }),
    rowNoun: "Atlas relationship surface row(s)",
    basisSummary:
      "Read relationship-like interface/type surfaces through the hot TypeScript Program.",
    evidenceForRow: evidenceForRelationshipSurface,
    nextPageId: "atlas.self:relationship-surfaces:next-page",
    nextPageRationale: "Continue Atlas relationship surface rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect relationship surface ${row.name}.`,
    }),
  });
}





export function answerSelfAxisPressureProjection(
  inquiry: Inquiry,
  value: SelfValue,
  analysis: AtlasSelfAnalysis,
): Answer<SelfValue> {
  const rows = filterAxisPressure(analysis.axisPressure, inquiry);
  return answerSelfRowProjection(inquiry, {
    familyId: "atlas.self:axis-pressure",
    rows,
    valueWithRows: (pageRows) => ({ ...value, axisPressure: pageRows }),
    rowNoun: "Atlas axis pressure row(s)",
    basisSummary:
      "Read axis, mapper, and stringly-surface pressure through the hot TypeScript Program.",
    evidenceForRow: evidenceForAxisPressure,
    nextPageId: "atlas.self:axis-pressure:next-page",
    nextPageRationale: "Continue Atlas axis pressure rows.",
    inspectionForRow: (row) => ({
      id: row.id,
      source: row.source,
      summary: `Inspect axis pressure ${row.sourceName}.`,
    }),
  });
}





function filterStrings(
  rows: readonly AtlasSelfStringLiteralRow[],
  inquiry: Inquiry,
): readonly AtlasSelfStringLiteralRow[] {
  const packageId = inquiryStringFilter(inquiry, "packageId");
  const role = inquiryStringFilter(inquiry, "stringRole");
  const declarationKind = inquiryStringFilter(inquiry, "declarationKind");
  const query = inquiryLowerStringFilter(inquiry, "query");
  const magicOnly = inquiryBooleanFilterOrDefault(inquiry, "magicOnly", true);
  return rows.filter((row) => {
    if (magicOnly && !row.reusedOutsideDeclaration) {
      return false;
    }
    if (packageId !== undefined && !row.packageIds.includes(packageId)) {
      return false;
    }
    if (role !== undefined && row.roles[role] === undefined) {
      return false;
    }
    if (!matchesStringDeclarationKind(row, declarationKind)) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.value.toLowerCase().includes(query) ||
      row.files.some((file) => file.toLowerCase().includes(query)) ||
      row.declaredByEnumMembers.some((member) =>
        member.toLowerCase().includes(query),
      ) ||
      row.declaredByConstObjectMembers.some((member) =>
        member.toLowerCase().includes(query),
      )
    );
  });
}





function filterRelationshipSurfaces(
  rows: readonly AtlasSelfRelationshipSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfRelationshipSurfaceRow[] {
  return filterRowSurfaces(rows, inquiry).filter(
    (row): row is AtlasSelfRelationshipSurfaceRow =>
      row.surfaceKind === "relationship",
  );
}





function filterAxisPressure(
  rows: readonly AtlasSelfAxisPressureRow[],
  inquiry: Inquiry,
): readonly AtlasSelfAxisPressureRow[] {
  const kind = inquiryStringFilter(inquiry, "kind");
  const axis = inquiryStringFilter(inquiry, "axis");
  const axisId = inquiryStringFilter(inquiry, "axisId");
  const axisField = inquiryStringFilter(inquiry, "axisField");
  const valueSpace = inquiryStringFilter(inquiry, "valueSpace");
  const pressure = inquiryStringFilter(inquiry, "pressure");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (kind !== undefined && row.kind !== kind) {
      return false;
    }
    if (axis !== undefined && row.axis !== axis) {
      return false;
    }
    if (axisId !== undefined && row.axisId !== axisId) {
      return false;
    }
    if (axisField !== undefined && row.axisField !== axisField) {
      return false;
    }
    if (valueSpace !== undefined && row.valueSpace !== valueSpace) {
      return false;
    }
    if (pressure !== undefined && row.pressure !== pressure) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.axis.toLowerCase().includes(query) ||
      row.axisId.toLowerCase().includes(query) ||
      (row.axisField?.toLowerCase().includes(query) ?? false) ||
      (row.valueSpace?.toLowerCase().includes(query) ?? false) ||
      row.kind.toLowerCase().includes(query) ||
      row.sourceName.toLowerCase().includes(query) ||
      row.filePath.toLowerCase().includes(query) ||
      row.sourceAxes.some((entry) => entry.toLowerCase().includes(query)) ||
      row.targetAxes.some((entry) => entry.toLowerCase().includes(query)) ||
      row.signals.some((entry) => entry.toLowerCase().includes(query))
    );
  });
}





function filterRowSurfaces(
  rows: readonly AtlasSelfRowSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfRowSurfaceRow[] {
  const packageId = inquiryStringFilter(inquiry, "packageId");
  const declarationKind = inquiryStringFilter(inquiry, "declarationKind");
  const surfaceKind = inquiryStringFilter(inquiry, "surfaceKind");
  const surfaceRole = inquiryStringFilter(inquiry, "surfaceRole");
  const axis = inquiryStringFilter(inquiry, "axis");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (
      declarationKind !== undefined &&
      row.declarationKind !== declarationKind
    ) {
      return false;
    }
    if (surfaceKind !== undefined && row.surfaceKind !== surfaceKind) {
      return false;
    }
    if (surfaceRole !== undefined && row.surfaceRole !== surfaceRole) {
      return false;
    }
    if (axis !== undefined && !row.fields.includes(axis)) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      row.packageId.toLowerCase().includes(query) ||
      row.surfaceRole.toLowerCase().includes(query) ||
      row.source.filePath.toLowerCase().includes(query) ||
      row.fields.some(
        (field) =>
          field.toLowerCase().includes(query) ||
          row.fieldTypes[field]?.toLowerCase().includes(query),
      )
    );
  });
}





function filterAtlasSelfClassSurfaces(
  rows: readonly AtlasSelfClassSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfClassSurfaceRow[] {
  const packageId = inquiryStringFilter(inquiry, "packageId");
  const className = inquiryStringFilter(inquiry, "className");
  const methodName = inquiryStringFilter(inquiry, "methodName");
  const minLineCount = inquiryNumberFilter(inquiry, "minLineCount");
  const minMethodCount = inquiryNumberFilter(inquiry, "minMethodCount");
  const minPropertyCount = inquiryNumberFilter(inquiry, "minPropertyCount");
  const query = inquiryLowerStringFilter(inquiry, "query");
  const filtered = rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (className !== undefined && row.name !== className) {
      return false;
    }
    if (
      methodName !== undefined &&
      !row.methods.includes(methodName) &&
        !row.staticMethods.includes(methodName)
    ) {
      return false;
    }
    if (minLineCount !== undefined && row.lineCount < minLineCount) {
      return false;
    }
    if (minMethodCount !== undefined && row.methodCount < minMethodCount) {
      return false;
    }
    if (
      minPropertyCount !== undefined &&
      row.propertyCount < minPropertyCount
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      row.filePath.toLowerCase().includes(query) ||
      (row.extendsType?.toLowerCase().includes(query) ?? false) ||
      row.implementsTypes.some((entry) =>
        entry.toLowerCase().includes(query),
      ) ||
      row.methods.some((method) => method.toLowerCase().includes(query)) ||
      row.staticMethods.some((method) =>
        method.toLowerCase().includes(query),
      ) ||
      row.accessors.some((accessor) =>
        accessor.toLowerCase().includes(query),
      ) ||
      row.properties.some((property) => property.toLowerCase().includes(query))
    );
  });
  return orderClassSurfaceRows(filtered, inquiryStringFilter(inquiry, "orderBy"));
}





function filterSourceFileSurfaces(
  rows: readonly AtlasSelfSourceFileSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfSourceFileSurfaceRow[] {
  const packageId = inquiryStringFilter(inquiry, "packageId");
  const area = inquiryStringFilter(inquiry, "area");
  const moduleShape = inquiryStringFilter(inquiry, "moduleShape");
  const minLineCount = inquiryNumberFilter(inquiry, "minLineCount");
  const minOutgoingLocalImportCount = inquiryNumberFilter(
    inquiry,
    "minOutgoingLocalImportCount",
  );
  const minIncomingLocalImportCount = inquiryNumberFilter(
    inquiry,
    "minIncomingLocalImportCount",
  );
  const minCrossAreaOutgoingImportCount = inquiryNumberFilter(
    inquiry,
    "minCrossAreaOutgoingImportCount",
  );
  const query = inquiryLowerStringFilter(inquiry, "query");
  const filtered = rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (area !== undefined && row.area !== area) {
      return false;
    }
    if (moduleShape !== undefined && row.moduleShape !== moduleShape) {
      return false;
    }
    if (minLineCount !== undefined && row.lineCount < minLineCount) {
      return false;
    }
    if (
      minOutgoingLocalImportCount !== undefined &&
      row.outgoingLocalImportCount < minOutgoingLocalImportCount
    ) {
      return false;
    }
    if (
      minIncomingLocalImportCount !== undefined &&
      row.incomingLocalImportCount < minIncomingLocalImportCount
    ) {
      return false;
    }
    if (
      minCrossAreaOutgoingImportCount !== undefined &&
      row.crossAreaOutgoingImportCount < minCrossAreaOutgoingImportCount
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.filePath.toLowerCase().includes(query) ||
      row.area.toLowerCase().includes(query) ||
      row.moduleShape.toLowerCase().includes(query) ||
      row.summary.toLowerCase().includes(query)
    );
  });
  return orderSourceFileSurfaces(filtered, inquiryStringFilter(inquiry, "orderBy"));
}





function orderSourceFileSurfaces(
  rows: readonly AtlasSelfSourceFileSurfaceRow[],
  orderBy: string | undefined,
): readonly AtlasSelfSourceFileSurfaceRow[] {
  switch (orderBy) {
    case "size":
    case "lineCount":
      return [...rows].sort((left, right) =>
        right.lineCount - left.lineCount ||
        right.statementCount - left.statementCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "importCount":
      return [...rows].sort((left, right) =>
        right.importCount - left.importCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "exportCount":
      return [...rows].sort((left, right) =>
        right.exportCount - left.exportCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "outgoingLocalImportCount":
      return [...rows].sort((left, right) =>
        right.outgoingLocalImportCount - left.outgoingLocalImportCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "incomingLocalImportCount":
      return [...rows].sort((left, right) =>
        right.incomingLocalImportCount - left.incomingLocalImportCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case "crossAreaOutgoingImportCount":
      return [...rows].sort((left, right) =>
        right.crossAreaOutgoingImportCount - left.crossAreaOutgoingImportCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath),
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}





function filterAtlasSelfFunctionSurfaces(
  rows: readonly AtlasSelfFunctionSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfFunctionSurfaceRow[] {
  const packageId = inquiryStringFilter(inquiry, "packageId");
  const functionKind = inquiryStringFilter(inquiry, "functionKind");
  const className = inquiryStringFilter(inquiry, "className");
  const functionName = inquiryStringFilter(inquiry, "functionName");
  const bodyFingerprint = inquiryStringFilter(inquiry, "bodyFingerprint");
  const bodyShapeFingerprint = inquiryStringFilter(inquiry, "bodyShapeFingerprint");
  const switchTopologyFingerprint = inquiryStringFilter(inquiry, "switchTopologyFingerprint");
  const minLineCount = inquiryNumberFilter(inquiry, "minLineCount");
  const minSwitchTopologyCount = inquiryNumberFilter(inquiry, "minSwitchTopologyCount");
  const minCallCount = inquiryNumberFilter(inquiry, "minCallCount");
  const minUniqueCallTargetCount = inquiryNumberFilter(
    inquiry,
    "minUniqueCallTargetCount",
  );
  const query = inquiryLowerStringFilter(inquiry, "query");
  const filtered = rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (functionKind !== undefined && row.functionKind !== functionKind) {
      return false;
    }
    if (className !== undefined && row.className !== className) {
      return false;
    }
    if (functionName !== undefined && row.name !== functionName) {
      return false;
    }
    if (bodyFingerprint !== undefined && row.bodyFingerprint !== bodyFingerprint) {
      return false;
    }
    if (bodyShapeFingerprint !== undefined && row.bodyShapeFingerprint !== bodyShapeFingerprint) {
      return false;
    }
    if (
      switchTopologyFingerprint !== undefined &&
      row.switchTopologyFingerprint !== switchTopologyFingerprint
    ) {
      return false;
    }
    if (minLineCount !== undefined && row.lineCount < minLineCount) {
      return false;
    }
    if (
      minSwitchTopologyCount !== undefined &&
      row.switchTopologyCount < minSwitchTopologyCount
    ) {
      return false;
    }
    if (minCallCount !== undefined && row.callCount < minCallCount) {
      return false;
    }
    if (
      minUniqueCallTargetCount !== undefined &&
      row.uniqueCallTargetCount < minUniqueCallTargetCount
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      (row.bodyFingerprint?.toLowerCase().includes(query) ?? false) ||
      (row.bodyShapeFingerprint?.toLowerCase().includes(query) ?? false) ||
      (row.switchTopologyFingerprint?.toLowerCase().includes(query) ?? false) ||
      (row.className?.toLowerCase().includes(query) ?? false) ||
      row.filePath.toLowerCase().includes(query) ||
      row.functionKind.toLowerCase().includes(query)
    );
  });
  return orderAtlasSelfFunctionSurfaces(filtered, inquiryStringFilter(inquiry, "orderBy"));
}





function orderAtlasSelfFunctionSurfaces(
  rows: readonly AtlasSelfFunctionSurfaceRow[],
  orderBy: string | undefined,
): readonly AtlasSelfFunctionSurfaceRow[] {
  switch (orderBy) {
    case "size":
    case "lineCount":
      return [...rows].sort((left, right) =>
        right.lineCount - left.lineCount ||
        right.callCount - left.callCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.functionKind.localeCompare(right.functionKind) ||
        left.name.localeCompare(right.name),
      );
    case "callCount":
      return [...rows].sort((left, right) =>
        right.callCount - left.callCount ||
        right.uniqueCallTargetCount - left.uniqueCallTargetCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.functionKind.localeCompare(right.functionKind) ||
        left.name.localeCompare(right.name),
      );
    case "uniqueCallTargetCount":
      return [...rows].sort((left, right) =>
        right.uniqueCallTargetCount - left.uniqueCallTargetCount ||
        right.callCount - left.callCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.functionKind.localeCompare(right.functionKind) ||
        left.name.localeCompare(right.name),
      );
    case "switchTopologyCount":
      return [...rows].sort((left, right) =>
        right.switchTopologyCount - left.switchTopologyCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.functionKind.localeCompare(right.functionKind) ||
        left.name.localeCompare(right.name),
      );
    case "bodyFingerprint":
      return [...rows].sort((left, right) =>
        compareNullableStrings(left.bodyFingerprint, right.bodyFingerprint) ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.functionKind.localeCompare(right.functionKind) ||
        left.name.localeCompare(right.name),
      );
    case "bodyShapeFingerprint":
      return [...rows].sort((left, right) =>
        compareNullableStrings(left.bodyShapeFingerprint, right.bodyShapeFingerprint) ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.functionKind.localeCompare(right.functionKind) ||
        left.name.localeCompare(right.name),
      );
    case "switchTopologyFingerprint":
      return [...rows].sort((left, right) =>
        compareNullableStrings(left.switchTopologyFingerprint, right.switchTopologyFingerprint) ||
        right.switchTopologyCount - left.switchTopologyCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.functionKind.localeCompare(right.functionKind) ||
        left.name.localeCompare(right.name),
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}

function filterAtlasSelfVariableSurfaces(
  rows: readonly AtlasSelfVariableSurfaceRow[],
  inquiry: Inquiry,
): readonly AtlasSelfVariableSurfaceRow[] {
  const packageId = inquiryStringFilter(inquiry, "packageId");
  const variableName = inquiryStringFilter(inquiry, "variableName");
  const declarationKind = inquiryStringFilter(inquiry, "declarationKind");
  const initializerKind = inquiryStringFilter(inquiry, "initializerKind");
  const exported = inquiryBooleanFilter(inquiry, "exported");
  const minLineCount = inquiryNumberFilter(inquiry, "minLineCount");
  const minInitializerEntryCount = inquiryNumberFilter(
    inquiry,
    "minInitializerEntryCount",
  );
  const query = inquiryLowerStringFilter(inquiry, "query");
  const filtered = rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (variableName !== undefined && row.name !== variableName) {
      return false;
    }
    if (
      declarationKind !== undefined &&
      row.declarationKind !== declarationKind
    ) {
      return false;
    }
    if (
      initializerKind !== undefined &&
      row.initializerKind !== initializerKind
    ) {
      return false;
    }
    if (exported !== undefined && row.exported !== exported) {
      return false;
    }
    if (minLineCount !== undefined && row.lineCount < minLineCount) {
      return false;
    }
    if (
      minInitializerEntryCount !== undefined &&
      (row.initializerEntryCount ?? 0) < minInitializerEntryCount
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      row.filePath.toLowerCase().includes(query) ||
      row.declarationKind.toLowerCase().includes(query) ||
      row.initializerKind.toLowerCase().includes(query)
    );
  });
  return orderAtlasSelfVariableSurfaces(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function orderAtlasSelfVariableSurfaces(
  rows: readonly AtlasSelfVariableSurfaceRow[],
  orderBy: string | undefined,
): readonly AtlasSelfVariableSurfaceRow[] {
  switch (orderBy) {
    case "size":
    case "lineCount":
      return [...rows].sort((left, right) =>
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name),
      );
    case "initializerEntryCount":
      return [...rows].sort((left, right) =>
        (right.initializerEntryCount ?? 0) -
          (left.initializerEntryCount ?? 0) ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name),
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}





function filterAtlasSelfFunctionShapeGroups(
  rows: readonly AtlasSelfFunctionShapeGroupRow[],
  inquiry: Inquiry,
): readonly AtlasSelfFunctionShapeGroupRow[] {
  const bodyShapeFingerprint = inquiryStringFilter(inquiry, "bodyShapeFingerprint");
  const minFunctionCount = inquiryNumberFilter(inquiry, "minFunctionCount");
  const minNameCount = inquiryNumberFilter(inquiry, "minNameCount");
  const minFileCount = inquiryNumberFilter(inquiry, "minFileCount");
  const minLineCount = inquiryNumberFilter(inquiry, "minLineCount");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (bodyShapeFingerprint !== undefined && row.bodyShapeFingerprint !== bodyShapeFingerprint) {
      return false;
    }
    if (minFunctionCount !== undefined && row.functionCount < minFunctionCount) {
      return false;
    }
    if (minNameCount !== undefined && row.nameCount < minNameCount) {
      return false;
    }
    if (minFileCount !== undefined && row.fileCount < minFileCount) {
      return false;
    }
    if (minLineCount !== undefined && row.lineCount < minLineCount) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.bodyShapeFingerprint.toLowerCase().includes(query) ||
      row.nameSamples.some((name) => name.toLowerCase().includes(query)) ||
      row.fileSamples.some((filePath) => filePath.toLowerCase().includes(query)) ||
      row.functionKinds.some((kind) => kind.toLowerCase().includes(query))
    );
  });
}

function filterAtlasSelfFunctionControlFlowShapeGroups(
  rows: readonly AtlasSelfFunctionControlFlowShapeGroupRow[],
  inquiry: Inquiry,
): readonly AtlasSelfFunctionControlFlowShapeGroupRow[] {
  const switchTopologyFingerprint = inquiryStringFilter(inquiry, "switchTopologyFingerprint");
  const minFunctionCount = inquiryNumberFilter(inquiry, "minFunctionCount");
  const minNameCount = inquiryNumberFilter(inquiry, "minNameCount");
  const minFileCount = inquiryNumberFilter(inquiry, "minFileCount");
  const minLineCount = inquiryNumberFilter(inquiry, "minLineCount");
  const minSwitchTopologyCount = inquiryNumberFilter(inquiry, "minSwitchTopologyCount");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (switchTopologyFingerprint !== undefined && row.switchTopologyFingerprint !== switchTopologyFingerprint) {
      return false;
    }
    if (minFunctionCount !== undefined && row.functionCount < minFunctionCount) {
      return false;
    }
    if (minNameCount !== undefined && row.nameCount < minNameCount) {
      return false;
    }
    if (minFileCount !== undefined && row.fileCount < minFileCount) {
      return false;
    }
    if (minLineCount !== undefined && row.lineCount < minLineCount) {
      return false;
    }
    if (
      minSwitchTopologyCount !== undefined &&
      row.switchTopologyCount < minSwitchTopologyCount
    ) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.switchTopologyFingerprint.toLowerCase().includes(query) ||
      row.nameSamples.some((name) => name.toLowerCase().includes(query)) ||
      row.fileSamples.some((filePath) => filePath.toLowerCase().includes(query)) ||
      row.functionKinds.some((kind) => kind.toLowerCase().includes(query))
    );
  });
}

function filterAtlasSelfFunctionWrappers(
  rows: readonly AtlasSelfFunctionWrapperRow[],
  inquiry: Inquiry,
): readonly AtlasSelfFunctionWrapperRow[] {
  const packageId = inquiryStringFilter(inquiry, "packageId");
  const functionKind = inquiryStringFilter(inquiry, "functionKind");
  const className = inquiryStringFilter(inquiry, "className");
  const functionName = inquiryStringFilter(inquiry, "functionName");
  const wrapperKind = inquiryStringFilter(inquiry, "wrapperKind");
  const wrappedTarget = inquiryStringFilter(inquiry, "wrappedTarget");
  const maxIncomingCallCount = inquiryNumberFilter(inquiry, "maxIncomingCallCount");
  const maxIncomingUsageCount = inquiryNumberFilter(inquiry, "maxIncomingUsageCount");
  const minLineCount = inquiryNumberFilter(inquiry, "minLineCount");
  const exported = inquiryBooleanFilter(inquiry, "exported");
  const query = inquiryLowerStringFilter(inquiry, "query");
  const filtered = rows.filter((row) => {
    if (packageId !== undefined && row.packageId !== packageId) {
      return false;
    }
    if (functionKind !== undefined && row.functionKind !== functionKind) {
      return false;
    }
    if (className !== undefined && row.className !== className) {
      return false;
    }
    if (functionName !== undefined && row.name !== functionName) {
      return false;
    }
    if (wrapperKind !== undefined && row.wrapperKind !== wrapperKind) {
      return false;
    }
    if (wrappedTarget !== undefined && row.wrappedTarget !== wrappedTarget) {
      return false;
    }
    if (maxIncomingCallCount !== undefined && row.incomingCallCount > maxIncomingCallCount) {
      return false;
    }
    if (maxIncomingUsageCount !== undefined && row.incomingUsageCount > maxIncomingUsageCount) {
      return false;
    }
    if (minLineCount !== undefined && row.lineCount < minLineCount) {
      return false;
    }
    if (exported !== undefined && row.exported !== exported) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.name.toLowerCase().includes(query) ||
      row.wrappedTarget.toLowerCase().includes(query) ||
      row.wrapperKind.toLowerCase().includes(query) ||
      (row.className?.toLowerCase().includes(query) ?? false) ||
      row.filePath.toLowerCase().includes(query)
    );
  });
  return orderAtlasSelfFunctionWrappers(filtered, inquiryStringFilter(inquiry, "orderBy"));
}

function orderAtlasSelfFunctionWrappers(
  rows: readonly AtlasSelfFunctionWrapperRow[],
  orderBy: string | undefined,
): readonly AtlasSelfFunctionWrapperRow[] {
  switch (orderBy) {
    case "incomingCallCount":
      return [...rows].sort((left, right) =>
        left.incomingCallCount - right.incomingCallCount ||
        left.incomingUsageCount - right.incomingUsageCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name)
      );
    case "incomingUsageCount":
      return [...rows].sort((left, right) =>
        left.incomingUsageCount - right.incomingUsageCount ||
        left.incomingCallCount - right.incomingCallCount ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name)
      );
    case "lineCount":
      return [...rows].sort((left, right) =>
        right.lineCount - left.lineCount ||
        left.incomingUsageCount - right.incomingUsageCount ||
        left.incomingCallCount - right.incomingCallCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name)
      );
    case "wrappedTarget":
      return [...rows].sort((left, right) =>
        left.wrappedTarget.localeCompare(right.wrappedTarget) ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name)
      );
    default:
      return [...rows].sort((left, right) =>
        left.incomingUsageCount - right.incomingUsageCount ||
        left.incomingCallCount - right.incomingCallCount ||
        Number(left.exported) - Number(right.exported) ||
        left.wrapperKind.localeCompare(right.wrapperKind) ||
        right.lineCount - left.lineCount ||
        left.filePath.localeCompare(right.filePath) ||
        left.name.localeCompare(right.name)
      );
  }
}





function filterContractStrings(
  rows: readonly AtlasSelfContractStringRow[],
  inquiry: Inquiry,
): readonly AtlasSelfContractStringRow[] {
  const contractClass = inquiryStringFilter(inquiry, "class");
  const declarationKind = inquiryStringFilter(inquiry, "declarationKind");
  const query = inquiryLowerStringFilter(inquiry, "query");
  return rows.filter((row) => {
    if (contractClass !== undefined && !row.classes.includes(contractClass)) {
      return false;
    }
    if (!matchesStringDeclarationKind(row, declarationKind)) {
      return false;
    }
    if (query === undefined) {
      return true;
    }
    return (
      row.value.toLowerCase().includes(query) ||
      row.classes.some((entry) => entry.toLowerCase().includes(query)) ||
      row.files.some((file) => file.toLowerCase().includes(query)) ||
      row.declaredByEnumMembers.some((entry) =>
        entry.toLowerCase().includes(query),
      ) ||
      row.declaredByConstObjectMembers.some((entry) =>
        entry.toLowerCase().includes(query),
      )
    );
  });
}





function matchesStringDeclarationKind(
  row: Pick<
    AtlasSelfStringLiteralRow | AtlasSelfContractStringRow,
    "declaredByEnumMembers" | "declaredByConstObjectMembers"
  >,
  declarationKind: string | undefined,
): boolean {
  switch (declarationKind) {
    case undefined:
      return true;
    case "enum":
      return row.declaredByEnumMembers.length > 0;
    case "const-object":
      return row.declaredByConstObjectMembers.length > 0;
    case "undeclared":
      return (
        row.declaredByEnumMembers.length === 0 &&
        row.declaredByConstObjectMembers.length === 0
      );
    default:
      return false;
  }
}





function evidenceForContractString(row: AtlasSelfContractStringRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Contract-string classification is AST-derived from enum declarations, const-object vocabularies, continuation ids, and schema/version declarations.",
    ),
    source: row.firstSource,
    data: row,
  };
}





function evidenceForStringLiteral(row: AtlasSelfStringLiteralRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("String literal grouping is AST-derived."),
    source: row.firstSource,
    data: {
      value: row.value,
      count: row.count,
      roles: row.roles,
      declaredByEnumMembers: row.declaredByEnumMembers,
      declaredByConstObjectMembers: row.declaredByConstObjectMembers,
      reusedOutsideDeclaration: row.reusedOutsideDeclaration,
    },
  };
}





function evidenceForRelationshipSurface(
  row: AtlasSelfRelationshipSurfaceRow,
): Evidence {
  return evidenceForRowSurface(row);
}





function evidenceForRowSurface(row: AtlasSelfRowSurfaceRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      row.surfaceKind === "relationship"
        ? "Relationship surface discovery is AST-derived."
        : "Structural row surface discovery is AST-derived.",
    ),
    source: row.source,
    data: {
      name: row.name,
      declarationKind: row.declarationKind,
      surfaceKind: row.surfaceKind,
      fields: row.fields,
      hasRelation: row.hasRelation,
      hasMechanism: row.hasMechanism,
      hasPhase: row.hasPhase,
      hasSource: row.hasSource,
      hasEndpoints: row.hasEndpoints,
      surfaceRole: row.surfaceRole,
    },
  };
}





function evidenceForAxisPressure(row: AtlasSelfAxisPressureRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis(
      "Axis pressure discovery is AST-derived from enum declarations, row surfaces, and mapper functions.",
    ),
    source: row.source,
    data: row,
  };
}





function evidenceForAtlasSelfClassSurface(row: AtlasSelfClassSurfaceRow): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Class surface discovery is AST-derived."),
    source: row.source,
    data: {
      name: row.name,
      exported: row.exported,
      abstract: row.abstract,
      filePath: row.filePath,
      lineCount: row.lineCount,
      extendsType: row.extendsType,
      implementsTypes: row.implementsTypes,
      methods: row.methods,
      staticMethods: row.staticMethods,
      accessors: row.accessors,
      properties: row.properties,
      constructorCount: row.constructorCount,
      methodCount: row.methodCount,
      propertyCount: row.propertyCount,
    },
  };
}





function evidenceForSourceFileSurface(
  row: AtlasSelfSourceFileSurfaceRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Source file surface discovery is AST-derived."),
    source: row.source,
    data: row,
  };
}





function evidenceForAtlasSelfFunctionSurface(
  row: AtlasSelfFunctionSurfaceRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Function surface discovery is AST-derived."),
    source: row.source,
    data: row,
  };
}

function evidenceForAtlasSelfVariableSurface(
  row: AtlasSelfVariableSurfaceRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Top-level variable surface discovery is AST-derived."),
    source: row.source,
    data: row,
  };
}





function evidenceForAtlasSelfFunctionShapeGroup(
  row: AtlasSelfFunctionShapeGroupRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Function body-shape grouping is derived from canonical AST/control-flow fingerprints."),
    source: row.source,
    data: row,
  };
}

function evidenceForAtlasSelfFunctionControlFlowShapeGroup(
  row: AtlasSelfFunctionControlFlowShapeGroupRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Function control-flow grouping is derived from canonical switch-dispatch topology fingerprints."),
    source: row.source,
    data: row,
  };
}

function evidenceForAtlasSelfFunctionWrapper(
  row: AtlasSelfFunctionWrapperRow,
): Evidence {
  return {
    id: `${row.id}:evidence`,
    kind: EvidenceKind.MaintenanceSignal,
    role: EvidenceRole.Subject,
    confidence: EvidenceConfidence.Exact,
    summary: row.summary,
    basis: selfSourceBasis("Function wrapper discovery is AST-derived and joined to local call-edge plus value-reference counts."),
    source: row.source,
    data: row,
  };
}
