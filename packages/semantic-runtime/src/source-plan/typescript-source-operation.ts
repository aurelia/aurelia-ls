import ts from 'typescript';
import {
  aureliaEntrypointRegistrationExpressionText,
  type AureliaEntrypointRegistrationExpression,
} from './aurelia-entrypoint-source-plan.js';
import {
  mergeTypeScriptImportRequirements,
  type TypeScriptImportRequirement,
  typeScriptImportStatement,
} from './typescript-import-source.js';

export enum TypeScriptSourceOperationEditKind {
  ImportDeclaration = 'typescript-import-declaration',
  AureliaRegisterChain = 'aurelia-register-chain',
}

/** Existing TypeScript source edit with validation text for hosts that apply it later. */
export interface TypeScriptSourceOperationEdit {
  readonly editKind: TypeScriptSourceOperationEditKind;
  readonly sourceFilePath: string;
  readonly start: number;
  readonly end: number;
  readonly oldText: string;
  readonly newText: string;
}

export interface AureliaRegisterChainEditModel {
  readonly appCallStart?: number | null;
  readonly appCallEnd?: number | null;
  readonly registrationExpressions: readonly AureliaEntrypointRegistrationExpression[];
}

/** Plan value imports atomically. A conflicting local import binding makes the plan unavailable. */
export function planTypeScriptImportSourceOperations(
  sourceFile: ts.SourceFile,
  imports: readonly TypeScriptImportRequirement[],
): readonly TypeScriptSourceOperationEdit[] | null {
  const edits: TypeScriptSourceOperationEdit[] = [];
  for (const requirement of mergeTypeScriptImportRequirements(imports)) {
    const planned = planTypeScriptImportSourceOperation(sourceFile, requirement);
    if (planned == null) return null;
    edits.push(...planned);
  }
  return edits;
}

/** Plan a `.register(...)` chain insertion immediately before the app-root `.app(...)` call. */
export function planAureliaRegisterChainSourceOperation(
  sourceFile: ts.SourceFile,
  model: AureliaRegisterChainEditModel,
): TypeScriptSourceOperationEdit | null {
  const appCall = findAppCallExpression(sourceFile, model.appCallStart ?? null, model.appCallEnd ?? null);
  if (appCall == null || !ts.isPropertyAccessExpression(appCall.expression)) {
    return null;
  }
  const registrationExpressions = model.registrationExpressions
    .map((expression) => aureliaEntrypointRegistrationExpressionText(expression).trim())
    .filter((expression) => expression.length > 0)
    .filter((expression) => !registerChainAlreadyContainsExpression(sourceFile, appCall, expression));
  if (registrationExpressions.length === 0) {
    return null;
  }
  const dotOffset = dotOffsetBeforePropertyName(sourceFile.text, appCall.expression.name.getStart(sourceFile));
  if (dotOffset == null) {
    return null;
  }
  const prefix = sourceFile.text.slice(lineStartOffset(sourceFile.text, dotOffset), dotOffset);
  const inline = prefix.trim().length > 0;
  const newText = inline
    ? aureliaRegisterCallText(registrationExpressions)
    : `${aureliaRegisterCallText(registrationExpressions)}${detectNewline(sourceFile.text)}${prefix}`;
  return {
    editKind: TypeScriptSourceOperationEditKind.AureliaRegisterChain,
    sourceFilePath: sourceFile.fileName,
    start: dotOffset,
    end: dotOffset,
    oldText: '',
    newText,
  };
}

function planTypeScriptImportSourceOperation(
  sourceFile: ts.SourceFile,
  importRequirement: TypeScriptImportRequirement,
): readonly TypeScriptSourceOperationEdit[] | null {
  const missing = new Set(importRequirement.namedImports);
  const promotions: TypeScriptSourceOperationEdit[] = [];
  for (const declaration of sourceFile.statements.filter(ts.isImportDeclaration)) {
    const clause = declaration.importClause;
    if (clause == null) continue;
    if (missing.has(clause.name?.text ?? '')) return null;
    const bindings = clause.namedBindings;
    if (bindings == null) continue;
    if (ts.isNamespaceImport(bindings)) {
      if (missing.has(bindings.name.text)) return null;
      continue;
    }
    const needed = bindings.elements.filter(specifier => missing.has(specifier.name.text));
    if (needed.length === 0) continue;
    if (!ts.isStringLiteral(declaration.moduleSpecifier) || declaration.moduleSpecifier.text !== importRequirement.moduleSpecifier
      || needed.some(specifier => specifier.propertyName != null && specifier.propertyName.text !== specifier.name.text)) {
      return null;
    }
    if (clause.isTypeOnly) {
      if (clause.name != null) return null;
      promotions.push(removeImportTypeModifier(sourceFile, clause));
      for (const specifier of bindings.elements) {
        if (!missing.has(specifier.name.text) && !specifier.isTypeOnly) {
          const start = specifier.getStart(sourceFile);
          promotions.push(editForRange(sourceFile, TypeScriptSourceOperationEditKind.ImportDeclaration, start, start, 'type '));
        }
      }
    }
    for (const specifier of needed) {
      missing.delete(specifier.name.text);
      if (specifier.isTypeOnly) promotions.push(removeImportTypeModifier(sourceFile, specifier));
    }
  }
  const missingNamedImports = [...missing];
  const missingDefaultImport = importRequirement.defaultImport != null
    && !hasValueDefaultImport(sourceFile, importRequirement.moduleSpecifier, importRequirement.defaultImport);
  if (missingNamedImports.length === 0 && !missingDefaultImport) {
    return promotions;
  }

  // An additional declaration keeps the new bindings disjoint from any type-token edits above.
  const editableImport = promotions.length === 0 ? findEditableValueImport(sourceFile, importRequirement.moduleSpecifier) : null;
  if (editableImport != null) {
    return [updateImportDeclaration(sourceFile, editableImport, {
      ...importRequirement,
      defaultImport: missingDefaultImport ? importRequirement.defaultImport : undefined,
      namedImports: missingNamedImports,
    })];
  }

  return [...promotions, insertImportDeclaration(sourceFile, {
    moduleSpecifier: importRequirement.moduleSpecifier,
    defaultImport: missingDefaultImport ? importRequirement.defaultImport : undefined,
    namedImports: missingNamedImports.length === 0 ? undefined : missingNamedImports,
  })];
}

function removeImportTypeModifier(sourceFile: ts.SourceFile, node: ts.ImportClause | ts.ImportSpecifier): TypeScriptSourceOperationEdit {
  const keyword = node.getFirstToken(sourceFile)!;
  const start = keyword.getStart(sourceFile);
  const end = keyword.end + (sourceFile.text[keyword.end] === ' ' ? 1 : 0);
  return editForRange(sourceFile, TypeScriptSourceOperationEditKind.ImportDeclaration, start, end, '');
}

function hasValueDefaultImport(
  sourceFile: ts.SourceFile,
  moduleSpecifier: string,
  name: string,
): boolean {
  return importDeclarationsForModule(sourceFile, moduleSpecifier).some((declaration) =>
    declaration.importClause != null
    && !declaration.importClause.isTypeOnly
    && declaration.importClause.name?.text === name
  );
}

function findEditableValueImport(
  sourceFile: ts.SourceFile,
  moduleSpecifier: string,
): ts.ImportDeclaration | null {
  const declarations = importDeclarationsForModule(sourceFile, moduleSpecifier).filter((declaration) =>
    declaration.importClause != null
    && !declaration.importClause.isTypeOnly
    && (
      declaration.importClause.namedBindings == null
      || ts.isNamedImports(declaration.importClause.namedBindings)
    )
  );
  return declarations.find((declaration) =>
    declaration.importClause?.namedBindings != null
    && ts.isNamedImports(declaration.importClause.namedBindings)
  ) ?? declarations[0] ?? null;
}

function updateImportDeclaration(
  sourceFile: ts.SourceFile,
  declaration: ts.ImportDeclaration,
  importRequirement: TypeScriptImportRequirement,
): TypeScriptSourceOperationEdit {
  const clause = declaration.importClause!;
  const namedBindings = clause.namedBindings != null && ts.isNamedImports(clause.namedBindings)
    ? clause.namedBindings
    : null;
  const existingNamed = namedBindings == null
    ? []
    : namedBindings.elements.map((element) => element.getText(sourceFile));
  const namedImports = [...existingNamed, ...(importRequirement.namedImports ?? [])];
  const importClauseText = [
    clause.name?.getText(sourceFile) ?? importRequirement.defaultImport,
    namedImports.length === 0 ? null : `{ ${namedImports.join(', ')} }`,
  ].filter((part): part is string => part != null && part.length > 0).join(', ');
  return editForRange(
    sourceFile,
    TypeScriptSourceOperationEditKind.ImportDeclaration,
    clause.getStart(sourceFile),
    clause.getEnd(),
    importClauseText,
  );
}

function insertImportDeclaration(
  sourceFile: ts.SourceFile,
  importRequirement: TypeScriptImportRequirement,
): TypeScriptSourceOperationEdit {
  const imports = sourceFile.statements.filter(ts.isImportDeclaration);
  const statement = typeScriptImportStatement(importRequirement);
  if (imports.length === 0) {
    return {
      editKind: TypeScriptSourceOperationEditKind.ImportDeclaration,
      sourceFilePath: sourceFile.fileName,
      start: 0,
      end: 0,
      oldText: '',
      newText: `${statement}${detectNewline(sourceFile.text)}`,
    };
  }

  const lastImport = imports[imports.length - 1]!;
  const insertion = lastImport.getEnd();
  return {
    editKind: TypeScriptSourceOperationEditKind.ImportDeclaration,
    sourceFilePath: sourceFile.fileName,
    start: insertion,
    end: insertion,
    oldText: '',
    newText: `${detectNewline(sourceFile.text)}${statement}`,
  };
}

function importDeclarationsForModule(
  sourceFile: ts.SourceFile,
  moduleSpecifier: string,
): readonly ts.ImportDeclaration[] {
  return sourceFile.statements.filter((statement): statement is ts.ImportDeclaration =>
    ts.isImportDeclaration(statement)
    && ts.isStringLiteral(statement.moduleSpecifier)
    && statement.moduleSpecifier.text === moduleSpecifier
  );
}

function findAppCallExpression(
  sourceFile: ts.SourceFile,
  appCallStart: number | null,
  appCallEnd: number | null,
): ts.CallExpression | null {
  let fallback: ts.CallExpression | null = null;
  let matched: ts.CallExpression | null = null;
  visit(sourceFile, (node) => {
    if (matched != null || !ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
      return;
    }
    if (node.expression.name.text !== 'app') {
      return;
    }
    if (fallback == null) {
      fallback = node;
    }
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    if (
      appCallStart != null
      && appCallEnd != null
      && start >= appCallStart
      && end <= appCallEnd
    ) {
      matched = node;
    }
  });
  return matched ?? (appCallStart == null || appCallEnd == null ? fallback : null);
}

function registerChainAlreadyContainsExpression(
  sourceFile: ts.SourceFile,
  appCall: ts.CallExpression,
  expression: string,
): boolean {
  if (!ts.isPropertyAccessExpression(appCall.expression)) {
    return false;
  }
  let receiver: ts.Expression = appCall.expression.expression;
  while (true) {
    if (ts.isParenthesizedExpression(receiver)) {
      receiver = receiver.expression;
      continue;
    }
    if (!ts.isCallExpression(receiver) || !ts.isPropertyAccessExpression(receiver.expression)) {
      return false;
    }
    if (
      receiver.expression.name.text === 'register'
      && receiver.arguments.some((argument) => argument.getText(sourceFile).trim() === expression)
    ) {
      return true;
    }
    receiver = receiver.expression.expression;
  }
}

function aureliaRegisterCallText(
  expressions: readonly string[],
): string {
  if (expressions.length === 1 && !expressions[0]!.includes('\n')) {
    return `.register(${expressions[0]})`;
  }
  return `.register(${expressions.join(', ')})`;
}

function dotOffsetBeforePropertyName(
  text: string,
  propertyNameStart: number,
): number | null {
  for (let offset = propertyNameStart - 1; offset >= 0; offset -= 1) {
    const char = text[offset];
    if (char === '.') {
      return offset;
    }
    if (char !== ' ' && char !== '\t') {
      return null;
    }
  }
  return null;
}

function editForRange(
  sourceFile: ts.SourceFile,
  editKind: TypeScriptSourceOperationEditKind,
  start: number,
  end: number,
  newText: string,
): TypeScriptSourceOperationEdit {
  return {
    editKind,
    sourceFilePath: sourceFile.fileName,
    start,
    end,
    oldText: sourceFile.text.slice(start, end),
    newText,
  };
}

function detectNewline(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function lineStartOffset(text: string, offset: number): number {
  return text.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
}

function visit(
  node: ts.Node,
  cb: (node: ts.Node) => void,
): void {
  cb(node);
  ts.forEachChild(node, (child) => visit(child, cb));
}
