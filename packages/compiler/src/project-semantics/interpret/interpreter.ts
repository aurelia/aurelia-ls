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
import { recognizeResource, type RecognizedResource } from './recognize.js';
import { extractFieldObservations } from './extract-fields.js';

// =============================================================================
// Interpreter Configuration
// =============================================================================

export interface InterpreterConfig {
  readonly program: ts.Program;
  readonly graph: ProjectDepGraph;
  readonly packagePath: string;
  readonly enableConventions?: boolean;
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
 * Interpret a single file — enumerate and evaluate all units.
 */
function interpretFile(
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  config: InterpreterConfig,
  checker: ts.TypeChecker,
): void {
  const units = enumerateUnits(sf, filePath);

  for (const unit of units) {
    const handle = config.graph.tracer.pushContext(filePath, unit.key);
    if (handle.isCycle) continue;

    try {
      config.graph.tracer.readFile(filePath);
      evaluateUnit(sf, filePath, unit, config, checker);
    } finally {
      config.graph.tracer.popContext(handle);
    }
  }
}

/**
 * Evaluate a single unit: extract value, recognize resource, emit observations.
 */
function evaluateUnit(
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  unit: EvaluationUnit,
  config: InterpreterConfig,
  checker: ts.TypeChecker,
): void {
  const { graph, program } = config;
  const scope = buildFileScope(sf, filePath);
  const tracingResolver = createTracingResolver(program, graph.tracer, filePath);

  // Extract the unit's AnalyzableValue
  let value;
  if (ts.isClassDeclaration(unit.node)) {
    // Record type-state dependency for class analysis
    graph.tracer.readTypeState(filePath);
    value = extractClassValue(unit.node, sf, filePath, checker);
    value = resolveInScope(value, scope);
    value = resolveWithTracer(value, scope, tracingResolver, filePath);
  } else if (ts.isVariableDeclaration(unit.node) && unit.node.initializer) {
    value = transformExpression(unit.node.initializer, sf);
    value = resolveInScope(value, scope);
    value = resolveWithTracer(value, scope, tracingResolver, filePath);
  } else if (ts.isFunctionDeclaration(unit.node)) {
    // Functions are units for registration analysis, not resource declaration
    return;
  } else {
    return;
  }

  // Recognize if this unit declares a resource
  const recognized = recognizeResource(
    value,
    unit.key,
    filePath,
    config.enableConventions ?? true,
  );

  if (!recognized) return;

  // Extract per-field observations and register them
  const evalNodeId = graph.tracer.pushContext(filePath, unit.key);
  if (!evalNodeId.isCycle) {
    // We already have the context from the caller — use its nodeId
    graph.tracer.popContext(evalNodeId);
  }

  extractFieldObservations(
    recognized,
    value,
    graph.observations,
    // Use the evaluation node ID from the outer push
    // (the caller already pushed this context)
    evalNodeId.nodeId,
    checker,
  );
}
