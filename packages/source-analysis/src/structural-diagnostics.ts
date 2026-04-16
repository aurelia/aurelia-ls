import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import ts from 'typescript';

const ANSWER_ENVELOPE_KEYS = ['schemaVersion', 'query', 'slots', 'outcome'] as const;
const ANSWER_DOCUMENT_KEYS = ['schemaVersion', 'blocks'] as const;
const CARD_PROPERTY_KEYS = ['title', 'summaryLines', 'primaryRef', 'relatedRefs'] as const;
const REF_PROPERTY_KEYS = ['kind', 'value', 'label'] as const;

export const SOURCE_ANALYSIS_STRUCTURAL_FUNCTION_ROLES = [
  'answer-envelope-builder',
  'answer-envelope-wrapper',
  'answer-document-builder',
  'policy-resolver',
  'precedence-helper',
  'summary-emitter',
] as const;

export const SOURCE_ANALYSIS_STRUCTURAL_INTERFACE_ROLES = [
  'card-like',
  'ref-like',
] as const;

export const SOURCE_ANALYSIS_STRUCTURAL_OBJECT_ROLES = [
  'card-like',
  'answer-document',
  'answer-document-block',
] as const;

export type SourceAnalysisStructuralFunctionRole =
  typeof SOURCE_ANALYSIS_STRUCTURAL_FUNCTION_ROLES[number];

export type SourceAnalysisStructuralInterfaceRole =
  typeof SOURCE_ANALYSIS_STRUCTURAL_INTERFACE_ROLES[number];

export type SourceAnalysisStructuralObjectRole =
  typeof SOURCE_ANALYSIS_STRUCTURAL_OBJECT_ROLES[number];

export interface SourceAnalysisStructuralFunctionFact {
  readonly name: string;
  readonly line: number;
  readonly roles: readonly SourceAnalysisStructuralFunctionRole[];
}

export interface SourceAnalysisStructuralInterfaceFact {
  readonly name: string;
  readonly line: number;
  readonly propertyKeys: readonly string[];
  readonly roles: readonly SourceAnalysisStructuralInterfaceRole[];
}

export interface SourceAnalysisStructuralObjectFact {
  readonly line: number;
  readonly propertyKeys: readonly string[];
  readonly roles: readonly SourceAnalysisStructuralObjectRole[];
}

export interface SourceAnalysisStructuralFileDiagnostics {
  readonly filePath: string;
  readonly functions: readonly SourceAnalysisStructuralFunctionFact[];
  readonly interfaces: readonly SourceAnalysisStructuralInterfaceFact[];
  readonly objectLiterals: readonly SourceAnalysisStructuralObjectFact[];
  readonly summaryLineSites: readonly number[];
}

export interface SourceAnalysisPackageStructuralDiagnostics {
  readonly files: readonly SourceAnalysisStructuralFileDiagnostics[];
}

interface NamedFunctionLike {
  readonly name: string;
  readonly line: number;
  readonly body: ts.ConciseBody;
}

export function createSourceAnalysisPackageStructuralDiagnostics(
  repoPath: string,
  packageFiles: readonly string[],
): SourceAnalysisPackageStructuralDiagnostics {
  const files = packageFiles
    .filter((filePath) => isAnalyzableTypeScriptFile(filePath))
    .map((filePath) => inspectStructuralFile(repoPath, filePath))
    .filter((surface): surface is SourceAnalysisStructuralFileDiagnostics => surface !== null);

  return { files };
}

export function getSourceAnalysisStructuralFilesByFunctionRole(
  diagnostics: SourceAnalysisPackageStructuralDiagnostics,
  role: SourceAnalysisStructuralFunctionRole,
): readonly SourceAnalysisStructuralFileDiagnostics[] {
  return diagnostics.files.filter((file) =>
    file.functions.some((fn) => fn.roles.includes(role)),
  );
}

export function getSourceAnalysisStructuralFilesByInterfaceRole(
  diagnostics: SourceAnalysisPackageStructuralDiagnostics,
  role: SourceAnalysisStructuralInterfaceRole,
): readonly SourceAnalysisStructuralFileDiagnostics[] {
  return diagnostics.files.filter((file) =>
    file.interfaces.some((item) => item.roles.includes(role)),
  );
}

export function getSourceAnalysisStructuralFilesByObjectRole(
  diagnostics: SourceAnalysisPackageStructuralDiagnostics,
  role: SourceAnalysisStructuralObjectRole,
): readonly SourceAnalysisStructuralFileDiagnostics[] {
  return diagnostics.files.filter((file) =>
    file.objectLiterals.some((item) => item.roles.includes(role)),
  );
}

function inspectStructuralFile(
  repoPath: string,
  filePath: string,
): SourceAnalysisStructuralFileDiagnostics | null {
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

  const functions = namedFunctions
    .map((fn) => ({
      name: fn.name,
      line: fn.line,
      roles: detectFunctionRoles(fn, directBuilderNames),
    }))
    .filter((fact) => fact.roles.length > 0);

  const interfaces: SourceAnalysisStructuralInterfaceFact[] = [];
  const objectLiterals: SourceAnalysisStructuralObjectFact[] = [];
  const summaryLineSites = new Set<number>();

  visitAllNodes(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      const propertyKeys = interfacePropertyKeys(node);
      const roles = detectInterfaceRoles(propertyKeys);
      if (roles.length > 0) {
        interfaces.push({
          name: node.name.text,
          line: lineNumber(sourceFile, node),
          propertyKeys,
          roles,
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
      const roles = detectObjectRoles(node, propertyKeys);
      if (propertyKeys.includes('summaryLines')) {
        summaryLineSites.add(lineNumber(sourceFile, node));
      }
      if (roles.length > 0) {
        objectLiterals.push({
          line: lineNumber(sourceFile, node),
          propertyKeys,
          roles,
        });
      }
    }
  });

  if (functions.length === 0 && interfaces.length === 0 && objectLiterals.length === 0 && summaryLineSites.size === 0) {
    return null;
  }

  return {
    filePath,
    functions,
    interfaces,
    objectLiterals,
    summaryLineSites: [...summaryLineSites].sort((left, right) => left - right),
  };
}

function detectFunctionRoles(
  fn: NamedFunctionLike,
  directBuilderNames: ReadonlySet<string>,
): readonly SourceAnalysisStructuralFunctionRole[] {
  const roles = new Set<SourceAnalysisStructuralFunctionRole>();

  if (functionBuildsAnswerEnvelope(fn)) {
    roles.add('answer-envelope-builder');
  }
  if (!roles.has('answer-envelope-builder') && functionWrapsLocalBuilder(fn, directBuilderNames)) {
    roles.add('answer-envelope-wrapper');
  }
  if (functionBuildsAnswerDocument(fn)) {
    roles.add('answer-document-builder');
  }
  if (functionUsesCallNamed(fn.body, 'resolveSourceAnalysisInquiryPolicy')) {
    roles.add('policy-resolver');
  }
  if (/^(compare|rank|score)/.test(fn.name)) {
    roles.add('precedence-helper');
  }
  if (/summary/i.test(fn.name) || functionMentionsSummaryLines(fn.body)) {
    roles.add('summary-emitter');
  }

  return [...roles];
}

function detectInterfaceRoles(
  propertyKeys: readonly string[],
): readonly SourceAnalysisStructuralInterfaceRole[] {
  const roles: SourceAnalysisStructuralInterfaceRole[] = [];
  if (hasAllKeys(propertyKeys, CARD_PROPERTY_KEYS)) {
    roles.push('card-like');
  }
  if (hasAllKeys(propertyKeys, REF_PROPERTY_KEYS)) {
    roles.push('ref-like');
  }
  return roles;
}

function detectObjectRoles(
  node: ts.ObjectLiteralExpression,
  propertyKeys: readonly string[],
): readonly SourceAnalysisStructuralObjectRole[] {
  const roles: SourceAnalysisStructuralObjectRole[] = [];
  if (hasAllKeys(propertyKeys, CARD_PROPERTY_KEYS)) {
    roles.push('card-like');
  }
  if (hasAllKeys(propertyKeys, ANSWER_DOCUMENT_KEYS)) {
    roles.push('answer-document');
  }
  if (propertyKeys.includes('kind') && (
    propertyKeys.includes('lines')
    || propertyKeys.includes('items')
    || propertyKeys.includes('findings')
    || propertyKeys.includes('witnesses')
    || propertyKeys.includes('refs')
    || propertyKeys.includes('facts')
  )) {
    roles.push('answer-document-block');
  }
  return roles;
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

function functionBuildsAnswerDocument(fn: NamedFunctionLike): boolean {
  return collectFunctionReturnExpressions(fn.body).some((expression) => {
    if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
      return expression.expression.text === 'createSourceAnalysisAnswerDocument';
    }
    return ts.isObjectLiteralExpression(expression) && looksLikeAnswerDocument(expression);
  });
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

function functionUsesCallNamed(body: ts.ConciseBody, calleeName: string): boolean {
  let found = false;
  visitBodyNodes(body, (node) => {
    if (found || !ts.isCallExpression(node)) {
      return;
    }
    if (ts.isIdentifier(node.expression) && node.expression.text === calleeName) {
      found = true;
    }
  });
  return found;
}

function functionMentionsSummaryLines(body: ts.ConciseBody): boolean {
  let found = false;
  visitBodyNodes(body, (node) => {
    if (found || !ts.isIdentifier(node)) {
      return;
    }
    if (node.text === 'summaryLines') {
      found = true;
    }
  });
  return found;
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

function visitBodyNodes(
  body: ts.ConciseBody,
  visitor: (node: ts.Node) => void,
): void {
  if (!ts.isBlock(body)) {
    visitAllNodes(body, visitor);
    return;
  }

  body.forEachChild((node) => {
    visitAllNodes(node, visitor);
  });
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

function looksLikeAnswerDocument(node: ts.ObjectLiteralExpression): boolean {
  const propertyKeys = objectLiteralPropertyKeys(node);
  return hasAllKeys(propertyKeys, ANSWER_DOCUMENT_KEYS);
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
