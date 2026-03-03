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
import type { EvaluationTracer } from '../graph/types.js';
import type {
  AnalyzableValue,
  LexicalScope,
  OnDemandResolver,
} from '../../project-semantics/evaluate/value/types.js';
import { buildFileScope, resolveInScope } from '../../project-semantics/evaluate/value/scope.js';
import { transformExpression } from '../../project-semantics/evaluate/value/transform.js';
import { canonicalPath } from '../../project-semantics/util/naming.js';

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

  // Build a module resolution host from the program's source files.
  // This is critical for in-memory test fixtures where ts.sys cannot
  // find the files on disk.
  const resolveHost = createProgramResolutionHost(program);

  const resolver: OnDemandResolver = (specifier: string, exportName: string, requestingFile: NormalizedPath) => {
    // Resolve the module specifier to a file path
    const resolved = ts.resolveModuleName(
      specifier,
      requestingFile,
      program.getCompilerOptions(),
      resolveHost,
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

      // Look up the exported value — check bindings first, then imports
      // (imports include re-export bindings from `export { X } from './y'`)
      let result: AnalyzableValue | null = null;
      const binding = scope.bindings.get(exportName);
      if (binding) {
        result = resolveInScope(binding, scope);
        // Multi-hop: resolve imports within the resolved value so that
        // values flowing through intermediary files are fully resolved.
        result = resolveWithTracer(result, scope, resolver, targetPath);
      } else if (scope.imports.has(exportName)) {
        // Re-export: the name is an import binding pointing to another module.
        // Resolve it by following the import chain.
        const importBinding = scope.imports.get(exportName)!;
        const reResolved = resolver(importBinding.specifier, importBinding.exportName, targetPath);
        if (reResolved) {
          result = reResolved;
        }
      } else if (exportName === 'default') {
        const defaultBinding = scope.bindings.get('default');
        if (defaultBinding) {
          result = resolveInScope(defaultBinding, scope);
          result = resolveWithTracer(result, scope, resolver, targetPath);
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

  return resolver;
}

// =============================================================================
// Program Resolution Host
// =============================================================================

/**
 * Create a ModuleResolutionHost that uses the program's source files.
 *
 * ts.resolveModuleName needs a host to check fileExists/readFile.
 * Using ts.sys directly fails for in-memory test fixtures. This host
 * checks the program's source files first, then falls back to ts.sys.
 */
function createProgramResolutionHost(program: ts.Program): ts.ModuleResolutionHost {
  const normalize = (f: string) => f.replace(/\\/g, '/');

  // Index all source files by their canonical path
  const fileMap = new Map<string, ts.SourceFile>();
  for (const sf of program.getSourceFiles()) {
    fileMap.set(normalize(sf.fileName), sf);
  }

  // Collect directory paths from all source files
  const dirs = new Set<string>();
  for (const path of fileMap.keys()) {
    let dir = path;
    while ((dir = dir.substring(0, dir.lastIndexOf('/'))) && dir !== '') {
      dirs.add(dir);
    }
    dirs.add('/');
  }

  return {
    fileExists: (f) => fileMap.has(normalize(f)) || (ts.sys?.fileExists?.(f) ?? false),
    readFile: (f) => {
      const sf = fileMap.get(normalize(f));
      return sf ? sf.text : ts.sys?.readFile?.(f);
    },
    directoryExists: (d) => {
      return dirs.has(normalize(d)) || (ts.sys?.directoryExists?.(d) ?? false);
    },
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
      let hasSpread = false;
      for (const [k, v] of value.properties) {
        properties.set(k, resolveValue(v, scope, resolver, fromFile, seen));
        if (k.startsWith('__spread_')) hasSpread = true;
      }
      // Object spread merge: after import resolution, spread targets
      // may now be resolved objects that can be merged
      if (hasSpread) {
        const merged = mergeObjectSpreads(properties);
        if (merged) {
          return { ...value, properties: merged };
        }
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

    case 'class': {
      // Resolve values inside class: decorator args, static members, bindable args
      let changed = false;
      const decorators = value.decorators.map(dec => {
        const args = dec.args.map(a => resolveValue(a, scope, resolver, fromFile, seen));
        if (args.some((a, i) => a !== dec.args[i])) { changed = true; return { ...dec, args }; }
        return dec;
      });
      const staticMembers = new Map<string, AnalyzableValue>();
      for (const [k, v] of value.staticMembers) {
        const r = resolveValue(v, scope, resolver, fromFile, seen);
        staticMembers.set(k, r);
        if (r !== v) changed = true;
      }
      const bindableMembers = value.bindableMembers.map(bm => {
        const args = bm.args.map(a => resolveValue(a, scope, resolver, fromFile, seen));
        if (args.some((a, i) => a !== bm.args[i])) { changed = true; return { ...bm, args }; }
        return bm;
      });
      if (!changed) return value;
      return { ...value, decorators, staticMembers, bindableMembers };
    }

    default:
      return value;
  }
}

/**
 * Follow reference/import chains to get the resolved leaf value.
 */
function getResolvedLeaf(value: AnalyzableValue): AnalyzableValue {
  if (value.kind === 'reference' && value.resolved) return getResolvedLeaf(value.resolved);
  if (value.kind === 'import' && value.resolved) return getResolvedLeaf(value.resolved);
  return value;
}

/**
 * Merge object spread entries after cross-file resolution.
 */
function mergeObjectSpreads(
  properties: Map<string, AnalyzableValue>,
): Map<string, AnalyzableValue> | null {
  let anyMerged = false;
  const result = new Map<string, AnalyzableValue>();

  for (const [key, value] of properties) {
    if (key.startsWith('__spread_')) {
      const target = value.kind === 'spread' ? getResolvedLeaf(value.target) : getResolvedLeaf(value);
      if (target?.kind === 'object') {
        for (const [sk, sv] of target.properties) {
          result.set(sk, sv);
        }
        anyMerged = true;
      } else {
        result.set(key, value);
      }
    } else {
      result.set(key, value);
    }
  }

  return anyMerged ? result : null;
}
