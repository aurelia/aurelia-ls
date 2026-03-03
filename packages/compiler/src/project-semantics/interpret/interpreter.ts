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
import type { ProjectDepGraph } from '../deps/types.js';
import type { UnitEvaluator } from '../deps/types.js';
import { buildFileScope } from '../evaluate/value/scope.js';
import { extractClassValue } from '../evaluate/value/class-extraction.js';
import { transformExpression } from '../evaluate/value/transform.js';
import { resolveInScope } from '../evaluate/value/scope.js';
import { createTracingResolver, resolveWithTracer } from './resolve.js';
import { recognizeResource, recognizeDefineCall, type RecognizedResource } from './recognize.js';
import { extractFieldObservations } from './extract-fields.js';
import { extractHtmlMetaObservations } from './html-meta.js';
import type { ClassValue } from '../evaluate/value/types.js';

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
  scope: import('../evaluate/value/types.js').LexicalScope,
  classMap: Map<string, ClassValue>,
  recognizedClasses: Set<string>,
): void {
  const { graph, program } = config;
  const tracingResolver = createTracingResolver(program, graph.tracer, filePath);

  // Collect expression statements, including those inside if-blocks
  // at the module level. D10: static analysis produces gaps, never
  // silent swallowing — conditional define() calls are still recognized.
  const exprStmts = collectModuleLevelExpressions(sf.statements);

  for (const exprStmt of exprStmts) {
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
        value as import('../evaluate/value/types.js').AnalyzableValue,
        graph.observations,
        handle.nodeId,
        checker,
      );
    } finally {
      config.graph.tracer.popContext(handle);
    }
  }
}

/**
 * Collect expression statements from module-level statements,
 * descending into if-blocks and plain blocks but NOT into
 * function/class bodies. This finds define() calls inside
 * conditionals (D10: produce gaps, never swallow).
 */
function collectModuleLevelExpressions(
  statements: ts.NodeArray<ts.Statement> | readonly ts.Statement[],
): ts.ExpressionStatement[] {
  const result: ts.ExpressionStatement[] = [];

  for (const stmt of statements) {
    if (ts.isExpressionStatement(stmt)) {
      result.push(stmt);
    } else if (ts.isIfStatement(stmt)) {
      // Descend into if/else blocks
      if (ts.isBlock(stmt.thenStatement)) {
        result.push(...collectModuleLevelExpressions(stmt.thenStatement.statements));
      } else if (ts.isExpressionStatement(stmt.thenStatement)) {
        result.push(stmt.thenStatement);
      }
      if (stmt.elseStatement) {
        if (ts.isBlock(stmt.elseStatement)) {
          result.push(...collectModuleLevelExpressions(stmt.elseStatement.statements));
        } else if (ts.isExpressionStatement(stmt.elseStatement)) {
          result.push(stmt.elseStatement);
        }
      }
    } else if (ts.isBlock(stmt)) {
      result.push(...collectModuleLevelExpressions(stmt.statements));
    }
    // Do NOT descend into function/class bodies — those are tier D
  }

  return result;
}

// =============================================================================
// Root Registration Scanning — Aurelia.register() calls
// =============================================================================

/**
 * Structured root registration observation.
 * Each entry identifies a class that was registered in the root container.
 */
export interface RootRegistration {
  /** Class name or import reference string */
  readonly classRef: string;
  /** File that contains the registration call site */
  readonly site: NormalizedPath;
}

/**
 * Scan a file for Aurelia.register() call patterns.
 *
 * Patterns recognized:
 * - Aurelia.register(X, Y, Z)
 * - new Aurelia().register(X)
 * - Chained: Aurelia.register(X).app(App).start()
 *
 * Each argument that resolves to a class reference becomes a root
 * registration observation on a well-known "root-registrations" resource.
 */
function scanRootRegistrations(
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  config: InterpreterConfig,
  scope: import('../evaluate/value/types.js').LexicalScope,
): void {
  const registrations: RootRegistration[] = [];

  // Collect all expression statements at module level
  const exprStmts = collectModuleLevelExpressions(sf.statements);

  for (const exprStmt of exprStmts) {
    findRegisterCalls(exprStmt.expression, sf, filePath, scope, registrations);
  }

  if (registrations.length === 0) return;

  // Emit root registration observations
  const { graph } = config;
  const evalHandle = graph.tracer.pushContext(filePath, 'root-registrations');
  if (evalHandle.isCycle) return;

  try {
    graph.tracer.readFile(filePath);

    // Build green value: array of class ref strings
    const elements = registrations.map(r =>
      ({ kind: 'literal' as const, value: `class:${r.classRef}` })
    );
    const green = { kind: 'array' as const, elements };
    const red = {
      origin: 'source' as const,
      state: 'known' as const,
      value: registrations.map(r => `class:${r.classRef}`),
    };

    graph.observations.registerObservation(
      'root-registrations',
      'registrations',
      { tier: 'analysis-explicit', form: 'aurelia-register' },
      green,
      red as any,
      evalHandle.nodeId,
    );
  } finally {
    graph.tracer.popContext(evalHandle);
  }
}

/**
 * Walk a call chain to find .register() calls on Aurelia receivers.
 *
 * Handles chaining: Aurelia.register(X).app(App).start()
 * The AST for this is nested: start(app(register(Aurelia, X), App))
 * We walk the receiver chain (each call's callee.expression) to find
 * all .register() calls.
 */
function findRegisterCalls(
  expr: ts.Expression,
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  scope: import('../evaluate/value/types.js').LexicalScope,
  out: RootRegistration[],
): void {
  if (!ts.isCallExpression(expr)) return;

  const callee = expr.expression;
  if (!ts.isPropertyAccessExpression(callee)) return;

  // Check if this is a .register() call on an Aurelia receiver
  if (callee.name.text === 'register' && isAureliaReceiver(callee.expression)) {
    for (const arg of expr.arguments) {
      const classRef = extractClassRefFromArg(arg, sf, scope);
      if (classRef) {
        out.push({ classRef, site: filePath });
      }
    }
  }

  // Walk the receiver chain for deeper .register() calls
  // E.g., Aurelia.register(A).register(B).app(C).start()
  // The receiver of .app() is .register(B), whose receiver is .register(A)
  if (ts.isCallExpression(callee.expression)) {
    findRegisterCalls(callee.expression, sf, filePath, scope, out);
  }
}

/**
 * Check if an expression is an Aurelia receiver:
 * - Identifier `Aurelia`
 * - `new Aurelia()`
 * - Import of `Aurelia` / `default` from 'aurelia'
 */
function isAureliaReceiver(expr: ts.Expression): boolean {
  // Direct identifier: Aurelia
  if (ts.isIdentifier(expr) && expr.text === 'Aurelia') return true;

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

/**
 * Extract a class name from a registration argument.
 *
 * Args can be:
 * - Identifier (local class reference)
 * - Import (cross-file class reference)
 * - Call expression (plugin: SomePlugin.configure(...)) — gap
 */
function extractClassRefFromArg(
  arg: ts.Expression,
  sf: ts.SourceFile,
  scope: import('../evaluate/value/types.js').LexicalScope,
): string | null {
  if (ts.isIdentifier(arg)) {
    return arg.text;
  }

  // Spread: ...args — gap
  if (ts.isSpreadElement(arg)) {
    return null;
  }

  // Property access: SomeModule.SomeClass
  if (ts.isPropertyAccessExpression(arg)) {
    return arg.name.text;
  }

  // Other complex expressions (function calls, etc.) — gap
  return null;
}
