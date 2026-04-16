import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import ts from 'typescript';

const ANSWER_ENVELOPE_KEYS = ['schemaVersion', 'query', 'slots', 'outcome'] as const;
const CARD_PROPERTY_KEYS = ['title', 'summaryLines', 'primaryRef', 'relatedRefs'] as const;
const REF_PROPERTY_KEYS = ['kind', 'value', 'label'] as const;

export interface SourceAnalysisCoordinationFunctionSurface {
  readonly name: string;
  readonly line: number;
}

export interface SourceAnalysisCoordinationInterfaceSurface {
  readonly name: string;
  readonly line: number;
  readonly propertyKeys: readonly string[];
}

export interface SourceAnalysisFileCoordinationSurface {
  readonly filePath: string;
  readonly envelopeBuilderFunctions: readonly SourceAnalysisCoordinationFunctionSurface[];
  readonly envelopeWrapperFunctions: readonly SourceAnalysisCoordinationFunctionSurface[];
  readonly cardLikeInterfaces: readonly SourceAnalysisCoordinationInterfaceSurface[];
  readonly refLikeInterfaces: readonly SourceAnalysisCoordinationInterfaceSurface[];
  readonly cardObjectLiteralLines: readonly number[];
  readonly summaryLineSites: readonly number[];
}

export interface SourceAnalysisPackageCoordinationSurface {
  readonly files: readonly SourceAnalysisFileCoordinationSurface[];
  readonly answerBuilderFiles: readonly SourceAnalysisFileCoordinationSurface[];
  readonly presentationCarrierFiles: readonly SourceAnalysisFileCoordinationSurface[];
}

interface NamedFunctionLike {
  readonly name: string;
  readonly line: number;
  readonly body: ts.ConciseBody;
}

export function createSourceAnalysisPackageCoordinationSurface(
  repoPath: string,
  packageFiles: readonly string[],
): SourceAnalysisPackageCoordinationSurface {
  const files = packageFiles
    .filter((filePath) => isAnalyzableTypeScriptFile(filePath))
    .map((filePath) => inspectFileCoordinationSurface(repoPath, filePath))
    .filter((surface): surface is SourceAnalysisFileCoordinationSurface => surface !== null);

  return {
    files,
    answerBuilderFiles: files.filter((file) => file.envelopeBuilderFunctions.length > 0),
    presentationCarrierFiles: files.filter((file) =>
      file.cardLikeInterfaces.length > 0
      && file.refLikeInterfaces.length > 0
      && file.cardObjectLiteralLines.length > 0,
    ),
  };
}

function inspectFileCoordinationSurface(
  repoPath: string,
  filePath: string,
): SourceAnalysisFileCoordinationSurface | null {
  const absolutePath = resolve(repoPath, filePath);
  if (!existsSync(absolutePath)) {
    return null;
  }

  const sourceText = readFileSync(absolutePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    absolutePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForFile(filePath),
  );

  const namedFunctions = collectNamedFunctions(sourceFile);
  const directBuilderNames = new Set<string>(
    namedFunctions
      .filter((fn) => functionBuildsAnswerEnvelope(fn))
      .map((fn) => fn.name),
  );
  const envelopeBuilderFunctions = namedFunctions
    .filter((fn) => directBuilderNames.has(fn.name))
    .map((fn) => ({ name: fn.name, line: fn.line }));
  const envelopeWrapperFunctions = namedFunctions
    .filter((fn) =>
      !directBuilderNames.has(fn.name)
      && functionWrapsLocalBuilder(fn, directBuilderNames),
    )
    .map((fn) => ({ name: fn.name, line: fn.line }));

  const cardLikeInterfaces: SourceAnalysisCoordinationInterfaceSurface[] = [];
  const refLikeInterfaces: SourceAnalysisCoordinationInterfaceSurface[] = [];
  const cardObjectLiteralLines: number[] = [];
  const summaryLineSites = new Set<number>();

  visitAllNodes(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      const propertyKeys = interfacePropertyKeys(node);
      if (hasAllKeys(propertyKeys, CARD_PROPERTY_KEYS)) {
        cardLikeInterfaces.push({
          name: node.name.text,
          line: lineNumber(sourceFile, node),
          propertyKeys,
        });
      }
      if (hasAllKeys(propertyKeys, REF_PROPERTY_KEYS)) {
        refLikeInterfaces.push({
          name: node.name.text,
          line: lineNumber(sourceFile, node),
          propertyKeys,
        });
      }
      return;
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'summaryLines') {
      summaryLineSites.add(lineNumber(sourceFile, node));
      return;
    }

    if (ts.isObjectLiteralExpression(node)) {
      const propertyKeys = objectLiteralPropertyKeys(node);
      if (propertyKeys.includes('summaryLines')) {
        summaryLineSites.add(lineNumber(sourceFile, node));
      }
      if (hasAllKeys(propertyKeys, CARD_PROPERTY_KEYS)) {
        cardObjectLiteralLines.push(lineNumber(sourceFile, node));
      }
    }
  });

  if (
    envelopeBuilderFunctions.length === 0
    && envelopeWrapperFunctions.length === 0
    && cardLikeInterfaces.length === 0
    && refLikeInterfaces.length === 0
    && cardObjectLiteralLines.length === 0
    && summaryLineSites.size === 0
  ) {
    return null;
  }

  return {
    filePath,
    envelopeBuilderFunctions,
    envelopeWrapperFunctions,
    cardLikeInterfaces,
    refLikeInterfaces,
    cardObjectLiteralLines: [...cardObjectLiteralLines].sort((left, right) => left - right),
    summaryLineSites: [...summaryLineSites].sort((left, right) => left - right),
  };
}

function collectNamedFunctions(sourceFile: ts.SourceFile): readonly NamedFunctionLike[] {
  const functions: NamedFunctionLike[] = [];

  walkNodeSkippingNestedFunctions(sourceFile, sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      functions.push({
        name: node.name.text,
        line: lineNumber(sourceFile, node),
        body: node.body,
      });
      return;
    }

    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) {
      return;
    }

    if (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) {
      functions.push({
        name: node.name.text,
        line: lineNumber(sourceFile, node),
        body: node.initializer.body,
      });
    }
  });

  return functions;
}

function functionBuildsAnswerEnvelope(fn: NamedFunctionLike): boolean {
  return collectFunctionReturnExpressions(fn.body).some((expression) =>
    ts.isObjectLiteralExpression(expression) && looksLikeAnswerEnvelope(expression),
  );
}

function functionWrapsLocalBuilder(
  fn: NamedFunctionLike,
  builderNames: ReadonlySet<string>,
): boolean {
  if (builderNames.size === 0) {
    return false;
  }

  return collectFunctionReturnExpressions(fn.body).some((expression) => {
    if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) {
      return false;
    }

    return builderNames.has(expression.expression.text);
  });
}

function collectFunctionReturnExpressions(body: ts.ConciseBody): readonly ts.Expression[] {
  const expressions: ts.Expression[] = [];

  if (!ts.isBlock(body)) {
    expressions.push(body);
    return expressions;
  }

  const visit = (node: ts.Node): void => {
    if (node !== body && ts.isFunctionLike(node)) {
      return;
    }

    if (ts.isReturnStatement(node) && node.expression) {
      expressions.push(node.expression);
      return;
    }

    node.forEachChild(visit);
  };

  body.forEachChild(visit);
  return expressions;
}

function looksLikeAnswerEnvelope(node: ts.ObjectLiteralExpression): boolean {
  const propertyKeys = objectLiteralPropertyKeys(node);
  if (!hasAllKeys(propertyKeys, ANSWER_ENVELOPE_KEYS)) {
    return false;
  }

  const slotsInitializer = getObjectPropertyInitializer(node, 'slots');
  if (!slotsInitializer || !ts.isObjectLiteralExpression(slotsInitializer)) {
    return false;
  }

  const slotKeys = objectLiteralPropertyKeys(slotsInitializer);
  return slotKeys.includes('outcome') && slotKeys.includes('focus_ref');
}

function getObjectPropertyInitializer(
  node: ts.ObjectLiteralExpression,
  propertyKey: string,
): ts.Expression | undefined {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    const name = propertyNameText(property.name);
    if (name === propertyKey) {
      return property.initializer;
    }
  }

  return undefined;
}

function interfacePropertyKeys(node: ts.InterfaceDeclaration): readonly string[] {
  const keys = node.members
    .flatMap((member) => {
      if (!ts.isPropertySignature(member) || !member.name) {
        return [];
      }

      const name = propertyNameText(member.name);
      return name ? [name] : [];
    });
  return uniqueSorted(keys);
}

function objectLiteralPropertyKeys(node: ts.ObjectLiteralExpression): readonly string[] {
  const keys = node.properties.flatMap((property) => {
    if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
      const name = propertyNameText(property.name);
      return name ? [name] : [];
    }

    return [];
  });
  return uniqueSorted(keys);
}

function propertyNameText(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return undefined;
}

function visitAllNodes(
  node: ts.Node,
  visitor: (node: ts.Node) => void,
): void {
  visitor(node);
  node.forEachChild((child) => {
    visitAllNodes(child, visitor);
  });
}

function walkNodeSkippingNestedFunctions(
  root: ts.Node,
  node: ts.Node,
  visitor: (node: ts.Node) => void,
): void {
  visitor(node);
  node.forEachChild((child) => {
    if (child !== root && ts.isFunctionLike(child)) {
      visitor(child);
      return;
    }
    walkNodeSkippingNestedFunctions(root, child, visitor);
  });
}

function hasAllKeys(
  propertyKeys: readonly string[],
  requiredKeys: readonly string[],
): boolean {
  return requiredKeys.every((key) => propertyKeys.includes(key));
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function isAnalyzableTypeScriptFile(filePath: string): boolean {
  return /\.(?:tsx?|mts|cts)$/i.test(filePath) && !/\.d\.ts$/i.test(filePath);
}

function scriptKindForFile(filePath: string): ts.ScriptKind {
  if (/\.tsx$/i.test(filePath)) return ts.ScriptKind.TSX;
  if (/\.jsx$/i.test(filePath)) return ts.ScriptKind.JSX;
  return ts.ScriptKind.TS;
}

function lineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
  return ts.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile)).line + 1;
}
