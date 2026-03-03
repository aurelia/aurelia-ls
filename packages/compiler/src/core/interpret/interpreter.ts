/**
 * Project Interpreter — Declaration-Driven Claim Producer
 *
 * Walks TypeScript declarations, recognizes Aurelia 2 resources,
 * extracts per-field values, and emits observations to the dep graph.
 * All within per-unit evaluation contexts that record dependencies
 * via the EvaluationTracer.
 *
 * Isomorphic to a type checker's declaration processing pass:
 * walk declarations → create symbols → populate properties.
 *
 * Reuses leaf-level evaluation from evaluate/:
 * - transform.ts (AST → AnalyzableValue)
 * - scope.ts (scope building + local resolution)
 * - class-extraction.ts (ClassValue extraction)
 * - value-helpers.ts (on-demand resolution)
 *
 * New orchestration: per-unit context management, tracer integration,
 * recognition, field extraction, observation emission.
 */

import ts from 'typescript';
import type { NormalizedPath } from '../../model/identity.js';
import type { ProjectDepGraph } from '../graph/types.js';
import type { UnitEvaluator } from '../graph/types.js';
import { buildFileScope } from '../../project-semantics/evaluate/value/scope.js';
import { extractClassValue } from '../../project-semantics/evaluate/value/class-extraction.js';
import { transformExpression } from '../../project-semantics/evaluate/value/transform.js';
import { resolveInScope } from '../../project-semantics/evaluate/value/scope.js';
import { createTracingResolver, resolveWithTracer } from './resolve.js';
import { recognizeResource, recognizeDefineCall, type RecognizedResource } from './recognize.js';
import { extractFieldObservations } from './extract-fields.js';
import { extractHtmlMetaObservations } from './html-meta.js';
import type { ClassValue, LexicalScope, AnalyzableValue } from '../../project-semantics/evaluate/value/types.js';

// =============================================================================
// Interpreter Configuration
// =============================================================================

export interface InterpreterConfig {
  readonly program: ts.Program;
  readonly graph: ProjectDepGraph;
  readonly packagePath: string;
  readonly enableConventions?: boolean;
  /** Optional file reader for non-TS files (HTML templates, etc.) */
  readonly readFile?: (path: string) => string | undefined;
}

// =============================================================================
// Unit Enumeration
// =============================================================================

interface EvaluationUnit {
  readonly key: string;
  readonly node: ts.ClassDeclaration | ts.VariableDeclaration | ts.FunctionDeclaration;
}

/**
 * Enumerate evaluation units in a source file.
 * A unit is a class declaration or a top-level exported binding.
 */
function enumerateUnits(sf: ts.SourceFile, filePath: NormalizedPath): EvaluationUnit[] {
  const units: EvaluationUnit[] = [];

  for (const stmt of sf.statements) {
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      units.push({ key: stmt.name.text, node: stmt });
    } else if (ts.isVariableStatement(stmt)) {
      const isExported = stmt.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExported) {
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            units.push({ key: decl.name.text, node: decl });
          }
        }
      }
    } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      const isExported = stmt.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (isExported) {
        units.push({ key: stmt.name.text, node: stmt });
      }
    }
  }

  return units;
}

// =============================================================================
// Interpreter Entry Points
// =============================================================================

/**
 * Create a UnitEvaluator callback for the dep graph.
 * This is called by the graph's pull mechanism when re-evaluation is needed.
 */
export function createUnitEvaluator(config: InterpreterConfig): UnitEvaluator {
  const checker = config.program.getTypeChecker();

  return (file: NormalizedPath, unitKey: string) => {
    const sf = config.program.getSourceFile(file);
    if (!sf) return;

    const units = enumerateUnits(sf, file);
    const unit = units.find(u => u.key === unitKey);
    if (!unit) return;

    evaluateUnit(sf, file, unit, config, checker);
  };
}

/**
 * Interpret all files in a project. Initial full evaluation.
 */
export function interpretProject(
  files: readonly NormalizedPath[],
  config: InterpreterConfig,
): void {
  const checker = config.program.getTypeChecker();

  for (const file of files) {
    const sf = config.program.getSourceFile(file);
    if (!sf) continue;

    interpretFile(sf, file, config, checker);
  }
}

/**
 * Interpret a single file — enumerate and evaluate all units,
 * scan for define() calls, and process paired HTML meta elements.
 */
function interpretFile(
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  config: InterpreterConfig,
  checker: ts.TypeChecker,
): void {
  const units = enumerateUnits(sf, filePath);
  const scope = buildFileScope(sf, filePath);

  // Track recognized classes so define() calls can find them
  const classMap = new Map<string, ClassValue>();
  // Track which classes were already recognized via explicit forms (decorator/$au)
  // Convention-recognized classes are NOT blocked — define() overrides convention
  const explicitlyRecognizedClasses = new Set<string>();

  for (const unit of units) {
    const handle = config.graph.tracer.pushContext(filePath, unit.key);
    if (handle.isCycle) continue;

    try {
      config.graph.tracer.readFile(filePath);
      const recognized = evaluateUnit(sf, filePath, unit, config, checker);
      if (recognized && recognized.source.tier === 'analysis-explicit') {
        explicitlyRecognizedClasses.add(unit.key);
      }
      // Collect class values for define() matching
      if (ts.isClassDeclaration(unit.node) && unit.node.name) {
        const cls = extractClassValue(unit.node, sf, filePath, checker);
        classMap.set(unit.node.name.text, cls);
      }
    } finally {
      config.graph.tracer.popContext(handle);
    }
  }

  // Scan for define() calls in expression statements
  scanDefineCallsInFile(sf, filePath, config, checker, scope, classMap, explicitlyRecognizedClasses);

  // Scan for Aurelia.register() calls (root registration sites)
  scanRootRegistrations(sf, filePath, config, scope);

  // Process paired HTML meta elements for convention-recognized resources
  if (filePath.endsWith('.ts')) {
    extractHtmlMetaObservations(sf, filePath, config, checker);
  }
}

/**
 * Evaluate a single unit: extract value, recognize resource, emit observations.
 * Returns the RecognizedResource if recognition succeeded, null otherwise.
 */
function evaluateUnit(
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  unit: EvaluationUnit,
  config: InterpreterConfig,
  checker: ts.TypeChecker,
): RecognizedResource | null {
  const { graph, program } = config;
  const scope = buildFileScope(sf, filePath);
  const tracingResolver = createTracingResolver(program, graph.tracer, filePath);

  // Extract the unit's AnalyzableValue
  let value;
  if (ts.isClassDeclaration(unit.node)) {
    graph.tracer.readTypeState(filePath);
    value = extractClassValue(unit.node, sf, filePath, checker);
    value = resolveInScope(value, scope);
    value = resolveWithTracer(value, scope, tracingResolver, filePath);
  } else if (ts.isVariableDeclaration(unit.node) && unit.node.initializer) {
    value = transformExpression(unit.node.initializer, sf);
    value = resolveInScope(value, scope);
    value = resolveWithTracer(value, scope, tracingResolver, filePath);
  } else if (ts.isFunctionDeclaration(unit.node)) {
    return null;
  } else {
    return null;
  }

  const recognized = recognizeResource(
    value,
    unit.key,
    filePath,
    config.enableConventions ?? true,
  );

  if (!recognized) return null;

  const evalNodeId = graph.tracer.pushContext(filePath, unit.key);
  if (!evalNodeId.isCycle) {
    graph.tracer.popContext(evalNodeId);
  }

  extractFieldObservations(
    recognized,
    value,
    graph.observations,
    evalNodeId.nodeId,
    checker,
  );

  return recognized;
}

/**
 * Scan top-level expression statements for define() calls.
 * Pattern: `CustomElement.define({ name: '...' }, MyClass)`
 */
function scanDefineCallsInFile(
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  config: InterpreterConfig,
  checker: ts.TypeChecker,
  scope: LexicalScope,
  classMap: Map<string, ClassValue>,
  recognizedClasses: Set<string>,
): void {
  const { graph, program } = config;
  const tracingResolver = createTracingResolver(program, graph.tracer, filePath);

  // Collect expression statements, including those inside if-blocks
  // at the module level. D10: static analysis produces gaps, never
  // silent swallowing — conditional define() calls are still recognized.
  const collected = collectModuleLevelExpressions(sf.statements);

  for (const { stmt: exprStmt } of collected) {
    const expr = transformExpression(exprStmt.expression, sf);
    const resolved = resolveInScope(expr, scope);
    const fullyResolved = resolveWithTracer(resolved, scope, tracingResolver, filePath);

    const recognized = recognizeDefineCall(fullyResolved, filePath, classMap);
    if (!recognized) continue;

    // If the target class was already recognized via decorator/$au, skip
    // (D2: two identity forms on one class → decorator wins, define() suppressed)
    if (recognized.className && recognizedClasses.has(recognized.className)) continue;

    const handle = config.graph.tracer.pushContext(filePath, `define:${recognized.name}`);
    if (handle.isCycle) continue;

    try {
      config.graph.tracer.readFile(filePath);

      // Find the class value to use for field extraction
      const cls = recognized.className ? classMap.get(recognized.className) : undefined;
      const value = cls ?? { kind: 'class' as const, className: recognized.className ?? 'anonymous', filePath, decorators: [], staticMembers: new Map(), bindableMembers: [], gaps: [], gapKinds: [] };

      extractFieldObservations(
        recognized,
        value as AnalyzableValue,
        graph.observations,
        handle.nodeId,
        checker,
      );
    } finally {
      config.graph.tracer.popContext(handle);
    }
  }
}

interface CollectedExpression {
  stmt: ts.ExpressionStatement;
  conditional: boolean;
}

/**
 * Collect expression statements from module-level statements,
 * descending into if-blocks and plain blocks but NOT into
 * function/class bodies. Tracks whether each expression is inside
 * a conditional (for gap generation on conditional registrations).
 */
function collectModuleLevelExpressions(
  statements: ts.NodeArray<ts.Statement> | readonly ts.Statement[],
  conditional: boolean = false,
): CollectedExpression[] {
  const result: CollectedExpression[] = [];

  for (const stmt of statements) {
    if (ts.isExpressionStatement(stmt)) {
      result.push({ stmt, conditional });
    } else if (ts.isIfStatement(stmt)) {
      // Descend into if/else blocks — expressions inside are conditional
      if (ts.isBlock(stmt.thenStatement)) {
        result.push(...collectModuleLevelExpressions(stmt.thenStatement.statements, true));
      } else if (ts.isExpressionStatement(stmt.thenStatement)) {
        result.push({ stmt: stmt.thenStatement, conditional: true });
      }
      if (stmt.elseStatement) {
        if (ts.isBlock(stmt.elseStatement)) {
          result.push(...collectModuleLevelExpressions(stmt.elseStatement.statements, true));
        } else if (ts.isExpressionStatement(stmt.elseStatement)) {
          result.push({ stmt: stmt.elseStatement, conditional: true });
        }
      }
    } else if (ts.isBlock(stmt)) {
      result.push(...collectModuleLevelExpressions(stmt.statements, conditional));
    }
    // Do NOT descend into function/class bodies
  }

  return result;
}

// =============================================================================
// Root Registration Scanning — Aurelia.register() calls
// =============================================================================

/**
 * Structured root registration observation.
 * Each entry is either a resolved class reference or a gap.
 */
export type RootRegistrationEntry =
  | { kind: 'class-ref'; classRef: string; site: NormalizedPath }
  | { kind: 'gap'; reason: string; site: NormalizedPath };

/**
 * Scan a file for Aurelia.register() call patterns.
 *
 * Patterns recognized:
 * - Aurelia.register(X, Y, Z)
 * - new Aurelia().register(X)
 * - Chained: Aurelia.register(X).app(App).start()
 *
 * Each argument is classified: identifiers that reference classes
 * become class-ref entries; opaque expressions (call results, spreads,
 * property access chains) become gap entries. Gaps prevent scope
 * completeness — the false-closed-world bug requires carrying them.
 */
function scanRootRegistrations(
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  config: InterpreterConfig,
  scope: LexicalScope,
): void {
  const entries: RootRegistrationEntry[] = [];

  const collected = collectModuleLevelExpressions(sf.statements);
  for (const { stmt: exprStmt, conditional } of collected) {
    const beforeCount = entries.length;
    findRegisterCalls(exprStmt.expression, sf, filePath, scope, entries, config);

    // If this expression was inside a conditional (if-block) and it
    // produced registrations, add a gap — we can't determine at compile
    // time whether the branch executes.
    if (conditional && entries.length > beforeCount) {
      entries.push({ kind: 'gap', reason: 'conditional-registration', site: filePath });
    }
  }

  if (entries.length === 0) return;

  const { graph } = config;
  const evalHandle = graph.tracer.pushContext(filePath, 'root-registrations');
  if (evalHandle.isCycle) return;

  try {
    graph.tracer.readFile(filePath);

    // Separate class refs and gaps
    const classRefs = entries.filter(e => e.kind === 'class-ref') as Extract<RootRegistrationEntry, { kind: 'class-ref' }>[];
    const gapEntries = entries.filter(e => e.kind === 'gap') as Extract<RootRegistrationEntry, { kind: 'gap' }>[];

    // Emit registrations observation (class refs)
    if (classRefs.length > 0 || gapEntries.length > 0) {
      const elements = classRefs.map(r =>
        ({ kind: 'literal' as const, value: `class:${r.classRef}` })
      );
      const green = { kind: 'array' as const, elements };
      const red = {
        origin: 'source' as const,
        state: 'known' as const,
        value: classRefs.map(r => `class:${r.classRef}`),
      };

      graph.observations.registerObservation(
        'root-registrations',
        'registrations',
        { tier: 'analysis-explicit', form: 'aurelia-register' },
        green,
        red as any,
        evalHandle.nodeId,
      );
    }

    // Emit gaps observation
    if (gapEntries.length > 0) {
      const gapReasons = gapEntries.map(g => g.reason);
      const gapGreen = {
        kind: 'array' as const,
        elements: gapReasons.map(r => ({ kind: 'literal' as const, value: r })),
      };
      const gapRed = {
        origin: 'source' as const,
        state: 'known' as const,
        value: gapReasons,
      };

      graph.observations.registerObservation(
        'root-registrations',
        'gaps',
        { tier: 'analysis-explicit', form: 'aurelia-register' },
        gapGreen,
        gapRed as any,
        evalHandle.nodeId,
      );
    }
  } finally {
    graph.tracer.popContext(evalHandle);
  }
}

/**
 * Walk a call chain to find .register() calls on Aurelia receivers.
 *
 * Handles:
 * - Direct: Aurelia.register(X).app(App).start()
 * - Helper wrapping: registerApp(Aurelia).app(App).start()
 *   (bounded interprocedural: one level into the helper body)
 *
 * The AST is nested: start(app(register(Aurelia, X), App))
 * We walk the receiver chain to find all .register() calls.
 */
function findRegisterCalls(
  expr: ts.Expression,
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  scope: LexicalScope,
  out: RootRegistrationEntry[],
  config?: InterpreterConfig,
): void {
  if (!ts.isCallExpression(expr)) return;

  const callee = expr.expression;

  // Case 1: Property access — .register() or other chained method
  if (ts.isPropertyAccessExpression(callee)) {
    if (callee.name.text === 'register' && isAureliaReceiver(callee.expression)) {
      for (const arg of expr.arguments) {
        const entries = classifyRegisterArg(arg, filePath);
        out.push(...entries);

        // Bounded interprocedural: if any entry is a class-ref, trace into
        // its .register() method (IRegistry plugin pattern)
        for (const entry of entries) {
          if (entry.kind === 'class-ref' && config) {
            tracePluginRegistration(entry.classRef, sf, filePath, out, config);
          }
        }
      }
    }

    // Recurse into chained call receiver
    if (ts.isCallExpression(callee.expression)) {
      findRegisterCalls(callee.expression, sf, filePath, scope, out, config);
    }
    return;
  }

  // Case 2: Plain function call — registerApp(Aurelia)
  // Bounded interprocedural: if a function is called with Aurelia as an
  // argument, trace into the function body one level.
  if (ts.isIdentifier(callee) && config) {
    const aureliaArgIdx = findAureliaArgIndex(expr.arguments, sf);
    if (aureliaArgIdx >= 0) {
      traceHelperFunction(callee.text, aureliaArgIdx, sf, filePath, out, config);
    }
  }
}

/**
 * Check if an expression is an Aurelia receiver:
 * - Identifier `Aurelia` (direct or alias via `const au = Aurelia`)
 * - `new Aurelia()`
 * - Chained call result (e.g., `Aurelia.register(X)` returns Aurelia)
 */
function isAureliaReceiver(expr: ts.Expression): boolean {
  // Direct identifier: Aurelia
  if (ts.isIdentifier(expr)) {
    if (expr.text === 'Aurelia') return true;
    // Check if this identifier is an alias: `const au = Aurelia`
    // Walk up to find the variable declaration
    const sf = expr.getSourceFile();
    if (sf) {
      for (const stmt of sf.statements) {
        if (ts.isVariableStatement(stmt)) {
          for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === expr.text) {
              if (decl.initializer && ts.isIdentifier(decl.initializer) && decl.initializer.text === 'Aurelia') {
                return true;
              }
              if (decl.initializer && ts.isNewExpression(decl.initializer) &&
                  ts.isIdentifier(decl.initializer.expression) && decl.initializer.expression.text === 'Aurelia') {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  // new Aurelia()
  if (ts.isNewExpression(expr)) {
    if (ts.isIdentifier(expr.expression) && expr.expression.text === 'Aurelia') return true;
  }

  // Chained call: result of previous .register() or .app() call on Aurelia
  if (ts.isCallExpression(expr)) {
    const innerCallee = expr.expression;
    if (ts.isPropertyAccessExpression(innerCallee)) {
      return isAureliaReceiver(innerCallee.expression);
    }
  }

  return false;
}

// =============================================================================
// Bounded Interprocedural Registration Tracing
// =============================================================================

/**
 * Check if any argument to a call is an Aurelia instance.
 * Returns the argument index, or -1 if none found.
 */
function findAureliaArgIndex(
  args: ts.NodeArray<ts.Expression>,
  sf: ts.SourceFile,
): number {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (ts.isIdentifier(arg) && isAureliaReceiver(arg)) return i;
  }
  return -1;
}

/**
 * Trace into a helper function that wraps Aurelia.register().
 *
 * Pattern: registerApp(Aurelia) where registerApp's body contains
 * au.register(X, Y). One level of call depth only.
 *
 * Finds the function declaration (same-file or imported), identifies
 * the parameter that receives Aurelia, and scans the body for
 * .register() calls on that parameter.
 */
function traceHelperFunction(
  funcName: string,
  aureliaArgIdx: number,
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  out: RootRegistrationEntry[],
  config: InterpreterConfig,
): void {
  // Find the function declaration in the same file
  let funcBody: ts.Block | undefined;
  let paramName: string | undefined;

  for (const stmt of sf.statements) {
    // Function declaration: function registerApp(au) { ... }
    if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === funcName && stmt.body) {
      funcBody = stmt.body;
      paramName = stmt.parameters[aureliaArgIdx]?.name.getText(sf);
      break;
    }
    // Variable declaration: const registerApp = function(au) { ... }
    // or arrow function: const registerApp = (au) => { ... }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || decl.name.text !== funcName) continue;
        if (!decl.initializer) continue;

        if (ts.isFunctionExpression(decl.initializer) && decl.initializer.body) {
          funcBody = decl.initializer.body;
          paramName = decl.initializer.parameters[aureliaArgIdx]?.name.getText(sf);
        } else if (ts.isArrowFunction(decl.initializer)) {
          if (ts.isBlock(decl.initializer.body)) {
            funcBody = decl.initializer.body;
          }
          paramName = decl.initializer.parameters[aureliaArgIdx]?.name.getText(sf);
        }
      }
    }
  }

  // Also check imports — the function might be imported from another file
  if (!funcBody) {
    const imported = findImportedFunctionBody(funcName, aureliaArgIdx, sf, filePath, config);
    if (imported) {
      funcBody = imported.body;
      paramName = imported.paramName;
    }
  }

  if (!funcBody || !paramName) return;

  // Scan the function body for param.register(X) calls
  scanBodyForRegistrations(funcBody, paramName, filePath, out);
}

/**
 * Trace into a plugin object's .register() method.
 *
 * Pattern: Aurelia.register(MyPlugin) where MyPlugin = { register(container) { container.register(X) } }
 *
 * Finds the object literal, locates the `register` method, and scans
 * its body for container.register(X) calls.
 */
function tracePluginRegistration(
  identifier: string,
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  out: RootRegistrationEntry[],
  config: InterpreterConfig,
): void {
  // Find the declaration for this identifier
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== identifier) continue;
      if (!decl.initializer) continue;

      // Object literal: { register(container) { ... } }
      if (ts.isObjectLiteralExpression(decl.initializer)) {
        const registerMethod = findRegisterMethod(decl.initializer);
        if (registerMethod) {
          const paramName = registerMethod.parameters[0]?.name.getText(sf);
          if (paramName && registerMethod.body) {
            scanBodyForRegistrations(registerMethod.body, paramName, filePath, out);
          }
        }
      }
    }
  }

  // Also check imports
  const imported = findImportedObjectRegisterMethod(identifier, sf, filePath, config);
  if (imported) {
    scanBodyForRegistrations(imported.body, imported.paramName, filePath, out);
  }
}

/**
 * Find a `register` method on an object literal expression.
 */
function findRegisterMethod(obj: ts.ObjectLiteralExpression): ts.MethodDeclaration | undefined {
  for (const prop of obj.properties) {
    if (ts.isMethodDeclaration(prop) &&
        ts.isIdentifier(prop.name) &&
        prop.name.text === 'register' &&
        prop.body) {
      return prop;
    }
  }
  return undefined;
}

/**
 * Find an imported function's body by following the import chain.
 */
function findImportedFunctionBody(
  funcName: string,
  paramIdx: number,
  sf: ts.SourceFile,
  fromFile: NormalizedPath,
  config: InterpreterConfig,
): { body: ts.Block; paramName: string } | undefined {
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const specifier = stmt.moduleSpecifier.text;

    const namedBindings = stmt.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;

    for (const imp of namedBindings.elements) {
      if (imp.name.text !== funcName) continue;

      const targetSf = resolveModuleSourceFile(specifier, fromFile, config);
      if (!targetSf) return undefined;

      const exportName = imp.propertyName?.text ?? imp.name.text;
      return findFunctionInFile(exportName, paramIdx, targetSf);
    }
  }
  return undefined;
}

/**
 * Find an imported object's .register() method body.
 */
function findImportedObjectRegisterMethod(
  identifier: string,
  sf: ts.SourceFile,
  fromFile: NormalizedPath,
  config: InterpreterConfig,
): { body: ts.Block; paramName: string } | undefined {
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const specifier = stmt.moduleSpecifier.text;

    const namedBindings = stmt.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;

    for (const imp of namedBindings.elements) {
      if (imp.name.text !== identifier) continue;

      const targetSf = resolveModuleSourceFile(specifier, fromFile, config);
      if (!targetSf) return undefined;

      const exportName = imp.propertyName?.text ?? imp.name.text;
      return findObjectRegisterInFile(exportName, targetSf);
    }
  }
  return undefined;
}

/**
 * Find a function declaration/expression in a file and return its body.
 */
function findFunctionInFile(
  name: string,
  paramIdx: number,
  sf: ts.SourceFile,
): { body: ts.Block; paramName: string } | undefined {
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === name && stmt.body) {
      const paramName = stmt.parameters[paramIdx]?.name.getText(sf);
      if (paramName) return { body: stmt.body, paramName };
    }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || decl.name.text !== name) continue;
        if (!decl.initializer) continue;
        if (ts.isFunctionExpression(decl.initializer) && decl.initializer.body) {
          const paramName = decl.initializer.parameters[paramIdx]?.name.getText(sf);
          if (paramName) return { body: decl.initializer.body, paramName };
        }
        if (ts.isArrowFunction(decl.initializer) && ts.isBlock(decl.initializer.body)) {
          const paramName = decl.initializer.parameters[paramIdx]?.name.getText(sf);
          if (paramName) return { body: decl.initializer.body, paramName };
        }
      }
    }
  }
  return undefined;
}

/**
 * Find an exported object with a .register() method in a file.
 */
function findObjectRegisterInFile(
  name: string,
  sf: ts.SourceFile,
): { body: ts.Block; paramName: string } | undefined {
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== name) continue;
      if (!decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) continue;

      const method = findRegisterMethod(decl.initializer);
      if (method?.body) {
        const paramName = method.parameters[0]?.name.getText(sf);
        if (paramName) return { body: method.body, paramName };
      }
    }
  }
  return undefined;
}

/**
 * Resolve a module specifier to a SourceFile using the program.
 */
function resolveModuleSourceFile(
  specifier: string,
  fromFile: NormalizedPath,
  config: InterpreterConfig,
): ts.SourceFile | undefined {
  const { program } = config;

  // Use TypeScript's module resolution
  const resolved = ts.resolveModuleName(
    specifier,
    fromFile,
    program.getCompilerOptions(),
    {
      fileExists: (f) => program.getSourceFile(f) !== undefined || (ts.sys?.fileExists?.(f) ?? false),
      readFile: (f) => program.getSourceFile(f)?.text ?? ts.sys?.readFile?.(f),
      directoryExists: (d) => ts.sys?.directoryExists?.(d) ?? false,
    },
  );

  if (resolved.resolvedModule) {
    return program.getSourceFile(resolved.resolvedModule.resolvedFileName);
  }

  // Fallback for relative imports in test fixtures
  if (specifier.startsWith('.')) {
    const fromDir = fromFile.slice(0, fromFile.lastIndexOf('/'));
    const parts = specifier.split('/');
    const resultParts = fromDir.split('/');
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') { resultParts.pop(); continue; }
      resultParts.push(part);
    }
    const base = resultParts.join('/');
    for (const ext of ['.ts', '/index.ts', '.d.ts']) {
      const sf = program.getSourceFile(base + ext);
      if (sf) return sf;
    }
  }

  return undefined;
}

/**
 * Scan a function/method body for `paramName.register(X, Y)` calls.
 * Extracts registration arguments using the same classifyRegisterArg logic.
 * One level only — does not recurse into further function calls.
 *
 * Special handling for spreads of static arrays: if a spread argument
 * is a bare identifier that resolves to a static array declaration in
 * the same file, the array elements are extracted individually.
 */
function scanBodyForRegistrations(
  body: ts.Block,
  paramName: string,
  filePath: NormalizedPath,
  out: RootRegistrationEntry[],
): void {
  const bodySf = body.getSourceFile();

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isPropertyAccessExpression(callee) &&
          callee.name.text === 'register' &&
          ts.isIdentifier(callee.expression) &&
          callee.expression.text === paramName) {
        for (const arg of node.arguments) {
          // Special case: spread of a static identifier
          if (ts.isSpreadElement(arg) && ts.isIdentifier(arg.expression)) {
            const arrayElements = resolveStaticArray(arg.expression.text, bodySf);
            if (arrayElements) {
              for (const el of arrayElements) {
                out.push(...classifyRegisterArg(el, filePath));
              }
              continue;
            }
          }
          out.push(...classifyRegisterArg(arg, filePath));
        }
        return;
      }
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(body, visit);
}

/**
 * Resolve a static array identifier to its elements.
 * Handles: const appRegistrations = [X, Y, Z]
 * Returns the array element expressions, or undefined if not resolvable.
 */
function resolveStaticArray(
  name: string,
  sf: ts.SourceFile,
): readonly ts.Expression[] | undefined {
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== name) continue;
      if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer)) {
        return decl.initializer.elements;
      }
    }
  }
  return undefined;
}

/**
 * Classify a registration argument as class reference(s) and/or gap(s).
 *
 * Returns an array because some patterns produce BOTH a class-ref
 * (for plugin detection) AND a gap (for completeness). Example:
 * `I18nConfiguration.customize(cb)` — the base `I18nConfiguration` is
 * a known plugin identifier (class-ref), but the `.customize(cb)` call
 * means the configuration is opaque (gap).
 */
function classifyRegisterArg(
  arg: ts.Expression,
  filePath: NormalizedPath,
): RootRegistrationEntry[] {
  // Bare identifier: class reference (most common case)
  if (ts.isIdentifier(arg)) {
    return [{ kind: 'class-ref', classRef: arg.text, site: filePath }];
  }

  // Spread: ...getPlugins() or ...array — opaque
  if (ts.isSpreadElement(arg)) {
    const inner = arg.expression;
    const desc = ts.isIdentifier(inner) ? `spread:${inner.text}`
      : ts.isCallExpression(inner) ? 'spread:opaque-call'
      : 'spread:opaque';
    return [{ kind: 'gap', reason: desc, site: filePath }];
  }

  // Call expression: getPlugins(), Plugin.configure(...), etc.
  if (ts.isCallExpression(arg)) {
    const callee = arg.expression;

    // X.method(args) pattern — extract base identifier as class-ref
    // AND record the method call as a gap. Both signals are needed:
    // class-ref enables plugin detection, gap records the opaque config.
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
      return [
        { kind: 'class-ref', classRef: callee.expression.text, site: filePath },
        { kind: 'gap', reason: `opaque-call:${callee.name.text}`, site: filePath },
      ];
    }

    const desc = ts.isIdentifier(callee) ? `opaque-call:${callee.text}`
      : ts.isPropertyAccessExpression(callee) ? `opaque-call:${callee.name.text}`
      : 'opaque-call';
    return [{ kind: 'gap', reason: desc, site: filePath }];
  }

  // Property access: SomeModule.SomeClass — might be a class, treat as ref
  if (ts.isPropertyAccessExpression(arg)) {
    return [{ kind: 'class-ref', classRef: arg.name.text, site: filePath }];
  }

  // Anything else: conditional expressions, template literals, etc.
  return [{ kind: 'gap', reason: 'opaque-expression', site: filePath }];
}
