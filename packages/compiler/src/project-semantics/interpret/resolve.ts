/**
 * Tracer-Integrated Import Resolution
 *
 * Wraps the existing cross-file resolution with EvaluationTracer events.
 * When the interpreter resolves an import, it records:
 * - tracer.readFile(targetFile) — file dependency
 * - tracer.readEvaluation(targetFile, exportName) — evaluation dependency
 *
 * Design decision D2: file access and evaluation access are separate
 * tracer events. This decomposition enables fine-grained invalidation.
 */

import ts from 'typescript';
import type { NormalizedPath } from '../../model/identity.js';
import type { EvaluationTracer } from '../deps/types.js';
import type {
  AnalyzableValue,
  LexicalScope,
  OnDemandResolver,
} from '../evaluate/value/types.js';
import { buildFileScope, resolveInScope } from '../evaluate/value/scope.js';
import { transformExpression } from '../evaluate/value/transform.js';
import { canonicalPath } from '../util/naming.js';

// =============================================================================
// Tracing On-Demand Resolver
// =============================================================================

/**
 * Create an OnDemandResolver that records tracer events for every
 * cross-file resolution.
 */
export function createTracingResolver(
  program: ts.Program,
  tracer: EvaluationTracer,
  fromFile: NormalizedPath,
): OnDemandResolver {
  const scopeCache = new Map<NormalizedPath, LexicalScope>();
  const resolving = new Set<string>();

  return (specifier: string, exportName: string, requestingFile: NormalizedPath) => {
    // Resolve the module specifier to a file path
    const resolved = ts.resolveModuleName(
      specifier,
      requestingFile,
      program.getCompilerOptions(),
      ts.sys,
    );

    const resolvedModule = resolved.resolvedModule;
    if (!resolvedModule) return null;

    const targetPath = canonicalPath(resolvedModule.resolvedFileName) as NormalizedPath;
    const targetSf = program.getSourceFile(resolvedModule.resolvedFileName);
    if (!targetSf) return null;

    // D2 decomposition: file access and evaluation access are separate events
    // 1. Record file dependency
    tracer.readFile(targetPath);

    // 2. Push evaluation context for the target unit
    const handle = tracer.pushContext(targetPath, exportName);
    if (handle.isCycle) {
      // Circular import — record the cross-evaluation edge and return null
      // (forward ref resolution will be added with ForwardRef integration)
      tracer.readEvaluation(targetPath, exportName);
      return null;
    }

    // Cycle detection (in-progress resolution within this resolver instance)
    const cycleKey = `${targetPath}#${exportName}`;
    if (resolving.has(cycleKey)) {
      tracer.popContext(handle);
      tracer.readEvaluation(targetPath, exportName);
      return null;
    }
    resolving.add(cycleKey);

    try {
      // Record file read within B's context (B depends on its own file)
      tracer.readFile(targetPath);

      // Build or retrieve scope for target file
      let scope = scopeCache.get(targetPath);
      if (!scope) {
        scope = buildFileScope(targetSf, targetPath);
        scopeCache.set(targetPath, scope);
      }

      // Look up the exported value
      let result: AnalyzableValue | null = null;
      const binding = scope.bindings.get(exportName);
      if (binding) {
        result = resolveInScope(binding, scope);
      } else if (exportName === 'default') {
        const defaultBinding = scope.bindings.get('default');
        if (defaultBinding) {
          result = resolveInScope(defaultBinding, scope);
        }
      }

      // Pop B's evaluation context
      tracer.popContext(handle);

      // 3. Record cross-evaluation dependency (A depends on B's result)
      tracer.readEvaluation(targetPath, exportName);

      return result;
    } catch (e) {
      tracer.popContext(handle);
      tracer.readEvaluation(targetPath, exportName);
      throw e;
    } finally {
      resolving.delete(cycleKey);
    }
  };
}

// =============================================================================
// Resolve with Tracer
// =============================================================================

/**
 * Resolve imports in an AnalyzableValue tree using a tracing resolver.
 *
 * Walks the value tree and resolves ImportValue nodes via the
 * on-demand resolver (which records tracer events).
 */
export function resolveWithTracer(
  value: AnalyzableValue,
  scope: LexicalScope,
  resolver: OnDemandResolver,
  fromFile: NormalizedPath,
): AnalyzableValue {
  return resolveValue(value, scope, resolver, fromFile, new Set());
}

function resolveValue(
  value: AnalyzableValue,
  scope: LexicalScope,
  resolver: OnDemandResolver,
  fromFile: NormalizedPath,
  seen: Set<string>,
): AnalyzableValue {
  switch (value.kind) {
    case 'import': {
      if (value.resolved) return value;
      const resolved = resolver(value.specifier, value.exportName, fromFile);
      if (resolved) {
        return { ...value, resolved };
      }
      return value;
    }

    case 'reference': {
      if (value.resolved) {
        return {
          ...value,
          resolved: resolveValue(value.resolved, scope, resolver, fromFile, seen),
        };
      }
      return value;
    }

    case 'array':
      return {
        ...value,
        elements: value.elements.map(el => resolveValue(el, scope, resolver, fromFile, seen)),
      };

    case 'object': {
      const properties = new Map<string, AnalyzableValue>();
      for (const [k, v] of value.properties) {
        properties.set(k, resolveValue(v, scope, resolver, fromFile, seen));
      }
      return { ...value, properties };
    }

    case 'propertyAccess':
      return {
        ...value,
        base: resolveValue(value.base, scope, resolver, fromFile, seen),
      };

    case 'call':
      return {
        ...value,
        callee: resolveValue(value.callee, scope, resolver, fromFile, seen),
        args: value.args.map(a => resolveValue(a, scope, resolver, fromFile, seen)),
      };

    case 'spread':
      return {
        ...value,
        target: resolveValue(value.target, scope, resolver, fromFile, seen),
      };

    case 'new':
      return {
        ...value,
        callee: resolveValue(value.callee, scope, resolver, fromFile, seen),
        args: value.args.map(a => resolveValue(a, scope, resolver, fromFile, seen)),
      };

    default:
      return value;
  }
}
