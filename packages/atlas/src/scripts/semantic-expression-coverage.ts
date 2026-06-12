import ts from "typescript";

import {
  createSourceProject,
  SourcePackageId,
  type SourceProject,
  type SourceSpan,
  sourceSpanForNode,
} from "../source/index.js";
import {
  assertKnownScriptArguments,
  printEmptyRows,
  scriptArgumentValue,
  scriptFilterSummary,
  scriptNumberArgumentValue,
} from "./script-output.js";

type ExpressionCoverageProjection = "summary" | "rows" | "collection-methods";

interface ExpressionKindCoverageRow {
  readonly kind: string;
  readonly className: string;
  readonly constructorCallCount: number;
  readonly switchCaseCount: number;
  readonly overlaySupportKind: string | null;
  readonly overlayOwner: string | null;
  readonly sourceValueSupportKind: string | null;
  readonly sourceValueOwner: string | null;
  readonly overlayProjectorCaseCount: number;
  readonly typeEvaluatorCaseCount: number;
  readonly sourceValueEvaluatorCaseCount: number;
  readonly observedDependencyCaseCount: number;
  readonly memberOwnerCaseCount: number;
  readonly source: SourceSpan;
  readonly filePath: string;
  readonly flags: readonly string[];
  readonly normalization: ExpressionKindNormalization | null;
  readonly summary: string;
}

interface ExpressionKindNormalization {
  readonly replacementKind: string;
  readonly reason: string;
}

interface CollectionMethodCoverageRow {
  readonly methodName: string;
  readonly astEvaluateAutoObserved: boolean;
  readonly nativeCallbackShape: string | null;
  readonly typeProjectionKind: string | null;
  readonly callbackBodyDrivesTypeProjection: boolean;
  readonly sourceValueReduced: boolean;
  readonly sourceValueOpenPolicy: CollectionMethodSourceValueOpenPolicy | null;
  readonly staticHostPrototypeBoundary: boolean;
  readonly proxyArrayObserved: boolean;
  readonly proxyArrayIntercepted: boolean;
  readonly proxyArrayWrappedResult: boolean;
  readonly flags: readonly string[];
  readonly summary: string;
}

const expressionKindNormalizations = new Map<string, ExpressionKindNormalization>([
  [
    "DestructuringAssignment",
    {
      replacementKind: "BindingPattern",
      reason:
        "semantic-runtime models repeat destructuring declarations as BindingPattern products instead of the framework parser's DestructuringAssignment leaf tree.",
    },
  ],
]);

const intentionalSourceValueRuntimeOpenOwners = new Set<string>([
  "AssignmentRuntime",
]);

const modernArrayMethodNames = new Set([
  "findLast",
  "findLastIndex",
  "toReversed",
  "toSorted",
  "toSpliced",
  "with",
]);

const sourceValueMutatingArrayMethodNames = new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift",
]);

const knownProjections = new Set<ExpressionCoverageProjection>([
  "summary",
  "rows",
  "collection-methods",
]);
const detail = process.argv.includes("--detail");
const json = process.argv.includes("--json");
const projection = expressionCoverageProjection(
  scriptArgumentValue("--projection=") ?? "summary",
);
const query = scriptArgumentValue("--query=")?.toLowerCase();
const kindFilter = scriptArgumentValue("--kind=");
const flagFilter = scriptArgumentValue("--flag=");
const rowLimit = scriptNumberArgumentValue("--rows=") ??
  scriptNumberArgumentValue("--limit=") ??
  (detail ? 80 : 24);

assertKnownScriptArguments("semantic.expression-coverage", [
  "--detail",
  "--json",
  "--projection=",
  "--rows=",
  "--limit=",
  "--query=",
  "--kind=",
  "--flag=",
]);

const sourceProject = createSourceProject();
try {
  if (projection === "collection-methods") {
    const rows = collectionMethodCoverageRows(sourceProject);
    const filtered = rows.filter((row) =>
      (kindFilter === undefined || row.methodName === kindFilter) &&
      (flagFilter === undefined || row.flags.includes(flagFilter)) &&
      (query === undefined || collectionMethodRowMatchesQuery(row, query))
    );

    if (json) {
      console.log(JSON.stringify({
        projection,
        filters: activeFilters(),
        rollup: collectionMethodRollup(rows),
        rows: filtered,
      }, null, 2));
      process.exit(0);
    }

    console.log("semantic.expression-coverage");
    console.log(`projection: ${projection}; mode=${detail ? "detail" : "compact"}`);
    const filterSummary = scriptFilterSummary(activeFilters());
    if (filterSummary !== undefined) {
      console.log(`filters: ${filterSummary}`);
    }
    printCollectionMethodRollup(rows);
    printCollectionMethodRows(filtered, rowLimit);
    process.exit(0);
  }

  const rows = expressionKindCoverageRows(sourceProject);
  const filtered = rows.filter((row) =>
    (kindFilter === undefined || row.kind === kindFilter || row.className === kindFilter) &&
    (flagFilter === undefined || row.flags.includes(flagFilter)) &&
    (query === undefined || rowMatchesQuery(row, query))
  );

  if (json) {
    console.log(JSON.stringify({
      projection,
      filters: activeFilters(),
      rollup: rollup(rows),
      rows: filtered,
    }, null, 2));
    process.exit(0);
  }

  console.log("semantic.expression-coverage");
  console.log(`projection: ${projection}; mode=${detail ? "detail" : "compact"}`);
  const filterSummary = scriptFilterSummary(activeFilters());
  if (filterSummary !== undefined) {
    console.log(`filters: ${filterSummary}`);
  }
  printRollup(rows);
  printRows(filtered, rowLimit);
} finally {
  sourceProject.dispose();
}

function expressionCoverageProjection(value: string): ExpressionCoverageProjection {
  if (knownProjections.has(value as ExpressionCoverageProjection)) {
    return value as ExpressionCoverageProjection;
  }
  throw new Error(`Unknown semantic expression coverage projection: ${value}`);
}

function expressionKindCoverageRows(
  sourceProject: SourceProject,
): readonly ExpressionKindCoverageRow[] {
  const astSourceFile = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/expression/ast.ts",
  );
  const supportSource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/template/template-type-system-overlay-expression-support.ts",
  );
  const sourceValueSupportSource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/observation/binding-source-value-expression-support.ts",
  );
  const projectorSource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/template/template-type-system-overlay-expression.ts",
  );
  const evaluatorSource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/type-system/expression-type-evaluator.ts",
  );
  const sourceValueSource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/observation/binding-source-value-evaluator.ts",
  );
  const connectableSource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/observation/connectable-observed-dependency.ts",
  );
  const trackableSource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/observation/trackable-method-observed-dependency.ts",
  );
  const memberOwnerSource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/type-system/expression-member-owner-projector.ts",
  );

  const declarations = expressionKindDeclarations(sourceProject, astSourceFile);
  const constructorCounts = constructorCallCounts(sourceProject);
  const allSwitchCaseCounts = switchCaseCounts(
    sourceProject.ownedImplementationSourceFilesForPackage(SourcePackageId.SemanticRuntime),
  );
  const overlaySupport = expressionSupportRows(supportSource);
  const sourceValueSupport = expressionSupportRows(sourceValueSupportSource);
  const overlayProjectorCases = switchCaseCounts([projectorSource]);
  const evaluatorCases = switchCaseCounts([evaluatorSource]);
  const sourceValueCases = switchCaseCounts([sourceValueSource]);
  const observedDependencyCases = mergeCountMaps([
    switchCaseCounts([connectableSource]),
    switchCaseCounts([trackableSource]),
  ]);
  const memberOwnerCases = switchCaseCounts([memberOwnerSource]);

  return declarations.map((declaration) => {
    const support = overlaySupport.get(declaration.kind) ?? null;
    const sourceSupport = sourceValueSupport.get(declaration.kind) ?? null;
    const constructorCallCount = constructorCounts.get(declaration.className) ?? 0;
    const normalization = constructorCallCount === 0
      ? expressionKindNormalizations.get(declaration.kind) ?? null
      : null;
    const flags = rowFlags(
      declaration.kind,
      constructorCallCount,
      support,
      sourceSupport,
      allSwitchCaseCounts.get(declaration.kind) ?? 0,
      normalization,
    );
    return {
      kind: declaration.kind,
      className: declaration.className,
      constructorCallCount,
      switchCaseCount: allSwitchCaseCounts.get(declaration.kind) ?? 0,
      overlaySupportKind: support?.supportKind ?? null,
      overlayOwner: support?.owner ?? null,
      sourceValueSupportKind: sourceSupport?.supportKind ?? null,
      sourceValueOwner: sourceSupport?.owner ?? null,
      overlayProjectorCaseCount: overlayProjectorCases.get(declaration.kind) ?? 0,
      typeEvaluatorCaseCount: evaluatorCases.get(declaration.kind) ?? 0,
      sourceValueEvaluatorCaseCount: sourceValueCases.get(declaration.kind) ?? 0,
      observedDependencyCaseCount: observedDependencyCases.get(declaration.kind) ?? 0,
      memberOwnerCaseCount: memberOwnerCases.get(declaration.kind) ?? 0,
      source: declaration.source,
      filePath: declaration.filePath,
      flags,
      normalization,
      summary: expressionKindSummary(
        declaration.kind,
        declaration.className,
        constructorCallCount,
        support,
        sourceSupport,
        flags,
        normalization,
      ),
    } satisfies ExpressionKindCoverageRow;
  }).sort((left, right) =>
    left.kind.localeCompare(right.kind),
  );
}

function collectionMethodCoverageRows(
  sourceProject: SourceProject,
): readonly CollectionMethodCoverageRow[] {
  const semanticsSource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/expression/array-method-semantics.ts",
  );
  const sourceValueSource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/observation/binding-source-array-method-value.ts",
  );
  const proxySource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/observation/runtime-collection-method-semantics.ts",
  );
  const propertyAccessSource = requiredSourceFile(
    sourceProject,
    "packages/semantic-runtime/src/evaluation/property-access.ts",
  );

  const astEvaluateAutoObserved = stringSetVariable(
    semanticsSource,
    "aureliaAstEvaluateAutoObservedArrayMethods",
  );
  const callbackShapes = stringMapVariable(
    semanticsSource,
    "aureliaNativeArrayCallbackParameterShapeByMethod",
  );
  const typeProjectionKinds = stringMapVariable(
    semanticsSource,
    "aureliaArrayMethodTypeProjectionKindByMethod",
  );
  const descriptorMethods = new Set<string>([
    ...astEvaluateAutoObserved,
    ...callbackShapes.keys(),
    ...typeProjectionKinds.keys(),
  ]);
  const staticHostPrototypeBoundary = staticHostArrayPrototypeBoundaryMethods(
    propertyAccessSource,
    descriptorMethods,
  );
  const sourceValueCases = switchStringCaseModesInClassMethod(
    sourceValueSource,
    "RuntimeBindingSourceArrayMethodEvaluator",
    "evaluateMemberCall",
    "expression.name.name",
  );
  const proxyArrayObserved = stringSetVariable(
    proxySource,
    "runtimeProxyObservedArrayMethods",
  );
  const proxyArrayVariableSets = new Map<string, ReadonlySet<string>>([
    ["runtimeProxyObservedArrayMethods", proxyArrayObserved],
  ]);
  const proxyArrayIntercepted = proxyPolicyArrayMethods(
    proxySource,
    "interceptedMethods",
    proxyArrayVariableSets,
  );
  const proxyArrayWrappedResult = proxyPolicyArrayMethods(
    proxySource,
    "wrappedResultMethods",
    proxyArrayVariableSets,
  );

  const methodNames = uniqueSorted([
    ...astEvaluateAutoObserved,
    ...callbackShapes.keys(),
    ...typeProjectionKinds.keys(),
    ...staticHostPrototypeBoundary,
    ...sourceValueCases.keys(),
    ...proxyArrayObserved,
    ...proxyArrayIntercepted,
    ...proxyArrayWrappedResult,
  ]);

  return methodNames.map((methodName) => {
    const rowWithoutFlags = {
      methodName,
      astEvaluateAutoObserved: astEvaluateAutoObserved.has(methodName),
      nativeCallbackShape: callbackShapes.get(methodName) ?? null,
      typeProjectionKind: typeProjectionKinds.get(methodName) ?? null,
      callbackBodyDrivesTypeProjection: collectionMethodCallbackBodyDrivesTypeProjection(typeProjectionKinds.get(methodName) ?? null),
      sourceValueReduced: sourceValueCases.get(methodName) === "reduced",
      sourceValueOpenPolicy: null,
      staticHostPrototypeBoundary: staticHostPrototypeBoundary.has(methodName),
      proxyArrayObserved: proxyArrayObserved.has(methodName),
      proxyArrayIntercepted: proxyArrayIntercepted.has(methodName),
      proxyArrayWrappedResult: proxyArrayWrappedResult.has(methodName),
    };
    const rowWithOpenPolicy = {
      ...rowWithoutFlags,
      sourceValueOpenPolicy: collectionMethodSourceValueOpenPolicy(rowWithoutFlags),
    };
    const flags = collectionMethodFlags(rowWithOpenPolicy);
    return {
      ...rowWithOpenPolicy,
      flags,
      summary: collectionMethodSummary({ ...rowWithOpenPolicy, flags }),
    } satisfies CollectionMethodCoverageRow;
  }).sort((left, right) => left.methodName.localeCompare(right.methodName));
}

interface ExpressionKindDeclaration {
  readonly kind: string;
  readonly className: string;
  readonly filePath: string;
  readonly source: SourceSpan;
}

interface ExpressionSupportRow {
  readonly supportKind: string;
  readonly owner: string;
}

function expressionKindDeclarations(
  sourceProject: SourceProject,
  sourceFile: ts.SourceFile,
): readonly ExpressionKindDeclaration[] {
  const rows: ExpressionKindDeclaration[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      const kind = classExpressionKind(sourceFile, node);
      if (kind !== null) {
        rows.push({
          kind,
          className: node.name.text,
          filePath: sourceProject.requiredSourceFileIdentity(sourceFile).repoPath,
          source: sourceSpanForNode(sourceFile, node.name),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

function classExpressionKind(
  sourceFile: ts.SourceFile,
  node: ts.ClassDeclaration,
): string | null {
  for (const member of node.members) {
    if (
      ts.isPropertyDeclaration(member) &&
      propertyNameText(sourceFile, member.name) === "$kind" &&
      member.initializer !== undefined
    ) {
      return stringLiteralExpressionText(member.initializer);
    }
  }
  return null;
}

function constructorCallCounts(
  sourceProject: SourceProject,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const sourceFile of sourceProject.ownedImplementationSourceFilesForPackage(SourcePackageId.SemanticRuntime)) {
    const visit = (node: ts.Node): void => {
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
        increment(counts, node.expression.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return counts;
}

function switchCaseCounts(
  sourceFiles: readonly ts.SourceFile[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const sourceFile of sourceFiles) {
    const visit = (node: ts.Node): void => {
      if (
        ts.isCaseClause(node) &&
        ts.isStringLiteralLike(node.expression)
      ) {
        increment(counts, node.expression.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return counts;
}

function expressionSupportRows(
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, ExpressionSupportRow> {
  const rows = new Map<string, ExpressionSupportRow>();
  const visit = (node: ts.Node): void => {
    if (!ts.isObjectLiteralExpression(node)) {
      ts.forEachChild(node, visit);
      return;
    }
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) {
        continue;
      }
      const kind = propertyNameText(sourceFile, property.name);
      if (kind === null || !ts.isObjectLiteralExpression(property.initializer)) {
        continue;
      }
      const supportKind = enumMemberPropertyText(
        sourceFile,
        property.initializer,
        "supportKind",
      );
      const owner = enumMemberPropertyText(
        sourceFile,
        property.initializer,
        "owner",
      );
      if (supportKind !== null || owner !== null) {
        rows.set(kind, {
          supportKind: supportKind ?? "<unknown>",
          owner: owner ?? "<unknown>",
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return rows;
}

function enumMemberPropertyText(
  sourceFile: ts.SourceFile,
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): string | null {
  for (const property of objectLiteral.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      propertyNameText(sourceFile, property.name) === propertyName
    ) {
      return enumMemberNameText(property.initializer);
    }
  }
  return null;
}

function enumMemberNameText(node: ts.Expression): string | null {
  const unwrapped = unwrapTransparentExpression(node);
  if (unwrapped !== node) {
    return enumMemberNameText(unwrapped);
  }
  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }
  return null;
}

function stringLiteralExpressionText(node: ts.Expression): string | null {
  const unwrapped = unwrapTransparentExpression(node);
  return ts.isStringLiteralLike(unwrapped) ? unwrapped.text : null;
}

function unwrapTransparentExpression(node: ts.Expression): ts.Expression {
  let current = node;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function rowFlags(
  kind: string,
  constructorCallCount: number,
  overlaySupport: ExpressionSupportRow | null,
  sourceValueSupport: ExpressionSupportRow | null,
  switchCaseCount: number,
  normalization: ExpressionKindNormalization | null,
): readonly string[] {
  const flags: string[] = [];
  if (constructorCallCount === 0) {
    flags.push("unconstructed");
    if (normalization !== null) {
      flags.push("normalized-unconstructed");
    }
  }
  if (overlaySupport === null) {
    flags.push("missing-overlay-support");
  } else if (overlaySupport.supportKind === "StatementLoweringNeeded") {
    flags.push(normalization === null ? "statement-overlay-frontier" : "dormant-statement-overlay-frontier");
  } else if (overlaySupport.supportKind === "OpaqueOwnerHandled") {
    flags.push("opaque-owner-handled");
  } else if (overlaySupport.supportKind === "OwnerHandled") {
    flags.push("owner-handled");
  }
  if (sourceValueSupport === null) {
    flags.push("missing-source-value-support");
  } else if (sourceValueSupport.supportKind === "StatementValueNeeded") {
    flags.push(normalization === null ? "source-value-statement-frontier" : "dormant-source-value-statement-frontier");
  } else if (sourceValueSupport.supportKind === "RuntimeOpen") {
    flags.push(intentionalSourceValueRuntimeOpenOwners.has(sourceValueSupport.owner)
      ? "source-value-intentional-runtime-open"
      : "source-value-runtime-open");
  } else if (sourceValueSupport.supportKind === "OpaqueOwnerHandled") {
    flags.push("source-value-opaque-owner-handled");
  } else if (sourceValueSupport.supportKind === "OwnerHandled") {
    flags.push("source-value-owner-handled");
  }
  if (switchCaseCount === 0) {
    flags.push("no-switch-consumer");
  }
  if (kind.endsWith("Pattern") || kind === "BindingIdentifier" || kind === "ForOfStatement" || kind === "Interpolation") {
    flags.push("owner-surface");
  }
  return flags;
}

function expressionKindSummary(
  kind: string,
  className: string,
  constructorCallCount: number,
  overlaySupport: ExpressionSupportRow | null,
  sourceValueSupport: ExpressionSupportRow | null,
  flags: readonly string[],
  normalization: ExpressionKindNormalization | null,
): string {
  const overlayText = overlaySupport === null
    ? "has no overlay support row"
    : `overlay=${overlaySupport.supportKind}/${overlaySupport.owner}`;
  const sourceValueText = sourceValueSupport === null
    ? "has no source-value support row"
    : `sourceValue=${sourceValueSupport.supportKind}/${sourceValueSupport.owner}`;
  const flagText = flags.length === 0 ? "closed" : flags.join(",");
  const normalizationText = normalization === null
    ? ""
    : ` normalizedTo=${normalization.replacementKind}.`;
  return `${kind} (${className}) has ${constructorCallCount} constructor call(s), ${overlayText}, ${sourceValueText}, flags=${flagText}.${normalizationText}`;
}

function requiredSourceFile(
  sourceProject: SourceProject,
  filePath: string,
): ts.SourceFile {
  const sourceFile = sourceProject.readSourceFile(filePath);
  if (sourceFile === null) {
    throw new Error(`Source file is not admitted: ${filePath}`);
  }
  return sourceFile;
}

function propertyNameText(
  sourceFile: ts.SourceFile,
  name: ts.PropertyName | ts.BindingName,
): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return ts.isComputedPropertyName(name) ? name.expression.getText(sourceFile) : null;
}

function mergeCountMaps(
  maps: readonly ReadonlyMap<string, number>[],
): ReadonlyMap<string, number> {
  const merged = new Map<string, number>();
  for (const map of maps) {
    for (const [key, value] of map) {
      merged.set(key, (merged.get(key) ?? 0) + value);
    }
  }
  return merged;
}

function increment(
  map: Map<string, number>,
  key: string,
): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function stringSetVariable(
  sourceFile: ts.SourceFile,
  variableName: string,
): ReadonlySet<string> {
  const values = new Set<string>();
  const declaration = variableDeclaration(sourceFile, variableName);
  const initializer = declaration?.initializer;
  if (initializer === undefined || !ts.isNewExpression(initializer) || initializer.arguments?.[0] === undefined) {
    return values;
  }
  collectStringLiterals(initializer.arguments[0], values, new Map(), stringVariableValues(sourceFile));
  return values;
}

function staticHostArrayPrototypeBoundaryMethods(
  sourceFile: ts.SourceFile,
  descriptorMethods: ReadonlySet<string>,
): ReadonlySet<string> {
  const functionNode = functionDeclaration(sourceFile, "isKnownArrayPrototypeFunction");
  if (functionNode === null) {
    return new Set();
  }
  const functionText = functionNode.getText(sourceFile);
  if (functionText.includes("aureliaArrayMethodSemanticsFor")) {
    return descriptorMethods;
  }
  return switchStringCasesInFunction(sourceFile, functionNode, "name");
}

function stringMapVariable(
  sourceFile: ts.SourceFile,
  variableName: string,
): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  const declaration = variableDeclaration(sourceFile, variableName);
  const initializer = declaration?.initializer;
  const entries = initializer !== undefined && ts.isNewExpression(initializer)
    ? initializer.arguments?.[0]
    : undefined;
  if (entries === undefined || !ts.isArrayLiteralExpression(entries)) {
    return values;
  }
  for (const entry of entries.elements) {
    if (!ts.isArrayLiteralExpression(entry) || entry.elements.length < 2) {
      continue;
    }
    const key = stringLiteralExpressionText(entry.elements[0] as ts.Expression);
    const value = enumMemberNameText(entry.elements[1] as ts.Expression)
      ?? stringLiteralExpressionText(entry.elements[1] as ts.Expression);
    if (key !== null && value !== null) {
      values.set(key, value);
    }
  }
  return values;
}

function functionDeclaration(
  sourceFile: ts.SourceFile,
  functionName: string,
): ts.FunctionDeclaration | null {
  let result: ts.FunctionDeclaration | null = null;
  const visit = (node: ts.Node): void => {
    if (result !== null) {
      return;
    }
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) {
      result = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}

function switchStringCasesInFunction(
  sourceFile: ts.SourceFile,
  functionNode: ts.FunctionDeclaration,
  switchExpressionText: string,
): ReadonlySet<string> {
  const values = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isSwitchStatement(node) && node.expression.getText(sourceFile) === switchExpressionText) {
      for (const clause of node.caseBlock.clauses) {
        if (ts.isCaseClause(clause) && ts.isStringLiteralLike(clause.expression)) {
          values.add(clause.expression.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(functionNode);
  return values;
}

function variableDeclaration(
  sourceFile: ts.SourceFile,
  variableName: string,
): ts.VariableDeclaration | null {
  let result: ts.VariableDeclaration | null = null;
  const visit = (node: ts.Node): void => {
    if (result !== null) {
      return;
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName) {
      result = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}

type SourceValueCaseMode = "reduced" | "open";
type CollectionMethodSourceValueOpenPolicy = "mutating-receiver" | "unmodeled-callback" | "unmodeled-host-array";

function switchStringCaseModesInClassMethod(
  sourceFile: ts.SourceFile,
  className: string,
  methodName: string,
  switchExpressionText: string,
): ReadonlyMap<string, SourceValueCaseMode> {
  const values = new Map<string, SourceValueCaseMode>();
  const visit = (node: ts.Node): void => {
    if (!ts.isClassDeclaration(node) || node.name?.text !== className) {
      ts.forEachChild(node, visit);
      return;
    }
    for (const member of node.members) {
      if (!ts.isMethodDeclaration(member) || propertyNameText(sourceFile, member.name) !== methodName) {
        continue;
      }
      const switchExpressionTexts = switchExpressionAliasesInMethod(sourceFile, member, switchExpressionText);
      const visitMethod = (child: ts.Node): void => {
        if (ts.isSwitchStatement(child) && switchExpressionTexts.has(child.expression.getText(sourceFile))) {
          let pendingFallthroughNames: string[] = [];
          for (const clause of child.caseBlock.clauses) {
            if (!ts.isCaseClause(clause) || !ts.isStringLiteralLike(clause.expression)) {
              pendingFallthroughNames = [];
              continue;
            }
            const names = [...pendingFallthroughNames, clause.expression.text];
            if (clause.statements.length === 0) {
              pendingFallthroughNames = names;
              continue;
            }
            const mode = sourceValueCaseMode(clause.statements);
            for (const name of names) {
              values.set(name, mode);
            }
            pendingFallthroughNames = [];
          }
        }
        ts.forEachChild(child, visitMethod);
      };
      visitMethod(member);
    }
  };
  visit(sourceFile);
  return values;
}

function switchExpressionAliasesInMethod(
  sourceFile: ts.SourceFile,
  method: ts.MethodDeclaration,
  switchExpressionText: string,
): ReadonlySet<string> {
  const expressions = new Set<string>([switchExpressionText]);
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer?.getText(sourceFile) === switchExpressionText
    ) {
      expressions.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(method);
  return expressions;
}

function sourceValueCaseMode(
  statements: ts.NodeArray<ts.Statement>,
): SourceValueCaseMode {
  const first = statements[0];
  return statements.length === 1
    && first !== undefined
    && ts.isReturnStatement(first)
    && first.expression !== undefined
    && isCallExpressionNamed(first.expression, "openBindingSourceNeedsRuntimeValue")
    ? "open"
    : "reduced";
}

function isCallExpressionNamed(
  expression: ts.Expression,
  functionName: string,
): boolean {
  const unwrapped = unwrapTransparentExpression(expression);
  return ts.isCallExpression(unwrapped)
    && ts.isIdentifier(unwrapped.expression)
    && unwrapped.expression.text === functionName;
}

function proxyPolicyArrayMethods(
  sourceFile: ts.SourceFile,
  propertyName: string,
  variableSets: ReadonlyMap<string, ReadonlySet<string>>,
): ReadonlySet<string> {
  const values = new Set<string>();
  const policy = variableDeclaration(sourceFile, "runtimeProxyCollectionMethodPolicies");
  const initializer = policy?.initializer;
  if (initializer === undefined || !ts.isObjectLiteralExpression(initializer)) {
    return values;
  }
  const arrayPolicy = initializer.properties.find((property): property is ts.PropertyAssignment =>
    ts.isPropertyAssignment(property)
    && propertyNameText(sourceFile, property.name) === "RuntimeProxyCollectionReceiverKind.Array"
    && ts.isObjectLiteralExpression(property.initializer)
  );
  if (arrayPolicy === undefined || !ts.isObjectLiteralExpression(arrayPolicy.initializer)) {
    return values;
  }
  const methodSet = arrayPolicy.initializer.properties.find((property): property is ts.PropertyAssignment =>
    ts.isPropertyAssignment(property)
    && propertyNameText(sourceFile, property.name) === propertyName
  );
  const setExpression = methodSet?.initializer;
  if (setExpression === undefined) {
    return values;
  }
  collectStringLiterals(setExpression, values, variableSets, stringVariableValues(sourceFile));
  return values;
}

function collectStringLiterals(
  node: ts.Node,
  values: Set<string>,
  variableSets: ReadonlyMap<string, ReadonlySet<string>>,
  variableValues: ReadonlyMap<string, string> = new Map(),
): void {
  if (ts.isStringLiteralLike(node)) {
    values.add(node.text);
    return;
  }
  if (ts.isIdentifier(node)) {
    for (const value of variableSets.get(node.text) ?? []) {
      values.add(value);
    }
    const variableValue = variableValues.get(node.text);
    if (variableValue !== undefined) {
      values.add(variableValue);
    }
    return;
  }
  if (ts.isSpreadElement(node)) {
    collectStringLiterals(node.expression, values, variableSets, variableValues);
    return;
  }
  ts.forEachChild(node, (child) => collectStringLiterals(child, values, variableSets, variableValues));
}

function stringVariableValues(sourceFile: ts.SourceFile): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      const value = stringLiteralExpressionText(node.initializer);
      if (value !== null) {
        values.set(node.name.text, value);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return values;
}

type CollectionMethodCoverageWithoutFlags = Omit<CollectionMethodCoverageRow, "flags" | "summary">;

function collectionMethodFlags(
  row: CollectionMethodCoverageWithoutFlags,
): readonly string[] {
  const flags: string[] = [];
  if (row.typeProjectionKind !== null && !row.sourceValueReduced) {
    flags.push("type-visible-source-value-open");
  }
  if (row.sourceValueReduced && row.typeProjectionKind === null) {
    flags.push("source-value-without-type-projection");
  }
  if ((row.astEvaluateAutoObserved || row.nativeCallbackShape !== null || row.typeProjectionKind !== null) && !row.staticHostPrototypeBoundary) {
    flags.push("descriptor-without-static-host-boundary");
  }
  if (
    row.staticHostPrototypeBoundary
    && !row.astEvaluateAutoObserved
    && row.nativeCallbackShape === null
    && row.typeProjectionKind === null
  ) {
    flags.push("static-host-boundary-only");
  }
  if (row.nativeCallbackShape !== null && !row.sourceValueReduced) {
    flags.push("callback-source-value-open");
  }
  if (row.nativeCallbackShape !== null && row.typeProjectionKind !== null && !row.callbackBodyDrivesTypeProjection) {
    flags.push("callback-body-type-independent");
  }
  if (row.sourceValueOpenPolicy !== null) {
    flags.push(`source-value-${row.sourceValueOpenPolicy}-open`);
  }
  if (row.nativeCallbackShape !== null && !row.astEvaluateAutoObserved) {
    flags.push("native-callback-not-auto-observed");
  }
  if (row.typeProjectionKind !== null && !row.astEvaluateAutoObserved && !row.proxyArrayObserved && !row.proxyArrayIntercepted) {
    flags.push("type-visible-no-observation-policy");
  }
  if (modernArrayMethodNames.has(row.methodName) && !row.astEvaluateAutoObserved && !row.proxyArrayObserved && !row.proxyArrayIntercepted) {
    flags.push("modern-array-framework-observation-gap");
  }
  return flags;
}

function collectionMethodSourceValueOpenPolicy(
  row: CollectionMethodCoverageWithoutFlags,
): CollectionMethodSourceValueOpenPolicy | null {
  if (row.sourceValueReduced) {
    return null;
  }
  if (sourceValueMutatingArrayMethodNames.has(row.methodName)) {
    return "mutating-receiver";
  }
  if (row.nativeCallbackShape !== null) {
    return "unmodeled-callback";
  }
  return row.typeProjectionKind === null
    ? null
    : "unmodeled-host-array";
}

function collectionMethodCallbackBodyDrivesTypeProjection(typeProjectionKind: string | null): boolean {
  return typeProjectionKind === "CallbackReturnArray"
    || typeProjectionKind === "callback-return-array"
    || typeProjectionKind === "FlattenedCallbackReturnArray"
    || typeProjectionKind === "flattened-callback-return-array"
    || typeProjectionKind === "ReducerReturn"
    || typeProjectionKind === "reducer-return";
}

function collectionMethodSummary(
  row: CollectionMethodCoverageWithoutFlags & { readonly flags: readonly string[] },
): string {
  const lanes = [
    row.astEvaluateAutoObserved ? "astEvaluate-auto-observed" : null,
    row.proxyArrayObserved ? "proxy-observed" : null,
    row.proxyArrayIntercepted && !row.proxyArrayObserved ? "proxy-intercepted" : null,
    row.proxyArrayWrappedResult ? "proxy-wrapped-result" : null,
    row.nativeCallbackShape === null ? null : `callback=${row.nativeCallbackShape}`,
    row.typeProjectionKind === null ? null : `type=${row.typeProjectionKind}`,
    row.callbackBodyDrivesTypeProjection ? "callback-body-drives-type" : null,
    row.sourceValueReduced ? "source-value-reduced" : null,
    row.sourceValueOpenPolicy === null ? null : `source-value-open=${row.sourceValueOpenPolicy}`,
    row.staticHostPrototypeBoundary ? "static-host-boundary" : null,
  ].filter((lane): lane is string => lane !== null);
  const flagText = row.flags.length === 0 ? "closed" : row.flags.join(",");
  return `${row.methodName}: ${lanes.join("; ") || "no semantic-runtime collection lane"}; flags=${flagText}.`;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function rowMatchesQuery(
  row: ExpressionKindCoverageRow,
  loweredQuery: string,
): boolean {
  return [
    row.kind,
    row.className,
    row.overlaySupportKind ?? "",
    row.overlayOwner ?? "",
    row.sourceValueSupportKind ?? "",
    row.sourceValueOwner ?? "",
    row.summary,
    row.normalization?.replacementKind ?? "",
    row.normalization?.reason ?? "",
    ...row.flags,
  ].some((value) => value.toLowerCase().includes(loweredQuery));
}

function collectionMethodRowMatchesQuery(
  row: CollectionMethodCoverageRow,
  loweredQuery: string,
): boolean {
  return [
    row.methodName,
    row.nativeCallbackShape ?? "",
    row.typeProjectionKind ?? "",
    row.callbackBodyDrivesTypeProjection
      ? "callback-body-drives-type"
      : row.nativeCallbackShape !== null && row.typeProjectionKind !== null
        ? "callback-body-type-independent"
        : "",
    row.sourceValueOpenPolicy ?? "",
    row.summary,
    ...row.flags,
  ].some((value) => value.toLowerCase().includes(loweredQuery));
}

function activeFilters(): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries({
      projection,
      query,
      kind: kindFilter,
      flag: flagFilter,
    }).filter(([, value]) => value !== undefined),
  );
}

function collectionMethodRollup(
  rows: readonly CollectionMethodCoverageRow[],
): Readonly<Record<string, number>> {
  return {
    methods: rows.length,
    astEvaluateAutoObserved: rows.filter((row) => row.astEvaluateAutoObserved).length,
    proxyArrayObserved: rows.filter((row) => row.proxyArrayObserved).length,
    proxyArrayIntercepted: rows.filter((row) => row.proxyArrayIntercepted).length,
    proxyArrayWrappedResult: rows.filter((row) => row.proxyArrayWrappedResult).length,
    nativeCallback: rows.filter((row) => row.nativeCallbackShape !== null).length,
    typeProjection: rows.filter((row) => row.typeProjectionKind !== null).length,
    callbackBodyDrivesTypeProjection: rows.filter((row) => row.callbackBodyDrivesTypeProjection).length,
    callbackBodyTypeIndependent: rows.filter((row) =>
      row.nativeCallbackShape !== null && row.typeProjectionKind !== null && !row.callbackBodyDrivesTypeProjection
    ).length,
    sourceValueReduced: rows.filter((row) => row.sourceValueReduced).length,
    sourceValueMutatingReceiverOpen: rows.filter((row) => row.sourceValueOpenPolicy === "mutating-receiver").length,
    sourceValueUnmodeledCallbackOpen: rows.filter((row) => row.sourceValueOpenPolicy === "unmodeled-callback").length,
    sourceValueUnmodeledHostArrayOpen: rows.filter((row) => row.sourceValueOpenPolicy === "unmodeled-host-array").length,
    staticHostPrototypeBoundary: rows.filter((row) => row.staticHostPrototypeBoundary).length,
    typeVisibleSourceValueOpen: rows.filter((row) => row.flags.includes("type-visible-source-value-open")).length,
    descriptorWithoutStaticHostBoundary: rows.filter((row) => row.flags.includes("descriptor-without-static-host-boundary")).length,
    callbackSourceValueOpen: rows.filter((row) => row.flags.includes("callback-source-value-open")).length,
    nativeCallbackNotAutoObserved: rows.filter((row) => row.flags.includes("native-callback-not-auto-observed")).length,
    modernArrayFrameworkObservationGap: rows.filter((row) => row.flags.includes("modern-array-framework-observation-gap")).length,
  };
}

function rollup(
  rows: readonly ExpressionKindCoverageRow[],
): Readonly<Record<string, number>> {
  return {
    expressionKinds: rows.length,
    unconstructed: rows.filter((row) => row.flags.includes("unconstructed")).length,
    missingOverlaySupport: rows.filter((row) => row.flags.includes("missing-overlay-support")).length,
    missingSourceValueSupport: rows.filter((row) => row.flags.includes("missing-source-value-support")).length,
    statementOverlayFrontier: rows.filter((row) => row.flags.includes("statement-overlay-frontier")).length,
    dormantStatementOverlayFrontier: rows.filter((row) => row.flags.includes("dormant-statement-overlay-frontier")).length,
    sourceValueIntentionalRuntimeOpen: rows.filter((row) => row.flags.includes("source-value-intentional-runtime-open")).length,
    sourceValueRuntimeOpen: rows.filter((row) => row.flags.includes("source-value-runtime-open")).length,
    sourceValueStatementFrontier: rows.filter((row) => row.flags.includes("source-value-statement-frontier")).length,
    dormantSourceValueStatementFrontier: rows.filter((row) => row.flags.includes("dormant-source-value-statement-frontier")).length,
    sourceValueOwnerHandled: rows.filter((row) => row.flags.includes("source-value-owner-handled")).length,
    sourceValueOpaqueOwnerHandled: rows.filter((row) => row.flags.includes("source-value-opaque-owner-handled")).length,
    ownerHandled: rows.filter((row) => row.flags.includes("owner-handled")).length,
    opaqueOwnerHandled: rows.filter((row) => row.flags.includes("opaque-owner-handled")).length,
    normalizedUnconstructed: rows.filter((row) => row.flags.includes("normalized-unconstructed")).length,
  };
}

function printRollup(rows: readonly ExpressionKindCoverageRow[]): void {
  const counts = rollup(rows);
  console.log(`rollup: kinds=${counts.expressionKinds} unconstructed=${counts.unconstructed} normalizedUnconstructed=${counts.normalizedUnconstructed} missingOverlaySupport=${counts.missingOverlaySupport} missingSourceValueSupport=${counts.missingSourceValueSupport} statementFrontier=${counts.statementOverlayFrontier} dormantStatementFrontier=${counts.dormantStatementOverlayFrontier} sourceValueIntentionalRuntimeOpen=${counts.sourceValueIntentionalRuntimeOpen} sourceValueRuntimeOpen=${counts.sourceValueRuntimeOpen} sourceValueStatementFrontier=${counts.sourceValueStatementFrontier} dormantSourceValueStatementFrontier=${counts.dormantSourceValueStatementFrontier} ownerHandled=${counts.ownerHandled} sourceValueOwnerHandled=${counts.sourceValueOwnerHandled} opaqueOwnerHandled=${counts.opaqueOwnerHandled} sourceValueOpaqueOwnerHandled=${counts.sourceValueOpaqueOwnerHandled}`);
}

function printCollectionMethodRollup(rows: readonly CollectionMethodCoverageRow[]): void {
  const counts = collectionMethodRollup(rows);
  console.log(`rollup: methods=${counts.methods} astEvaluateAutoObserved=${counts.astEvaluateAutoObserved} proxyArrayObserved=${counts.proxyArrayObserved} proxyArrayIntercepted=${counts.proxyArrayIntercepted} proxyArrayWrappedResult=${counts.proxyArrayWrappedResult} nativeCallback=${counts.nativeCallback} typeProjection=${counts.typeProjection} callbackBodyDrivesTypeProjection=${counts.callbackBodyDrivesTypeProjection} callbackBodyTypeIndependent=${counts.callbackBodyTypeIndependent} sourceValueReduced=${counts.sourceValueReduced} sourceValueMutatingReceiverOpen=${counts.sourceValueMutatingReceiverOpen} sourceValueUnmodeledCallbackOpen=${counts.sourceValueUnmodeledCallbackOpen} sourceValueUnmodeledHostArrayOpen=${counts.sourceValueUnmodeledHostArrayOpen} staticHostPrototypeBoundary=${counts.staticHostPrototypeBoundary} typeVisibleSourceValueOpen=${counts.typeVisibleSourceValueOpen} descriptorWithoutStaticHostBoundary=${counts.descriptorWithoutStaticHostBoundary} callbackSourceValueOpen=${counts.callbackSourceValueOpen} nativeCallbackNotAutoObserved=${counts.nativeCallbackNotAutoObserved} modernArrayFrameworkObservationGap=${counts.modernArrayFrameworkObservationGap}`);
}

function printCollectionMethodRows(
  rows: readonly CollectionMethodCoverageRow[],
  rowsToShow: number,
): void {
  console.log("");
  console.log("collection method rows");
  printEmptyRows(rows, "no collection method rows matched");
  for (const row of rows.slice(0, rowsToShow)) {
    console.log(`- ${row.summary}`);
    if (detail) {
      console.log(`  lanes: astEvaluate=${row.astEvaluateAutoObserved}; proxyObserved=${row.proxyArrayObserved}; proxyIntercepted=${row.proxyArrayIntercepted}; proxyWrappedResult=${row.proxyArrayWrappedResult}; callback=${row.nativeCallbackShape ?? "none"}; type=${row.typeProjectionKind ?? "none"}; callbackBodyDrivesType=${row.callbackBodyDrivesTypeProjection}; sourceValue=${row.sourceValueReduced}; sourceValueOpenPolicy=${row.sourceValueOpenPolicy ?? "none"}; staticHostBoundary=${row.staticHostPrototypeBoundary}`);
    }
  }
  if (rows.length > rowsToShow) {
    console.log(`- omitted ${rows.length - rowsToShow} row(s); pass --rows=${rows.length} when the tail matters`);
  }
}

function printRows(
  rows: readonly ExpressionKindCoverageRow[],
  rowsToShow: number,
): void {
  console.log("");
  console.log("expression kind rows");
  printEmptyRows(rows, "no expression kind rows matched");
  for (const row of rows.slice(0, rowsToShow)) {
    console.log(`- ${row.summary} at ${row.filePath}:${row.source.startLine}`);
    if (detail) {
      console.log(`  switches=${row.switchCaseCount}; projector=${row.overlayProjectorCaseCount}; evaluator=${row.typeEvaluatorCaseCount}; sourceValueCases=${row.sourceValueEvaluatorCaseCount}; observedDependency=${row.observedDependencyCaseCount}; memberOwner=${row.memberOwnerCaseCount}`);
      if (row.normalization !== null) {
        console.log(`  normalization=${row.normalization.replacementKind}; reason=${row.normalization.reason}`);
      }
    }
  }
  if (rows.length > rowsToShow) {
    console.log(`- omitted ${rows.length - rowsToShow} row(s); pass --rows=${rows.length} when the tail matters`);
  }
}
