/**
 * File Facts Extractor
 *
 * Extracts FileFacts from TypeScript source files using the unified value model.
 *
 * Design notes:
 * - Uses enriched ClassValue (decorators, staticMembers, bindableMembers as AnalyzableValue)
 * - Uses LexicalScope from the value model
 * - Registration/Define calls use AnalyzableValue arguments
 * - No separate ClassFacts/PropertyValueFact types
 */

import ts from 'typescript';
import type { NormalizedPath, TextSpan } from '../compiler.js';
import { debug } from '../compiler.js';
import type {
  FileFacts,
  ImportDeclaration,
  ExportDeclaration,
  VariableDeclaration,
  FunctionDeclaration,
  RegistrationCall,
  RegistrationGuard,
  DefineCall,
  FileContext,
  SiblingFile,
  LocalTemplateDefinition,
  LocalTemplateImport,
  TemplateImport,
} from './file-facts.js';
import { emptyFileFacts, emptyFileContext } from './file-facts.js';
import type { ClassValue, LexicalScope, AnalyzableValue } from '../evaluate/value/types.js';
import type { AnalysisGap } from '../evaluate/types.js';
import { gap } from '../evaluate/types.js';
import { extractClassValue } from '../evaluate/value/class-extraction.js';
import { buildFileScope } from '../evaluate/value/scope.js';
import { transformExpression } from '../evaluate/value/transform.js';
import { canonicalPath } from '../util/naming.js';
import type { FileSystemContext } from '../project/context.js';
import {
  extractTemplateImports,
  extractLocalTemplateDefinitions,
  extractLocalTemplateImports,
  resolveTemplateImportPaths,
} from './template-imports.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for file facts extraction.
 */
export interface ExtractionOptions {
  /**
   * File system context for sibling detection.
   * When provided, enables sibling file convention support.
   */
  readonly fileSystem?: FileSystemContext;

  /**
   * Template extensions to look for as siblings.
   * @default ['.html']
   */
  readonly templateExtensions?: readonly string[];

  /**
   * Style extensions to look for as siblings.
   * @default ['.css', '.scss']
   */
  readonly styleExtensions?: readonly string[];

  /**
   * Custom module resolution host for resolving import paths.
   */
  readonly moduleResolutionHost?: ts.ModuleResolutionHost;
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Extract FileFacts from all source files in a TypeScript program.
 *
 * @param program - TypeScript program
 * @param options - Extraction options
 * @returns Map from file path to FileFacts
 */
export function extractAllFileFacts(
  program: ts.Program,
  options?: ExtractionOptions
): Map<NormalizedPath, FileFacts> {
  const result = new Map<NormalizedPath, FileFacts>();
  const checker = program.getTypeChecker();

  const files = program
    .getSourceFiles()
    .filter(sf => !sf.isDeclarationFile)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  debug.project('fileFacts.extractAll.start', {
    fileCount: files.length,
    hasFileSystem: !!options?.fileSystem,
  });

  for (const sf of files) {
    const facts = extractFileFacts(sf, checker, program, options);
    result.set(facts.path, facts);
  }

  debug.project('fileFacts.extractAll.done', {
    factCount: result.size,
  });

  return result;
}

/**
 * Extract FileFacts from a single source file.
 *
 * @param sf - TypeScript source file
 * @param checker - Type checker
 * @param program - TypeScript program (optional, for import resolution)
 * @param options - Extraction options
 */
export function extractFileFacts(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
  program?: ts.Program,
  options?: ExtractionOptions
): FileFacts {
  const path = canonicalPath(sf.fileName);
  const gaps: AnalysisGap[] = [];

  // Build lexical scope
  const scope = buildFileScope(sf, path);

  // Extract classes using the enriched ClassValue
  const classes: ClassValue[] = [];
  const imports: ImportDeclaration[] = [];
  const exports: ExportDeclaration[] = [];
  const variables: VariableDeclaration[] = [];
  const functions: FunctionDeclaration[] = [];
  const registrationCalls: RegistrationCall[] = [];
  const defineCalls: DefineCall[] = [];

  for (const stmt of sf.statements) {
    // Class declarations
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      const classValue = extractClassValue(stmt, sf, path, checker);
      classes.push(classValue);
      gaps.push(...classValue.gaps);

      // Handle class exports
      const exportInfo = extractClassExport(stmt);
      if (exportInfo) exports.push(exportInfo);
    }

    // Import declarations
    if (ts.isImportDeclaration(stmt)) {
      const importDecl = extractImportDeclaration(stmt, sf, program, options?.moduleResolutionHost);
      if (importDecl) imports.push(importDecl);
    }

    // Export declarations
    if (ts.isExportDeclaration(stmt)) {
      const exportDecl = extractExportDeclaration(stmt, sf, program, options?.moduleResolutionHost);
      if (exportDecl) exports.push(exportDecl);
    }

    // Variable statements
    if (ts.isVariableStatement(stmt)) {
      const { variables: vars, exports: varExports, gaps: varGaps } = extractVariableStatement(stmt, sf);
      variables.push(...vars);
      exports.push(...varExports);
      gaps.push(...varGaps);
    }

    // Function declarations
    if (ts.isFunctionDeclaration(stmt)) {
      const { func, exportDecl, gap: funcGap } = extractFunctionDeclaration(stmt, sf, path);
      if (func) functions.push(func);
      if (exportDecl) exports.push(exportDecl);
      if (funcGap) gaps.push(funcGap);
    }

    // Registration/define calls can appear anywhere in the AST.
    // Define calls are still collected from top-level expressions/initializers.
    if (ts.isExpressionStatement(stmt)) {
      findDefineCalls(stmt.expression, sf, defineCalls);
    }

    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (decl.initializer) {
          findDefineCalls(decl.initializer, sf, defineCalls);
        }
      }
    }
  }

  // Collect registration calls across the full AST with guard tracking.
  collectRegistrationCalls(sf, sf, registrationCalls, []);

  return {
    path,
    classes,
    scope,
    imports,
    exports,
    variables,
    functions,
    registrationCalls,
    defineCalls,
    gaps,
  };
}

/**
 * Extract FileContext for a file.
 *
 * This is separate from FileFacts because it requires project-level
 * information (file system access, sibling detection).
 */
export function extractFileContext(
  sourcePath: string,
  options?: ExtractionOptions,
  program?: ts.Program
): FileContext {
  if (!options?.fileSystem) {
    return emptyFileContext();
  }

  const siblings = detectSiblingFiles(sourcePath, options);
  const templateImports = extractSiblingTemplateImports(siblings, options, program);
  const localTemplateImports = extractSiblingLocalTemplateImports(siblings, options, program);
  const localTemplateDefinitions = extractSiblingLocalTemplateDefinitions(siblings, options);

  return {
    siblings,
    template: null, // TODO: Parse template content if needed
    templateImports,
    localTemplateImports,
    localTemplateDefinitions,
  };
}

// =============================================================================
// Import Extraction
// =============================================================================

function extractImportDeclaration(
  decl: ts.ImportDeclaration,
  sf: ts.SourceFile,
  program?: ts.Program,
  host?: ts.ModuleResolutionHost
): ImportDeclaration | null {
  const specifier = decl.moduleSpecifier;
  if (!ts.isStringLiteral(specifier)) return null;

  const moduleSpecifier = specifier.text;
  const resolvedPath = program
    ? resolveModulePath(moduleSpecifier, sf.fileName, program, host)
    : null;
  const span: TextSpan = { start: decl.getStart(sf), end: decl.getEnd() };

  const clause = decl.importClause;
  if (!clause) {
    // Side-effect import: import "./foo"
    return {
      kind: 'side-effect',
      moduleSpecifier,
      resolvedPath,
      span,
    };
  }

  // Namespace import: import * as foo from "./foo"
  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
    return {
      kind: 'namespace',
      alias: clause.namedBindings.name.text,
      moduleSpecifier,
      resolvedPath,
      span,
    };
  }

  // Named imports: import { a, b as c } from "./foo"
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    const bindings = clause.namedBindings.elements.map(el => ({
      name: el.propertyName?.text ?? el.name.text,
      alias: el.propertyName ? el.name.text : null,
    }));
    return {
      kind: 'named',
      bindings,
      moduleSpecifier,
      resolvedPath,
      span,
    };
  }

  // Default import: import foo from "./foo"
  if (clause.name) {
    return {
      kind: 'default',
      alias: clause.name.text,
      moduleSpecifier,
      resolvedPath,
      span,
    };
  }

  return null;
}

// =============================================================================
// Export Extraction
// =============================================================================

function extractExportDeclaration(
  decl: ts.ExportDeclaration,
  sf: ts.SourceFile,
  program?: ts.Program,
  host?: ts.ModuleResolutionHost
): ExportDeclaration | null {
  const span: TextSpan = { start: decl.getStart(sf), end: decl.getEnd() };

  // Re-export from another module
  if (decl.moduleSpecifier && ts.isStringLiteral(decl.moduleSpecifier)) {
    const moduleSpecifier = decl.moduleSpecifier.text;
    const resolvedPath = program
      ? resolveModulePath(moduleSpecifier, sf.fileName, program, host)
      : null;

    // export * from "./foo"
    if (!decl.exportClause) {
      return {
        kind: 'reexport-all',
        moduleSpecifier,
        resolvedPath,
        span,
      };
    }

    // export { a, b as c } from "./foo"
    if (ts.isNamedExports(decl.exportClause)) {
      const bindings = decl.exportClause.elements.map(el => ({
        name: el.propertyName?.text ?? el.name.text,
        alias: el.propertyName ? el.name.text : null,
      }));
      return {
        kind: 'reexport-named',
        bindings,
        moduleSpecifier,
        resolvedPath,
        span,
      };
    }
  }

  // Local export: export { a, b as c }
  if (!decl.moduleSpecifier && decl.exportClause && ts.isNamedExports(decl.exportClause)) {
    const names = decl.exportClause.elements.map(el => el.name.text);
    return {
      kind: 'named',
      names,
      span,
    };
  }

  return null;
}

function extractClassExport(decl: ts.ClassDeclaration): ExportDeclaration | null {
  if (!decl.name) return null;

  const modifiers = ts.canHaveModifiers(decl) ? ts.getModifiers(decl) : undefined;
  const hasExport = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
  const hasDefault = modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);

  if (!hasExport) return null;

  const span: TextSpan = { start: decl.getStart(), end: decl.getEnd() };

  if (hasDefault) {
    return { kind: 'default', name: decl.name.text, span };
  }

  return { kind: 'named', names: [decl.name.text], span };
}

// =============================================================================
// Variable/Function Extraction
// =============================================================================

interface VariableExtractionResult {
  variables: VariableDeclaration[];
  exports: ExportDeclaration[];
  gaps: AnalysisGap[];
}

function extractVariableStatement(
  stmt: ts.VariableStatement,
  sf: ts.SourceFile
): VariableExtractionResult {
  const variables: VariableDeclaration[] = [];
  const exports: ExportDeclaration[] = [];
  const gaps: AnalysisGap[] = [];

  const modifiers = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
  const isExported = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  const kind = getVariableKind(stmt.declarationList.flags);

  for (const decl of stmt.declarationList.declarations) {
    if (ts.isIdentifier(decl.name)) {
      const name = decl.name.text;
      const initializer = decl.initializer
        ? transformExpression(decl.initializer, sf)
        : null;
      const span: TextSpan = { start: decl.getStart(sf), end: decl.getEnd() };

      variables.push({ name, kind, initializer, isExported, span });

      if (isExported) {
        exports.push({ kind: 'named', names: [name], span });
      }
    } else {
      // Destructuring export
      const patternText = decl.name.getText(sf);
      const path = canonicalPath(sf.fileName);
      gaps.push(gap(
        `destructuring export: ${patternText}`,
        { kind: 'unsupported-pattern', path, reason: 'destructuring-export' },
        `Destructuring export patterns like "export const ${patternText} = ..." are not analyzed`,
        { file: path }
      ));
    }
  }

  return { variables, exports, gaps };
}

interface FunctionExtractionResult {
  func: FunctionDeclaration | null;
  exportDecl: ExportDeclaration | null;
  gap: AnalysisGap | null;
}

function extractFunctionDeclaration(
  decl: ts.FunctionDeclaration,
  sf: ts.SourceFile,
  path: NormalizedPath
): FunctionExtractionResult {
  const modifiers = ts.canHaveModifiers(decl) ? ts.getModifiers(decl) : undefined;
  const isExported = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  const hasDefault = modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
  const isAsync = modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
  const isGenerator = decl.asteriskToken !== undefined;

  // Anonymous default function exports
  if (!decl.name && isExported && hasDefault) {
    return {
      func: null,
      exportDecl: null,
      gap: gap(
        'anonymous default function export',
        { kind: 'unsupported-pattern', path, reason: 'anonymous-default-function' },
        'Anonymous default function exports like "export default function() { ... }" are not analyzed',
        { file: path }
      ),
    };
  }

  if (!decl.name) {
    return { func: null, exportDecl: null, gap: null };
  }

  const name = decl.name.text;
  const span: TextSpan = { start: decl.getStart(sf), end: decl.getEnd() };

  const func: FunctionDeclaration = { name, isAsync, isGenerator, isExported, span };

  let exportDecl: ExportDeclaration | null = null;
  if (isExported) {
    exportDecl = hasDefault
      ? { kind: 'default', name, span }
      : { kind: 'named', names: [name], span };
  }

  return { func, exportDecl, gap: null };
}

// =============================================================================
// Registration/Define Call Extraction
// =============================================================================

/**
 * Collect registration calls across the full AST with guard tracking.
 */
function collectRegistrationCalls(
  node: ts.Node,
  sf: ts.SourceFile,
  results: RegistrationCall[],
  guards: readonly RegistrationGuard[]
): void {
  if (ts.isIfStatement(node)) {
    const conditionText = node.expression.getText(sf);
    const conditionSpan: TextSpan = { start: node.expression.getStart(sf), end: node.expression.getEnd() };
    const conditionValue = transformExpression(node.expression, sf);
    const guard: RegistrationGuard = {
      kind: 'if',
      condition: conditionValue,
      negated: false,
      span: conditionSpan,
      conditionText,
    };

    collectRegistrationCalls(node.thenStatement, sf, results, guards.concat(guard));

    if (node.elseStatement) {
      const elseGuard: RegistrationGuard = { ...guard, negated: true };
      collectRegistrationCalls(node.elseStatement, sf, results, guards.concat(elseGuard));
    }

    return;
  }

  if (ts.isCallExpression(node)) {
    const regCall = createRegistrationCall(node, sf, guards);
    if (regCall) {
      results.push(regCall);
    }
  }

  ts.forEachChild(node, child => collectRegistrationCalls(child, sf, results, guards));
}

/**
 * Find all define calls in an expression, including nested in method chains.
 */
function findDefineCalls(
  expr: ts.Expression,
  sf: ts.SourceFile,
  results: DefineCall[]
): void {
  // Check if this expression is a define call
  const defCall = extractDefineCall(expr, sf);
  if (defCall) {
    results.push(defCall);
  }

  // Recursively check call chain
  if (ts.isCallExpression(expr)) {
    if (ts.isPropertyAccessExpression(expr.expression)) {
      findDefineCalls(expr.expression.expression, sf, results);
    }
  }
}

function createRegistrationCall(
  expr: ts.CallExpression,
  sf: ts.SourceFile,
  guards: readonly RegistrationGuard[]
): RegistrationCall | null {
  // Look for .register(...) calls
  if (!ts.isPropertyAccessExpression(expr.expression)) return null;
  if (expr.expression.name.text !== 'register') return null;

  const receiver = determineRegisterReceiver(expr.expression.expression);
  const args = expr.arguments.map(arg => transformExpression(arg, sf));
  const span: TextSpan = { start: expr.getStart(sf), end: expr.getEnd() };

  return { receiver, arguments: args, guards, span };
}

function determineRegisterReceiver(
  expr: ts.Expression
): 'aurelia' | 'container' | 'unknown' {
  // new Aurelia()
  if (ts.isNewExpression(expr)) {
    if (ts.isIdentifier(expr.expression) && expr.expression.text === 'Aurelia') {
      return 'aurelia';
    }
  }

  // Chained: new Aurelia().register(...).register(...)
  if (ts.isCallExpression(expr)) {
    if (ts.isPropertyAccessExpression(expr.expression)) {
      return determineRegisterReceiver(expr.expression.expression);
    }
  }

  // Simple identifier
  if (ts.isIdentifier(expr)) {
    const name = expr.text.toLowerCase();
    if (name === 'aurelia') return 'aurelia';
    if (name === 'container' || name === 'di') return 'container';
  }

  // Property access: DI.createContainer()
  if (ts.isCallExpression(expr)) {
    if (ts.isPropertyAccessExpression(expr.expression)) {
      const propAccess = expr.expression;
      if (ts.isIdentifier(propAccess.expression) && propAccess.expression.text === 'DI') {
        if (propAccess.name.text === 'createContainer') {
          return 'container';
        }
      }
    }
  }

  return 'unknown';
}

function extractDefineCall(
  expr: ts.Expression,
  sf: ts.SourceFile
): DefineCall | null {
  // Look for CustomElement.define(...), CustomAttribute.define(...), etc.
  if (!ts.isCallExpression(expr)) return null;
  if (!ts.isPropertyAccessExpression(expr.expression)) return null;
  if (expr.expression.name.text !== 'define') return null;

  const callee = expr.expression.expression;
  if (!ts.isIdentifier(callee)) return null;

  const resourceType = callee.text as DefineCall['resourceType'];
  if (![
    'CustomElement',
    'CustomAttribute',
    'ValueConverter',
    'BindingBehavior',
    'BindingCommand',
    'AttributePattern',
  ].includes(resourceType)) {
    return null;
  }

  if (expr.arguments.length < 2) return null;

  const definition = transformExpression(expr.arguments[0]!, sf);
  const classRef = transformExpression(expr.arguments[1]!, sf);
  const span: TextSpan = { start: expr.getStart(sf), end: expr.getEnd() };

  return { resourceType, definition, classRef, span };
}

// =============================================================================
// Sibling/Template Extraction
// =============================================================================

function detectSiblingFiles(
  sourcePath: string,
  options: ExtractionOptions
): SiblingFile[] {
  if (!options.fileSystem) return [];

  const templateExtensions = options.templateExtensions ?? ['.html'];
  const styleExtensions = options.styleExtensions ?? ['.css', '.scss'];
  const allExtensions = [...templateExtensions, ...styleExtensions];

  const siblings = options.fileSystem.getSiblingFiles(sourcePath, allExtensions);

  debug.project('fileFacts.siblings', {
    sourcePath,
    found: siblings.map(s => s.path),
  });

  return siblings.map(s => ({
    path: s.path,
    extension: s.extension,
    baseName: s.baseName,
  }));
}

function extractSiblingTemplateImports(
  siblings: SiblingFile[],
  options: ExtractionOptions,
  program: ts.Program | undefined,
): readonly TemplateImport[] {
  if (!options.fileSystem) return [];

  const templateExtensions = options.templateExtensions ?? ['.html'];
  const templateSibling = selectPrimaryTemplateSibling(siblings, templateExtensions);

  if (!templateSibling) return [];

  const imports = extractTemplateImports(templateSibling.path, options.fileSystem);

  debug.project('fileFacts.templateImports', {
    templatePath: templateSibling.path,
    importCount: imports.length,
  });

  if (program && imports.length > 0) {
    const resolveModule = (specifier: string, fromFile: NormalizedPath) =>
      resolveModulePath(specifier, fromFile, program, options.moduleResolutionHost);

    const resolved = resolveTemplateImportPaths(imports, templateSibling.path, resolveModule);

    // Convert to TemplateImport format
    return resolved.map(imp => ({
      moduleSpecifier: imp.moduleSpecifier,
      resolvedPath: imp.resolvedPath,
      defaultAlias: imp.defaultAlias,
      namedAliases: imp.namedAliases,
      span: imp.span,
      moduleSpecifierSpan: imp.moduleSpecifierSpan,
    }));
  }

  // Convert to TemplateImport format without resolution
  return imports.map(imp => ({
    moduleSpecifier: imp.moduleSpecifier,
    resolvedPath: null,
    defaultAlias: imp.defaultAlias,
    namedAliases: imp.namedAliases,
    span: imp.span,
    moduleSpecifierSpan: imp.moduleSpecifierSpan,
  }));
}

function extractSiblingLocalTemplateImports(
  siblings: SiblingFile[],
  options: ExtractionOptions,
  program: ts.Program | undefined,
): readonly LocalTemplateImport[] {
  if (!options.fileSystem) return [];

  const templateExtensions = options.templateExtensions ?? ['.html'];
  const templateSibling = selectPrimaryTemplateSibling(siblings, templateExtensions);

  if (!templateSibling) return [];

  const imports = extractLocalTemplateImports(templateSibling.path, options.fileSystem);

  debug.project('fileFacts.localTemplateImports', {
    templatePath: templateSibling.path,
    importCount: imports.length,
  });

  if (program && imports.length > 0) {
    const resolveModule = (specifier: string, fromFile: NormalizedPath) =>
      resolveModulePath(specifier, fromFile, program, options.moduleResolutionHost);

    return imports.map((entry) => ({
      ...entry,
      import: {
        ...entry.import,
        resolvedPath: resolveModule(entry.import.moduleSpecifier, templateSibling.path),
      },
    }));
  }

  return imports.map((entry) => ({
    ...entry,
    import: {
      ...entry.import,
      resolvedPath: null,
    },
  }));
}

function extractSiblingLocalTemplateDefinitions(
  siblings: SiblingFile[],
  options: ExtractionOptions,
): readonly LocalTemplateDefinition[] {
  if (!options.fileSystem) return [];

  const templateExtensions = options.templateExtensions ?? ['.html'];
  const templateSibling = selectPrimaryTemplateSibling(siblings, templateExtensions);

  if (!templateSibling) return [];

  const definitions = extractLocalTemplateDefinitions(templateSibling.path, options.fileSystem);

  debug.project('fileFacts.localTemplateDefinitions', {
    templatePath: templateSibling.path,
    definitionCount: definitions.length,
  });

  return definitions;
}

function selectPrimaryTemplateSibling(
  siblings: readonly SiblingFile[],
  templateExtensions: readonly string[],
): SiblingFile | undefined {
  const extensionOrder = new Map(
    templateExtensions.map((extension, index) => [extension.toLowerCase(), index]),
  );

  const templateSiblings = siblings.filter((sibling) =>
    extensionOrder.has(sibling.extension.toLowerCase()),
  );

  if (templateSiblings.length === 0) {
    return undefined;
  }

  templateSiblings.sort((a, b) => {
    const aOrder = extensionOrder.get(a.extension.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = extensionOrder.get(b.extension.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.path.localeCompare(b.path);
  });

  return templateSiblings[0];
}

// =============================================================================
// Utilities
// =============================================================================

function getVariableKind(flags: ts.NodeFlags): 'const' | 'let' | 'var' {
  if (flags & ts.NodeFlags.Const) return 'const';
  if (flags & ts.NodeFlags.Let) return 'let';
  return 'var';
}

function resolveModulePath(
  specifier: string,
  containingFile: string,
  program: ts.Program,
  host?: ts.ModuleResolutionHost
): NormalizedPath | null {
  const resolveHost = host ?? ts.sys;

  const result = ts.resolveModuleName(
    specifier,
    containingFile,
    program.getCompilerOptions(),
    resolveHost
  );

  if (result.resolvedModule?.resolvedFileName) {
    let resolvedPath = result.resolvedModule.resolvedFileName;

    // Handle ESM-style .js → .ts mapping
    if (resolvedPath.endsWith('.js')) {
      const tsPath = resolvedPath.slice(0, -3) + '.ts';
      if (resolveHost.fileExists?.(tsPath)) {
        resolvedPath = tsPath;
      }
    }

    return canonicalPath(resolvedPath);
  }

  // Try .js → .ts mapping if standard resolution fails
  if (specifier.endsWith('.js') && (specifier.startsWith('./') || specifier.startsWith('../'))) {
    const tsSpecifier = specifier.slice(0, -3) + '.ts';
    const result2 = ts.resolveModuleName(
      tsSpecifier,
      containingFile,
      program.getCompilerOptions(),
      resolveHost
    );

    if (result2.resolvedModule?.resolvedFileName) {
      return canonicalPath(result2.resolvedModule.resolvedFileName);
    }
  }

  return null;
}
