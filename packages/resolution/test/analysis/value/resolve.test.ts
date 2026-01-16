/**
 * Cross-File Resolution Tests (Layer 3)
 *
 * Tests for resolving ImportValue nodes across file boundaries.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import ts from 'typescript';
import type { NormalizedPath } from '@aurelia-ls/compiler';
import {
  // Value constructors
  literal,
  array,
  object,
  ref,
  importVal,
  propAccess,
  call,
  spread,
  classVal,
  method,
  // Statement constructors
  exprStmt,
  returnStmt,
  // Types
  type AnalyzableValue,
  type LexicalScope,
  type ResolutionContext,
  type ExportBindingMap,
  // Layer 3
  buildResolutionContext,
  resolveImportsCrossFile,
  resolveImport,
  fullyResolve,
} from '../../../src/analysis/value/index.js';
import type { FileFacts, ImportDeclaration } from '../../../src/extraction/file-facts.js';
import type { ResolvedExport } from '../../../src/binding/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

/** Default span for test import declarations */
const SPAN = { start: 0, end: 0 };

/**
 * Parse TypeScript source and return SourceFile.
 */
function parseSource(code: string, fileName: string = 'test.ts'): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS
  );
}

/**
 * Create a minimal LexicalScope for testing.
 */
function createScope(
  bindings: Record<string, AnalyzableValue>,
  imports: Record<string, { specifier: string; exportName: string; resolvedPath: NormalizedPath | null }> = {},
  filePath: NormalizedPath = '/test.ts' as NormalizedPath
): LexicalScope {
  return {
    bindings: new Map(Object.entries(bindings)),
    imports: new Map(Object.entries(imports)),
    parent: null,
    filePath,
  };
}

/**
 * Create FileFacts for testing (minimal version).
 * Only populates fields needed for cross-file resolution tests.
 */
function createFileFacts(
  path: NormalizedPath,
  imports: readonly ImportDeclaration[]
): FileFacts {
  return {
    path,
    imports,
    scope: createScope({}, {}, path),
    classes: [],
    exports: [],
    variables: [],
    functions: [],
    registrationCalls: [],
    defineCalls: [],
    gaps: [],
  };
}

/**
 * Create ExportBindingMap for testing.
 */
function createExportBindings(
  entries: Array<{
    file: NormalizedPath;
    exports: Record<string, { definitionPath: NormalizedPath; definitionName: string }>;
  }>
): ExportBindingMap {
  const map = new Map<NormalizedPath, Map<string, ResolvedExport>>();
  for (const entry of entries) {
    const fileBindings = new Map<string, ResolvedExport>();
    for (const [name, binding] of Object.entries(entry.exports)) {
      fileBindings.set(name, binding);
    }
    map.set(entry.file, fileBindings);
  }
  return map;
}

/**
 * Create a ResolutionContext for testing.
 */
function createContext(options: {
  scopes: Array<{ path: NormalizedPath; scope: LexicalScope }>;
  exports: Array<{ file: NormalizedPath; exports: Record<string, { definitionPath: NormalizedPath; definitionName: string }> }>;
  facts: Array<FileFacts>;
  packagePath?: string;
}): ResolutionContext {
  const fileScopes = new Map<NormalizedPath, LexicalScope>();
  for (const { path, scope } of options.scopes) {
    fileScopes.set(path, scope);
  }

  const fileFacts = new Map<NormalizedPath, FileFacts>();
  for (const fact of options.facts) {
    fileFacts.set(fact.path, fact);
  }

  return buildResolutionContext({
    fileScopes,
    exportBindings: createExportBindings(options.exports),
    fileFacts,
    packagePath: options.packagePath ?? '/pkg',
  });
}

// =============================================================================
// Test Suites
// =============================================================================

describe('Cross-File Resolution (Layer 3)', () => {
  // ===========================================================================
  // buildResolutionContext
  // ===========================================================================

  describe('buildResolutionContext', () => {
    it('creates context with empty collections', () => {
      const ctx = buildResolutionContext({
        fileScopes: new Map(),
        exportBindings: new Map(),
        fileFacts: new Map(),
        packagePath: '/pkg',
      });

      expect(ctx.fileScopes.size).toBe(0);
      expect(ctx.exportBindings.size).toBe(0);
      expect(ctx.fileFacts.size).toBe(0);
      expect(ctx.resolving.size).toBe(0);
      expect(ctx.gaps).toEqual([]);
      expect(ctx.packagePath).toBe('/pkg');
    });

    it('creates context with provided collections', () => {
      const scope = createScope({ Foo: classVal('Foo', '/foo.ts' as NormalizedPath) });
      const ctx = buildResolutionContext({
        fileScopes: new Map([['/foo.ts' as NormalizedPath, scope]]),
        exportBindings: createExportBindings([{
          file: '/foo.ts' as NormalizedPath,
          exports: { Foo: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'Foo' } },
        }]),
        fileFacts: new Map([['/foo.ts' as NormalizedPath, createFileFacts('/foo.ts' as NormalizedPath, [])]]),
        packagePath: '/my-pkg',
      });

      expect(ctx.fileScopes.size).toBe(1);
      expect(ctx.exportBindings.size).toBe(1);
      expect(ctx.fileFacts.size).toBe(1);
      expect(ctx.packagePath).toBe('/my-pkg');
    });
  });

  // ===========================================================================
  // resolveImport - Basic Cases
  // ===========================================================================

  describe('resolveImport - basic cases', () => {
    it('resolves named import to class definition', () => {
      const ctx = createContext({
        scopes: [
          { path: '/foo.ts' as NormalizedPath, scope: createScope({ FooElement: classVal('FooElement', '/foo.ts' as NormalizedPath) }, {}, '/foo.ts' as NormalizedPath) },
          { path: '/main.ts' as NormalizedPath, scope: createScope({}, { FooElement: { specifier: './foo', exportName: 'FooElement', resolvedPath: '/foo.ts' as NormalizedPath } }, '/main.ts' as NormalizedPath) },
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { FooElement: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'FooElement' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'FooElement', alias: null }], moduleSpecifier: './foo', resolvedPath: '/foo.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const imp = importVal('./foo', 'FooElement');
      const result = resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('import');
      if (result.kind === 'import') {
        expect(result.resolved?.kind).toBe('class');
        if (result.resolved?.kind === 'class') {
          expect(result.resolved.className).toBe('FooElement');
          expect(result.resolved.filePath).toBe('/foo.ts');
        }
      }
    });

    it('resolves default import', () => {
      const ctx = createContext({
        scopes: [
          { path: '/config.ts' as NormalizedPath, scope: createScope({ Config: object(new Map()) }, {}, '/config.ts' as NormalizedPath) },
          { path: '/main.ts' as NormalizedPath, scope: createScope({}, { Config: { specifier: './config', exportName: 'default', resolvedPath: '/config.ts' as NormalizedPath } }, '/main.ts' as NormalizedPath) },
        ],
        exports: [
          { file: '/config.ts' as NormalizedPath, exports: { default: { definitionPath: '/config.ts' as NormalizedPath, definitionName: 'Config' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'default', alias: 'Config', moduleSpecifier: './config', resolvedPath: '/config.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const imp = importVal('./config', 'default');
      const result = resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('import');
      if (result.kind === 'import') {
        expect(result.resolved?.kind).toBe('object');
      }
    });

    it('resolves import with pre-populated resolvedPath', () => {
      const ctx = createContext({
        scopes: [
          { path: '/foo.ts' as NormalizedPath, scope: createScope({ Foo: literal('foo-value') }, {}, '/foo.ts' as NormalizedPath) },
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { Foo: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'Foo' } } },
        ],
        facts: [],
      });

      // Import already has resolvedPath - doesn't need FileFacts lookup
      const imp = importVal('./foo', 'Foo', '/foo.ts' as NormalizedPath);
      const result = resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('import');
      if (result.kind === 'import') {
        expect(result.resolved?.kind).toBe('literal');
      }
    });
  });

  // ===========================================================================
  // resolveImport - Re-export Chains
  // ===========================================================================

  describe('resolveImport - re-export chains', () => {
    it('follows single re-export', () => {
      // /foo.ts exports FooClass
      // /index.ts re-exports FooClass from ./foo
      // /main.ts imports FooClass from ./index
      const ctx = createContext({
        scopes: [
          { path: '/foo.ts' as NormalizedPath, scope: createScope({ FooClass: classVal('FooClass', '/foo.ts' as NormalizedPath) }, {}, '/foo.ts' as NormalizedPath) },
          { path: '/index.ts' as NormalizedPath, scope: createScope({}, {}, '/index.ts' as NormalizedPath) },
          { path: '/main.ts' as NormalizedPath, scope: createScope({}, {}, '/main.ts' as NormalizedPath) },
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { FooClass: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'FooClass' } } },
          // Re-export: /index.ts → /foo.ts
          { file: '/index.ts' as NormalizedPath, exports: { FooClass: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'FooClass' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'FooClass', alias: null }], moduleSpecifier: './index', resolvedPath: '/index.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const imp = importVal('./index', 'FooClass');
      const result = resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('import');
      if (result.kind === 'import') {
        expect(result.resolved?.kind).toBe('class');
        if (result.resolved?.kind === 'class') {
          expect(result.resolved.className).toBe('FooClass');
          expect(result.resolved.filePath).toBe('/foo.ts');
        }
      }
    });

    it('follows aliased re-export', () => {
      // /foo.ts exports Original
      // /index.ts exports { Original as Aliased } from ./foo
      const ctx = createContext({
        scopes: [
          { path: '/foo.ts' as NormalizedPath, scope: createScope({ Original: classVal('Original', '/foo.ts' as NormalizedPath) }, {}, '/foo.ts' as NormalizedPath) },
          { path: '/index.ts' as NormalizedPath, scope: createScope({}, {}, '/index.ts' as NormalizedPath) },
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { Original: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'Original' } } },
          { file: '/index.ts' as NormalizedPath, exports: { Aliased: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'Original' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'Aliased', alias: null }], moduleSpecifier: './index', resolvedPath: '/index.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const imp = importVal('./index', 'Aliased');
      const result = resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('import');
      if (result.kind === 'import') {
        expect(result.resolved?.kind).toBe('class');
        if (result.resolved?.kind === 'class') {
          expect(result.resolved.className).toBe('Original');
        }
      }
    });

    it('follows chain of re-exports (A → B → C)', () => {
      const ctx = createContext({
        scopes: [
          { path: '/c.ts' as NormalizedPath, scope: createScope({ Deep: classVal('Deep', '/c.ts' as NormalizedPath) }, {}, '/c.ts' as NormalizedPath) },
          { path: '/b.ts' as NormalizedPath, scope: createScope({}, {}, '/b.ts' as NormalizedPath) },
          { path: '/a.ts' as NormalizedPath, scope: createScope({}, {}, '/a.ts' as NormalizedPath) },
        ],
        exports: [
          { file: '/c.ts' as NormalizedPath, exports: { Deep: { definitionPath: '/c.ts' as NormalizedPath, definitionName: 'Deep' } } },
          { file: '/b.ts' as NormalizedPath, exports: { Deep: { definitionPath: '/c.ts' as NormalizedPath, definitionName: 'Deep' } } },
          { file: '/a.ts' as NormalizedPath, exports: { Deep: { definitionPath: '/c.ts' as NormalizedPath, definitionName: 'Deep' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'Deep', alias: null }], moduleSpecifier: './a', resolvedPath: '/a.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const imp = importVal('./a', 'Deep');
      const result = resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('import');
      if (result.kind === 'import') {
        expect(result.resolved?.kind).toBe('class');
        if (result.resolved?.kind === 'class') {
          expect(result.resolved.filePath).toBe('/c.ts');
        }
      }
    });
  });

  // ===========================================================================
  // resolveImport - Error Cases
  // ===========================================================================

  describe('resolveImport - error cases', () => {
    it('returns unknown for unresolvable module specifier', () => {
      const ctx = createContext({
        scopes: [],
        exports: [],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, []),
        ],
      });

      const imp = importVal('./nonexistent', 'Missing');
      const result = resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('unknown');
      expect(ctx.gaps.length).toBe(1);
      expect(ctx.gaps[0]?.why.kind).toBe('unresolved-import');
    });

    it('returns unknown for missing export', () => {
      const ctx = createContext({
        scopes: [
          { path: '/foo.ts' as NormalizedPath, scope: createScope({ Other: literal('other') }, {}, '/foo.ts' as NormalizedPath) },
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { Other: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'Other' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'Missing', alias: null }], moduleSpecifier: './foo', resolvedPath: '/foo.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const imp = importVal('./foo', 'Missing');
      const result = resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('unknown');
      expect(ctx.gaps.length).toBe(1);
    });

    it('returns unknown for missing definition file scope', () => {
      const ctx = createContext({
        scopes: [], // No scopes
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { Foo: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'Foo' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'Foo', alias: null }], moduleSpecifier: './foo', resolvedPath: '/foo.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const imp = importVal('./foo', 'Foo');
      const result = resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('unknown');
      expect(ctx.gaps.length).toBe(1);
    });

    it('returns unknown for missing binding in scope', () => {
      const ctx = createContext({
        scopes: [
          { path: '/foo.ts' as NormalizedPath, scope: createScope({}, {}, '/foo.ts' as NormalizedPath) }, // Empty scope
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { Foo: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'Foo' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'Foo', alias: null }], moduleSpecifier: './foo', resolvedPath: '/foo.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const imp = importVal('./foo', 'Foo');
      const result = resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('unknown');
      expect(ctx.gaps.length).toBe(1);
    });
  });

  // ===========================================================================
  // resolveImport - Cycle Detection
  // ===========================================================================

  describe('resolveImport - cycle detection', () => {
    it('handles circular import gracefully', () => {
      // Realistic circular import:
      // a.ts: export class A {}; import { B } from './b'; const dep = B;
      // b.ts: export class B {}; import { A } from './a'; const dep = A;
      //
      // When resolving A's dependency on B, B's dependency on A creates a cycle
      // But each file has its OWN class defined locally

      // Build scopes with local classes AND import references
      const aScope = createScope(
        {
          A: classVal('A', '/a.ts' as NormalizedPath),
          // dep references B which is an import
          dep: ref('B'),
        },
        { B: { specifier: './b', exportName: 'B', resolvedPath: '/b.ts' as NormalizedPath } },
        '/a.ts' as NormalizedPath
      );

      const bScope = createScope(
        {
          B: classVal('B', '/b.ts' as NormalizedPath),
          // dep references A which is an import
          dep: ref('A'),
        },
        { A: { specifier: './a', exportName: 'A', resolvedPath: '/a.ts' as NormalizedPath } },
        '/b.ts' as NormalizedPath
      );

      const ctx = createContext({
        scopes: [
          { path: '/a.ts' as NormalizedPath, scope: aScope },
          { path: '/b.ts' as NormalizedPath, scope: bScope },
        ],
        exports: [
          { file: '/a.ts' as NormalizedPath, exports: { A: { definitionPath: '/a.ts' as NormalizedPath, definitionName: 'A' } } },
          { file: '/b.ts' as NormalizedPath, exports: { B: { definitionPath: '/b.ts' as NormalizedPath, definitionName: 'B' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'A', alias: null }], moduleSpecifier: './a', resolvedPath: '/a.ts' as NormalizedPath, span: SPAN },
          ]),
          createFileFacts('/a.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'B', alias: null }], moduleSpecifier: './b', resolvedPath: '/b.ts' as NormalizedPath, span: SPAN },
          ]),
          createFileFacts('/b.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'A', alias: null }], moduleSpecifier: './a', resolvedPath: '/a.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const imp = importVal('./a', 'A');
      const result = resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      // Should not throw or hang - and should resolve to the class
      expect(result.kind).toBe('import');
      if (result.kind === 'import') {
        expect(result.resolved?.kind).toBe('class');
        if (result.resolved?.kind === 'class') {
          expect(result.resolved.className).toBe('A');
        }
      }
    });

    it('clears resolving set after resolution completes', () => {
      const ctx = createContext({
        scopes: [
          { path: '/foo.ts' as NormalizedPath, scope: createScope({ Foo: literal('foo') }, {}, '/foo.ts' as NormalizedPath) },
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { Foo: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'Foo' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'Foo', alias: null }], moduleSpecifier: './foo', resolvedPath: '/foo.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const imp = importVal('./foo', 'Foo');
      resolveImport(imp, ctx, '/main.ts' as NormalizedPath);

      // Resolving set should be empty after completion
      expect(ctx.resolving.size).toBe(0);
    });
  });

  // ===========================================================================
  // resolveImportsCrossFile - Nested Structures
  // ===========================================================================

  describe('resolveImportsCrossFile - nested structures', () => {
    let ctx: ResolutionContext;

    beforeEach(() => {
      ctx = createContext({
        scopes: [
          { path: '/foo.ts' as NormalizedPath, scope: createScope({ FooClass: classVal('FooClass', '/foo.ts' as NormalizedPath) }, {}, '/foo.ts' as NormalizedPath) },
          { path: '/bar.ts' as NormalizedPath, scope: createScope({ BarClass: classVal('BarClass', '/bar.ts' as NormalizedPath) }, {}, '/bar.ts' as NormalizedPath) },
          { path: '/main.ts' as NormalizedPath, scope: createScope({}, {}, '/main.ts' as NormalizedPath) },
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { FooClass: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'FooClass' } } },
          { file: '/bar.ts' as NormalizedPath, exports: { BarClass: { definitionPath: '/bar.ts' as NormalizedPath, definitionName: 'BarClass' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'FooClass', alias: null }], moduleSpecifier: './foo', resolvedPath: '/foo.ts' as NormalizedPath, span: SPAN },
            { kind: 'named', bindings: [{ name: 'BarClass', alias: null }], moduleSpecifier: './bar', resolvedPath: '/bar.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });
    });

    it('resolves imports in array elements', () => {
      const arr = array([
        importVal('./foo', 'FooClass'),
        importVal('./bar', 'BarClass'),
      ]);

      const result = resolveImportsCrossFile(arr, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('array');
      if (result.kind === 'array') {
        expect(result.elements[0]?.kind).toBe('import');
        expect(result.elements[1]?.kind).toBe('import');
        if (result.elements[0]?.kind === 'import') {
          expect(result.elements[0].resolved?.kind).toBe('class');
        }
      }
    });

    it('resolves imports in object properties', () => {
      const obj = object(new Map([
        ['foo', importVal('./foo', 'FooClass')],
        ['bar', importVal('./bar', 'BarClass')],
      ]));

      const result = resolveImportsCrossFile(obj, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('object');
      if (result.kind === 'object') {
        const foo = result.properties.get('foo');
        expect(foo?.kind).toBe('import');
        if (foo?.kind === 'import') {
          expect(foo.resolved?.kind).toBe('class');
        }
      }
    });

    it('resolves imports in call arguments', () => {
      const callExpr = call(
        propAccess(ref('container'), 'register'),
        [importVal('./foo', 'FooClass'), importVal('./bar', 'BarClass')]
      );

      const result = resolveImportsCrossFile(callExpr, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('call');
      if (result.kind === 'call') {
        expect(result.args[0]?.kind).toBe('import');
        if (result.args[0]?.kind === 'import') {
          expect(result.args[0].resolved?.kind).toBe('class');
        }
      }
    });

    it('resolves imports in spread target', () => {
      const spreadExpr = spread(importVal('./foo', 'FooClass'));

      const result = resolveImportsCrossFile(spreadExpr, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('spread');
      if (result.kind === 'spread') {
        expect(result.target.kind).toBe('import');
        if (result.target.kind === 'import') {
          expect(result.target.resolved?.kind).toBe('class');
        }
      }
    });

    it('resolves imports in method body', () => {
      const obj = object(
        new Map(),
        new Map([
          ['register', method('register', [{ name: 'c' }], [
            exprStmt(call(propAccess(ref('c'), 'register'), [
              importVal('./foo', 'FooClass'),
            ])),
          ])],
        ])
      );

      const result = resolveImportsCrossFile(obj, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('object');
      if (result.kind === 'object') {
        const registerMethod = result.methods.get('register');
        expect(registerMethod).toBeDefined();
        const stmt = registerMethod?.body[0];
        expect(stmt?.kind).toBe('expression');
        if (stmt?.kind === 'expression' && stmt.value.kind === 'call') {
          const arg = stmt.value.args[0];
          expect(arg?.kind).toBe('import');
          if (arg?.kind === 'import') {
            expect(arg.resolved?.kind).toBe('class');
          }
        }
      }
    });

    it('resolves imports inside reference resolved value', () => {
      const refWithResolved = ref('arr', array([importVal('./foo', 'FooClass')]));

      const result = resolveImportsCrossFile(refWithResolved, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('reference');
      if (result.kind === 'reference' && result.resolved?.kind === 'array') {
        const elem = result.resolved.elements[0];
        expect(elem?.kind).toBe('import');
        if (elem?.kind === 'import') {
          expect(elem.resolved?.kind).toBe('class');
        }
      }
    });
  });

  // ===========================================================================
  // Namespace Import Resolution
  // ===========================================================================

  describe('namespace import resolution', () => {
    it('resolves namespace property access', () => {
      const ctx = createContext({
        scopes: [
          { path: '/foo.ts' as NormalizedPath, scope: createScope({ FooClass: classVal('FooClass', '/foo.ts' as NormalizedPath), BarClass: classVal('BarClass', '/foo.ts' as NormalizedPath) }, {}, '/foo.ts' as NormalizedPath) },
          { path: '/main.ts' as NormalizedPath, scope: createScope({}, {}, '/main.ts' as NormalizedPath) },
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: {
            FooClass: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'FooClass' },
            BarClass: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'BarClass' },
          }},
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'namespace', alias: 'Mod', moduleSpecifier: './foo', resolvedPath: '/foo.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      // ns.FooClass where ns is a namespace import
      const nsImport = importVal('./foo', '*', '/foo.ts' as NormalizedPath);
      const propAccessExpr = propAccess(nsImport, 'FooClass');

      const result = resolveImportsCrossFile(propAccessExpr, ctx, '/main.ts' as NormalizedPath);

      // Property access on namespace import should resolve to the named export
      expect(result.kind).toBe('import');
      if (result.kind === 'import') {
        expect(result.exportName).toBe('FooClass');
        expect(result.resolved?.kind).toBe('class');
      }
    });
  });

  // ===========================================================================
  // Spread Expansion
  // ===========================================================================

  describe('spread expansion', () => {
    it('expands spread when target resolves to array', () => {
      const ctx = createContext({
        scopes: [
          {
            path: '/foo.ts' as NormalizedPath,
            scope: createScope({
              DefaultComponents: array([
                classVal('A', '/foo.ts' as NormalizedPath),
                classVal('B', '/foo.ts' as NormalizedPath),
              ])
            }, {}, '/foo.ts' as NormalizedPath)
          },
          { path: '/main.ts' as NormalizedPath, scope: createScope({}, {}, '/main.ts' as NormalizedPath) },
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { DefaultComponents: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'DefaultComponents' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'DefaultComponents', alias: null }], moduleSpecifier: './foo', resolvedPath: '/foo.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const spreadExpr = spread(importVal('./foo', 'DefaultComponents'));
      const result = resolveImportsCrossFile(spreadExpr, ctx, '/main.ts' as NormalizedPath);

      expect(result.kind).toBe('spread');
      if (result.kind === 'spread') {
        expect(result.expanded).toBeDefined();
        expect(result.expanded?.length).toBe(2);
        expect(result.expanded?.[0]?.kind).toBe('class');
      }
    });
  });

  // ===========================================================================
  // fullyResolve - Combined Layer 2 + 3
  // ===========================================================================

  describe('fullyResolve - combined resolution', () => {
    it('resolves local references and imports together', () => {
      const mainScope = createScope(
        {
          LocalClass: classVal('LocalClass', '/main.ts' as NormalizedPath),
          arr: array([ref('LocalClass'), ref('ImportedClass')]),
        },
        {
          ImportedClass: { specifier: './foo', exportName: 'ImportedClass', resolvedPath: '/foo.ts' as NormalizedPath },
        },
        '/main.ts' as NormalizedPath
      );

      const ctx = createContext({
        scopes: [
          { path: '/foo.ts' as NormalizedPath, scope: createScope({ ImportedClass: classVal('ImportedClass', '/foo.ts' as NormalizedPath) }, {}, '/foo.ts' as NormalizedPath) },
          { path: '/main.ts' as NormalizedPath, scope: mainScope },
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { ImportedClass: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'ImportedClass' } } },
        ],
        facts: [
          createFileFacts('/main.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'ImportedClass', alias: null }], moduleSpecifier: './foo', resolvedPath: '/foo.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      // arr references both LocalClass and ImportedClass
      const arrRef = ref('arr');
      const result = fullyResolve(arrRef, mainScope, ctx);

      expect(result.kind).toBe('reference');
      if (result.kind === 'reference' && result.resolved?.kind === 'array') {
        const [first, second] = result.resolved.elements;

        // First element: LocalClass (resolved via scope)
        expect(first?.kind).toBe('reference');
        if (first?.kind === 'reference') {
          expect(first.resolved?.kind).toBe('class');
          if (first.resolved?.kind === 'class') {
            expect(first.resolved.className).toBe('LocalClass');
          }
        }

        // Second element: ImportedClass (resolved via import)
        expect(second?.kind).toBe('import');
        if (second?.kind === 'import') {
          expect(second.resolved?.kind).toBe('class');
          if (second.resolved?.kind === 'class') {
            expect(second.resolved.className).toBe('ImportedClass');
          }
        }
      }
    });
  });

  // ===========================================================================
  // Integration: IRegistry Pattern with Imports
  // ===========================================================================

  describe('IRegistry pattern with imports', () => {
    it('resolves register body with imported classes', () => {
      const mainScope = createScope(
        {},
        {
          FooElement: { specifier: './foo', exportName: 'FooElement', resolvedPath: '/foo.ts' as NormalizedPath },
          BarAttribute: { specifier: './bar', exportName: 'BarAttribute', resolvedPath: '/bar.ts' as NormalizedPath },
        },
        '/config.ts' as NormalizedPath
      );

      // Build the IRegistry object with imported references
      const configObj = object(
        new Map(),
        new Map([
          ['register', method('register', [{ name: 'container' }], [
            exprStmt(call(
              propAccess(ref('container'), 'register'),
              [ref('FooElement'), ref('BarAttribute')]
            )),
          ])],
        ])
      );

      // First resolve in scope (Layer 2)
      const ctx = createContext({
        scopes: [
          { path: '/foo.ts' as NormalizedPath, scope: createScope({ FooElement: classVal('FooElement', '/foo.ts' as NormalizedPath) }, {}, '/foo.ts' as NormalizedPath) },
          { path: '/bar.ts' as NormalizedPath, scope: createScope({ BarAttribute: classVal('BarAttribute', '/bar.ts' as NormalizedPath) }, {}, '/bar.ts' as NormalizedPath) },
          { path: '/config.ts' as NormalizedPath, scope: mainScope },
        ],
        exports: [
          { file: '/foo.ts' as NormalizedPath, exports: { FooElement: { definitionPath: '/foo.ts' as NormalizedPath, definitionName: 'FooElement' } } },
          { file: '/bar.ts' as NormalizedPath, exports: { BarAttribute: { definitionPath: '/bar.ts' as NormalizedPath, definitionName: 'BarAttribute' } } },
        ],
        facts: [
          createFileFacts('/config.ts' as NormalizedPath, [
            { kind: 'named', bindings: [{ name: 'FooElement', alias: null }], moduleSpecifier: './foo', resolvedPath: '/foo.ts' as NormalizedPath, span: SPAN },
            { kind: 'named', bindings: [{ name: 'BarAttribute', alias: null }], moduleSpecifier: './bar', resolvedPath: '/bar.ts' as NormalizedPath, span: SPAN },
          ]),
        ],
      });

      const result = fullyResolve(configObj, mainScope, ctx);

      expect(result.kind).toBe('object');
      if (result.kind === 'object') {
        const registerMethod = result.methods.get('register');
        expect(registerMethod).toBeDefined();

        const stmt = registerMethod?.body[0];
        expect(stmt?.kind).toBe('expression');
        if (stmt?.kind === 'expression' && stmt.value.kind === 'call') {
          const [arg1, arg2] = stmt.value.args;

          // Both arguments should be imports resolved to classes
          expect(arg1?.kind).toBe('import');
          expect(arg2?.kind).toBe('import');

          if (arg1?.kind === 'import') {
            expect(arg1.resolved?.kind).toBe('class');
            if (arg1.resolved?.kind === 'class') {
              expect(arg1.resolved.className).toBe('FooElement');
            }
          }

          if (arg2?.kind === 'import') {
            expect(arg2.resolved?.kind).toBe('class');
            if (arg2.resolved?.kind === 'class') {
              expect(arg2.resolved.className).toBe('BarAttribute');
            }
          }
        }
      }
    });
  });
});


