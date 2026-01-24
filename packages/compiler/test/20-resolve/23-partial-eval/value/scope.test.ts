/**
 * Scope Building and Resolution Tests
 *
 * Tests for Layer 2 scope building, lookup, and resolution functions.
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import type { NormalizedPath } from '@aurelia-ls/compiler';
import {
  buildFileScope,
  enterFunctionScope,
  createChildScope,
  lookupBinding,
  isImportBinding,
  resolveInScope,
  type LexicalScope,
  type ImportBinding,
  type AnalyzableValue,
  type ParameterInfo,
  // Value constructors for building test values
  literal,
  array,
  object,
  ref,
  propAccess,
  call,
  spread,
  method,
  exprStmt,
  returnStmt,
  varStmt,
  varDecl,
  ifStmt,
  forOfStmt,
} from '../../../../src/analysis/20-resolve/resolution/23-partial-eval/value/index.js';

// =============================================================================
// Test Helpers
// =============================================================================

function parseSource(code: string): ts.SourceFile {
  return ts.createSourceFile(
    'test.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
}

const TEST_PATH = '/test/file.ts' as NormalizedPath;

// =============================================================================
// buildFileScope Tests
// =============================================================================

describe('buildFileScope', () => {
  describe('variable declarations', () => {
    it('collects const declarations with literals', () => {
      const sf = parseSource(`
        const name = 'hello';
        const count = 42;
        const flag = true;
      `);

      const scope = buildFileScope(sf, TEST_PATH);

      expect(scope.bindings.size).toBe(3);
      expect(scope.bindings.get('name')).toEqual({ kind: 'literal', value: 'hello', span: expect.any(Object) });
      expect(scope.bindings.get('count')).toEqual({ kind: 'literal', value: 42, span: expect.any(Object) });
      expect(scope.bindings.get('flag')).toEqual({ kind: 'literal', value: true, span: expect.any(Object) });
    });

    it('collects let declarations', () => {
      const sf = parseSource(`let x = 10;`);
      const scope = buildFileScope(sf, TEST_PATH);

      expect(scope.bindings.get('x')).toEqual({ kind: 'literal', value: 10, span: expect.any(Object) });
    });

    it('collects var declarations', () => {
      const sf = parseSource(`var y = 'test';`);
      const scope = buildFileScope(sf, TEST_PATH);

      expect(scope.bindings.get('y')).toEqual({ kind: 'literal', value: 'test', span: expect.any(Object) });
    });

    it('collects declarations without initializers as undefined', () => {
      const sf = parseSource(`let x;`);
      const scope = buildFileScope(sf, TEST_PATH);

      expect(scope.bindings.get('x')).toEqual({ kind: 'literal', value: undefined });
    });

    it('collects array literal declarations', () => {
      const sf = parseSource(`const items = [1, 2, 3];`);
      const scope = buildFileScope(sf, TEST_PATH);

      const items = scope.bindings.get('items');
      expect(items?.kind).toBe('array');
      if (items?.kind === 'array') {
        expect(items.elements).toHaveLength(3);
        expect(items.elements[0]).toEqual({ kind: 'literal', value: 1, span: expect.any(Object) });
      }
    });

    it('collects object literal declarations', () => {
      const sf = parseSource(`const config = { name: 'test', value: 42 };`);
      const scope = buildFileScope(sf, TEST_PATH);

      const config = scope.bindings.get('config');
      expect(config?.kind).toBe('object');
      if (config?.kind === 'object') {
        expect(config.properties.get('name')).toEqual({ kind: 'literal', value: 'test', span: expect.any(Object) });
        expect(config.properties.get('value')).toEqual({ kind: 'literal', value: 42, span: expect.any(Object) });
      }
    });

    it('collects declarations with reference initializers', () => {
      const sf = parseSource(`
        const a = 1;
        const b = a;
      `);
      const scope = buildFileScope(sf, TEST_PATH);

      const b = scope.bindings.get('b');
      expect(b?.kind).toBe('reference');
      if (b?.kind === 'reference') {
        expect(b.name).toBe('a');
      }
    });

    it('handles object destructuring', () => {
      const sf = parseSource(`const { a, b: c } = obj;`);
      const scope = buildFileScope(sf, TEST_PATH);

      // 'a' is bound to obj.a
      const aBinding = scope.bindings.get('a');
      expect(aBinding?.kind).toBe('propertyAccess');
      if (aBinding?.kind === 'propertyAccess') {
        expect(aBinding.property).toBe('a');
      }

      // 'c' is bound to obj.b (aliased)
      const cBinding = scope.bindings.get('c');
      expect(cBinding?.kind).toBe('propertyAccess');
      if (cBinding?.kind === 'propertyAccess') {
        expect(cBinding.property).toBe('b');
      }

      // 'b' should NOT be bound (it's aliased to c)
      expect(scope.bindings.has('b')).toBe(false);
    });

    it('handles array destructuring', () => {
      const sf = parseSource(`const [first, second] = arr;`);
      const scope = buildFileScope(sf, TEST_PATH);

      const first = scope.bindings.get('first');
      expect(first?.kind).toBe('propertyAccess');
      if (first?.kind === 'propertyAccess') {
        expect(first.property).toBe('0');
      }

      const second = scope.bindings.get('second');
      expect(second?.kind).toBe('propertyAccess');
      if (second?.kind === 'propertyAccess') {
        expect(second.property).toBe('1');
      }
    });
  });

  describe('function declarations', () => {
    it('collects function declarations', () => {
      const sf = parseSource(`
        function greet(name: string) {
          return 'Hello, ' + name;
        }
      `);
      const scope = buildFileScope(sf, TEST_PATH);

      const greet = scope.bindings.get('greet');
      expect(greet?.kind).toBe('function');
      if (greet?.kind === 'function') {
        expect(greet.name).toBe('greet');
        expect(greet.params).toHaveLength(1);
        expect(greet.params[0]?.name).toBe('name');
      }
    });

    it('collects function with multiple parameters', () => {
      const sf = parseSource(`function add(a: number, b: number) { return a + b; }`);
      const scope = buildFileScope(sf, TEST_PATH);

      const add = scope.bindings.get('add');
      expect(add?.kind).toBe('function');
      if (add?.kind === 'function') {
        expect(add.params).toHaveLength(2);
        expect(add.params[0]?.name).toBe('a');
        expect(add.params[1]?.name).toBe('b');
      }
    });

    it('collects function with default parameter', () => {
      const sf = parseSource(`function greet(name = 'World') { return name; }`);
      const scope = buildFileScope(sf, TEST_PATH);

      const greet = scope.bindings.get('greet');
      expect(greet?.kind).toBe('function');
      if (greet?.kind === 'function') {
        expect(greet.params[0]?.defaultValue).toEqual({ kind: 'literal', value: 'World', span: expect.any(Object) });
      }
    });

    it('collects function with rest parameter', () => {
      const sf = parseSource(`function collect(...items: string[]) { return items; }`);
      const scope = buildFileScope(sf, TEST_PATH);

      const collect = scope.bindings.get('collect');
      expect(collect?.kind).toBe('function');
      if (collect?.kind === 'function') {
        expect(collect.params[0]?.name).toBe('items');
        expect(collect.params[0]?.isRest).toBe(true);
      }
    });
  });

  describe('class declarations', () => {
    it('collects class declarations as ClassValue', () => {
      const sf = parseSource(`class MyComponent {}`);
      const scope = buildFileScope(sf, TEST_PATH);

      const cls = scope.bindings.get('MyComponent');
      expect(cls?.kind).toBe('class');
      if (cls?.kind === 'class') {
        expect(cls.className).toBe('MyComponent');
        expect(cls.filePath).toBe(TEST_PATH);
      }
    });

    it('collects exported class declarations', () => {
      const sf = parseSource(`export class FooElement {}`);
      const scope = buildFileScope(sf, TEST_PATH);

      const cls = scope.bindings.get('FooElement');
      expect(cls?.kind).toBe('class');
    });
  });

  describe('import declarations', () => {
    it('collects named imports', () => {
      const sf = parseSource(`import { Foo, Bar } from './components';`);
      const scope = buildFileScope(sf, TEST_PATH);

      expect(scope.imports.size).toBe(2);

      const foo = scope.imports.get('Foo');
      expect(foo).toBeDefined();
      expect(foo?.specifier).toBe('./components');
      expect(foo?.exportName).toBe('Foo');

      const bar = scope.imports.get('Bar');
      expect(bar).toBeDefined();
      expect(bar?.specifier).toBe('./components');
      expect(bar?.exportName).toBe('Bar');
    });

    it('collects aliased named imports', () => {
      const sf = parseSource(`import { Foo as MyFoo } from './components';`);
      const scope = buildFileScope(sf, TEST_PATH);

      // 'MyFoo' is the local name, 'Foo' is the export name
      const myFoo = scope.imports.get('MyFoo');
      expect(myFoo).toBeDefined();
      expect(myFoo?.specifier).toBe('./components');
      expect(myFoo?.exportName).toBe('Foo');

      // 'Foo' should NOT be in imports
      expect(scope.imports.has('Foo')).toBe(false);
    });

    it('collects default imports', () => {
      const sf = parseSource(`import Config from './config';`);
      const scope = buildFileScope(sf, TEST_PATH);

      const config = scope.imports.get('Config');
      expect(config).toBeDefined();
      expect(config?.specifier).toBe('./config');
      expect(config?.exportName).toBe('default');
    });

    it('collects namespace imports', () => {
      const sf = parseSource(`import * as utils from './utils';`);
      const scope = buildFileScope(sf, TEST_PATH);

      const utils = scope.imports.get('utils');
      expect(utils).toBeDefined();
      expect(utils?.specifier).toBe('./utils');
      expect(utils?.exportName).toBe('*');
    });

    it('collects combined default and named imports', () => {
      const sf = parseSource(`import React, { useState, useEffect } from 'react';`);
      const scope = buildFileScope(sf, TEST_PATH);

      expect(scope.imports.size).toBe(3);

      const react = scope.imports.get('React');
      expect(react?.exportName).toBe('default');

      const useState = scope.imports.get('useState');
      expect(useState?.exportName).toBe('useState');

      const useEffect = scope.imports.get('useEffect');
      expect(useEffect?.exportName).toBe('useEffect');
    });

    it('ignores side-effect imports', () => {
      const sf = parseSource(`import './styles.css';`);
      const scope = buildFileScope(sf, TEST_PATH);

      expect(scope.imports.size).toBe(0);
    });
  });

  describe('enum declarations', () => {
    it('collects enum declarations as references', () => {
      const sf = parseSource(`enum Color { Red, Green, Blue }`);
      const scope = buildFileScope(sf, TEST_PATH);

      const color = scope.bindings.get('Color');
      expect(color?.kind).toBe('reference');
      if (color?.kind === 'reference') {
        expect(color.name).toBe('Color');
      }
    });
  });

  describe('scope metadata', () => {
    it('sets filePath correctly', () => {
      const sf = parseSource(`const x = 1;`);
      const scope = buildFileScope(sf, TEST_PATH);

      expect(scope.filePath).toBe(TEST_PATH);
    });

    it('has null parent for module scope', () => {
      const sf = parseSource(`const x = 1;`);
      const scope = buildFileScope(sf, TEST_PATH);

      expect(scope.parent).toBeNull();
    });
  });
});

// =============================================================================
// enterFunctionScope Tests
// =============================================================================

describe('enterFunctionScope', () => {
  const parentScope: LexicalScope = {
    bindings: new Map([['outer', { kind: 'literal', value: 'parent' }]]),
    imports: new Map(),
    parent: null,
    filePath: TEST_PATH,
  };

  it('creates child scope with parameters', () => {
    const params: ParameterInfo[] = [
      { name: 'a' },
      { name: 'b' },
    ];

    const childScope = enterFunctionScope(params, parentScope);

    expect(childScope.bindings.size).toBe(2);
    expect(childScope.bindings.has('a')).toBe(true);
    expect(childScope.bindings.has('b')).toBe(true);
    expect(childScope.parent).toBe(parentScope);
  });

  it('parameters are reference values', () => {
    const params: ParameterInfo[] = [{ name: 'container' }];
    const childScope = enterFunctionScope(params, parentScope);

    const container = childScope.bindings.get('container');
    expect(container?.kind).toBe('reference');
    if (container?.kind === 'reference') {
      expect(container.name).toBe('container');
    }
  });

  it('includes default values if present', () => {
    const params: ParameterInfo[] = [
      { name: 'x', defaultValue: { kind: 'literal', value: 10 } },
    ];
    const childScope = enterFunctionScope(params, parentScope);

    const x = childScope.bindings.get('x');
    expect(x).toEqual({ kind: 'literal', value: 10 });
  });

  it('skips destructuring placeholders', () => {
    const params: ParameterInfo[] = [
      { name: '(destructuring)' },
      { name: 'normalParam' },
    ];
    const childScope = enterFunctionScope(params, parentScope);

    expect(childScope.bindings.has('(destructuring)')).toBe(false);
    expect(childScope.bindings.has('normalParam')).toBe(true);
  });

  it('inherits filePath from parent', () => {
    const params: ParameterInfo[] = [{ name: 'x' }];
    const childScope = enterFunctionScope(params, parentScope);

    expect(childScope.filePath).toBe(TEST_PATH);
  });

  it('has empty imports', () => {
    const params: ParameterInfo[] = [{ name: 'x' }];
    const childScope = enterFunctionScope(params, parentScope);

    expect(childScope.imports.size).toBe(0);
  });
});

// =============================================================================
// createChildScope Tests
// =============================================================================

describe('createChildScope', () => {
  const parentScope: LexicalScope = {
    bindings: new Map([['outer', { kind: 'literal', value: 'parent' }]]),
    imports: new Map([['Foo', { specifier: './foo', exportName: 'Foo', resolvedPath: null }]]),
    parent: null,
    filePath: TEST_PATH,
  };

  it('creates child scope with additional bindings', () => {
    const bindings = new Map<string, AnalyzableValue>([
      ['item', { kind: 'reference', name: 'item' }],
    ]);

    const childScope = createChildScope(bindings, parentScope);

    expect(childScope.bindings.get('item')).toBeDefined();
    expect(childScope.parent).toBe(parentScope);
  });

  it('inherits filePath from parent', () => {
    const childScope = createChildScope(new Map(), parentScope);
    expect(childScope.filePath).toBe(TEST_PATH);
  });

  it('has empty imports', () => {
    const childScope = createChildScope(new Map(), parentScope);
    expect(childScope.imports.size).toBe(0);
  });
});

// =============================================================================
// lookupBinding Tests
// =============================================================================

describe('lookupBinding', () => {
  describe('single scope', () => {
    const scope: LexicalScope = {
      bindings: new Map([
        ['x', { kind: 'literal', value: 42 }],
        ['y', { kind: 'reference', name: 'z' }],
      ]),
      imports: new Map([
        ['Foo', { specifier: './foo', exportName: 'Foo', resolvedPath: null }],
      ]),
      parent: null,
      filePath: TEST_PATH,
    };

    it('finds binding in current scope', () => {
      const result = lookupBinding('x', scope);
      expect(result).toEqual({ kind: 'literal', value: 42 });
    });

    it('finds import binding', () => {
      const result = lookupBinding('Foo', scope);
      expect(isImportBinding(result)).toBe(true);
      if (isImportBinding(result)) {
        expect(result.specifier).toBe('./foo');
        expect(result.exportName).toBe('Foo');
      }
    });

    it('returns undefined for unknown names', () => {
      const result = lookupBinding('unknown', scope);
      expect(result).toBeUndefined();
    });
  });

  describe('scope chain', () => {
    const grandparentScope: LexicalScope = {
      bindings: new Map([['grandparent', { kind: 'literal', value: 'gp' }]]),
      imports: new Map(),
      parent: null,
      filePath: TEST_PATH,
    };

    const parentScope: LexicalScope = {
      bindings: new Map([['parent', { kind: 'literal', value: 'p' }]]),
      imports: new Map([['ImportedFoo', { specifier: './foo', exportName: 'Foo', resolvedPath: null }]]),
      parent: grandparentScope,
      filePath: TEST_PATH,
    };

    const childScope: LexicalScope = {
      bindings: new Map([['child', { kind: 'literal', value: 'c' }]]),
      imports: new Map(),
      parent: parentScope,
      filePath: TEST_PATH,
    };

    it('finds binding in current scope', () => {
      const result = lookupBinding('child', childScope);
      expect(result).toEqual({ kind: 'literal', value: 'c' });
    });

    it('finds binding in parent scope', () => {
      const result = lookupBinding('parent', childScope);
      expect(result).toEqual({ kind: 'literal', value: 'p' });
    });

    it('finds binding in grandparent scope', () => {
      const result = lookupBinding('grandparent', childScope);
      expect(result).toEqual({ kind: 'literal', value: 'gp' });
    });

    it('finds import in parent scope', () => {
      const result = lookupBinding('ImportedFoo', childScope);
      expect(isImportBinding(result)).toBe(true);
    });

    it('returns undefined if not found in chain', () => {
      const result = lookupBinding('nonexistent', childScope);
      expect(result).toBeUndefined();
    });
  });

  describe('shadowing', () => {
    const parentScope: LexicalScope = {
      bindings: new Map([['x', { kind: 'literal', value: 'parent' }]]),
      imports: new Map(),
      parent: null,
      filePath: TEST_PATH,
    };

    const childScope: LexicalScope = {
      bindings: new Map([['x', { kind: 'literal', value: 'child' }]]),
      imports: new Map(),
      parent: parentScope,
      filePath: TEST_PATH,
    };

    it('inner scope shadows outer scope', () => {
      const result = lookupBinding('x', childScope);
      expect(result).toEqual({ kind: 'literal', value: 'child' });
    });

    it('parent scope still has its own value', () => {
      const result = lookupBinding('x', parentScope);
      expect(result).toEqual({ kind: 'literal', value: 'parent' });
    });
  });

  describe('bindings vs imports priority', () => {
    const scope: LexicalScope = {
      bindings: new Map([['Foo', { kind: 'literal', value: 'local' }]]),
      imports: new Map([['Foo', { specifier: './foo', exportName: 'Foo', resolvedPath: null }]]),
      parent: null,
      filePath: TEST_PATH,
    };

    it('bindings take priority over imports', () => {
      const result = lookupBinding('Foo', scope);
      // Should return the binding, not the import
      expect(result).toEqual({ kind: 'literal', value: 'local' });
      expect(isImportBinding(result)).toBe(false);
    });
  });
});

// =============================================================================
// isImportBinding Tests
// =============================================================================

describe('isImportBinding', () => {
  it('returns true for import bindings', () => {
    const importBinding: ImportBinding = {
      specifier: './foo',
      exportName: 'Foo',
      resolvedPath: null,
    };
    expect(isImportBinding(importBinding)).toBe(true);
  });

  it('returns false for AnalyzableValue', () => {
    const value: AnalyzableValue = { kind: 'literal', value: 42 };
    expect(isImportBinding(value)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isImportBinding(undefined)).toBe(false);
  });

  it('returns false for reference values', () => {
    const ref: AnalyzableValue = { kind: 'reference', name: 'x' };
    expect(isImportBinding(ref)).toBe(false);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('scope building integration', () => {
  it('builds complete scope for typical module', () => {
    const sf = parseSource(`
      import { Component } from '@aurelia/runtime-html';
      import Config from './config';

      const DEFAULT_NAME = 'App';

      class MyApp {
        name = DEFAULT_NAME;
      }

      function createApp() {
        return new MyApp();
      }

      export { MyApp, createApp };
    `);

    const scope = buildFileScope(sf, TEST_PATH);

    // Variable bindings
    expect(scope.bindings.get('DEFAULT_NAME')).toEqual({
      kind: 'literal',
      value: 'App',
      span: expect.any(Object),
    });

    // Class binding
    const myApp = scope.bindings.get('MyApp');
    expect(myApp?.kind).toBe('class');

    // Function binding
    const createApp = scope.bindings.get('createApp');
    expect(createApp?.kind).toBe('function');

    // Imports
    expect(scope.imports.get('Component')?.exportName).toBe('Component');
    expect(scope.imports.get('Config')?.exportName).toBe('default');
  });

  it('handles IRegistry pattern', () => {
    const sf = parseSource(`
      import { FooElement } from './foo-element';
      import { BarAttribute } from './bar-attribute';

      const DefaultComponents = [FooElement, BarAttribute];

      export const Config = {
        register(container) {
          container.register(...DefaultComponents);
        }
      };
    `);

    const scope = buildFileScope(sf, TEST_PATH);

    // DefaultComponents should be in bindings
    const components = scope.bindings.get('DefaultComponents');
    expect(components?.kind).toBe('array');

    // The array elements should be references
    if (components?.kind === 'array') {
      expect(components.elements[0]?.kind).toBe('reference');
      expect(components.elements[1]?.kind).toBe('reference');
    }

    // Config should be in bindings
    const config = scope.bindings.get('Config');
    expect(config?.kind).toBe('object');

    // FooElement and BarAttribute should be in imports
    expect(scope.imports.has('FooElement')).toBe(true);
    expect(scope.imports.has('BarAttribute')).toBe(true);
  });

  it('function scope can access parent module bindings', () => {
    const sf = parseSource(`
      const moduleValue = 'module';
      function test(param) {
        return moduleValue + param;
      }
    `);

    const moduleScope = buildFileScope(sf, TEST_PATH);

    // Simulate entering the function
    const params: ParameterInfo[] = [{ name: 'param' }];
    const funcScope = enterFunctionScope(params, moduleScope);

    // Can find 'param' in function scope
    expect(lookupBinding('param', funcScope)).toBeDefined();

    // Can find 'moduleValue' via parent chain
    const moduleValue = lookupBinding('moduleValue', funcScope);
    expect(moduleValue).toEqual({ kind: 'literal', value: 'module', span: expect.any(Object) });
  });
});

// =============================================================================
// resolveInScope Tests (WP 2.4)
// =============================================================================

describe('resolveInScope', () => {
  describe('leaf values', () => {
    const scope: LexicalScope = {
      bindings: new Map(),
      imports: new Map(),
      parent: null,
      filePath: TEST_PATH,
    };

    it('returns literal values unchanged', () => {
      const lit = literal('hello');
      const result = resolveInScope(lit, scope);
      expect(result).toBe(lit); // Same reference
    });

    it('returns class values unchanged', () => {
      const cls: AnalyzableValue = { kind: 'class', className: 'Foo', filePath: TEST_PATH };
      const result = resolveInScope(cls, scope);
      expect(result).toBe(cls);
    });

    it('returns unknown values unchanged', () => {
      const unk: AnalyzableValue = {
        kind: 'unknown',
        reason: { what: 'test', why: { kind: 'dynamic-value', expression: 'x' }, suggestion: 'n/a' },
      };
      const result = resolveInScope(unk, scope);
      expect(result).toBe(unk);
    });
  });

  describe('reference resolution', () => {
    it('resolves reference to literal binding', () => {
      const scope: LexicalScope = {
        bindings: new Map([['x', literal(42)]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = ref('x');
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('reference');
      if (result.kind === 'reference') {
        expect(result.name).toBe('x');
        expect(result.resolved).toEqual({ kind: 'literal', value: 42 });
      }
    });

    it('resolves reference to class binding', () => {
      const cls: AnalyzableValue = { kind: 'class', className: 'Foo', filePath: TEST_PATH };
      const scope: LexicalScope = {
        bindings: new Map([['Foo', cls]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = ref('Foo');
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('reference');
      if (result.kind === 'reference') {
        expect(result.resolved).toBe(cls);
      }
    });

    it('leaves unresolved references unchanged', () => {
      const scope: LexicalScope = {
        bindings: new Map(),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = ref('unknown');
      const result = resolveInScope(value, scope);

      expect(result).toBe(value); // Same reference (nothing to resolve)
    });

    it('resolves reference in parent scope', () => {
      const parentScope: LexicalScope = {
        bindings: new Map([['parent', literal('from-parent')]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };
      const childScope: LexicalScope = {
        bindings: new Map([['child', literal('from-child')]]),
        imports: new Map(),
        parent: parentScope,
        filePath: TEST_PATH,
      };

      const value = ref('parent');
      const result = resolveInScope(value, childScope);

      expect(result.kind).toBe('reference');
      if (result.kind === 'reference') {
        expect(result.resolved).toEqual({ kind: 'literal', value: 'from-parent' });
      }
    });

    it('handles cyclic references gracefully', () => {
      // a = b, b = a (would cause infinite loop without cycle detection)
      const scope: LexicalScope = {
        bindings: new Map([
          ['a', ref('b')],
          ['b', ref('a')],
        ]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = ref('a');
      const result = resolveInScope(value, scope);

      // Should not hang, and should have partial resolution
      expect(result.kind).toBe('reference');
    });
  });

  describe('import conversion', () => {
    it('converts reference to import binding into ImportValue', () => {
      const scope: LexicalScope = {
        bindings: new Map(),
        imports: new Map([['Foo', { specifier: './foo', exportName: 'Foo', resolvedPath: null }]]),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = ref('Foo');
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('import');
      if (result.kind === 'import') {
        expect(result.specifier).toBe('./foo');
        expect(result.exportName).toBe('Foo');
      }
    });

    it('converts aliased import correctly', () => {
      const scope: LexicalScope = {
        bindings: new Map(),
        imports: new Map([['MyFoo', { specifier: './foo', exportName: 'Foo', resolvedPath: null }]]),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = ref('MyFoo');
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('import');
      if (result.kind === 'import') {
        expect(result.specifier).toBe('./foo');
        expect(result.exportName).toBe('Foo'); // Original export name
      }
    });

    it('converts default import correctly', () => {
      const scope: LexicalScope = {
        bindings: new Map(),
        imports: new Map([['Config', { specifier: './config', exportName: 'default', resolvedPath: null }]]),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = ref('Config');
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('import');
      if (result.kind === 'import') {
        expect(result.exportName).toBe('default');
      }
    });
  });

  describe('array resolution', () => {
    it('resolves references inside arrays', () => {
      const scope: LexicalScope = {
        bindings: new Map([
          ['a', literal(1)],
          ['b', literal(2)],
        ]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = array([ref('a'), ref('b'), literal(3)]);
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('array');
      if (result.kind === 'array') {
        expect(result.elements).toHaveLength(3);
        expect(result.elements[0]?.kind).toBe('reference');
        if (result.elements[0]?.kind === 'reference') {
          expect(result.elements[0].resolved).toEqual({ kind: 'literal', value: 1 });
        }
        expect(result.elements[1]?.kind).toBe('reference');
        if (result.elements[1]?.kind === 'reference') {
          expect(result.elements[1].resolved).toEqual({ kind: 'literal', value: 2 });
        }
        expect(result.elements[2]).toEqual({ kind: 'literal', value: 3 });
      }
    });

    it('returns same array if nothing changed', () => {
      const scope: LexicalScope = {
        bindings: new Map(),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = array([literal(1), literal(2)]);
      const result = resolveInScope(value, scope);

      expect(result).toBe(value); // Same reference
    });
  });

  describe('object resolution', () => {
    it('resolves references in object properties', () => {
      const scope: LexicalScope = {
        bindings: new Map([['x', literal(42)]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const props = new Map<string, AnalyzableValue>([
        ['value', ref('x')],
        ['name', literal('test')],
      ]);
      const value = object(props);
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('object');
      if (result.kind === 'object') {
        const valueRef = result.properties.get('value');
        expect(valueRef?.kind).toBe('reference');
        if (valueRef?.kind === 'reference') {
          expect(valueRef.resolved).toEqual({ kind: 'literal', value: 42 });
        }
      }
    });

    it('resolves references in object methods', () => {
      const scope: LexicalScope = {
        bindings: new Map([['Foo', { kind: 'class', className: 'Foo', filePath: TEST_PATH } as AnalyzableValue]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const registerMethod = method('register', [{ name: 'container' }], [
        exprStmt(call(propAccess(ref('container'), 'register'), [ref('Foo')])),
      ]);
      const value = object(new Map(), new Map([['register', registerMethod]]));
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('object');
      if (result.kind === 'object') {
        const resolvedMethod = result.methods.get('register');
        expect(resolvedMethod).toBeDefined();

        // The method body should have Foo resolved
        const stmt = resolvedMethod?.body[0];
        expect(stmt?.kind).toBe('expression');
        if (stmt?.kind === 'expression' && stmt.value.kind === 'call') {
          const args = stmt.value.args;
          expect(args).toHaveLength(1);
          expect(args[0]?.kind).toBe('reference');
          if (args[0]?.kind === 'reference') {
            expect(args[0].resolved?.kind).toBe('class');
          }
        }
      }
    });
  });

  describe('property access resolution', () => {
    it('resolves base of property access', () => {
      const obj = object(new Map([['x', literal(42)]]));
      const scope: LexicalScope = {
        bindings: new Map([['obj', obj]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = propAccess(ref('obj'), 'x');
      const result = resolveInScope(value, scope);

      // Should resolve to the literal 42 since we can access obj.x
      expect(result).toEqual({ kind: 'literal', value: 42 });
    });

    it('resolves array element access', () => {
      const arr = array([literal('a'), literal('b'), literal('c')]);
      const scope: LexicalScope = {
        bindings: new Map([['arr', arr]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = propAccess(ref('arr'), '1');
      const result = resolveInScope(value, scope);

      expect(result).toEqual({ kind: 'literal', value: 'b' });
    });

    it('keeps property access if property not found', () => {
      const obj = object(new Map([['x', literal(42)]]));
      const scope: LexicalScope = {
        bindings: new Map([['obj', obj]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = propAccess(ref('obj'), 'missing');
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('propertyAccess');
      if (result.kind === 'propertyAccess') {
        expect(result.property).toBe('missing');
        // Base should be resolved
        expect(result.base.kind).toBe('reference');
      }
    });
  });

  describe('call resolution', () => {
    it('resolves callee and arguments', () => {
      const scope: LexicalScope = {
        bindings: new Map([
          ['fn', { kind: 'function', name: 'fn', params: [], body: [] } as AnalyzableValue],
          ['arg', literal('value')],
        ]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = call(ref('fn'), [ref('arg')]);
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('call');
      if (result.kind === 'call') {
        expect(result.callee.kind).toBe('reference');
        if (result.callee.kind === 'reference') {
          expect(result.callee.resolved?.kind).toBe('function');
        }
        expect(result.args[0]?.kind).toBe('reference');
        if (result.args[0]?.kind === 'reference') {
          expect(result.args[0].resolved).toEqual({ kind: 'literal', value: 'value' });
        }
      }
    });
  });

  describe('spread resolution', () => {
    it('resolves spread target', () => {
      const arr = array([literal(1), literal(2)]);
      const scope: LexicalScope = {
        bindings: new Map([['items', arr]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = spread(ref('items'));
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('spread');
      if (result.kind === 'spread') {
        expect(result.target.kind).toBe('reference');
        // Should expand the array
        expect(result.expanded).toBeDefined();
        expect(result.expanded).toHaveLength(2);
      }
    });

    it('expands array directly if spread target is array', () => {
      const scope: LexicalScope = {
        bindings: new Map(),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const value = spread(array([literal(1), literal(2)]));
      const result = resolveInScope(value, scope);

      expect(result.kind).toBe('spread');
      if (result.kind === 'spread') {
        expect(result.expanded).toHaveLength(2);
      }
    });
  });

  describe('statement resolution', () => {
    it('resolves references in return statements', () => {
      const scope: LexicalScope = {
        bindings: new Map([['x', literal(42)]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const fn: AnalyzableValue = {
        kind: 'function',
        name: 'test',
        params: [],
        body: [returnStmt(ref('x'))],
      };
      const result = resolveInScope(fn, scope);

      expect(result.kind).toBe('function');
      if (result.kind === 'function') {
        const ret = result.body[0];
        expect(ret?.kind).toBe('return');
        if (ret?.kind === 'return' && ret.value?.kind === 'reference') {
          expect(ret.value.resolved).toEqual({ kind: 'literal', value: 42 });
        }
      }
    });

    it('resolves references in variable declarations', () => {
      const scope: LexicalScope = {
        bindings: new Map([['x', literal(42)]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const fn: AnalyzableValue = {
        kind: 'function',
        name: 'test',
        params: [],
        body: [varStmt([varDecl('y', ref('x'))])],
      };
      const result = resolveInScope(fn, scope);

      expect(result.kind).toBe('function');
      if (result.kind === 'function') {
        const stmt = result.body[0];
        expect(stmt?.kind).toBe('variable');
        if (stmt?.kind === 'variable') {
          const init = stmt.declarations[0]?.init;
          expect(init?.kind).toBe('reference');
          if (init?.kind === 'reference') {
            expect(init.resolved).toEqual({ kind: 'literal', value: 42 });
          }
        }
      }
    });

    it('resolves references in if statements', () => {
      const scope: LexicalScope = {
        bindings: new Map([
          ['cond', literal(true)],
          ['x', literal(1)],
          ['y', literal(2)],
        ]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const fn: AnalyzableValue = {
        kind: 'function',
        name: 'test',
        params: [],
        body: [
          ifStmt(
            ref('cond'),
            [returnStmt(ref('x'))],
            [returnStmt(ref('y'))]
          ),
        ],
      };
      const result = resolveInScope(fn, scope);

      expect(result.kind).toBe('function');
      if (result.kind === 'function') {
        const stmt = result.body[0];
        expect(stmt?.kind).toBe('if');
        if (stmt?.kind === 'if') {
          expect(stmt.condition.kind).toBe('reference');
          if (stmt.condition.kind === 'reference') {
            expect(stmt.condition.resolved).toEqual({ kind: 'literal', value: true });
          }
        }
      }
    });

    it('resolves references in for-of statements with loop scope', () => {
      const arr = array([literal(1), literal(2)]);
      const scope: LexicalScope = {
        bindings: new Map([['items', arr]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const fn: AnalyzableValue = {
        kind: 'function',
        name: 'test',
        params: [],
        body: [
          forOfStmt('item', ref('items'), [
            exprStmt(call(ref('process'), [ref('item')])),
          ]),
        ],
      };
      const result = resolveInScope(fn, scope);

      expect(result.kind).toBe('function');
      if (result.kind === 'function') {
        const stmt = result.body[0];
        expect(stmt?.kind).toBe('forOf');
        if (stmt?.kind === 'forOf') {
          // iterable should be resolved
          expect(stmt.iterable.kind).toBe('reference');
          if (stmt.iterable.kind === 'reference') {
            expect(stmt.iterable.resolved?.kind).toBe('array');
          }
        }
      }
    });
  });

  describe('function scope resolution', () => {
    it('resolves function parameters in body', () => {
      // Function with parameter that's used in body
      // But parameters don't resolve to anything - they're runtime values
      const scope: LexicalScope = {
        bindings: new Map(),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const fn: AnalyzableValue = {
        kind: 'function',
        name: 'test',
        params: [{ name: 'x' }],
        body: [returnStmt(ref('x'))],
      };
      const result = resolveInScope(fn, scope);

      // Parameter 'x' resolves to itself (a reference)
      expect(result.kind).toBe('function');
      if (result.kind === 'function') {
        const ret = result.body[0];
        expect(ret?.kind).toBe('return');
        if (ret?.kind === 'return' && ret.value?.kind === 'reference') {
          // x resolves to the parameter binding (which is itself a reference)
          expect(ret.value.resolved?.kind).toBe('reference');
        }
      }
    });

    it('resolves module bindings in function body', () => {
      const scope: LexicalScope = {
        bindings: new Map([['MODULE_CONST', literal('module-value')]]),
        imports: new Map(),
        parent: null,
        filePath: TEST_PATH,
      };

      const fn: AnalyzableValue = {
        kind: 'function',
        name: 'test',
        params: [{ name: 'x' }],
        body: [returnStmt(ref('MODULE_CONST'))],
      };
      const result = resolveInScope(fn, scope);

      expect(result.kind).toBe('function');
      if (result.kind === 'function') {
        const ret = result.body[0];
        expect(ret?.kind).toBe('return');
        if (ret?.kind === 'return' && ret.value?.kind === 'reference') {
          expect(ret.value.resolved).toEqual({ kind: 'literal', value: 'module-value' });
        }
      }
    });
  });

  describe('IRegistry pattern integration', () => {
    it('resolves complete IRegistry config object', () => {
      const sf = parseSource(`
        import { FooElement } from './foo-element';
        import { BarAttribute } from './bar-attribute';

        const DefaultComponents = [FooElement, BarAttribute];

        export const Config = {
          register(container) {
            container.register(...DefaultComponents);
          }
        };
      `);

      const scope = buildFileScope(sf, TEST_PATH);

      // Get the Config binding
      const config = scope.bindings.get('Config');
      expect(config?.kind).toBe('object');

      // Resolve it
      const resolved = resolveInScope(config!, scope);

      expect(resolved.kind).toBe('object');
      if (resolved.kind === 'object') {
        const registerMethod = resolved.methods.get('register');
        expect(registerMethod).toBeDefined();

        // Check the method body
        const stmt = registerMethod?.body[0];
        expect(stmt?.kind).toBe('expression');
        if (stmt?.kind === 'expression' && stmt.value.kind === 'call') {
          const callExpr = stmt.value;
          expect(callExpr.args).toHaveLength(1);

          // The spread argument
          const spreadArg = callExpr.args[0];
          expect(spreadArg?.kind).toBe('spread');
          if (spreadArg?.kind === 'spread') {
            // Target should be resolved
            expect(spreadArg.target.kind).toBe('reference');
            if (spreadArg.target.kind === 'reference') {
              expect(spreadArg.target.name).toBe('DefaultComponents');
              expect(spreadArg.target.resolved?.kind).toBe('array');

              // The array elements should be ImportValues
              if (spreadArg.target.resolved?.kind === 'array') {
                const elements = spreadArg.target.resolved.elements;
                expect(elements).toHaveLength(2);
                expect(elements[0]?.kind).toBe('import');
                expect(elements[1]?.kind).toBe('import');
              }
            }

            // Should also have expanded set
            expect(spreadArg.expanded).toHaveLength(2);
          }
        }
      }
    });
  });
});


