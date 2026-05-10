import ts from "typescript";

import { countBy, countWhere } from "../../collections.js";
import {
  AURELIA_FRAMEWORK_PACKAGE_IDS,
  compactExpressionText as compactSourceExpressionText,
  propertyNameText,
  requiredSourceFileIdentity,
  requiredSourceRangeForNode,
  SourceProjectMemo,
  unwrapExpression,
  type SourceProject,
} from "../../source/index.js";
import type { SourceRange } from "../locus.js";
import { calleeTail } from "./framework-ts-utils.js";

export const FRAMEWORK_ERROR_ANALYSIS_VERSION = "framework-error-analysis.v1" as const;

const frameworkErrorAnalysisMemo =
  new SourceProjectMemo<FrameworkErrorAnalysis>();

export type FrameworkErrorEnumName = "ErrorNames" | "Events";

export type FrameworkErrorUsageMechanism =
  | "createMappedError"
  | "getMessage"
  | "raw-new-error";

export type FrameworkErrorUsageEffect =
  | "throw"
  | "warning"
  | "return"
  | "new-error"
  | "call";

export interface FrameworkErrorRollup {
  readonly packageCount: number;
  readonly sourceFileCount: number;
  readonly codeCount: number;
  readonly messageCount: number;
  readonly usageCount: number;
  readonly createMappedErrorUsageCount: number;
  readonly getMessageUsageCount: number;
  readonly rawNewErrorCount: number;
  readonly thrownUsageCount: number;
  readonly warningUsageCount: number;
  readonly codesByPackage: Readonly<Record<string, number>>;
  readonly codesByEnum: Readonly<Record<string, number>>;
  readonly codesByHundred: Readonly<Record<string, number>>;
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

export interface FrameworkErrorUsageRow {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly mechanism: FrameworkErrorUsageMechanism;
  readonly effect: FrameworkErrorUsageEffect;
  readonly enumName: FrameworkErrorEnumName | null;
  readonly codeName: string | null;
  readonly code: number | null;
  readonly codeLabel: string | null;
  readonly filePath: string;
  readonly source: SourceRange;
  readonly summary: string;
}

export interface FrameworkErrorAnalysis {
  readonly version: typeof FRAMEWORK_ERROR_ANALYSIS_VERSION;
  readonly rollup: FrameworkErrorRollup;
  readonly packages: readonly FrameworkErrorPackageRow[];
  readonly codes: readonly FrameworkErrorCodeRow[];
  readonly usages: readonly FrameworkErrorUsageRow[];
}

interface MutableErrorCode {
  readonly packageId: string;
  readonly packageName: string;
  readonly enumName: FrameworkErrorEnumName;
  readonly name: string;
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
): FrameworkErrorRollup {
  return {
    packageCount: packages.length,
    sourceFileCount: packages.reduce((total, row) => total + row.sourceFileCount, 0),
    codeCount: codes.length,
    messageCount: countWhere(codes, (row) => row.message != null),
    usageCount: usages.length,
    createMappedErrorUsageCount: countWhere(usages, (row) => row.mechanism === "createMappedError"),
    getMessageUsageCount: countWhere(usages, (row) => row.mechanism === "getMessage"),
    rawNewErrorCount: countWhere(usages, (row) => row.mechanism === "raw-new-error"),
    thrownUsageCount: countWhere(usages, (row) => row.effect === "throw"),
    warningUsageCount: countWhere(usages, (row) => row.effect === "warning"),
    codesByPackage: countBy(codes, (row) => row.packageId),
    codesByEnum: countBy(codes, (row) => row.enumName),
    codesByHundred: countBy(codes, (row) => codeHundredBucket(row.code)),
    usagesByPackage: countBy(usages, (row) => row.packageId),
    usageMechanisms: countBy(usages, (row) => row.mechanism),
    usageEffects: countBy(usages, (row) => row.effect),
  };
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

  for (const sourcePackage of packageSummaries) {
    const files = sourceProject.ownedImplementationSourceFilesForPackage(sourcePackage.id);
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

  for (const sourcePackage of packageSummaries) {
    const files = sourceProject.ownedImplementationSourceFilesForPackage(sourcePackage.id);
    for (const sourceFile of files) {
      inspectFrameworkErrorUsages(
        sourceProject,
        sourceFile,
        sourcePackage.id,
        sourcePackage.packageName,
        codeNumbers,
        usages,
      );
    }
  }

  const codes = [...mutableCodes.values()]
    .map((row) => finalizeCodeRow(row, usages))
    .sort(compareCodeRows);
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

  const analysis = {
    version: FRAMEWORK_ERROR_ANALYSIS_VERSION,
    rollup: frameworkErrorRollupForRows(finalizedPackages, codes, usages),
    packages: finalizedPackages,
    codes,
    usages: usages.sort(compareUsageRows),
  };
  return analysis;
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
  usages: FrameworkErrorUsageRow[],
): void {
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const usage = usageForCall(sourceProject, sourceFile, packageId, packageName, codeNumbers, node);
      if (usage != null) {
        usages.push(usage);
      }
    } else if (ts.isNewExpression(node) && calleeTail(node.expression) === "Error" && !newErrorUsesGetMessage(node)) {
      usages.push({
        id: `framework-error-usage:${packageId}:${file.repoPath}:${node.getStart(sourceFile)}:raw-new-error`,
        packageId,
        packageName,
        mechanism: "raw-new-error",
        effect: usageEffect(node),
        enumName: null,
        codeName: null,
        code: null,
        codeLabel: null,
        filePath: file.repoPath,
        source: requiredSourceRangeForNode(sourceProject, node),
        summary: "Raw Error construction without a mapped framework error code.",
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
    codes.set(errorCodeKey(packageId, enumName, name), {
      packageId,
      packageName,
      enumName,
      name,
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
  node: ts.CallExpression,
): FrameworkErrorUsageRow | null {
  const mechanism = calleeTail(node.expression);
  if (mechanism !== "createMappedError" && mechanism !== "getMessage") {
    return null;
  }
  const codeName = errorNameFromExpression(node.arguments[0]);
  if (codeName == null) {
    return null;
  }
  const file = requiredSourceFileIdentity(sourceProject, sourceFile);
  const code = codeNumbers.get(errorCodeKey(packageId, codeName.enumName, codeName.name)) ?? null;
  return {
    id: `framework-error-usage:${packageId}:${file.repoPath}:${node.getStart(sourceFile)}:${mechanism}`,
    packageId,
    packageName,
    mechanism,
    effect: usageEffect(node),
    enumName: codeName.enumName,
    codeName: codeName.name,
    code,
    codeLabel: codeLabel(code),
    filePath: file.repoPath,
    source: requiredSourceRangeForNode(sourceProject, node),
    summary: `${mechanism}(${codeName.enumName}.${codeName.name}) as ${usageEffect(node)}.`,
  };
}

function applyMessageAssignments(
  codes: Map<string, MutableErrorCode>,
  messages: readonly FrameworkErrorMessageAssignment[],
): void {
  for (const message of messages) {
    const existing = codes.get(errorCodeKey(message.packageId, message.enumName, message.name));
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
    id: errorCodeKey(row.packageId, row.enumName, row.name),
    codeLabel: codeLabelValue,
    usageCount: matchingUsages.length,
    thrownUsageCount: countWhere(matchingUsages, (usage) => usage.effect === "throw"),
    warningUsageCount: countWhere(matchingUsages, (usage) => usage.effect === "warning"),
    summary: `${row.packageName} ${row.enumName}.${row.name} (${codeLabelValue})${row.message == null ? "" : `: ${row.message}`}`,
  };
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

function errorCodeKey(
  packageId: string,
  enumName: FrameworkErrorEnumName,
  name: string,
): string {
  return `${packageId}:${enumName}:${name}`;
}

function compareCodeRows(left: FrameworkErrorCodeRow, right: FrameworkErrorCodeRow): number {
  return left.packageId.localeCompare(right.packageId) ||
    (left.code ?? Number.MAX_SAFE_INTEGER) - (right.code ?? Number.MAX_SAFE_INTEGER) ||
    left.name.localeCompare(right.name);
}

function compareUsageRows(left: FrameworkErrorUsageRow, right: FrameworkErrorUsageRow): number {
  return left.packageId.localeCompare(right.packageId) ||
    left.filePath.localeCompare(right.filePath) ||
    left.source.start.line - right.source.start.line ||
    left.source.start.character - right.source.start.character;
}
