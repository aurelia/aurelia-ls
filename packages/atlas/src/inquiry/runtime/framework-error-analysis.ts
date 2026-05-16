import ts from "typescript";

import { countBy, countByWhere, countWhere, uniqueSortedStrings } from "../../collections.js";
import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  compactExpressionText as compactSourceExpressionText,
  numericLiteralArgument,
  propertyNameText,
  requiredSourceFileIdentity,
  requiredSourceRangeForNode,
  SourceProjectMemo,
  stringLiteralArgument,
  symbolForDeclaration,
  symbolForExpressionName,
  unwrapExpression,
  type SourceProject,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import { calleeTail, isNestedExecutionBoundary } from "./framework-ts-utils.js";

export const FRAMEWORK_ERROR_ANALYSIS_VERSION = "framework-error-analysis.v1" as const;

const frameworkErrorAnalysisMemo =
  new SourceProjectMemo<FrameworkErrorAnalysis>();

export type FrameworkErrorEnumName = "ErrorNames" | "Events";

export type FrameworkErrorUsageMechanism =
  | "createMappedError"
  | "getMessage"
  | "mapped-error-wrapper-call"
  | "raw-new-error"
  | "raw-error-factory-call";

export type FrameworkErrorUsageEffect =
  | "throw"
  | "warning"
  | "return"
  | "new-error"
  | "call";

export type FrameworkErrorRawErrorKind =
  | "mapped-error-factory-implementation"
  | "inline-aur-code"
  | "message-expression"
  | "empty";

export interface FrameworkErrorRollup {
  readonly packageCount: number;
  readonly sourceFileCount: number;
  readonly codeCount: number;
  readonly messageCount: number;
  readonly usageCount: number;
  readonly createMappedErrorUsageCount: number;
  readonly getMessageUsageCount: number;
  readonly mappedErrorWrapperCallCount: number;
  readonly rawNewErrorCount: number;
  readonly rawErrorFactoryCallCount: number;
  readonly rawErrorUsageCount: number;
  readonly rawErrorAuthorityGapCount: number;
  readonly intentionallyUnclaimedRawAuthorityCount: number;
  readonly inlineRawCodeUsageCount: number;
  readonly codeWithoutMessageCount: number;
  readonly unusedCodeCount: number;
  readonly unresolvedUsageCodeCount: number;
  readonly duplicateCodeLabelCount: number;
  readonly thrownUsageCount: number;
  readonly warningUsageCount: number;
  readonly codesByPackage: Readonly<Record<string, number>>;
  readonly codesByEnum: Readonly<Record<string, number>>;
  readonly codesByHundred: Readonly<Record<string, number>>;
  readonly codesByNamePrefix: Readonly<Record<string, number>>;
  readonly duplicateCodeLabels: Readonly<Record<string, number>>;
  readonly codesWithoutMessageByPackage: Readonly<Record<string, number>>;
  readonly unusedCodesByPackage: Readonly<Record<string, number>>;
  readonly unusedCodesByNamePrefix: Readonly<Record<string, number>>;
  readonly unresolvedUsageCodesByPackage: Readonly<Record<string, number>>;
  readonly rawNewErrorsByPackage: Readonly<Record<string, number>>;
  readonly rawErrorFactoryCallsByPackage: Readonly<Record<string, number>>;
  readonly rawErrorUsagesByPackage: Readonly<Record<string, number>>;
  readonly rawErrorUsagesByKind: Readonly<Record<string, number>>;
  readonly rawErrorUsagesByPackageAndKind: Readonly<Record<string, number>>;
  readonly rawErrorAuthorityGapsByPackage: Readonly<Record<string, number>>;
  readonly rawErrorAuthorityGapsByKind: Readonly<Record<string, number>>;
  readonly intentionallyUnclaimedRawAuthorityByPackage: Readonly<Record<string, number>>;
  readonly intentionallyUnclaimedRawAuthorityByKind: Readonly<Record<string, number>>;
  readonly inlineRawCodeLabels: Readonly<Record<string, number>>;
  readonly inlineRawCodeLabelsByPackage: Readonly<Record<string, number>>;
  readonly semanticRuntimeRawReferenceCount: number;
  readonly semanticRuntimeUsedRawReferenceCount: number;
  readonly semanticRuntimeUnresolvedRawReferenceCount: number;
  readonly semanticRuntimeRawReferencesByFrameworkPackage: Readonly<Record<string, number>>;
  readonly semanticRuntimeUnresolvedRawReferencesByFrameworkPackage: Readonly<Record<string, number>>;
  readonly semanticRuntimeCodeReferenceCount: number;
  readonly semanticRuntimeUsedCodeReferenceCount: number;
  readonly semanticRuntimeUnusedCodeReferenceCount: number;
  readonly semanticRuntimeAmbiguousLabelReferenceCount: number;
  readonly semanticRuntimeUnresolvedCodeReferenceCount: number;
  readonly semanticRuntimeUnresolvedExactReferenceCount: number;
  readonly diagnosticCodeDispositions: Readonly<Record<string, number>>;
  readonly semanticRuntimeCodeReferencesByCode: Readonly<Record<string, number>>;
  readonly semanticRuntimeCodeReferencesByKind: Readonly<Record<string, number>>;
  readonly semanticRuntimeCodeReferencesByFrameworkPackage: Readonly<Record<string, number>>;
  readonly semanticRuntimeAmbiguousLabelReferencesByCode: Readonly<Record<string, number>>;
  readonly semanticRuntimeUnresolvedCodeReferencesByCode: Readonly<Record<string, number>>;
  readonly semanticRuntimeUnresolvedExactReferencesByCode: Readonly<Record<string, number>>;
  readonly usagesByPackage: Readonly<Record<string, number>>;
  readonly usageMechanisms: Readonly<Record<string, number>>;
  readonly usageEffects: Readonly<Record<string, number>>;
}

export interface FrameworkErrorPackageRow {
  readonly id: string;
  readonly packageName: string;
  readonly sourceFileCount: number;
  readonly codeCount: number;
  readonly messageCount: number;
  readonly usageCount: number;
  readonly rawNewErrorCount: number;
  readonly thrownUsageCount: number;
  readonly warningUsageCount: number;
  readonly summary: string;
}

export interface FrameworkErrorCodeRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly enumName: FrameworkErrorEnumName;
  readonly name: string;
  readonly namePrefix: string;
  readonly code: number | null;
  readonly codeLabel: string;
  readonly message: string | null;
  readonly usageCount: number;
  readonly thrownUsageCount: number;
  readonly warningUsageCount: number;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export interface FrameworkErrorFamilyRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly enumName: FrameworkErrorEnumName;
  readonly namePrefix: string;
  readonly codeCount: number;
  readonly messageCount: number;
  readonly usageCount: number;
  readonly thrownUsageCount: number;
  readonly warningUsageCount: number;
  readonly unusedCodeCount: number;
  readonly pressureScore: number;
  readonly codeLabels: readonly string[];
  readonly codeNames: readonly string[];
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export type FrameworkErrorDiagnosticCoverage =
  | "none"
  | "partial"
  | "future-substrate"
  | "dormant-closed"
  | "complete";

export type FrameworkErrorIntentionalUnclaimedKind =
  | "future-substrate"
  | "runtime-product-boundary";

export interface FrameworkErrorDiagnosticFrontierRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly enumName: FrameworkErrorEnumName;
  readonly namePrefix: string;
  readonly codeCount: number;
  readonly messageCount: number;
  readonly usageCount: number;
  readonly thrownUsageCount: number;
  readonly warningUsageCount: number;
  readonly unusedCodeCount: number;
  readonly rawAuthorityGapCount: number;
  readonly semanticRuntimeReferenceCount: number;
  readonly semanticRuntimeExactReferenceCount: number;
  readonly semanticRuntimeUsedExactReferenceCount: number;
  readonly semanticRuntimeLinkedCodeCount: number;
  readonly semanticRuntimeUnresolvedExactReferenceCount: number;
  readonly intentionalUnclaimedCodeCount: number;
  readonly intentionalUnclaimedFutureSubstrateCodeCount: number;
  readonly intentionalUnclaimedRuntimeBoundaryCodeCount: number;
  readonly intentionalUnclaimedSummaries: readonly string[];
  readonly intentionalUnclaimedFutureSubstrateSummaries: readonly string[];
  readonly dormantCodeCount: number;
  readonly dormantCodeSummaries: readonly string[];
  readonly actionableUncoveredCodeCount: number;
  readonly semanticRuntimeCoverage: FrameworkErrorDiagnosticCoverage;
  readonly frontierScore: number;
  readonly codeLabels: readonly string[];
  readonly codeNames: readonly string[];
  readonly rawAuthorityGapSummaries: readonly string[];
  readonly likelySemanticRuntimeOwner: string | null;
  readonly recommendedNextStep: string;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export type FrameworkErrorDiagnosticCodeDisposition =
  | "modeled-exact"
  | "declared-unspent"
  | "broken-exact-link"
  | "raw-authority-gap"
  | "intentionally-unclaimed-framework-authority"
  | "unmodeled-used-framework-authority"
  | "dormant-framework-authority";

export interface FrameworkErrorDiagnosticCodeRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly enumName: FrameworkErrorEnumName;
  readonly name: string;
  readonly namePrefix: string;
  readonly code: number | null;
  readonly codeLabel: string;
  readonly message: string | null;
  readonly usageCount: number;
  readonly thrownUsageCount: number;
  readonly warningUsageCount: number;
  readonly usageMechanisms: readonly FrameworkErrorUsageMechanism[];
  readonly usageEffects: readonly FrameworkErrorUsageEffect[];
  readonly rawAuthorityGapCount: number;
  readonly semanticRuntimeReferenceCount: number;
  readonly semanticRuntimeExactReferenceCount: number;
  readonly semanticRuntimeUsedExactReferenceCount: number;
  readonly semanticRuntimeUnresolvedExactReferenceCount: number;
  readonly semanticRuntimeAmbiguousLabelReferenceCount: number;
  readonly diagnosticDisposition: FrameworkErrorDiagnosticCodeDisposition;
  readonly intentionalUnclaimedReason: string | null;
  readonly intentionalUnclaimedKind: FrameworkErrorIntentionalUnclaimedKind | null;
  readonly diagnosticScore: number;
  readonly likelySemanticRuntimeOwner: string | null;
  readonly recommendedNextStep: string;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export interface FrameworkErrorUsageRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly mechanism: FrameworkErrorUsageMechanism;
  readonly effect: FrameworkErrorUsageEffect;
  readonly enumName: FrameworkErrorEnumName | null;
  readonly codeName: string | null;
  readonly codeNamePrefix: string | null;
  readonly code: number | null;
  readonly codeLabel: string | null;
  readonly rawErrorKind: FrameworkErrorRawErrorKind | null;
  readonly inlineCodeLabel: string | null;
  readonly intentionalUnclaimedRawAuthorityReason: string | null;
  readonly expressionText: string;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export type FrameworkErrorSemanticRuntimeReferenceKind =
  | "enum-member-value"
  | "framework-code-link"
  | "string-literal";

export interface FrameworkErrorSemanticRuntimeReferenceRow {
  readonly id: string;
  readonly packageId: "semantic-runtime";
  readonly codeLabel: string;
  readonly referenceKind: FrameworkErrorSemanticRuntimeReferenceKind;
  readonly frameworkPackageId: string | null;
  readonly frameworkEnumName: FrameworkErrorEnumName | null;
  readonly frameworkCodeName: string | null;
  readonly resolvedDefinitionCount: number;
  readonly resolvedExactDefinitionCount: number;
  readonly semanticRuntimeUseCount: number;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export type FrameworkErrorSemanticRuntimeRawReferenceKind =
  | "framework-raw-error-link";

export interface FrameworkErrorSemanticRuntimeRawReferenceRow {
  readonly id: string;
  readonly packageId: "semantic-runtime";
  readonly referenceKind: FrameworkErrorSemanticRuntimeRawReferenceKind;
  readonly frameworkPackageId: string;
  readonly mechanism: FrameworkErrorUsageMechanism;
  readonly effect: FrameworkErrorUsageEffect;
  readonly frameworkSourceFilePath: string;
  readonly frameworkSourceStartLine: number;
  readonly expressionText: string;
  readonly resolvedUsageCount: number;
  readonly semanticRuntimeUseCount: number;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export interface FrameworkErrorAnalysis {
  readonly version: typeof FRAMEWORK_ERROR_ANALYSIS_VERSION;
  readonly rollup: FrameworkErrorRollup;
  readonly packages: readonly FrameworkErrorPackageRow[];
  readonly families: readonly FrameworkErrorFamilyRow[];
  readonly diagnosticFrontiers: readonly FrameworkErrorDiagnosticFrontierRow[];
  readonly diagnosticCodes: readonly FrameworkErrorDiagnosticCodeRow[];
  readonly codes: readonly FrameworkErrorCodeRow[];
  readonly usages: readonly FrameworkErrorUsageRow[];
  readonly semanticRuntimeReferences: readonly FrameworkErrorSemanticRuntimeReferenceRow[];
  readonly semanticRuntimeRawReferences: readonly FrameworkErrorSemanticRuntimeRawReferenceRow[];
}

interface MutableErrorCode {
  readonly packageId: string;
  readonly packageName: string;
  readonly enumName: FrameworkErrorEnumName;
  readonly name: string;
  readonly namePrefix: string;
  readonly code: number | null;
  readonly filePath: string;
  readonly source: SourceRange;
  message: string | null;
}

interface FrameworkErrorMessageAssignment {
  readonly packageId: string;
  readonly enumName: FrameworkErrorEnumName;
  readonly name: string;
  readonly message: string;
}

interface MappedErrorWrapper {
  readonly mechanism: "createMappedError" | "getMessage";
  readonly parameterIndex: number;
}

export function readFrameworkErrorAnalysis(
  sourceProject: SourceProject,
): FrameworkErrorAnalysis {
  return frameworkErrorAnalysisMemo.read(sourceProject, () =>
    buildFrameworkErrorAnalysis(sourceProject),
  );
}

export function frameworkErrorRollupForRows(
  packages: readonly FrameworkErrorPackageRow[],
  codes: readonly FrameworkErrorCodeRow[],
  usages: readonly FrameworkErrorUsageRow[],
  semanticRuntimeReferences: readonly FrameworkErrorSemanticRuntimeReferenceRow[] = [],
  semanticRuntimeRawReferences: readonly FrameworkErrorSemanticRuntimeRawReferenceRow[] = [],
): FrameworkErrorRollup {
  const codeDefinitionsByLabel = countBy(codes, (row) => row.codeLabel);
  const openRawAuthorityGaps = usages.filter((usage) =>
    frameworkErrorUsageIsOpenRawAuthorityGap(usage, semanticRuntimeRawReferences)
  );
  const intentionalRawAuthority = usages.filter(frameworkErrorUsageIsIntentionallyUnclaimedRawAuthority);
  return {
    packageCount: packages.length,
    sourceFileCount: packages.reduce((total, row) => total + row.sourceFileCount, 0),
    codeCount: codes.length,
    messageCount: countWhere(codes, (row) => row.message != null),
    usageCount: usages.length,
    createMappedErrorUsageCount: countWhere(usages, (row) => row.mechanism === "createMappedError"),
    getMessageUsageCount: countWhere(usages, (row) => row.mechanism === "getMessage"),
    mappedErrorWrapperCallCount: countWhere(usages, (row) => row.mechanism === "mapped-error-wrapper-call"),
    rawNewErrorCount: countWhere(usages, (row) => row.mechanism === "raw-new-error"),
    rawErrorFactoryCallCount: countWhere(usages, (row) => row.mechanism === "raw-error-factory-call"),
    rawErrorUsageCount: countWhere(usages, (row) => row.rawErrorKind != null),
    rawErrorAuthorityGapCount: openRawAuthorityGaps.length,
    intentionallyUnclaimedRawAuthorityCount: intentionalRawAuthority.length,
    inlineRawCodeUsageCount: countWhere(usages, (row) => row.inlineCodeLabel != null),
    codeWithoutMessageCount: countWhere(codes, (row) => row.message == null),
    unusedCodeCount: countWhere(codes, (row) => row.usageCount === 0),
    unresolvedUsageCodeCount: countWhere(usages, frameworkErrorUsageCodeIsUnresolved),
    duplicateCodeLabelCount: countWhere(Object.values(codeDefinitionsByLabel), (count) => count > 1),
    thrownUsageCount: countWhere(usages, (row) => row.effect === "throw"),
    warningUsageCount: countWhere(usages, (row) => row.effect === "warning"),
    codesByPackage: countBy(codes, (row) => row.packageId),
    codesByEnum: countBy(codes, (row) => row.enumName),
    codesByHundred: countBy(codes, (row) => codeHundredBucket(row.code)),
    codesByNamePrefix: countBy(codes, (row) => row.namePrefix),
    duplicateCodeLabels: countRecordWhere(codeDefinitionsByLabel, (count) => count > 1),
    codesWithoutMessageByPackage: countByWhere(codes, (row) => row.message == null, (row) => row.packageId),
    unusedCodesByPackage: countByWhere(codes, (row) => row.usageCount === 0, (row) => row.packageId),
    unusedCodesByNamePrefix: countByWhere(codes, (row) => row.usageCount === 0, (row) => row.namePrefix),
    unresolvedUsageCodesByPackage: countByWhere(usages, frameworkErrorUsageCodeIsUnresolved, (row) => row.packageId),
    rawNewErrorsByPackage: countByWhere(usages, (row) => row.mechanism === "raw-new-error", (row) => row.packageId),
    rawErrorFactoryCallsByPackage: countByWhere(usages, (row) => row.mechanism === "raw-error-factory-call", (row) => row.packageId),
    rawErrorUsagesByPackage: countByWhere(usages, (row) => row.rawErrorKind != null, (row) => row.packageId),
    rawErrorUsagesByKind: countByWhere(usages, (row) => row.rawErrorKind != null, (row) => row.rawErrorKind ?? "none"),
    rawErrorUsagesByPackageAndKind: countByWhere(usages, (row) => row.rawErrorKind != null, (row) => `${row.packageId}:${row.rawErrorKind ?? "none"}`),
    rawErrorAuthorityGapsByPackage: countBy(openRawAuthorityGaps, (row) => row.packageId),
    rawErrorAuthorityGapsByKind: countBy(openRawAuthorityGaps, (row) => row.rawErrorKind ?? "none"),
    intentionallyUnclaimedRawAuthorityByPackage: countBy(intentionalRawAuthority, (row) => row.packageId),
    intentionallyUnclaimedRawAuthorityByKind: countBy(intentionalRawAuthority, (row) => row.rawErrorKind ?? "none"),
    inlineRawCodeLabels: countByWhere(usages, (row) => row.inlineCodeLabel != null, (row) => row.inlineCodeLabel ?? "none"),
    inlineRawCodeLabelsByPackage: countByWhere(usages, (row) => row.inlineCodeLabel != null, (row) => `${row.packageId}:${row.inlineCodeLabel ?? "none"}`),
    semanticRuntimeRawReferenceCount: semanticRuntimeRawReferences.length,
    semanticRuntimeUsedRawReferenceCount: countWhere(semanticRuntimeRawReferences, (row) => row.semanticRuntimeUseCount > 0),
    semanticRuntimeUnresolvedRawReferenceCount: countWhere(semanticRuntimeRawReferences, (row) => row.resolvedUsageCount === 0),
    semanticRuntimeRawReferencesByFrameworkPackage: countBy(semanticRuntimeRawReferences, (row) => row.frameworkPackageId),
    semanticRuntimeUnresolvedRawReferencesByFrameworkPackage: countByWhere(semanticRuntimeRawReferences, (row) => row.resolvedUsageCount === 0, (row) => row.frameworkPackageId),
    semanticRuntimeCodeReferenceCount: semanticRuntimeReferences.length,
    semanticRuntimeUsedCodeReferenceCount: countWhere(semanticRuntimeReferences, (row) => row.semanticRuntimeUseCount > 0),
    semanticRuntimeUnusedCodeReferenceCount: countWhere(semanticRuntimeReferences, (row) => row.semanticRuntimeUseCount === 0),
    semanticRuntimeAmbiguousLabelReferenceCount: countWhere(semanticRuntimeReferences, semanticRuntimeReferenceHasAmbiguousLabel),
    semanticRuntimeUnresolvedCodeReferenceCount: countWhere(semanticRuntimeReferences, (row) => row.resolvedDefinitionCount === 0),
    semanticRuntimeUnresolvedExactReferenceCount: countWhere(semanticRuntimeReferences, semanticRuntimeReferenceIsUnresolvedExact),
    diagnosticCodeDispositions: countBy(codes, (row) =>
      diagnosticCodeDispositionForCode(row, usages, semanticRuntimeReferences, semanticRuntimeRawReferences)
    ),
    semanticRuntimeCodeReferencesByCode: countBy(semanticRuntimeReferences, (row) => row.codeLabel),
    semanticRuntimeCodeReferencesByKind: countBy(semanticRuntimeReferences, (row) => row.referenceKind),
    semanticRuntimeCodeReferencesByFrameworkPackage: countByWhere(semanticRuntimeReferences, (row) => row.frameworkPackageId != null, (row) => row.frameworkPackageId ?? "none"),
    semanticRuntimeAmbiguousLabelReferencesByCode: countByWhere(semanticRuntimeReferences, semanticRuntimeReferenceHasAmbiguousLabel, (row) => row.codeLabel),
    semanticRuntimeUnresolvedCodeReferencesByCode: countByWhere(semanticRuntimeReferences, (row) => row.resolvedDefinitionCount === 0, (row) => row.codeLabel),
    semanticRuntimeUnresolvedExactReferencesByCode: countByWhere(semanticRuntimeReferences, semanticRuntimeReferenceIsUnresolvedExact, (row) => row.codeLabel),
    usagesByPackage: countBy(usages, (row) => row.packageId),
    usageMechanisms: countBy(usages, (row) => row.mechanism),
    usageEffects: countBy(usages, (row) => row.effect),
  };
}

function countRecordWhere(
  counts: Readonly<Record<string, number>>,
  predicate: (count: number, key: string) => boolean,
): Readonly<Record<string, number>> {
  return Object.fromEntries(
    Object.entries(counts).filter(([key, count]) => predicate(count, key)),
  );
}

function buildFrameworkErrorAnalysis(
  sourceProject: SourceProject,
): FrameworkErrorAnalysis {
  const packageSummaries = sourceProject.snapshot().summary.packages
    .filter((row) => (AURELIA_FRAMEWORK_PACKAGE_IDS as readonly string[]).includes(row.id));
  const packageRows = new Map<string, Omit<FrameworkErrorPackageRow, "summary">>();
  const mutableCodes = new Map<string, MutableErrorCode>();
  const messageAssignments: FrameworkErrorMessageAssignment[] = [];
  const usages: FrameworkErrorUsageRow[] = [];
  const packageFiles = new Map<string, readonly ts.SourceFile[]>();

  for (const sourcePackage of packageSummaries) {
    const files = sourceProject.ownedImplementationSourceFilesForPackage(sourcePackage.id);
    packageFiles.set(sourcePackage.id, files);
    packageRows.set(sourcePackage.id, {
      id: sourcePackage.id,
      packageName: sourcePackage.packageName,
      sourceFileCount: files.length,
      codeCount: 0,
      messageCount: 0,
      usageCount: 0,
      rawNewErrorCount: 0,
      thrownUsageCount: 0,
      warningUsageCount: 0,
    });
    for (const sourceFile of files) {
      inspectFrameworkErrorDefinitions(
        sourceProject,
        sourceFile,
        sourcePackage.id,
        sourcePackage.packageName,
        mutableCodes,
        messageAssignments,
      );
    }
  }

  applyMessageAssignments(mutableCodes, messageAssignments);
  const codeNumbers = frameworkErrorCodeNumbers(mutableCodes);
  const rawErrorFactoryDeclarations = readRawErrorFactoryDeclarations(
    sourceProject,
    [...packageFiles.values()].flat(),
  );
  const mappedErrorWrappers = readMappedErrorWrappers(
    sourceProject,
    [...packageFiles.values()].flat(),
  );

  for (const sourcePackage of packageSummaries) {
    const files = packageFiles.get(sourcePackage.id) ?? [];
    for (const sourceFile of files) {
      inspectFrameworkErrorUsages(
        sourceProject,
        sourceFile,
        sourcePackage.id,
        sourcePackage.packageName,
        codeNumbers,
        mappedErrorWrappers,
        rawErrorFactoryDeclarations,
        usages,
      );
    }
  }

  const codes = [...mutableCodes.values()]
    .map((row) => finalizeCodeRow(row, usages))
    .sort(compareCodeRows);
  const semanticRuntimeReferences = readSemanticRuntimeCodeReferences(sourceProject, codes);
  const semanticRuntimeRawReferences = readSemanticRuntimeRawReferences(sourceProject, usages);
  const finalizedPackages = [...packageRows.values()]
    .map((row) => {
      const packageCodes = codes.filter((code) => code.packageId === row.id);
      const packageUsages = usages.filter((usage) => usage.packageId === row.id);
      const rawNewErrorCount = countWhere(packageUsages, (usage) => usage.mechanism === "raw-new-error");
      const thrownUsageCount = countWhere(packageUsages, (usage) => usage.effect === "throw");
      const warningUsageCount = countWhere(packageUsages, (usage) => usage.effect === "warning");
      return {
        ...row,
        codeCount: packageCodes.length,
        messageCount: countWhere(packageCodes, (code) => code.message != null),
        usageCount: packageUsages.length,
        rawNewErrorCount,
        thrownUsageCount,
        warningUsageCount,
        summary: `${row.packageName} defines ${packageCodes.length} framework error/event code(s) and ${packageUsages.length} usage site(s).`,
      } satisfies FrameworkErrorPackageRow;
    })
    .sort((left, right) => right.codeCount - left.codeCount || left.id.localeCompare(right.id));

  const families = frameworkErrorFamiliesForRows(codes, usages);
  const analysis = {
    version: FRAMEWORK_ERROR_ANALYSIS_VERSION,
    rollup: frameworkErrorRollupForRows(finalizedPackages, codes, usages, semanticRuntimeReferences, semanticRuntimeRawReferences),
    packages: finalizedPackages,
    families,
    diagnosticFrontiers: frameworkErrorDiagnosticFrontiersForRows(
      families,
      codes,
      usages,
      semanticRuntimeReferences,
      semanticRuntimeRawReferences,
    ),
    diagnosticCodes: frameworkErrorDiagnosticCodeRowsForRows(
      codes,
      usages,
      semanticRuntimeReferences,
      semanticRuntimeRawReferences,
    ),
    codes,
    usages: usages.sort(compareUsageRows),
    semanticRuntimeReferences,
    semanticRuntimeRawReferences,
  };
  return analysis;
}

export function frameworkErrorFamiliesForRows(
  codes: readonly FrameworkErrorCodeRow[],
  usages: readonly FrameworkErrorUsageRow[],
): readonly FrameworkErrorFamilyRow[] {
  const groups = new Map<string, FrameworkErrorCodeRow[]>();
  for (const code of codes) {
    const key = frameworkErrorScopedKey(code.packageId, code.enumName, code.namePrefix);
    groups.set(key, [...groups.get(key) ?? [], code]);
  }

  return [...groups.entries()]
    .map(([key, familyCodes]) => frameworkErrorFamilyForGroup(key, familyCodes, usages))
    .sort(compareFamilyRows);
}

export function frameworkErrorDiagnosticFrontiersForRows(
  families: readonly FrameworkErrorFamilyRow[],
  codes: readonly FrameworkErrorCodeRow[],
  usages: readonly FrameworkErrorUsageRow[],
  semanticRuntimeReferences: readonly FrameworkErrorSemanticRuntimeReferenceRow[],
  semanticRuntimeRawReferences: readonly FrameworkErrorSemanticRuntimeRawReferenceRow[] = [],
): readonly FrameworkErrorDiagnosticFrontierRow[] {
  return families
    .map((family) => frameworkErrorDiagnosticFrontierForFamily(
      family,
      codes,
      usages,
      semanticRuntimeReferences,
      semanticRuntimeRawReferences,
    ))
    .sort(compareDiagnosticFrontierRows);
}

export function frameworkErrorDiagnosticCodeRowsForRows(
  codes: readonly FrameworkErrorCodeRow[],
  usages: readonly FrameworkErrorUsageRow[],
  semanticRuntimeReferences: readonly FrameworkErrorSemanticRuntimeReferenceRow[],
  semanticRuntimeRawReferences: readonly FrameworkErrorSemanticRuntimeRawReferenceRow[] = [],
): readonly FrameworkErrorDiagnosticCodeRow[] {
  const ownerHintsByFamily = new Map(
    frameworkErrorFamiliesForRows(codes, usages).map((family) => [
      frameworkErrorScopedKey(family.packageId, family.enumName, family.namePrefix),
      diagnosticFrontierOwnerHint(family),
    ]),
  );
  return codes
    .map((code) => frameworkErrorDiagnosticCodeForCode(
      code,
      usages,
      semanticRuntimeReferences,
      semanticRuntimeRawReferences,
      diagnosticCodeOwnerHint(
        code,
        ownerHintsByFamily.get(frameworkErrorScopedKey(code.packageId, code.enumName, code.namePrefix)) ?? null,
      ),
    ))
    .sort(compareDiagnosticCodeRows);
}

function readSemanticRuntimeCodeReferences(
  sourceProject: SourceProject,
  codes: readonly FrameworkErrorCodeRow[],
): readonly FrameworkErrorSemanticRuntimeReferenceRow[] {
  const definitionsByCode = countBy(codes, (row) => row.codeLabel);
  const definitionsByFrameworkIdentity = countBy(codes, (row) => frameworkErrorDefinitionIdentity(row));
  const files = sourceProject.ownedImplementationSourceFilesForPackage("semantic-runtime");
  const codeLinkUseCounts = semanticRuntimeFrameworkCodeLinkUseCounts(files);
  const rows: FrameworkErrorSemanticRuntimeReferenceRow[] = [];
  for (const sourceFile of files) {
    const file = requiredSourceFileIdentity(sourceProject, sourceFile);
    const visit = (node: ts.Node): void => {
      if (ts.isStringLiteral(node) && frameworkErrorCodeLabelPattern.test(node.text)) {
        const source = requiredSourceRangeForNode(sourceProject, node);
        const link = semanticRuntimeFrameworkErrorLinkForCodeLiteral(node);
        const resolvedExactDefinitionCount = link == null
          ? 0
          : definitionsByFrameworkIdentity[frameworkErrorDefinitionIdentity({
            packageId: link.frameworkPackageId,
            enumName: link.frameworkEnumName,
            name: link.frameworkCodeName,
            codeLabel: node.text,
          })] ?? 0;
        rows.push({
          id: `framework-error-semantic-runtime-reference:${file.repoPath}:${node.getStart(sourceFile)}`,
          packageId: "semantic-runtime",
          codeLabel: node.text,
          referenceKind: link == null ? semanticRuntimeCodeReferenceKind(node) : "framework-code-link",
          frameworkPackageId: link?.frameworkPackageId ?? null,
          frameworkEnumName: link?.frameworkEnumName ?? null,
          frameworkCodeName: link?.frameworkCodeName ?? null,
          resolvedDefinitionCount: definitionsByCode[node.text] ?? 0,
          resolvedExactDefinitionCount,
          semanticRuntimeUseCount: semanticRuntimeFrameworkCodeLinkUseCount(node, codeLinkUseCounts),
          filePath: file.repoPath,
          source,
          summary: semanticRuntimeFrameworkErrorReferenceSummary(
            node.text,
            definitionsByCode[node.text] ?? 0,
            link,
            resolvedExactDefinitionCount,
            semanticRuntimeFrameworkCodeLinkUseCount(node, codeLinkUseCounts),
          ),
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return rows.sort((left, right) =>
    left.filePath.localeCompare(right.filePath)
    || left.source.start.line - right.source.start.line
    || left.codeLabel.localeCompare(right.codeLabel)
  );
}

function readSemanticRuntimeRawReferences(
  sourceProject: SourceProject,
  usages: readonly FrameworkErrorUsageRow[],
): readonly FrameworkErrorSemanticRuntimeRawReferenceRow[] {
  const files = sourceProject.ownedImplementationSourceFilesForPackage("semantic-runtime");
  const linkUseCounts = semanticRuntimeFrameworkLinkUseCounts(files);
  const rows: FrameworkErrorSemanticRuntimeRawReferenceRow[] = [];
  for (const sourceFile of files) {
    const file = requiredSourceFileIdentity(sourceProject, sourceFile);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && calleeTail(node.expression) === "frameworkRawErrorAuthority") {
        const reference = semanticRuntimeFrameworkRawErrorReferenceForCall(node);
        if (reference != null) {
          const source = requiredSourceRangeForNode(sourceProject, node);
          const matchingUsages = usages.filter((usage) =>
            semanticRuntimeRawAuthorityReferenceMatchesUsage(reference, usage)
          );
          rows.push({
            id: `framework-error-semantic-runtime-raw-reference:${file.repoPath}:${node.getStart(sourceFile)}`,
            packageId: "semantic-runtime",
            referenceKind: "framework-raw-error-link",
            frameworkPackageId: reference.frameworkPackageId,
            mechanism: reference.mechanism,
            effect: reference.effect,
            frameworkSourceFilePath: reference.frameworkSourceFilePath,
            frameworkSourceStartLine: reference.frameworkSourceStartLine,
            expressionText: reference.expressionText,
            resolvedUsageCount: matchingUsages.length,
            semanticRuntimeUseCount: semanticRuntimeFrameworkLinkUseCount(node, linkUseCounts),
            filePath: file.repoPath,
            source,
            summary: semanticRuntimeFrameworkRawReferenceSummary(
              reference,
              matchingUsages.length,
              semanticRuntimeFrameworkLinkUseCount(node, linkUseCounts),
            ),
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return rows.sort((left, right) =>
    left.frameworkPackageId.localeCompare(right.frameworkPackageId)
    || left.frameworkSourceFilePath.localeCompare(right.frameworkSourceFilePath)
    || left.frameworkSourceStartLine - right.frameworkSourceStartLine
    || left.filePath.localeCompare(right.filePath)
  );
}

const frameworkErrorCodeLabelPattern = /^AUR\d{4}$/;

function semanticRuntimeFrameworkCodeLinkUseCounts(
  files: readonly ts.SourceFile[],
): ReadonlyMap<string, number> {
  return semanticRuntimeFrameworkLinkUseCounts(files);
}

function semanticRuntimeFrameworkLinkUseCounts(
  files: readonly ts.SourceFile[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const sourceFile of files) {
    const visit = (node: ts.Node): void => {
      if (
        ts.isPropertyAccessExpression(node)
        && ts.isIdentifier(node.expression)
      ) {
        const key = semanticRuntimeFrameworkCodeLinkUseKey(node.expression.text, node.name.text);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return counts;
}

function semanticRuntimeFrameworkCodeLinkUseCount(
  node: ts.StringLiteral,
  counts: ReadonlyMap<string, number>,
): number {
  const key = semanticRuntimeFrameworkCodeLinkPropertyKey(node);
  return key == null ? 0 : counts.get(key) ?? 0;
}

function semanticRuntimeFrameworkLinkUseCount(
  call: ts.CallExpression,
  counts: ReadonlyMap<string, number>,
): number {
  const key = semanticRuntimeFrameworkLinkPropertyKey(call);
  return key == null ? 0 : counts.get(key) ?? 0;
}

function semanticRuntimeFrameworkCodeLinkPropertyKey(
  node: ts.StringLiteral,
): string | null {
  const call = node.parent;
  if (!ts.isCallExpression(call) || call.arguments[3] !== node) {
    return null;
  }
  return semanticRuntimeFrameworkLinkPropertyKey(call);
}

function semanticRuntimeFrameworkLinkPropertyKey(
  call: ts.CallExpression,
): string | null {
  const property = call.parent;
  if (!ts.isPropertyAssignment(property)) {
    return null;
  }
  const propertyName = propertyNameText(property.name);
  const ownerName = semanticRuntimeFrameworkCodeLinkOwnerName(property);
  return propertyName == null || ownerName == null
    ? null
    : semanticRuntimeFrameworkCodeLinkUseKey(ownerName, propertyName);
}

function semanticRuntimeFrameworkCodeLinkUseKey(
  ownerName: string,
  propertyName: string,
): string {
  return `${ownerName}.${propertyName}`;
}

function semanticRuntimeFrameworkCodeLinkOwnerName(
  property: ts.PropertyAssignment,
): string | null {
  let initializer: ts.Expression = property.parent;
  let parent = initializer.parent;
  while (ts.isAsExpression(parent) || ts.isSatisfiesExpression(parent) || ts.isParenthesizedExpression(parent)) {
    initializer = parent;
    parent = parent.parent;
  }
  return ts.isVariableDeclaration(parent)
    && parent.initializer === initializer
    && ts.isIdentifier(parent.name)
    ? parent.name.text
    : null;
}

interface SemanticRuntimeFrameworkErrorLink {
  readonly frameworkPackageId: string;
  readonly frameworkEnumName: FrameworkErrorEnumName;
  readonly frameworkCodeName: string;
}

interface SemanticRuntimeFrameworkRawErrorReference {
  readonly frameworkPackageId: string;
  readonly mechanism: FrameworkErrorUsageMechanism;
  readonly effect: FrameworkErrorUsageEffect;
  readonly frameworkSourceFilePath: string;
  readonly frameworkSourceStartLine: number;
  readonly expressionText: string;
}

function semanticRuntimeFrameworkErrorLinkForCodeLiteral(
  node: ts.StringLiteral,
): SemanticRuntimeFrameworkErrorLink | null {
  const call = node.parent;
  if (!ts.isCallExpression(call) || call.arguments[3] !== node || calleeTail(call.expression) !== "frameworkErrorCode") {
    return null;
  }
  const packageId = stringLiteralArgument(call, 0);
  const enumName = stringLiteralArgument(call, 1);
  const codeName = stringLiteralArgument(call, 2);
  return packageId == null || enumName == null || !isFrameworkErrorEnumName(enumName) || codeName == null
    ? null
    : {
      frameworkPackageId: packageId,
      frameworkEnumName: enumName,
      frameworkCodeName: codeName,
    };
}

function semanticRuntimeFrameworkRawErrorReferenceForCall(
  node: ts.CallExpression,
): SemanticRuntimeFrameworkRawErrorReference | null {
  const packageId = stringLiteralArgument(node, 0);
  const mechanism = stringLiteralArgument(node, 1);
  const effect = stringLiteralArgument(node, 2);
  const frameworkSourceFilePath = stringLiteralArgument(node, 3);
  const frameworkSourceStartLine = numericLiteralArgument(node, 4);
  const expressionText = stringLiteralArgument(node, 5);
  return packageId == null ||
    !isFrameworkErrorUsageMechanism(mechanism) ||
    !isFrameworkErrorUsageEffect(effect) ||
    frameworkSourceFilePath == null ||
    frameworkSourceStartLine == null ||
    expressionText == null
    ? null
    : {
      frameworkPackageId: packageId,
      mechanism,
      effect,
      frameworkSourceFilePath,
      frameworkSourceStartLine,
      expressionText,
    };
}

function isFrameworkErrorUsageMechanism(
  value: string | null,
): value is FrameworkErrorUsageMechanism {
  switch (value) {
    case "createMappedError":
    case "getMessage":
    case "mapped-error-wrapper-call":
    case "raw-new-error":
    case "raw-error-factory-call":
      return true;
    default:
      return false;
  }
}

function isFrameworkErrorUsageEffect(
  value: string | null,
): value is FrameworkErrorUsageEffect {
  switch (value) {
    case "throw":
    case "warning":
    case "return":
    case "new-error":
    case "call":
      return true;
    default:
      return false;
  }
}

function semanticRuntimeRawAuthorityReferenceMatchesUsage(
  reference: Pick<FrameworkErrorSemanticRuntimeRawReferenceRow | SemanticRuntimeFrameworkRawErrorReference, "frameworkPackageId" | "mechanism" | "effect" | "frameworkSourceFilePath" | "frameworkSourceStartLine" | "expressionText">,
  usage: FrameworkErrorUsageRow,
): boolean {
  return usage.packageId === reference.frameworkPackageId &&
    usage.mechanism === reference.mechanism &&
    usage.effect === reference.effect &&
    usage.filePath === reference.frameworkSourceFilePath &&
    usage.source.start.line + 1 === reference.frameworkSourceStartLine &&
    usage.expressionText === reference.expressionText;
}

function semanticRuntimeFrameworkRawReferenceSummary(
  reference: SemanticRuntimeFrameworkRawErrorReference,
  resolvedUsageCount: number,
  useCount: number,
): string {
  return `semantic-runtime links ${reference.frameworkPackageId} raw Error at ${reference.frameworkSourceFilePath}:${reference.frameworkSourceStartLine} (${resolvedUsageCount} exact framework usage(s), ${useCount} semantic-runtime use(s)).`;
}

function semanticRuntimeFrameworkErrorReferenceSummary(
  codeLabel: string,
  labelDefinitionCount: number,
  link: SemanticRuntimeFrameworkErrorLink | null,
  exactDefinitionCount: number,
  useCount: number,
): string {
  if (link == null) {
    return `semantic-runtime references ${codeLabel} (${labelDefinitionCount} framework definition(s)).`;
  }
  return `semantic-runtime links ${link.frameworkPackageId} ${link.frameworkEnumName}.${link.frameworkCodeName} ${codeLabel} (${exactDefinitionCount} exact framework definition(s), ${labelDefinitionCount} label definition(s), ${useCount} semantic-runtime use(s)).`;
}

function semanticRuntimeCodeReferenceKind(
  node: ts.StringLiteral,
): FrameworkErrorSemanticRuntimeReferenceKind {
  return ts.isEnumMember(node.parent) && node.parent.initializer === node
    ? "enum-member-value"
    : "string-literal";
}

function semanticRuntimeReferenceIsUnresolvedExact(
  row: FrameworkErrorSemanticRuntimeReferenceRow,
): boolean {
  return row.frameworkPackageId != null && row.resolvedExactDefinitionCount === 0;
}

function semanticRuntimeReferenceHasAmbiguousLabel(
  row: FrameworkErrorSemanticRuntimeReferenceRow,
): boolean {
  return row.resolvedDefinitionCount > 1
    && row.frameworkPackageId == null
    && row.frameworkEnumName == null
    && row.frameworkCodeName == null;
}

export function frameworkErrorDefinitionIdentity(
  row: Pick<FrameworkErrorCodeRow, "packageId" | "enumName" | "name" | "codeLabel">,
): string {
  return `${row.packageId}:${row.enumName}:${row.name}:${row.codeLabel}`;
}

function inspectFrameworkErrorDefinitions(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  codes: Map<string, MutableErrorCode>,
  messages: FrameworkErrorMessageAssignment[],
): void {
  const visit = (node: ts.Node): void => {
    if (ts.isEnumDeclaration(node) && isFrameworkErrorEnumName(node.name.text)) {
      readEnumCodes(sourceProject, sourceFile, packageId, packageName, node, codes);
    } else if (ts.isPropertyAssignment(node)) {
      readMessageAssignment(sourceFile, node, packageId, messages);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function inspectFrameworkErrorUsages(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  codeNumbers: ReadonlyMap<string, number | null>,
  mappedErrorWrappers: ReadonlyMap<ts.Declaration, MappedErrorWrapper>,
  rawErrorFactoryDeclarations: ReadonlySet<ts.Declaration>,
  usages: FrameworkErrorUsageRow[],
): void {
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const usage = usageForCall(
        sourceProject,
        sourceFile,
        packageId,
        packageName,
        codeNumbers,
        mappedErrorWrappers,
        rawErrorFactoryDeclarations,
        node,
      );
      if (usage != null) {
        usages.push(usage);
      }
    } else if (ts.isNewExpression(node) && calleeTail(node.expression) === "Error" && !newErrorUsesGetMessage(node)) {
      const expressionText = compactFrameworkErrorUsageExpressionText(node, sourceFile);
      const rawErrorKind = classifyRawErrorKind(node, sourceFile);
      const inlineCodeLabel = inlineCodeLabelForRawErrorArgument(node.arguments?.[0], sourceFile, rawErrorKind);
      const source = requiredSourceRangeForNode(sourceProject, node);
      usages.push({
        id: `framework-error-usage:${packageId}:${file.repoPath}:${node.getStart(sourceFile)}:raw-new-error`,
        packageId,
        packageName,
        mechanism: "raw-new-error",
        effect: usageEffect(node),
        enumName: null,
        codeName: null,
        codeNamePrefix: null,
        code: null,
        codeLabel: null,
        rawErrorKind,
        inlineCodeLabel,
        intentionalUnclaimedRawAuthorityReason: intentionalUnclaimedFrameworkRawErrorReason(
          packageId,
          file.repoPath,
          source.start.line + 1,
          expressionText,
        ),
        expressionText,
        filePath: file.repoPath,
        source,
        summary: rawErrorUsageSummary("Raw Error construction", rawErrorKind, inlineCodeLabel, usageEffect(node), expressionText),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function readEnumCodes(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  declaration: ts.EnumDeclaration,
  codes: Map<string, MutableErrorCode>,
): void {
  let nextValue = 0;
  for (const member of declaration.members) {
    const name = propertyNameText(member.name, sourceFile);
    if (name == null) {
      continue;
    }
    const numeric = numericEnumInitializer(member.initializer);
    const code = numeric ?? nextValue;
    nextValue = code + 1;
    const enumName = declaration.name.text as FrameworkErrorEnumName;
    codes.set(frameworkErrorScopedKey(packageId, enumName, name), {
      packageId,
      packageName,
      enumName,
      name,
      namePrefix: frameworkErrorNamePrefix(name),
      code,
      message: null,
      filePath: requiredSourceFileIdentity(sourceProject, sourceFile).repoPath,
      source: requiredSourceRangeForNode(sourceProject, member),
    });
  }
}

function readMessageAssignment(
  sourceFile: ts.SourceFile,
  node: ts.PropertyAssignment,
  packageId: string,
  messages: FrameworkErrorMessageAssignment[],
): void {
  const codeName = errorNameFromExpression(computedPropertyExpression(node.name));
  if (codeName == null) {
    return;
  }
  messages.push({
    packageId,
    enumName: codeName.enumName,
    name: codeName.name,
    message: compactErrorMessageText(node.initializer, sourceFile),
  });
}

function usageForCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  codeNumbers: ReadonlyMap<string, number | null>,
  mappedErrorWrappers: ReadonlyMap<ts.Declaration, MappedErrorWrapper>,
  rawErrorFactoryDeclarations: ReadonlySet<ts.Declaration>,
  node: ts.CallExpression,
): FrameworkErrorUsageRow | null {
  const mechanism = calleeTail(node.expression);
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  if (mechanism !== "createMappedError" && mechanism !== "getMessage") {
    const wrappedUsage = usageForMappedErrorWrapperCall(
      sourceProject,
      sourceFile,
      packageId,
      packageName,
      codeNumbers,
      mappedErrorWrappers,
      node,
      file.repoPath,
    );
    if (wrappedUsage != null) {
      return wrappedUsage;
    }
    if (!calleeResolvesToRawErrorFactory(sourceProject, node, rawErrorFactoryDeclarations)) {
      return null;
    }
    const expressionText = compactFrameworkErrorUsageExpressionText(node, sourceFile);
    const rawErrorKind = classifyRawErrorFactoryCallKind(node, sourceFile);
    const inlineCodeLabel = inlineCodeLabelForRawErrorArgument(node.arguments[0], sourceFile, rawErrorKind);
    const source = requiredSourceRangeForNode(sourceProject, node);
    return {
      id: `framework-error-usage:${packageId}:${file.repoPath}:${node.getStart(sourceFile)}:raw-error-factory-call`,
      packageId,
      packageName,
      mechanism: "raw-error-factory-call",
      effect: usageEffect(node),
      enumName: null,
      codeName: null,
      codeNamePrefix: null,
      code: null,
      codeLabel: null,
      rawErrorKind,
      inlineCodeLabel,
      intentionalUnclaimedRawAuthorityReason: intentionalUnclaimedFrameworkRawErrorReason(
        packageId,
        file.repoPath,
        source.start.line + 1,
        expressionText,
      ),
      expressionText,
      filePath: file.repoPath,
      source,
      summary: rawErrorUsageSummary("Raw Error factory call", rawErrorKind, inlineCodeLabel, usageEffect(node), expressionText),
    };
  }
  const codeName = errorNameFromExpression(node.arguments[0]);
  if (codeName == null) {
    return null;
  }
  const code = codeNumbers.get(frameworkErrorScopedKey(packageId, codeName.enumName, codeName.name)) ?? null;
  const expressionText = compactFrameworkErrorUsageExpressionText(node, sourceFile);
  return {
    id: `framework-error-usage:${packageId}:${file.repoPath}:${node.getStart(sourceFile)}:${mechanism}`,
    packageId,
    packageName,
    mechanism,
    effect: usageEffect(node),
    enumName: codeName.enumName,
    codeName: codeName.name,
    codeNamePrefix: frameworkErrorNamePrefix(codeName.name),
    code,
    codeLabel: codeLabel(code),
    rawErrorKind: null,
    inlineCodeLabel: null,
    intentionalUnclaimedRawAuthorityReason: null,
    expressionText,
    filePath: file.repoPath,
    source: requiredSourceRangeForNode(sourceProject, node),
    summary: `${mechanism}(${codeName.enumName}.${codeName.name}) as ${usageEffect(node)}: ${expressionText}`,
  };
}

function applyMessageAssignments(
  codes: Map<string, MutableErrorCode>,
  messages: readonly FrameworkErrorMessageAssignment[],
): void {
  for (const message of messages) {
    const existing = codes.get(frameworkErrorScopedKey(message.packageId, message.enumName, message.name));
    if (existing != null) {
      existing.message = message.message;
    }
  }
}

function frameworkErrorCodeNumbers(
  codes: ReadonlyMap<string, MutableErrorCode>,
): ReadonlyMap<string, number | null> {
  return new Map([...codes].map(([key, row]) => [key, row.code] as const));
}

export function frameworkErrorUsageCodeIsUnresolved(row: FrameworkErrorUsageRow): boolean {
  return row.enumName != null && row.codeName != null && row.code == null;
}

export function frameworkErrorUsageIsRawAuthorityGap(row: FrameworkErrorUsageRow): boolean {
  return row.rawErrorKind != null && row.rawErrorKind !== "mapped-error-factory-implementation";
}

export function frameworkErrorUsageIsOpenRawAuthorityGap(
  row: FrameworkErrorUsageRow,
  semanticRuntimeRawReferences: readonly FrameworkErrorSemanticRuntimeRawReferenceRow[],
): boolean {
  return frameworkErrorUsageIsRawAuthorityGap(row) &&
    !frameworkErrorUsageIsIntentionallyUnclaimedRawAuthority(row) &&
    !semanticRuntimeRawReferences.some((reference) =>
      reference.semanticRuntimeUseCount > 0 &&
      reference.resolvedUsageCount > 0 &&
      semanticRuntimeRawAuthorityReferenceMatchesUsage(reference, row)
    );
}

export function frameworkErrorUsageIsIntentionallyUnclaimedRawAuthority(
  row: FrameworkErrorUsageRow,
): boolean {
  return frameworkErrorUsageIsRawAuthorityGap(row) &&
    row.intentionalUnclaimedRawAuthorityReason != null;
}

function readMappedErrorWrappers(
  sourceProject: SourceProject,
  sourceFiles: readonly ts.SourceFile[],
): ReadonlyMap<ts.Declaration, MappedErrorWrapper> {
  const wrappers = new Map<ts.Declaration, MappedErrorWrapper>();
  for (const sourceFile of sourceFiles) {
    readMappedErrorWrappersInFile(sourceProject, sourceFile, wrappers);
  }
  return wrappers;
}

function readMappedErrorWrappersInFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  wrappers: Map<ts.Declaration, MappedErrorWrapper>,
): void {
  const visit = (node: ts.Node): void => {
    const wrapper = mappedErrorWrapperForDeclaration(node);
    if (wrapper != null) {
      addMappedErrorWrapperDeclaration(sourceProject, node, wrapper, wrappers);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function mappedErrorWrapperForDeclaration(
  node: ts.Node,
): MappedErrorWrapper | null {
  if (ts.isFunctionDeclaration(node) && node.name != null && node.body !== undefined) {
    return mappedErrorWrapperForFunctionBody(node.body, node.parameters);
  }
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.initializer !== undefined &&
    (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer))
  ) {
    return mappedErrorWrapperForFunctionBody(node.initializer.body, node.initializer.parameters);
  }
  return null;
}

function mappedErrorWrapperForFunctionBody(
  body: ts.ConciseBody,
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
): MappedErrorWrapper | null {
  let wrapper: MappedErrorWrapper | null = null;
  const visit = (node: ts.Node): void => {
    if (wrapper != null) {
      return;
    }
    if (node !== body && isNestedExecutionBoundary(node)) {
      return;
    }
    if (ts.isCallExpression(node)) {
      const mechanism = calleeTail(node.expression);
      if (mechanism === "createMappedError" || mechanism === "getMessage") {
        const parameterIndex = parameterIndexForIdentifierArgument(node.arguments[0], parameters);
        if (parameterIndex !== null) {
          wrapper = { mechanism, parameterIndex };
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return wrapper;
}

function parameterIndexForIdentifierArgument(
  argument: ts.Expression | undefined,
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
): number | null {
  const current = argument === undefined ? null : unwrapExpression(argument);
  if (current == null || !ts.isIdentifier(current)) {
    return null;
  }
  const index = parameters.findIndex((parameter) =>
    ts.isIdentifier(parameter.name) && parameter.name.text === current.text
  );
  return index < 0 ? null : index;
}

function addMappedErrorWrapperDeclaration(
  sourceProject: SourceProject,
  node: ts.Node,
  wrapper: MappedErrorWrapper,
  wrappers: Map<ts.Declaration, MappedErrorWrapper>,
): void {
  if (!ts.isFunctionDeclaration(node) && !ts.isVariableDeclaration(node)) {
    return;
  }
  wrappers.set(node, wrapper);
  const symbol = symbolForDeclaration(sourceProject.checker, node);
  for (const declaration of symbol?.declarations ?? []) {
    wrappers.set(declaration, wrapper);
  }
}

function usageForMappedErrorWrapperCall(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  packageId: string,
  packageName: string,
  codeNumbers: ReadonlyMap<string, number | null>,
  mappedErrorWrappers: ReadonlyMap<ts.Declaration, MappedErrorWrapper>,
  node: ts.CallExpression,
  filePath: string,
): FrameworkErrorUsageRow | null {
  const wrapper = mappedErrorWrapperForCall(sourceProject, node, mappedErrorWrappers);
  if (wrapper == null) {
    return null;
  }
  const codeName = errorNameFromExpression(node.arguments[wrapper.parameterIndex]);
  if (codeName == null) {
    return null;
  }
  const code = codeNumbers.get(frameworkErrorScopedKey(packageId, codeName.enumName, codeName.name)) ?? null;
  const expressionText = compactFrameworkErrorUsageExpressionText(node, sourceFile);
  return {
    id: `framework-error-usage:${packageId}:${filePath}:${node.getStart(sourceFile)}:mapped-error-wrapper-call`,
    packageId,
    packageName,
    mechanism: "mapped-error-wrapper-call",
    effect: usageEffect(node),
    enumName: codeName.enumName,
    codeName: codeName.name,
    codeNamePrefix: frameworkErrorNamePrefix(codeName.name),
    code,
    codeLabel: codeLabel(code),
    rawErrorKind: null,
    inlineCodeLabel: null,
    intentionalUnclaimedRawAuthorityReason: null,
    expressionText,
    filePath,
    source: requiredSourceRangeForNode(sourceProject, node),
    summary: `${wrapper.mechanism} wrapper(${codeName.enumName}.${codeName.name}) as ${usageEffect(node)}: ${expressionText}`,
  };
}

function mappedErrorWrapperForCall(
  sourceProject: SourceProject,
  node: ts.CallExpression,
  mappedErrorWrappers: ReadonlyMap<ts.Declaration, MappedErrorWrapper>,
): MappedErrorWrapper | null {
  const symbol = symbolForExpressionName(sourceProject.checker, node.expression);
  for (const declaration of symbol?.declarations ?? []) {
    const wrapper = mappedErrorWrappers.get(declaration);
    if (wrapper != null) {
      return wrapper;
    }
  }
  return null;
}

function readRawErrorFactoryDeclarations(
  sourceProject: SourceProject,
  sourceFiles: readonly ts.SourceFile[],
): ReadonlySet<ts.Declaration> {
  const factories = new Set<ts.Declaration>();
  for (const sourceFile of sourceFiles) {
    readRawErrorFactoryDeclarationsInFile(sourceProject, sourceFile, factories);
  }
  return factories;
}

function readRawErrorFactoryDeclarationsInFile(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
  factories: Set<ts.Declaration>,
): void {
  const visit = (node: ts.Node): void => {
    if (rawErrorFactoryDeclaration(node)) {
      addRawErrorFactoryDeclaration(sourceProject, node, factories);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function rawErrorFactoryDeclaration(
  node: ts.Node,
): node is ts.VariableDeclaration | ts.FunctionDeclaration {
  return (ts.isVariableDeclaration(node) && rawErrorFactoryBody(node.initializer)) ||
    (ts.isFunctionDeclaration(node) && node.name != null && rawErrorFactoryBody(node.body));
}

function addRawErrorFactoryDeclaration(
  sourceProject: SourceProject,
  node: ts.VariableDeclaration | ts.FunctionDeclaration,
  factories: Set<ts.Declaration>,
): void {
  factories.add(node);
  const symbol = symbolForDeclaration(sourceProject.checker, node);
  for (const declaration of symbol?.declarations ?? []) {
    factories.add(declaration);
  }
}

function calleeResolvesToRawErrorFactory(
  sourceProject: SourceProject,
  node: ts.CallExpression,
  rawErrorFactoryDeclarations: ReadonlySet<ts.Declaration>,
): boolean {
  const symbol = symbolForExpressionName(sourceProject.checker, node.expression);
  return symbol?.declarations?.some((declaration) =>
    rawErrorFactoryDeclarations.has(declaration)
  ) === true;
}

function rawErrorFactoryBody(node: ts.Node | undefined): boolean {
  if (node == null) {
    return false;
  }
  if (ts.isParenthesizedExpression(node)) {
    return rawErrorFactoryBody(node.expression);
  }
  if (ts.isNewExpression(node)) {
    return calleeTail(node.expression) === "Error" && !newErrorUsesGetMessage(node);
  }
  if (ts.isArrowFunction(node)) {
    return rawErrorFactoryBody(node.body);
  }
  if (ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node) || ts.isBlock(node)) {
    return blockDirectlyReturnsRawError(ts.isBlock(node) ? node : node.body);
  }
  return false;
}

function blockDirectlyReturnsRawError(block: ts.Block | undefined): boolean {
  if (block == null) {
    return false;
  }
  const statements = block.statements.filter((statement) => !ts.isEmptyStatement(statement));
  const onlyStatement = statements[0];
  return statements.length === 1
    && onlyStatement !== undefined
    && ts.isReturnStatement(onlyStatement)
    && rawErrorFactoryBody(onlyStatement.expression);
}

function finalizeCodeRow(
  row: MutableErrorCode,
  usages: readonly FrameworkErrorUsageRow[],
): FrameworkErrorCodeRow {
  const matchingUsages = usages.filter((usage) =>
    usage.packageId === row.packageId &&
    usage.enumName === row.enumName &&
    usage.codeName === row.name
  );
  const codeLabelValue = codeLabel(row.code);
  return {
    ...row,
    id: frameworkErrorScopedKey(row.packageId, row.enumName, row.name),
    codeLabel: codeLabelValue,
    usageCount: matchingUsages.length,
    thrownUsageCount: countWhere(matchingUsages, (usage) => usage.effect === "throw"),
    warningUsageCount: countWhere(matchingUsages, (usage) => usage.effect === "warning"),
    summary: `${row.packageName} ${row.enumName}.${row.name} (${codeLabelValue})${row.message == null ? "" : `: ${row.message}`}`,
  };
}

function frameworkErrorFamilyForGroup(
  key: string,
  codes: readonly FrameworkErrorCodeRow[],
  usages: readonly FrameworkErrorUsageRow[],
): FrameworkErrorFamilyRow {
  const first = codes[0];
  if (first === undefined) {
    throw new Error(`Cannot materialize empty framework error family '${key}'.`);
  }
  const matchingUsages = usages.filter((usage) =>
    usage.packageId === first.packageId &&
    usage.enumName === first.enumName &&
    usage.codeNamePrefix === first.namePrefix
  );
  const unusedCodeCount = countWhere(codes, (code) => code.usageCount === 0);
  const thrownUsageCount = countWhere(matchingUsages, (usage) => usage.effect === "throw");
  const warningUsageCount = countWhere(matchingUsages, (usage) => usage.effect === "warning");
  const pressureScore = codes.length * 4 + matchingUsages.length + thrownUsageCount * 2 + unusedCodeCount;
  const codeLabels = uniqueSortedStrings(codes.map((code) => code.codeLabel));
  const codeNames = uniqueSortedStrings(codes.map((code) => code.name));
  return {
    id: `framework-error-family:${key}`,
    packageId: first.packageId,
    packageName: first.packageName,
    enumName: first.enumName,
    namePrefix: first.namePrefix,
    codeCount: codes.length,
    messageCount: countWhere(codes, (code) => code.message != null),
    usageCount: matchingUsages.length,
    thrownUsageCount,
    warningUsageCount,
    unusedCodeCount,
    pressureScore,
    codeLabels,
    codeNames,
    filePath: first.filePath,
    source: first.source,
    summary: `${first.packageName} ${first.enumName}.${first.namePrefix}* groups ${codes.length} code(s), ${matchingUsages.length} mapped usage(s), and ${unusedCodeCount} unused code(s).`,
  };
}

function frameworkErrorDiagnosticFrontierForFamily(
  family: FrameworkErrorFamilyRow,
  codes: readonly FrameworkErrorCodeRow[],
  usages: readonly FrameworkErrorUsageRow[],
  semanticRuntimeReferences: readonly FrameworkErrorSemanticRuntimeReferenceRow[],
  semanticRuntimeRawReferences: readonly FrameworkErrorSemanticRuntimeRawReferenceRow[],
): FrameworkErrorDiagnosticFrontierRow {
  const familyCodes = codes.filter((code) =>
    code.packageId === family.packageId &&
    code.enumName === family.enumName &&
    code.namePrefix === family.namePrefix
  );
  const familyCodeLabels = new Set(familyCodes.map((code) => code.codeLabel));
  const rawAuthorityGaps = usages.filter((usage) =>
    frameworkErrorUsageIsOpenRawAuthorityGap(usage, semanticRuntimeRawReferences) &&
    usage.packageId === family.packageId &&
    (
      usage.codeNamePrefix === family.namePrefix ||
      (usage.inlineCodeLabel != null && familyCodeLabels.has(usage.inlineCodeLabel))
    )
  );
  const semanticRuntimeReferencesForFamily = semanticRuntimeReferences.filter((reference) =>
    semanticRuntimeFrameworkErrorReferenceBelongsToFamily(reference, family, familyCodeLabels)
  );
  const exactReferences = semanticRuntimeReferencesForFamily.filter((reference) =>
    reference.frameworkPackageId === family.packageId &&
    reference.frameworkEnumName === family.enumName &&
    reference.frameworkCodeName != null &&
    frameworkErrorNamePrefix(reference.frameworkCodeName) === family.namePrefix
  );
  const usedExactReferences = exactReferences.filter((reference) =>
    reference.semanticRuntimeUseCount > 0
  );
  const resolvedExactCodeNames = new Set(
    exactReferences
      .filter((reference) => reference.resolvedExactDefinitionCount > 0 && reference.frameworkCodeName != null)
      .map((reference) => reference.frameworkCodeName),
  );
  const linkedCodeNames = new Set(
    usedExactReferences
      .filter((reference) => reference.resolvedExactDefinitionCount > 0 && reference.frameworkCodeName != null)
      .map((reference) => reference.frameworkCodeName),
  );
  const intentionalUnclaimedCodes = familyCodes.filter((code) =>
    !linkedCodeNames.has(code.name) &&
    intentionalUnclaimedFrameworkErrorReason(code) != null
  );
  const intentionalUnclaimedSummaries = intentionalUnclaimedCodes.map((code) =>
    `${code.name} ${code.codeLabel}: ${intentionalUnclaimedFrameworkErrorReason(code)}`
  );
  const intentionalUnclaimedFutureSubstrateCodes = intentionalUnclaimedCodes.filter((code) =>
    intentionalUnclaimedFrameworkErrorKind(code) === "future-substrate"
  );
  const intentionalUnclaimedFutureSubstrateSummaries = intentionalUnclaimedFutureSubstrateCodes.map((code) =>
    `${code.name} ${code.codeLabel}: ${intentionalUnclaimedFrameworkErrorReason(code)}`
  );
  const dormantCodes = familyCodes.filter((code) =>
    !linkedCodeNames.has(code.name) &&
    !resolvedExactCodeNames.has(code.name) &&
    code.usageCount === 0 &&
    intentionalUnclaimedFrameworkErrorReason(code) == null
  );
  const dormantCodeSummaries = dormantCodes.map((code) => `${code.name} ${code.codeLabel}`);
  const unresolvedExactReferenceCount = countWhere(exactReferences, (reference) =>
    reference.resolvedExactDefinitionCount === 0
  );
  const effectivelyClosedCodeCount = linkedCodeNames.size + intentionalUnclaimedCodes.length + dormantCodes.length;
  const actionableUncoveredCodeCount = Math.max(0, family.codeCount - effectivelyClosedCodeCount);
  const semanticRuntimeCoverage = diagnosticCoverageForFamily(
    family.codeCount,
    linkedCodeNames.size,
    effectivelyClosedCodeCount,
    dormantCodes.length,
    intentionalUnclaimedFutureSubstrateCodes.length,
  );
  const rawAuthorityGapSummaries = uniqueSortedStrings(
    rawAuthorityGaps.map((usage) =>
      `${usage.mechanism}:${usage.rawErrorKind ?? "none"}:${usage.inlineCodeLabel ?? "unlabeled"}`
    ),
  );
  const likelySemanticRuntimeOwner = diagnosticFrontierOwnerHint(family);
  const frontierScore =
    family.codeCount * 2 +
    family.usageCount * 3 +
    family.thrownUsageCount * 2 +
    family.warningUsageCount * 2 +
    actionableUncoveredCodeCount * 2 +
    intentionalUnclaimedFutureSubstrateCodes.length * 8 +
    rawAuthorityGaps.length * 10 +
    unresolvedExactReferenceCount * 12;
  return {
    id: `framework-error-diagnostic-frontier:${family.packageId}:${family.enumName}:${family.namePrefix}`,
    packageId: family.packageId,
    packageName: family.packageName,
    enumName: family.enumName,
    namePrefix: family.namePrefix,
    codeCount: family.codeCount,
    messageCount: family.messageCount,
    usageCount: family.usageCount,
    thrownUsageCount: family.thrownUsageCount,
    warningUsageCount: family.warningUsageCount,
    unusedCodeCount: family.unusedCodeCount,
    rawAuthorityGapCount: rawAuthorityGaps.length,
    semanticRuntimeReferenceCount: semanticRuntimeReferencesForFamily.length,
    semanticRuntimeExactReferenceCount: countWhere(exactReferences, (reference) =>
      reference.resolvedExactDefinitionCount > 0
    ),
    semanticRuntimeUsedExactReferenceCount: countWhere(usedExactReferences, (reference) =>
      reference.resolvedExactDefinitionCount > 0
    ),
    semanticRuntimeLinkedCodeCount: linkedCodeNames.size,
    semanticRuntimeUnresolvedExactReferenceCount: unresolvedExactReferenceCount,
    intentionalUnclaimedCodeCount: intentionalUnclaimedCodes.length,
    intentionalUnclaimedFutureSubstrateCodeCount: intentionalUnclaimedFutureSubstrateCodes.length,
    intentionalUnclaimedRuntimeBoundaryCodeCount: intentionalUnclaimedCodes.length - intentionalUnclaimedFutureSubstrateCodes.length,
    intentionalUnclaimedSummaries,
    intentionalUnclaimedFutureSubstrateSummaries,
    dormantCodeCount: dormantCodes.length,
    dormantCodeSummaries,
    actionableUncoveredCodeCount,
    semanticRuntimeCoverage,
    frontierScore,
    codeLabels: family.codeLabels,
    codeNames: family.codeNames,
    rawAuthorityGapSummaries,
    likelySemanticRuntimeOwner,
    recommendedNextStep: frameworkErrorDiagnosticFrontierRecommendation(
      family,
      rawAuthorityGaps.length,
      linkedCodeNames.size,
      intentionalUnclaimedCodes.length,
      intentionalUnclaimedSummaries,
      intentionalUnclaimedFutureSubstrateCodes.length,
      intentionalUnclaimedFutureSubstrateSummaries,
      dormantCodes.length,
      dormantCodeSummaries,
      actionableUncoveredCodeCount,
      unresolvedExactReferenceCount,
      likelySemanticRuntimeOwner,
    ),
    filePath: family.filePath,
    source: family.source,
    summary: `${family.packageName} ${family.enumName}.${family.namePrefix}* diagnostic frontier: ${family.codeCount} code(s), ${family.usageCount} usage(s), ${linkedCodeNames.size}/${family.codeCount} used exact semantic-runtime code link(s), ${intentionalUnclaimedCodes.length} intentionally unclaimed code(s), ${intentionalUnclaimedFutureSubstrateCodes.length} future-substrate code(s), ${dormantCodes.length} dormant code(s), ${actionableUncoveredCodeCount} actionable uncovered code(s), ${rawAuthorityGaps.length} raw authority gap(s).`,
  };
}

function frameworkErrorDiagnosticCodeForCode(
  code: FrameworkErrorCodeRow,
  usages: readonly FrameworkErrorUsageRow[],
  semanticRuntimeReferences: readonly FrameworkErrorSemanticRuntimeReferenceRow[],
  semanticRuntimeRawReferences: readonly FrameworkErrorSemanticRuntimeRawReferenceRow[],
  ownerHint: string | null,
): FrameworkErrorDiagnosticCodeRow {
  const codeUsages = usages.filter((usage) => frameworkErrorUsageMatchesCode(usage, code));
  const rawAuthorityGaps = usages.filter((usage) =>
    frameworkErrorUsageIsOpenRawAuthorityGap(usage, semanticRuntimeRawReferences) &&
    usage.packageId === code.packageId &&
    (
      frameworkErrorUsageMatchesCode(usage, code) ||
      usage.inlineCodeLabel === code.codeLabel
    )
  );
  const codeReferences = semanticRuntimeReferences.filter((reference) =>
    semanticRuntimeFrameworkErrorReferenceMatchesCode(reference, code)
  );
  const exactReferences = codeReferences.filter((reference) =>
    reference.frameworkPackageId === code.packageId &&
    reference.frameworkEnumName === code.enumName &&
    reference.frameworkCodeName === code.name
  );
  const resolvedExactReferences = exactReferences.filter((reference) =>
    reference.resolvedExactDefinitionCount > 0
  );
  const usedExactReferences = resolvedExactReferences.filter((reference) =>
    reference.semanticRuntimeUseCount > 0
  );
  const unresolvedExactReferenceCount = countWhere(exactReferences, (reference) =>
    reference.resolvedExactDefinitionCount === 0
  );
  const ambiguousLabelReferenceCount = countWhere(
    codeReferences,
    semanticRuntimeReferenceHasAmbiguousLabel,
  );
  const intentionalUnclaimedReason = intentionalUnclaimedFrameworkErrorReason(code);
  const intentionalUnclaimedKind = intentionalUnclaimedFrameworkErrorKind(code);
  const diagnosticDisposition = diagnosticCodeDisposition(
    code,
    rawAuthorityGaps.length,
    resolvedExactReferences.length,
    usedExactReferences.length,
    unresolvedExactReferenceCount,
    intentionalUnclaimedReason != null,
  );
  const diagnosticScore = diagnosticCodeScore(
    code,
    rawAuthorityGaps.length,
    resolvedExactReferences.length,
    usedExactReferences.length,
    unresolvedExactReferenceCount,
    ambiguousLabelReferenceCount,
    diagnosticDisposition,
  );
  return {
    id: `framework-error-diagnostic-code:${code.packageId}:${code.enumName}:${code.name}`,
    packageId: code.packageId,
    packageName: code.packageName,
    enumName: code.enumName,
    name: code.name,
    namePrefix: code.namePrefix,
    code: code.code,
    codeLabel: code.codeLabel,
    message: code.message,
    usageCount: code.usageCount,
    thrownUsageCount: code.thrownUsageCount,
    warningUsageCount: code.warningUsageCount,
    usageMechanisms: uniqueSortedStrings(codeUsages.map((usage) => usage.mechanism)) as readonly FrameworkErrorUsageMechanism[],
    usageEffects: uniqueSortedStrings(codeUsages.map((usage) => usage.effect)) as readonly FrameworkErrorUsageEffect[],
    rawAuthorityGapCount: rawAuthorityGaps.length,
    semanticRuntimeReferenceCount: codeReferences.length,
    semanticRuntimeExactReferenceCount: resolvedExactReferences.length,
    semanticRuntimeUsedExactReferenceCount: usedExactReferences.length,
    semanticRuntimeUnresolvedExactReferenceCount: unresolvedExactReferenceCount,
    semanticRuntimeAmbiguousLabelReferenceCount: ambiguousLabelReferenceCount,
    diagnosticDisposition,
    intentionalUnclaimedReason,
    intentionalUnclaimedKind,
    diagnosticScore,
    likelySemanticRuntimeOwner: ownerHint,
    recommendedNextStep: diagnosticCodeRecommendation(
      diagnosticDisposition,
      code,
      ownerHint,
      intentionalUnclaimedReason,
    ),
    filePath: code.filePath,
    source: code.source,
    summary: `${code.packageName} ${code.enumName}.${code.name} ${code.codeLabel}: ${diagnosticDisposition}; ${code.usageCount} usage(s), ${usedExactReferences.length} used exact semantic-runtime link(s), ${rawAuthorityGaps.length} raw authority gap(s).`,
  };
}

function frameworkErrorUsageMatchesCode(
  usage: FrameworkErrorUsageRow,
  code: FrameworkErrorCodeRow,
): boolean {
  return usage.packageId === code.packageId &&
    usage.enumName === code.enumName &&
    usage.codeName === code.name;
}

function semanticRuntimeFrameworkErrorReferenceMatchesCode(
  reference: FrameworkErrorSemanticRuntimeReferenceRow,
  code: FrameworkErrorCodeRow,
): boolean {
  if (
    reference.frameworkPackageId != null ||
    reference.frameworkEnumName != null ||
    reference.frameworkCodeName != null
  ) {
    return reference.frameworkPackageId === code.packageId &&
      reference.frameworkEnumName === code.enumName &&
      reference.frameworkCodeName === code.name &&
      reference.codeLabel === code.codeLabel;
  }
  return reference.codeLabel === code.codeLabel;
}

function diagnosticCodeDisposition(
  code: FrameworkErrorCodeRow,
  rawAuthorityGapCount: number,
  exactReferenceCount: number,
  usedExactReferenceCount: number,
  unresolvedExactReferenceCount: number,
  isIntentionallyUnclaimed: boolean,
): FrameworkErrorDiagnosticCodeDisposition {
  if (unresolvedExactReferenceCount > 0) {
    return "broken-exact-link";
  }
  if (usedExactReferenceCount > 0) {
    return "modeled-exact";
  }
  if (exactReferenceCount > 0) {
    return "declared-unspent";
  }
  if (rawAuthorityGapCount > 0) {
    return "raw-authority-gap";
  }
  if (isIntentionallyUnclaimed) {
    return "intentionally-unclaimed-framework-authority";
  }
  if (code.usageCount === 0) {
    return "dormant-framework-authority";
  }
  return "unmodeled-used-framework-authority";
}

function diagnosticCodeDispositionForCode(
  code: FrameworkErrorCodeRow,
  usages: readonly FrameworkErrorUsageRow[],
  semanticRuntimeReferences: readonly FrameworkErrorSemanticRuntimeReferenceRow[],
  semanticRuntimeRawReferences: readonly FrameworkErrorSemanticRuntimeRawReferenceRow[],
): FrameworkErrorDiagnosticCodeDisposition {
  const rawAuthorityGapCount = countWhere(usages, (usage) =>
    frameworkErrorUsageIsOpenRawAuthorityGap(usage, semanticRuntimeRawReferences) &&
    usage.packageId === code.packageId &&
    (
      frameworkErrorUsageMatchesCode(usage, code) ||
      usage.inlineCodeLabel === code.codeLabel
    )
  );
  const exactReferences = semanticRuntimeReferences.filter((reference) =>
    reference.frameworkPackageId === code.packageId &&
    reference.frameworkEnumName === code.enumName &&
    reference.frameworkCodeName === code.name &&
    reference.codeLabel === code.codeLabel
  );
  const resolvedExactReferenceCount = countWhere(exactReferences, (reference) =>
    reference.resolvedExactDefinitionCount > 0
  );
  const usedExactReferenceCount = countWhere(exactReferences, (reference) =>
    reference.resolvedExactDefinitionCount > 0 &&
    reference.semanticRuntimeUseCount > 0
  );
  const unresolvedExactReferenceCount = countWhere(exactReferences, (reference) =>
    reference.resolvedExactDefinitionCount === 0
  );
  return diagnosticCodeDisposition(
    code,
    rawAuthorityGapCount,
    resolvedExactReferenceCount,
    usedExactReferenceCount,
    unresolvedExactReferenceCount,
    intentionalUnclaimedFrameworkErrorReason(code) != null,
  );
}

function diagnosticCodeScore(
  code: FrameworkErrorCodeRow,
  rawAuthorityGapCount: number,
  exactReferenceCount: number,
  usedExactReferenceCount: number,
  unresolvedExactReferenceCount: number,
  ambiguousLabelReferenceCount: number,
  disposition: FrameworkErrorDiagnosticCodeDisposition,
): number {
  if (disposition === "intentionally-unclaimed-framework-authority") {
    return Math.max(1, code.usageCount + code.thrownUsageCount + code.warningUsageCount);
  }
  const unmodeledScore = usedExactReferenceCount === 0 ? 12 : 0;
  const declaredButUnspentScore = exactReferenceCount > 0 && usedExactReferenceCount === 0 ? 6 : 0;
  const dormantPenalty = code.usageCount === 0 ? -8 : 0;
  return Math.max(0,
    code.usageCount * 5 +
    code.thrownUsageCount * 4 +
    code.warningUsageCount * 3 +
    rawAuthorityGapCount * 14 +
    unresolvedExactReferenceCount * 24 +
    ambiguousLabelReferenceCount * 2 +
    unmodeledScore +
    declaredButUnspentScore +
    dormantPenalty,
  );
}

function diagnosticCodeRecommendation(
  disposition: FrameworkErrorDiagnosticCodeDisposition,
  code: FrameworkErrorCodeRow,
  ownerHint: string | null,
  intentionalUnclaimedReason: string | null,
): string {
  const specific = diagnosticCodeSpecificRecommendation(disposition, code);
  if (specific != null) {
    return specific;
  }
  switch (disposition) {
    case "broken-exact-link":
      return "Repair the semantic-runtime framework-error link before using this code as diagnostic authority.";
    case "modeled-exact":
      return "Keep this exact framework code linked to its owning semantic-runtime product; revisit only when the framework usage path changes.";
    case "declared-unspent":
      return "Either spend this exact framework code through an owning product diagnostic or remove the bookkeeping constant until the modeled behavior exists.";
    case "raw-authority-gap":
      return ownerHint == null
        ? "Inspect the raw framework Error usage before deciding whether semantic-runtime needs a product diagnostic or Atlas needs better error authority modeling."
        : `Inspect the raw framework Error usage, then check ${ownerHint} before adding semantic-runtime diagnostic authority.`;
    case "intentionally-unclaimed-framework-authority":
      return intentionalUnclaimedReason == null
        ? "Leave this framework authority unclaimed for now; revisit only if semantic-runtime grows the matching runtime product path."
        : `Leave this framework authority unclaimed for now: ${intentionalUnclaimedReason}`;
    case "dormant-framework-authority":
      return "Treat this as dormant or duplicated framework authority until a source usage path or external pressure justifies modeling it.";
    case "unmodeled-used-framework-authority":
      return ownerHint == null
        ? "Inspect the exact framework usage row, choose the owning semantic-runtime substrate, then add a product-owned diagnostic only for the statically modeled path."
        : `Inspect the exact framework usage row, then check ${ownerHint} before adding a product-owned static diagnostic.`;
  }
}

function diagnosticCodeSpecificRecommendation(
  disposition: FrameworkErrorDiagnosticCodeDisposition,
  code: FrameworkErrorCodeRow,
): string | null {
  if (
    disposition === "unmodeled-used-framework-authority" &&
    code.packageId === "runtime" &&
    code.enumName === "ErrorNames" &&
    (code.name === "ast_unknown_binary_operator" || code.name === "ast_unknown_unary_operator")
  ) {
    return "Treat this as a malformed runtime-AST guard for now: ordinary semantic-runtime parser and AST products admit only the framework operator set, so claim it only if a product starts admitting raw, hydrated, or otherwise externally constructed AST objects.";
  }
  return null;
}

function intentionalUnclaimedFrameworkErrorReason(
  code: FrameworkErrorCodeRow,
): string | null {
  if (
    code.packageId === "kernel" &&
    code.enumName === "ErrorNames" &&
    code.name === "no_factory"
  ) {
    return "Aurelia's stock Container.getFactory returns a factory or throws its own getFactory/JIT error before Resolver.resolve observes a null factory; this guard is for custom IContainer implementations, which semantic-runtime does not currently admit as a DI handler product.";
  }
  if (
    code.packageId === "kernel" &&
    code.enumName === "ErrorNames" &&
    code.name === "unable_resolve_key"
  ) {
    return "Aurelia's stock Container.get loop returns from every ordinary resolver hit, root miss, or JIT/default-registration path; this trailing throw is a defensive unreachable guard unless container parent traversal is externally corrupted, which semantic-runtime does not currently admit as a DI container-state product.";
  }
  if (
    code.packageId === "expression-parser" &&
    code.enumName === "ErrorNames" &&
    code.name === "parse_invalid_empty"
  ) {
    return "Aurelia throws this from non-property/non-function expression entry families such as None/IsChainable, while semantic-runtime currently exposes property/function empty success plus iterator, interpolation, and custom families rather than those runtime entry points.";
  }
  if (
    code.packageId === "template-compiler" &&
    code.enumName === "ErrorNames" &&
    code.name === "attribute_pattern_already_initialized"
  ) {
    return "AttributeParser.registerPattern throws this only after a live parser service has already initialized itself by parsing an attribute; semantic-runtime materializes complete compiler-world parser visibility up front and does not yet admit mutable public IAttributeParser.registerPattern calls after parse-time initialization.";
  }
  if (
    code.packageId === "template-compiler" &&
    code.enumName === "ErrorNames" &&
    code.name === "compiler_no_dom_api"
  ) {
    return "CompilationContext throws this for a runtime IPlatform without a DOM document; semantic-runtime owns HTML source parsing and compiler-world construction without executing framework compilation against arbitrary platform service replacements.";
  }
  if (
    code.packageId === "validation" &&
    code.enumName === "ErrorNames" &&
    code.name === "method_not_implemented"
  ) {
    return "Validation's AUR0099 rows come from abstract rule/serializer/hydrator stubs and unsupported serialize-only rule classes. Semantic-runtime now admits source-authored validation rule-construction and model-rule hydration diagnostics, but it does not execute arbitrary custom validation rule classes or serializer visitors as live framework objects.";
  }
  if (
    code.packageId === "validation" &&
    code.enumName === "ErrorNames" &&
    (
      code.name === "unable_to_deserialize_expression" ||
      code.name === "serialization_display_name_not_a_string" ||
      code.name === "hydrate_rule_not_an_array"
    )
  ) {
    return "These validation serializer/deserializer rows belong to serialized validation AST/ruleset input. Semantic-runtime currently models source-authored fluent rules, accessor functions, model-rule object hydration, and closed group-rule results; it should claim serialized external validation payloads only after admitting that payload surface as a product.";
  }
  if (
    code.packageId === "validation" &&
    code.enumName === "ErrorNames" &&
    (
      code.name === "group_rule_no_scope" ||
      code.name === "invalid_rule_execution_result"
    )
  ) {
    return "These validation rule-execution rows depend on live validator invocation state or arbitrary custom rule return values. Semantic-runtime currently claims the closed source-authored group-result shape that can be proven before execution, while leaving live rule execution and custom rule evaluation unclaimed.";
  }
  if (
    code.packageId === "validation-html" &&
    code.enumName === "ErrorNames" &&
    code.name === "validation_controller_unable_to_parse_expression"
  ) {
    return "ValidationController.getPropertyInfo reaches this only when the framework AST walk falls through to an undefined expression root. Semantic-runtime owns parser-produced AST nodes, so ordinary validation binding analysis can model unsupported expression kinds exactly while leaving this malformed/foreign-AST fallback unclaimed until a product explicitly admits external AST objects.";
  }
  if (
    code.packageId === "dialog" &&
    code.enumName === "ErrorNames"
  ) {
    switch (code.name) {
      case "dialog_not_all_dialogs_closed":
        return "DialogService.closeAll throws this when live app deactivation still has open dialogs. Semantic-runtime now claims source-visible configuration/service argument failures, but it does not yet emulate live dialog controller deactivation state.";
      case "dialog_activation_rejected":
      case "dialog_cancellation_rejected":
      case "dialog_cancelled_with_cancel_on_rejection_setting":
      case "dialog_custom_error":
        return "DialogController reaches this through live activation/cancellation result handling. Semantic-runtime now claims source-visible configuration/service argument failures, but it does not yet emulate dialog component lifecycle, result mutation, or custom activation error propagation.";
      case "dialog_closed_before_deactivation":
        return "The standard dialog renderer warns here when a live dialog is already closed before renderer deactivation. Semantic-runtime now claims source-visible configuration/service argument failures, but it does not yet emulate renderer-owned dialog visibility/deactivation state.";
      default:
        return null;
    }
  }
  if (
    code.packageId === "fetch-client" &&
    code.enumName === "ErrorNames" &&
    code.name === "http_client_fetch_fn_not_found"
  ) {
    return "HttpClient construction reaches this when no fetch function is supplied and the host/global environment cannot provide one. Semantic-runtime now claims static HttpClient.configure(...) and RetryInterceptor configuration diagnostics, but it does not yet admit target-host global fetch availability or IFetchFn activation as a product.";
  }
  if (
    code.packageId === "fetch-client" &&
    code.enumName === "ErrorNames" &&
    code.name === "http_client_invalid_request_from_interceptor"
  ) {
    return "HttpClient.fetch reaches this after live request/response interceptor execution returns a value that is not a Request or Response. Semantic-runtime now claims static configuration and retry-policy errors, but it does not yet execute arbitrary interceptor chains or prove custom interceptor return values.";
  }
  if (
    code.packageId === "ui-virtualization" &&
    code.enumName === "ErrorNames" &&
    code.usageCount > 0
  ) {
    return "ui-virtualization throws this from VirtualRepeat, virtual DOM renderer, scroller lookup, or collection-strategy runtime policy; semantic-runtime models core repeat but not the ui-virtualization plugin's renderer/scroller/strategy substrate yet.";
  }
  if (
    code.packageId === "runtime" &&
    code.enumName === "ErrorNames" &&
    code.name === "method_not_implemented"
  ) {
    return "runtime uses this for internal noop/mixin guards in ast evaluator and connectable defaults; semantic-runtime models concrete evaluator and observation products instead of executing framework mixin stubs, so claim only if a product admits user-extensible evaluator/connectable classes.";
  }
  if (
    code.packageId === "runtime" &&
    code.enumName === "ErrorNames" &&
    (code.name === "ast_unknown_binary_operator" || code.name === "ast_unknown_unary_operator")
  ) {
    return "ordinary semantic-runtime template/app analysis admits only parser-produced framework AST operators, so this malformed/hydrated runtime-AST guard should stay unclaimed until a product explicitly accepts raw external AST objects.";
  }
  if (
    code.packageId === "runtime" &&
    code.enumName === "ErrorNames" &&
    code.name === "observing_null_undefined"
  ) {
    return "ObserverLocator.getObserver throws this for direct public API calls with a nullish object; semantic-runtime target-access products are created from controller, node, and source-expression substrates that keep nullish expression pressure in the AST/type lanes instead of admitting arbitrary ObserverLocator API invocations.";
  }
  if (
    code.packageId === "runtime" &&
    code.enumName === "ErrorNames" &&
    code.name === "observing_expression_no_parser"
  ) {
    return "ObserverLocator.getExpressionObserver throws this when the optional IExpressionParser service is absent; semantic-runtime parses authored expressions from compiler/value-site products and does not yet model public IObservation.watch string calls against partially configured service containers.";
  }
  if (
    code.packageId === "runtime" &&
    code.enumName === "ErrorNames" &&
    (
      code.name === "switch_on_null_connectable" ||
      code.name === "switch_active_connectable" ||
      code.name === "switch_off_null_connectable" ||
      code.name === "switch_off_inactive_connectable"
    )
  ) {
    return "ConnectableSwitcher throws these for live dependency-collection stack misuse; semantic-runtime supplies connectable evaluation context as a static AST/type flag and does not expose arbitrary enter/exit stack mutation as a product surface.";
  }
  if (
    code.packageId === "runtime" &&
    code.enumName === "ErrorNames" &&
    code.name === "non_recognisable_collection_type"
  ) {
    return "connectable.observeCollection throws this for direct invalid collection observation; built-in framework template paths either guard to arrays, map/set/array proxies, or runtime-html repeat diagnostics, so semantic-runtime should claim this only if it admits public/custom connectable collection calls.";
  }
  if (
    code.packageId === "runtime" &&
    code.enumName === "ErrorNames" &&
    code.name === "dirty_check_no_handler"
  ) {
    return "IDirtyChecker's development fallback throws this when the DI container lacks a dirty-checker registration; semantic-runtime has observer selection and app configuration facts, but not ObserverLocator service activation against arbitrary incomplete containers.";
  }
  if (
    code.packageId === "runtime" &&
    code.enumName === "ErrorNames" &&
    (
      code.name === "dirty_check_not_allowed" ||
      code.name === "dirty_check_setter_not_allowed"
    )
  ) {
    return "DirtyChecker throws these from descriptor-based dirty-check fallback and DirtyCheckSettings policy; semantic-runtime currently models ordinary setter/computed/node observers and should not claim dirty-check lifecycle writes until descriptor/config-driven DirtyChecker products exist.";
  }
  if (
    code.packageId === "runtime" &&
    code.enumName === "ErrorNames" &&
    (
      code.name === "effect_maximum_recursion_reached" ||
      code.name === "computed_mutating"
    )
  ) {
    return "runtime effects and computed observers throw these after live dependency execution detects recursive mutation; semantic-runtime can type getter/call surfaces, but it does not yet execute effect/computed dependency graphs deeply enough to prove these side-effect cycles.";
  }
  if (
    code.packageId === "runtime-html" &&
    code.enumName === "ErrorNames" &&
    (
      code.name === "controller_cached_not_found" ||
      code.name === "node_is_not_part_of_aurelia_app" ||
      code.name === "node_is_not_part_of_aurelia_app2"
    )
  ) {
    return "runtime-html throws this from public controller/node lookup APIs against live controller caches or host nodes; semantic-runtime materializes controller topology from source and does not expose arbitrary DOM-node-to-controller cache lookup as a product surface.";
  }
  if (
    code.packageId === "runtime-html" &&
    code.enumName === "ErrorNames" &&
    (
      code.name === "controller_activating_disposed" ||
      code.name === "controller_activation_unexpected_state" ||
      code.name === "controller_activation_synthetic_no_scope" ||
      code.name === "controller_deactivation_unexpected_state"
    )
  ) {
    return "semantic-runtime models controller creation, hydration, rendering, scope attachment, and bind handoff, but these errors come from live activate/deactivate state transitions and synthetic-view invocation state that are not executed by the current controller products.";
  }
  if (
    code.packageId === "runtime-html" &&
    code.enumName === "ErrorNames" &&
    code.name === "watcher_infinite_loop"
  ) {
    return "watcher_infinite_loop is raised after a live watch callback recursively dirties itself; semantic-runtime models watch metadata/callback validity but does not run watcher side effects deeply enough to prove recursive runtime mutation.";
  }
  if (
    code.packageId === "runtime-html" &&
    code.enumName === "ErrorNames" &&
    code.name === "view_factory_invalid_name"
  ) {
    return "ViewFactoryProvider.resolve throws this only after a prepared provider receives an IViewFactory whose runtime name is missing or empty; semantic-runtime-created template-controller factories carry generated nonempty definitions and arbitrary user-provided IViewFactory instances are not yet admitted.";
  }
  if (
    code.packageId === "runtime-html" &&
    code.enumName === "ErrorNames" &&
    code.name === "rendering_mismatch_length"
  ) {
    return "Rendering.render throws this from live DOM target count versus compiled instruction rows; semantic-runtime compiles template IR and controller products without executing DOM target discovery or SSR hydration target reconciliation.";
  }
  if (
    code.packageId === "runtime-html" &&
    code.enumName === "ErrorNames" &&
    (
      code.name === "root_not_found" ||
      code.name === "aurelia_instance_existed_in_container" ||
      code.name === "invalid_platform_impl" ||
      code.name === "no_composition_root" ||
      code.name === "invalid_dispose_call"
    )
  ) {
    return "these Aurelia instance/app-root errors belong to live start/stop/dispose/platform-host lifecycle state; semantic-runtime has app-root shape and project discovery, but not mutable Aurelia instance execution against a real host document.";
  }
  if (
    code.packageId === "runtime-html" &&
    code.enumName === "ErrorNames" &&
    (
      code.name === "au_compose_invalid_run" ||
      code.name === "au_compose_duplicate_deactivate"
    )
  ) {
    return "AuCompose throws these from the live CompositionController activation/deactivation state machine after a composition has already run; semantic-runtime currently claims static AuCompose input/resource failures, not repeated runtime composition lifecycle calls.";
  }
  if (
    code.packageId === "runtime-html" &&
    code.enumName === "ErrorNames" &&
    code.name === "repeat_mismatch_length"
  ) {
    return "Repeat throws this when live view count and item count diverge during collection-diff application; semantic-runtime models repeat source categories, locals, and constructor option diagnostics, not live view-array mutation consistency.";
  }
  if (
    code.packageId === "runtime-html" &&
    code.enumName === "ErrorNames" &&
    code.name === "update_trigger_behavior_not_supported"
  ) {
    return "UpdateTriggerBindingBehavior throws this only when INodeObserverLocator has been replaced by a non-default implementation; semantic-runtime models default NodeObserverLocator config and observer capability but not custom service replacement semantics yet.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    (
      code.name === "rtNoCtxStrComponent" ||
      code.name === "rtNoCtxLazyImport"
    )
  ) {
    return "resolveCustomElementDefinition throws this when asked to resolve a string or lazy-import routeable without a RouteConfigContext; semantic-runtime currently preserves such routeables as open until a context-specific routeable-resolution product is admitted.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    code.name === "rcNoContextStringComponent"
  ) {
    return "RouteContext.createViewportInstructions throws this for a relative string instruction after context normalization loses its current context; semantic-runtime records missing router-resource RouteContext as an open seam until relative instruction normalization grows an exact no-context diagnostic lane.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    code.name === "nmNoEndpoint"
  ) {
    return "NavigationRoute._setIsActive throws this while computing active navigation-menu state from the live router route tree; semantic-runtime materializes route configs, recognizer endpoints, and pre-activation route trees, but it does not currently emulate NavigationRoute active-state evaluation.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    code.name === "rtConfigFromHookApplied"
  ) {
    return "RouteConfig._applyFromConfigurationHook throws this when a routed view-model instance getRouteConfig hook is applied twice; semantic-runtime models static route metadata and pre-activation component-agent handoff, not repeated runtime view-model hook execution.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    code.name === "rtInvalidOperationNavigationStrategyComponent"
  ) {
    return "RouteConfig.component throws this when a NavigationStrategy route is read before a viewport instruction resolves it; semantic-runtime keeps navigation-strategy routeables referential/open instead of asking for a concrete component outside navigation.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    (
      code.name === "rcNoAppRoot" ||
      code.name === "rcHasRootContext" ||
      code.name === "rcNoRootCtrl"
    )
  ) {
    return "RouteContext.setRoot throws this during live router startup against the DI container and IAppRoot controller; semantic-runtime materializes app-root route-context topology from admitted app worlds but does not execute setRoot against mutable startup containers.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    code.name === "rcResolveInvalidCtxType"
  ) {
    return "RouteContext.resolve throws this for imperative context arguments that are not null, RouteContext, DOM Node, custom-element view-model, or controller; semantic-runtime does not expose arbitrary RouteContext.resolve calls as a static product surface.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    code.name === "instrInvalidUrlComponentOperation"
  ) {
    return "TypedNavigationInstruction.toUrlComponent throws this as a framework internal-bug guard for non-URL instruction kinds; semantic-runtime keeps URL generation on closed string/custom-element lanes and does not expose arbitrary toUrlComponent calls as a product surface.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    code.name === "instrIncompatiblePathGenerationInstr"
  ) {
    return "createEagerInstructions throws this from imperative generateRootedPath/generateRelativePath path-generation APIs before viewport-instruction creation; semantic-runtime currently models router-resource instruction materialization and RouteConfigContext eager generation, not direct public path-generation API calls.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    code.name === "rcNoNode"
  ) {
    return "RouteContext.node is the active navigation RouteNode pointer and the router assigns it during root setup or route-tree construction; semantic-runtime currently models potential RouteContext topology plus pre-activation RouteNode/RouteTree products, so claiming this invariant would pretend static contexts are active navigation state.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    code.name === "rcNoVpa"
  ) {
    return "RouteContext.vpa is only valid for non-root contexts hosted by a ViewportAgent; semantic-runtime keeps root and unresolved viewport-hosting contexts nullable and records viewport-resolution seams instead of dereferencing vpa, so this runtime getter guard should stay unclaimed until activation-state emulation admits such a read.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    code.name === "rtrNoCtx"
  ) {
    return "Router._ctx throws when the Router singleton is used before RouteContext.setRoot registered IRouteContext in the container; semantic-runtime models app-root route context topology and router-resource route-context seams, but it does not yet emulate imperative Router API calls against pre-root lifecycle/container state.";
  }
  if (
    code.packageId === "router" &&
    code.enumName === "Events" &&
    (
      code.name === "vpaUnexpectedActivation" ||
      code.name === "vpaUnexpectedDeactivation" ||
      code.name === "vpaUnexpectedState" ||
      code.name === "vpaUnexpectedGuardsResult"
    )
  ) {
    return "ViewportAgent unexpected-state errors are guard/activation-state machine invariants during navigation batches; semantic-runtime currently materializes pre-activation ViewportAgent, ComponentAgent, RouteTree, and RouteNode handoff products, but it does not run viewport activation, guard scheduling, or transition state mutation.";
  }
  return null;
}

function intentionalUnclaimedFrameworkErrorKind(
  code: FrameworkErrorCodeRow,
): FrameworkErrorIntentionalUnclaimedKind | null {
  if (intentionalUnclaimedFrameworkErrorReason(code) == null) {
    return null;
  }
  if (
    code.packageId === "dialog" &&
    code.enumName === "ErrorNames" &&
    code.usageCount > 0
  ) {
    return "future-substrate";
  }
  if (
    code.packageId === "ui-virtualization" &&
    code.usageCount > 0
  ) {
    return "future-substrate";
  }
  if (
    code.packageId === "validation" &&
    code.enumName === "ErrorNames" &&
    (
      code.name === "unable_to_deserialize_expression" ||
      code.name === "serialization_display_name_not_a_string" ||
      code.name === "hydrate_rule_not_an_array"
    )
  ) {
    return "future-substrate";
  }
  return "runtime-product-boundary";
}

function intentionalUnclaimedFrameworkRawErrorReason(
  packageId: string,
  filePath: string,
  publicLine: number,
  expressionText: string,
): string | null {
  if (
    packageId === "route-recognizer" &&
    filePath === "aurelia/packages/route-recognizer/src/index.ts"
  ) {
    switch (publicLine) {
      case 48:
        return "Endpoint.residualEndpoint is an internal one-shot mutation guard; semantic-runtime materializes primary/residual endpoint links directly and does not expose arbitrary Endpoint mutation as a product surface.";
      case 98:
        return "RecognizedRoute._getFirstNonEmptyPath throws only when live handler path metadata contains no non-empty path; semantic-runtime route-tree products carry explicit recognized paths and do not call this private helper.";
      case 149:
      case 153:
        return "Candidate optional-state traversal throws this as a route-recognizer state-graph invariant; semantic-runtime builds the same optional separator shape directly and should surface graph bugs through route-recognizer modeling, not a user diagnostic.";
      case 383:
        return "EndpointRequirement is constructed only after a candidate state with an endpoint is selected; semantic-runtime route recognition passes the Endpoint product directly, so this framework guard is not a user-authored route condition.";
      case 424:
        return "EndpointRequirement.consume throws this as an unexpected internal static-segment traversal state; semantic-runtime keeps static segment requirements closed and skips absent segments instead of exposing this as product behavior.";
      case 907:
        return "DynamicSegment rejects an undefined pattern only for direct malformed framework-object construction; semantic-runtime route parsing normalizes dynamic segment constraints to string patterns or null before state materialization.";
      case 958:
        return "This is the local createError helper implementation behind route-recognizer raw factory call sites; the call sites, not the helper body, are the semantic authority rows.";
    }
  }
  if (
    packageId === "state" &&
    filePath === "aurelia/packages/state/src/store.ts" &&
    (
      publicLine === 206 ||
      publicLine === 226 ||
      publicLine === 231
    )
  ) {
    return "State DevTools errors depend on host extension availability and live dispatch/devtools message lifecycle; semantic-runtime currently models store configuration and registry registration, not runtime DevTools integration.";
  }
  if (
    packageId === "router" &&
    filePath === "aurelia/packages/router/src/component-agent.ts" &&
    publicLine === 113
  ) {
    return "ComponentAgent._mountToViewport sees MountTarget.none only if a routed custom-element controller reaches activation without Controller.$el hydration setting host/shadowRoot/location; semantic-runtime models routed controller/component-agent handoff, not corrupted live controller mount state.";
  }
  if (
    packageId === "router" &&
    filePath === "aurelia/packages/router/src/instructions.ts" &&
    (
      publicLine === 380 ||
      publicLine === 385
    )
  ) {
    return publicLine === 380
      ? "ViewportInstructionTree.toUrl rejects a live NavigationOptions.context value that was not resolved to the framework RouteContext class; semantic-runtime closes router-resource instruction trees from modeled RouteContext products rather than emulating arbitrary imperative toUrl calls against user-supplied context objects."
      : "ViewportInstructionTree.toUrl needs active/current ViewportAgent nodes while walking a live relative navigation context; semantic-runtime materializes pre-activation route-context, viewport-agent, and instruction-tree products, not mutable current/next node slots.";
  }
  if (
    packageId === "router" &&
    filePath === "aurelia/packages/router/src/viewport-agent.ts" &&
    publicLine === 242
  ) {
    return "ViewportAgent._canUnload unexpected-state errors are transition batch state-machine guards; semantic-runtime materializes static ViewportAgent/RouteTree/ComponentAgent handoff products but does not run canUnload scheduling or mutate current viewport-agent state.";
  }
  if (
    packageId === "expression-parser" &&
    filePath === "aurelia/packages/expression-parser/src/ast.visitor.ts" &&
    publicLine === 136
  ) {
    return "astVisit reaches this only for malformed or foreign AST objects outside the expression-parser closed $kind union; semantic-runtime constructs parser-owned AST products directly and does not accept arbitrary framework AST objects as authored input.";
  }
  if (
    packageId === "expression-parser" &&
    expressionText === "new Error(message)"
  ) {
    return "This constructs a message-bearing Error object for parser result plumbing rather than a stable framework diagnostic authority row; exact parser ErrorNames remain the modeled authority.";
  }
  if (
    packageId === "platform" &&
    filePath === "aurelia/packages/platform/src/index.ts"
  ) {
    if (publicLine === 5) {
      return "This is the platform createError helper body; the notImplemented call sites that supply the missing global function name are the framework authority rows.";
    }
    if (publicLine === 9 || publicLine === 10) {
      return "Platform notImplemented throws only when the host global lacks a timer/microtask/performance function and user code later calls that live platform method; semantic-runtime does not model target-host global object availability or execute platform method calls.";
    }
  }
  if (
    packageId === "platform-browser" &&
    filePath === "aurelia/packages/platform-browser/src/index.ts" &&
    publicLine === 51
  ) {
    return "BrowserPlatform notImplemented throws only when the host global lacks fetch or animation-frame functions and user code later calls that live platform method; semantic-runtime does not model browser host global availability or execute platform method calls.";
  }
  if (
    packageId === "runtime" &&
    filePath === "aurelia/packages/runtime/src/queue.ts"
  ) {
    if (publicLine === 133) {
      return "runTasks constructs this only when a live scheduler flush recursively queues more than the framework deadlock guard allows; semantic-runtime does not execute Aurelia task queues or model host scheduling as a source product.";
    }
    if (publicLine === 586) {
      return "Task.run throws this for a mutable task instance that is no longer pending; semantic-runtime does not expose live Task objects or queue lifecycle mutation as authored-app semantics.";
    }
  }
  if (
    packageId === "runtime-html" &&
    filePath === "aurelia/packages/runtime-html/src/dom.node.ts" &&
    publicLine === 32
  ) {
    return "INode refs.set throws this for duplicate controller association on a live DOM Node; semantic-runtime materializes controller and hydration products from source, but does not mutate real Node.$au ref maps.";
  }
  if (
    packageId === "runtime-html" &&
    filePath === "aurelia/packages/runtime-html/src/templating/ssr.ts" &&
    (
      publicLine === 425 ||
      publicLine === 488 ||
      publicLine === 495
    )
  ) {
    return "SSR definition hydration throws this while translating an arbitrary serialized SSR manifest back into framework instructions; semantic-runtime currently preserves ssrScope source/configuration pressure but has not admitted an SSR manifest hydration substrate, and source-derived compiled-template products should not claim corrupt serialized-manifest guards.";
  }
  if (
    packageId === "validation" &&
    filePath === "aurelia/packages/validation/src/rule-provider.ts" &&
    (
      publicLine === 761 ||
      publicLine === 764
    )
  ) {
    return "ValidationRuleProvider.parseMessage forbids $parent in validation message interpolations; semantic-runtime does not yet admit the validation rule/message DSL substrate, so this belongs to the future validation package frontier rather than template expression diagnostics.";
  }
  return null;
}

function diagnosticCodeDispositionRank(
  disposition: FrameworkErrorDiagnosticCodeDisposition,
): number {
  switch (disposition) {
    case "broken-exact-link":
      return 5;
    case "raw-authority-gap":
    case "unmodeled-used-framework-authority":
      return 4;
    case "declared-unspent":
      return 3;
    case "intentionally-unclaimed-framework-authority":
    case "dormant-framework-authority":
      return 1;
    case "modeled-exact":
      return 0;
  }
}

function semanticRuntimeFrameworkErrorReferenceBelongsToFamily(
  reference: FrameworkErrorSemanticRuntimeReferenceRow,
  family: FrameworkErrorFamilyRow,
  familyCodeLabels: ReadonlySet<string>,
): boolean {
  if (
    reference.frameworkPackageId != null ||
    reference.frameworkEnumName != null ||
    reference.frameworkCodeName != null
  ) {
    return reference.frameworkPackageId === family.packageId &&
      reference.frameworkEnumName === family.enumName &&
      reference.frameworkCodeName != null &&
      frameworkErrorNamePrefix(reference.frameworkCodeName) === family.namePrefix;
  }
  return familyCodeLabels.has(reference.codeLabel);
}

function diagnosticCoverageForFamily(
  codeCount: number,
  linkedCodeCount: number,
  effectivelyClosedCodeCount: number,
  dormantCodeCount: number,
  futureSubstrateCodeCount: number,
): FrameworkErrorDiagnosticCoverage {
  if (effectivelyClosedCodeCount >= codeCount) {
    if (futureSubstrateCodeCount > 0) {
      return linkedCodeCount === 0 ? "future-substrate" : "partial";
    }
    return dormantCodeCount > 0 ? "dormant-closed" : "complete";
  }
  return linkedCodeCount === 0 ? "none" : "partial";
}

function frameworkErrorDiagnosticFrontierRecommendation(
  family: FrameworkErrorFamilyRow,
  rawAuthorityGapCount: number,
  linkedCodeCount: number,
  intentionalUnclaimedCodeCount: number,
  intentionalUnclaimedSummaries: readonly string[],
  intentionalUnclaimedFutureSubstrateCodeCount: number,
  intentionalUnclaimedFutureSubstrateSummaries: readonly string[],
  dormantCodeCount: number,
  dormantCodeSummaries: readonly string[],
  actionableUncoveredCodeCount: number,
  unresolvedExactReferenceCount: number,
  ownerHint: string | null,
): string {
  if (unresolvedExactReferenceCount > 0) {
    return "Repair semantic-runtime framework-error links before treating these labels as diagnostic authority.";
  }
  if (rawAuthorityGapCount > 0) {
    return ownerHint == null
      ? "Audit raw Error authority gaps against the framework source before adding semantic-runtime diagnostics."
      : `Audit raw Error authority gaps against the framework source, then inspect ${ownerHint} before adding semantic-runtime diagnostics.`;
  }
  if (family.usageCount === 0) {
    return "Treat this as dormant or duplicated framework authority until a source usage path or external pressure shows the behavior that semantic-runtime should model.";
  }
  if (intentionalUnclaimedFutureSubstrateCodeCount > 0) {
    const futureSummary = intentionalUnclaimedFutureSubstrateSummaries.length === 0
      ? `${intentionalUnclaimedFutureSubstrateCodeCount} intentionally unclaimed code(s) are future substrate pressure.`
      : intentionalUnclaimedFutureSubstrateSummaries.join(" | ");
    if (linkedCodeCount === 0) {
      return ownerHint == null
        ? `Treat this as a future semantic-runtime substrate frontier, not a closed diagnostic family: ${futureSummary}`
        : `Treat this as a future semantic-runtime substrate frontier for ${ownerHint}, not a closed diagnostic family: ${futureSummary}`;
    }
    return ownerHint == null
      ? `Keep modeled exact rows stable, but leave this frontier visible because future substrate pressure remains: ${futureSummary}`
      : `Keep modeled exact rows stable in ${ownerHint}, but leave this frontier visible because future substrate pressure remains: ${futureSummary}`;
  }
  if (linkedCodeCount + intentionalUnclaimedCodeCount >= family.codeCount && intentionalUnclaimedCodeCount > 0) {
    const intentionalSummary = intentionalUnclaimedSummaries.length === 0
      ? `${intentionalUnclaimedCodeCount} code(s) are intentionally unclaimed.`
      : intentionalUnclaimedSummaries.join(" | ");
    return `Treat this frontier as closed for now: ${intentionalSummary} Revisit only if semantic-runtime grows the matching runtime product path.`;
  }
  if (actionableUncoveredCodeCount === 0 && dormantCodeCount > 0) {
    const dormantSummary = dormantCodeSummaries.length === 0
      ? `${dormantCodeCount} code(s) are unused framework definitions.`
      : dormantCodeSummaries.join(" | ");
    if (intentionalUnclaimedSummaries.length > 0) {
      return `Treat this frontier as closed for now: ${intentionalUnclaimedSummaries.join(" | ")} Dormant definitions: ${dormantSummary}. Revisit only if a framework source usage appears or semantic-runtime grows the matching runtime product path.`;
    }
    return `Treat this frontier as dormant-closed for now: ${dormantSummary}. Revisit only if a framework source usage appears or external/product pressure admits the matching behavior.`;
  }
  if (linkedCodeCount === 0) {
    return ownerHint == null
      ? "Choose the semantic-runtime subsystem that owns this framework behavior, then add exact framework-error links only where the static diagnostic matches the runtime error."
      : `Inspect ${ownerHint} as the likely semantic-runtime owner, then add exact framework-error links only where static analysis matches the runtime error.`;
  }
  if (linkedCodeCount < family.codeCount) {
    return ownerHint == null
      ? "Complete exact semantic-runtime links for the remaining framework codes that are truly modeled; leave runtime-only codes unclaimed."
      : `Continue in ${ownerHint} for the remaining framework codes that are truly modeled; leave runtime-only codes unclaimed.`;
  }
  if (family.unusedCodeCount > 0) {
    return "Verify whether unused framework codes are dormant public authority or dead framework definitions before mirroring them.";
  }
  return "Keep this family as source-backed authority and revisit when external app pressure reaches the same framework behavior.";
}

function diagnosticFrontierOwnerHint(family: FrameworkErrorFamilyRow): string | null {
  if (family.packageId === "template-compiler" && family.namePrefix === "compiler") {
    return "semantic-runtime template compiler issue products, binding-command lowering, compiled-template assembly, and compiler-world service customization";
  }
  if (family.packageId === "expression-parser" && family.namePrefix === "parse") {
    return "semantic-runtime expression parser, completed-input corridors, interpolation parser, and parser failure publications";
  }
  if (family.packageId === "runtime" && family.namePrefix === "ast") {
    return "semantic-runtime type-system expression evaluator, expression call projector, and observation data-flow diagnostics";
  }
  if (family.packageId === "runtime" && (family.namePrefix === "dirty" || family.namePrefix === "switch")) {
    return "semantic-runtime observation/connectable modeling and binding lifecycle semantics";
  }
  if (family.packageId === "runtime-html") {
    switch (family.namePrefix) {
      case "ast":
        return "semantic-runtime type-system expression evaluator plus runtime-html binding/resource lookup semantics";
      case "controller":
        return "semantic-runtime controller products, runtime-controller hydration/bind materializers, resource convergence, and observation accessor capability";
      case "watch":
        return "semantic-runtime resource watch convergence and controller watcher materialization";
      case "repeat":
        return "semantic-runtime template-controller flow scope, repeat value-domain projection, and runtime controller child-view semantics";
      case "binding":
        return "semantic-runtime binding command lowering, runtime binding products, and built-in binding-behavior/resource catalogs";
      case "attribute":
      case "element":
        return "semantic-runtime resource resolver, compiler world, and built-in resource catalog materializers";
      case "node":
        return "semantic-runtime observer locator, node observer configuration, and host-node source typing";
      case "update":
        return "semantic-runtime binding behavior catalog and observer/accessor trigger capability";
      case "au":
      case "portal":
        return "semantic-runtime built-in template-controller/resource semantics and runtime controller activation products";
      case "invalid":
        return "semantic-runtime resource convergence, platform service modeling, and lifecycle disposal semantics";
      case "no":
        return "semantic-runtime compiler-world formation, spread compile host, and composition root modeling";
      default:
        return "semantic-runtime runtime-html resource, binding, controller, or observation substrates";
    }
  }
  if (family.packageId === "router") {
    return "semantic-runtime router configuration, route recognizer, route context/tree, viewport, and component-agent substrates";
  }
  if (family.packageId === "kernel") {
    return "semantic-runtime DI, registration, resolver, and static evaluation substrates";
  }
  if (family.packageId === "i18n") {
    return "semantic-runtime i18n configuration and translation-key products";
  }
  if (family.packageId === "validation" || family.packageId === "validation-html") {
    return "future semantic-runtime validation substrate or validation-html binding behavior modeling";
  }
  if (family.packageId === "fetch-client") {
    return "semantic-runtime fetch-client source diagnostics for static HttpClient.configure(...) and RetryInterceptor policy, plus future host-fetch/interceptor-execution substrate for the remaining runtime-only authorities";
  }
  if (family.packageId === "dialog") {
    return "semantic-runtime dialog source diagnostics for bare configuration, static service settings, and child settings keys, plus future dialog runtime/lifecycle/renderer substrate";
  }
  return null;
}

function diagnosticCodeOwnerHint(
  code: FrameworkErrorCodeRow,
  familyOwnerHint: string | null,
): string | null {
  if (code.packageId === "kernel" && code.name === "invalid_module_transform_input") {
    return "semantic-runtime module namespace/module-loader analysis, resource export recognition, and registration admission";
  }
  return familyOwnerHint;
}

function computedPropertyExpression(name: ts.PropertyName): ts.Expression | null {
  return ts.isComputedPropertyName(name) ? name.expression : null;
}

function errorNameFromExpression(
  expression: ts.Expression | undefined | null,
): { readonly enumName: FrameworkErrorEnumName; readonly name: string } | null {
  if (expression == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (!ts.isPropertyAccessExpression(current) || !ts.isIdentifier(current.expression)) {
    return null;
  }
  const enumName = current.expression.text;
  return isFrameworkErrorEnumName(enumName)
    ? { enumName, name: current.name.text }
    : null;
}

function isFrameworkErrorEnumName(value: string): value is FrameworkErrorEnumName {
  return value === "ErrorNames" || value === "Events";
}

function newErrorUsesGetMessage(node: ts.NewExpression): boolean {
  return node.arguments?.some((argument) => {
    const current = unwrapExpression(argument);
    return ts.isCallExpression(current) && calleeTail(current.expression) === "getMessage";
  }) === true;
}

function usageEffect(node: ts.Node): FrameworkErrorUsageEffect {
  if (hasAncestor(node, ts.isThrowStatement)) {
    return "throw";
  }
  if (isInsideConsoleWarn(node)) {
    return "warning";
  }
  if (hasAncestor(node, ts.isReturnStatement)) {
    return "return";
  }
  if (hasAncestor(node, ts.isNewExpression)) {
    return "new-error";
  }
  return "call";
}

function hasAncestor<TNode extends ts.Node>(
  node: ts.Node,
  predicate: (node: ts.Node) => node is TNode,
): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (predicate(current)) {
      return true;
    }
    if (ts.isStatement(current) || ts.isClassElement(current)) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function isInsideConsoleWarn(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.name.text === "warn" &&
      ts.isIdentifier(current.expression.expression) &&
      current.expression.expression.text === "console"
    ) {
      return true;
    }
    if (ts.isStatement(current)) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function numericEnumInitializer(initializer: ts.Expression | undefined): number | null {
  if (initializer == null) {
    return null;
  }
  const current = unwrapExpression(initializer);
  if (ts.isNumericLiteral(current)) {
    return Number(current.text);
  }
  if (
    ts.isPrefixUnaryExpression(current) &&
    current.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(current.operand)
  ) {
    return -Number(current.operand.text);
  }
  return null;
}

function compactErrorMessageText(expression: ts.Expression, sourceFile: ts.SourceFile): string {
  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  const compact = compactSourceExpressionText(expression, sourceFile);
  return compact.length <= 160 ? compact : `${compact.slice(0, 157)}...`;
}

function compactFrameworkErrorUsageExpressionText(expression: ts.Expression, sourceFile: ts.SourceFile): string {
  const compact = expression.getText(sourceFile).replace(/\s+/g, " ").trim();
  return compact.length <= 180 ? compact : `${compact.slice(0, 177)}...`;
}

function classifyRawErrorKind(node: ts.NewExpression, sourceFile: ts.SourceFile): FrameworkErrorRawErrorKind {
  if (insideMappedErrorFactoryImplementation(node)) {
    return "mapped-error-factory-implementation";
  }
  const firstArgument = node.arguments?.[0];
  if (firstArgument == null) {
    return "empty";
  }
  const text = firstArgument.getText(sourceFile);
  return text.includes("AUR")
    ? "inline-aur-code"
    : "message-expression";
}

function insideMappedErrorFactoryImplementation(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.text === "createMappedError";
    }
    if (ts.isFunctionDeclaration(current) && current.name != null) {
      return current.name.text === "createMappedError";
    }
    if (ts.isSourceFile(current)) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function classifyRawErrorFactoryCallKind(node: ts.CallExpression, sourceFile: ts.SourceFile): FrameworkErrorRawErrorKind {
  const firstArgument = node.arguments[0];
  if (firstArgument == null) {
    return "empty";
  }
  const text = firstArgument.getText(sourceFile);
  return text.includes("AUR")
    ? "inline-aur-code"
    : "message-expression";
}

function inlineCodeLabelForRawErrorArgument(
  argument: ts.Expression | undefined,
  sourceFile: ts.SourceFile,
  rawErrorKind: FrameworkErrorRawErrorKind,
): string | null {
  return rawErrorKind === "inline-aur-code"
    ? inlineAurCodeLabelFromText(argument?.getText(sourceFile) ?? "")
    : null;
}

function inlineAurCodeLabelFromText(text: string): string | null {
  const match = /AUR\s*(\d{4})/u.exec(text);
  return match?.[1] === undefined ? null : `AUR${match[1]}`;
}

function rawErrorUsageSummary(
  prefix: string,
  rawErrorKind: FrameworkErrorRawErrorKind,
  inlineCodeLabel: string | null,
  effect: FrameworkErrorUsageEffect,
  expressionText: string,
): string {
  const codeSuffix = inlineCodeLabel == null ? "" : ` ${inlineCodeLabel}`;
  return `${prefix} (${rawErrorKind}${codeSuffix}) as ${effect}: ${expressionText}`;
}

function codeLabel(code: number | null): string {
  return code == null ? "unresolved" : `AUR${String(code).padStart(4, "0")}`;
}

function codeHundredBucket(code: number | null): string {
  if (code == null) {
    return "unresolved";
  }
  const start = Math.floor(code / 100) * 100;
  const end = start + 99;
  return `${String(start).padStart(4, "0")}-${String(end).padStart(4, "0")}`;
}

function frameworkErrorNamePrefix(name: string): string {
  return name.split("_", 1)[0] ?? name;
}

function frameworkErrorScopedKey(
  packageId: string,
  enumName: FrameworkErrorEnumName,
  nameOrPrefix: string,
): string {
  return `${packageId}:${enumName}:${nameOrPrefix}`;
}

function compareCodeRows(left: FrameworkErrorCodeRow, right: FrameworkErrorCodeRow): number {
  return left.packageId.localeCompare(right.packageId) ||
    (left.code ?? Number.MAX_SAFE_INTEGER) - (right.code ?? Number.MAX_SAFE_INTEGER) ||
    left.name.localeCompare(right.name);
}

function compareFamilyRows(left: FrameworkErrorFamilyRow, right: FrameworkErrorFamilyRow): number {
  return right.pressureScore - left.pressureScore ||
    right.codeCount - left.codeCount ||
    left.packageId.localeCompare(right.packageId) ||
    left.enumName.localeCompare(right.enumName) ||
    left.namePrefix.localeCompare(right.namePrefix);
}

function compareDiagnosticFrontierRows(
  left: FrameworkErrorDiagnosticFrontierRow,
  right: FrameworkErrorDiagnosticFrontierRow,
): number {
  return right.semanticRuntimeUnresolvedExactReferenceCount - left.semanticRuntimeUnresolvedExactReferenceCount ||
    right.rawAuthorityGapCount - left.rawAuthorityGapCount ||
    right.actionableUncoveredCodeCount - left.actionableUncoveredCodeCount ||
    right.intentionalUnclaimedFutureSubstrateCodeCount - left.intentionalUnclaimedFutureSubstrateCodeCount ||
    right.frontierScore - left.frontierScore ||
    right.codeCount - left.codeCount ||
    left.packageId.localeCompare(right.packageId) ||
    left.enumName.localeCompare(right.enumName) ||
    left.namePrefix.localeCompare(right.namePrefix);
}

function compareDiagnosticCodeRows(
  left: FrameworkErrorDiagnosticCodeRow,
  right: FrameworkErrorDiagnosticCodeRow,
): number {
  return diagnosticCodeDispositionRank(right.diagnosticDisposition) - diagnosticCodeDispositionRank(left.diagnosticDisposition) ||
    right.diagnosticScore - left.diagnosticScore ||
    right.usageCount - left.usageCount ||
    left.packageId.localeCompare(right.packageId) ||
    (left.code ?? Number.MAX_SAFE_INTEGER) - (right.code ?? Number.MAX_SAFE_INTEGER) ||
    left.name.localeCompare(right.name);
}

function compareUsageRows(left: FrameworkErrorUsageRow, right: FrameworkErrorUsageRow): number {
  return left.packageId.localeCompare(right.packageId) ||
    left.filePath.localeCompare(right.filePath) ||
    left.source.start.line - right.source.start.line ||
    left.source.start.character - right.source.start.character;
}
