import ts from 'typescript';
import type { TypeSystemProject } from '../type-system/project.js';
import { resolveValueAlias } from '../evaluation/import-bindings.js';
import type { AureliaFrameworkRegistrationAdmissionSource } from './aurelia-framework-registration-admission-source.js';
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

/** Bind the framework value at the selected bootstrap call before proposing a registration. */
export function planFrameworkRegistrationSourceOperations(
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
  admission: AureliaFrameworkRegistrationAdmissionSource,
  appCallStart: number,
  appCallEnd: number,
): readonly TypeScriptSourceOperationEdit[] | null {
  const call = findAppCallExpression(sourceFile, appCallStart, appCallEnd);
  if (call == null) return null;
  // The framework admission manifest spends one exported registration value per capability.
  const [requirement] = admission.entrypointImports;
  const [expression] = admission.registrationExpressions;
  if (!requirement || !expression) return null;
  const name = aureliaEntrypointRegistrationExpressionText(expression);
  if (requirement.namedImports?.length !== 1 || requirement.namedImports[0] !== name) return null;

  const matchingModule = importDeclarationsForModule(sourceFile, requirement.moduleSpecifier)[0];
  const moduleSymbol = matchingModule && typeSystem.readProgramSymbolAtLocation(matchingModule.moduleSpecifier);
  const expected = moduleSymbol
    ? resolveValueAlias(typeSystem.checker, typeSystem.checker.getExportsOfModule(moduleSymbol).find(s => s.name === name))
    : typeSystem.readProgramExportedSymbol(requirement.moduleSpecifier, name);
  const matches = (specifier: ts.ImportSpecifier) => registrationImportMatches(typeSystem, specifier, requirement.moduleSpecifier, name, expected);
  const binding = visibleRegistrationImport(typeSystem, sourceFile, call, matches);
  let use = name;
  let edits: readonly TypeScriptSourceOperationEdit[] | null;
  if (binding) {
    use = binding.name.text;
    const clause = binding.parent.parent;
    if (clause.isTypeOnly && clause.name) return null;
    edits = clause.isTypeOnly || binding.isTypeOnly
      ? promoteNamedValueImports(sourceFile, clause, binding.parent, new Set([use]))
      : [];
  } else {
    const occupied = (node: ts.Node) => typeSystem.checker.resolveName(name, node,
      ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Alias, false);
    const moduleBinding = occupied(sourceFile);
    if (occupied(call) || moduleBinding) {
      if (moduleBinding?.declarations?.some(d => ts.isImportSpecifier(d) && !matches(d))) return null;
      const identifiers = new Set<string>();
      visit(sourceFile, node => { if (ts.isIdentifier(node)) identifiers.add(node.text); });
      const base = `aurelia${name}`;
      use = base;
      for (let suffix = 2; identifiers.has(use); suffix++) use = `${base}${suffix}`;
    }
    edits = planTypeScriptImportSourceOperation(sourceFile, {
      moduleSpecifier: requirement.moduleSpecifier,
      namedImports: [use === name ? name : `${name} as ${use}`],
    });
  }
  const register = registerChainEdit(sourceFile, call, [use]);
  return edits && register ? [...edits, register] : null;
}

function visibleRegistrationImport(
  project: TypeSystemProject,
  file: ts.SourceFile,
  call: ts.CallExpression,
  matches: (binding: ts.ImportSpecifier) => boolean,
): ts.ImportSpecifier | null {
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const specifier of bindings.elements) {
      if (!matches(specifier)) continue;
      const local = project.readProgramSymbolAtLocation(specifier.name);
      if (local && project.checker.resolveName(specifier.name.text, call, ts.SymbolFlags.Value | ts.SymbolFlags.Alias, false) === local) {
        return specifier;
      }
    }
  }
  return null;
}

function registrationImportMatches(
  project: TypeSystemProject,
  specifier: ts.ImportSpecifier,
  moduleSpecifier: string,
  name: string,
  expected: ts.Symbol | null,
): boolean {
  const source = specifier.parent.parent.parent.moduleSpecifier;
  if (!ts.isStringLiteral(source)) return false;
  const exported = (specifier.propertyName ?? specifier.name).text;
  if (source.text === moduleSpecifier && exported === name) return true;
  if (!expected) return false;
  // Authenticate the export at the module, independently of a local import type modifier.
  const owner = project.readProgramSymbolAtLocation(source);
  const symbol = owner && project.checker.getExportsOfModule(owner).find(s => s.name === exported);
  return resolveValueAlias(project.checker, symbol) === expected;
}

/** Plan a `.register(...)` chain insertion immediately before the app-root `.app(...)` call. */
export function planAureliaRegisterChainSourceOperation(
  sourceFile: ts.SourceFile,
  model: AureliaRegisterChainEditModel,
): TypeScriptSourceOperationEdit | null {
  const appCall = findAppCallExpression(sourceFile, model.appCallStart ?? null, model.appCallEnd ?? null);
  return appCall == null ? null : registerChainEdit(sourceFile, appCall, model.registrationExpressions);
}

function registerChainEdit(
  sourceFile: ts.SourceFile,
  appCall: ts.CallExpression,
  expressions: readonly AureliaEntrypointRegistrationExpression[],
): TypeScriptSourceOperationEdit | null {
  if (!ts.isPropertyAccessExpression(appCall.expression)) return null;
  const registrationExpressions = expressions
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
    if (clause.isTypeOnly && clause.name != null) return null;
    promotions.push(...promoteNamedValueImports(sourceFile, clause, bindings, new Set(needed.map(s => s.name.text))));
    for (const specifier of needed) missing.delete(specifier.name.text);
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

function promoteNamedValueImports(
  file: ts.SourceFile,
  clause: ts.ImportClause,
  bindings: ts.NamedImports,
  needed: ReadonlySet<string>,
): TypeScriptSourceOperationEdit[] {
  const edits = clause.isTypeOnly ? [removeImportTypeModifier(file, clause)] : [];
  for (const specifier of bindings.elements) {
    if (needed.has(specifier.name.text)) {
      if (specifier.isTypeOnly) edits.push(removeImportTypeModifier(file, specifier));
    } else if (clause.isTypeOnly && !specifier.isTypeOnly) {
      const start = specifier.getStart(file);
      edits.push(editForRange(file, TypeScriptSourceOperationEditKind.ImportDeclaration, start, start, 'type '));
    }
  }
  return edits;
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
  // Insert into the authored text rather than reprinting specifiers, which loses comments.
  let clauseText = clause.getText(sourceFile);
  if (namedBindings && importRequirement.namedImports?.length) {
    const last = namedBindings.elements.at(-1);
    const start = namedBindings.getStart(sourceFile) + 1;
    const tail = last && sourceFile.text.slice(last.end, namedBindings.end - 1);
    const multiline = /[\r\n]/u.test(namedBindings.getText(sourceFile));
    const prepend = multiline || (tail != null && tail.trim().length > 0);
    const offset = (prepend || !last ? start : last.end) - clause.getStart(sourceFile);
    const padding = multiline ? /^\s*/u.exec(sourceFile.text.slice(start, namedBindings.end - 1))![0] : ' ';
    const additions = importRequirement.namedImports.join(', ');
    const inserted = !last ? ` ${additions}` : prepend ? `${padding}${additions},` : `, ${additions}`;
    clauseText = clauseText.slice(0, offset) + inserted + clauseText.slice(offset);
  } else if (importRequirement.namedImports?.length) {
    clauseText += `, { ${importRequirement.namedImports.join(', ')} }`;
  }
  if (!clause.name && importRequirement.defaultImport) clauseText = `${importRequirement.defaultImport}, ${clauseText}`;
  return editForRange(sourceFile, TypeScriptSourceOperationEditKind.ImportDeclaration,
    clause.getStart(sourceFile), clause.end, clauseText);
}

function insertImportDeclaration(
  sourceFile: ts.SourceFile,
  importRequirement: TypeScriptImportRequirement,
): TypeScriptSourceOperationEdit {
  const imports = sourceFile.statements.filter(ts.isImportDeclaration);
  const statement = typeScriptImportStatement(importRequirement);
  // Keep shebangs, directive prologues and trailing import comments attached to the original code.
  const lastImport = imports.at(-1);
  let anchor: ts.Statement | undefined = lastImport;
  if (!anchor) {
    for (const statement of sourceFile.statements) {
      if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
      anchor = statement;
    }
  }
  if (!anchor) {
    const shebang = ts.getShebang(sourceFile.text);
    const start = shebang == null ? 0 : shebang.length;
    const newline = detectNewline(sourceFile.text);
    return editForRange(sourceFile, TypeScriptSourceOperationEditKind.ImportDeclaration, start, start,
      shebang == null ? `${statement}${newline}` : `${newline}${statement}${newline}`);
  }
  const insertion = ts.getTrailingCommentRanges(sourceFile.text, anchor.end)?.at(-1)?.end ?? anchor.end;
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
