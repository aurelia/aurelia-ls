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

  for (const stmt of sf.statements) {
    if (!ts.isExpressionStatement(stmt)) continue;

    const expr = transformExpression(stmt.expression, sf);
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
