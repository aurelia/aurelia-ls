/**
 * AST Transformation Tests (Layer 1)
 *
 * Tests for transforming TypeScript AST to AnalyzableValue.
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import {
  transformExpression,
  transformStatement,
  transformMethod,
  transformModuleExports,
  getPropertyKeySpan,
  type AnalyzableValue,
  type StatementValue,
} from '../../../../src/project-semantics/evaluate/value/index.js';

// =============================================================================
// Test Helpers
// =============================================================================

/** Parse an expression string and return the AST node */
function parseExpr(code: string): { expr: ts.Expression; sf: ts.SourceFile } {
  const fullCode = `const __expr__ = ${code};`;
  const sf = ts.createSourceFile('test.ts', fullCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const stmt = sf.statements[0] as ts.VariableStatement;
  const decl = stmt.declarationList.declarations[0]!;
  return { expr: decl.initializer!, sf };
}

/** Parse a statement string and return the AST node */
function parseStmt(code: string): { stmt: ts.Statement; sf: ts.SourceFile } {
  const sf = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return { stmt: sf.statements[0]!, sf };
}

/** Parse a function body and return the method AST */
function parseMethod(code: string): { method: ts.MethodDeclaration; sf: ts.SourceFile } {
  const fullCode = `const obj = { ${code} };`;
  const sf = ts.createSourceFile('test.ts', fullCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const stmt = sf.statements[0] as ts.VariableStatement;
  const decl = stmt.declarationList.declarations[0]!;
  const obj = decl.initializer as ts.ObjectLiteralExpression;
  const method = obj.properties[0] as ts.MethodDeclaration;
  return { method, sf };
}

/** Parse a module and return the source file */
function parseModule(code: string): ts.SourceFile {
  return ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** Transform an expression string */
function transform(code: string): AnalyzableValue {
  const { expr, sf } = parseExpr(code);
  return transformExpression(expr, sf);
}

/** Transform a statement string */
function transformStmtStr(code: string): StatementValue {
  const { stmt, sf } = parseStmt(code);
  return transformStatement(stmt, sf);
}

// =============================================================================
// Expression Transformation Tests
// =============================================================================

describe('transformExpression', () => {
  describe('literals', () => {
    it('transforms string literals', () => {
      const result = transform('"hello"');
      expect(result).toMatchObject({ kind: 'literal', value: 'hello' });
    });

    it('transforms single-quoted strings', () => {
      const result = transform("'world'");
      expect(result).toMatchObject({ kind: 'literal', value: 'world' });
    });

    it('transforms template literals without substitutions', () => {
      const result = transform('`template`');
      expect(result).toMatchObject({ kind: 'literal', value: 'template' });
    });

    it('transforms numeric literals', () => {
      expect(transform('42')).toMatchObject({ kind: 'literal', value: 42 });
      expect(transform('3.14')).toMatchObject({ kind: 'literal', value: 3.14 });
      expect(transform('0xFF')).toMatchObject({ kind: 'literal', value: 255 });
    });

    it('transforms boolean literals', () => {
      expect(transform('true')).toMatchObject({ kind: 'literal', value: true });
      expect(transform('false')).toMatchObject({ kind: 'literal', value: false });
    });

    it('transforms null', () => {
      expect(transform('null')).toMatchObject({ kind: 'literal', value: null });
    });

    it('transforms undefined', () => {
      expect(transform('undefined')).toMatchObject({ kind: 'literal', value: undefined });
    });
  });

  describe('identifiers', () => {
    it('transforms identifiers to references', () => {
      const result = transform('Config');
      expect(result).toMatchObject({ kind: 'reference', name: 'Config' });
      expect(result.kind === 'reference' && result.resolved).toBeUndefined();
    });

    it('preserves span information', () => {
      const result = transform('myVariable');
      expect(result.span).toBeDefined();
      expect(result.span!.start).toBeGreaterThanOrEqual(0);
      expect(result.span!.end).toBeGreaterThan(result.span!.start);
    });
  });

  describe('arrays', () => {
    it('transforms empty arrays', () => {
      const result = transform('[]');
      expect(result).toMatchObject({ kind: 'array', elements: [] });
    });

    it('transforms arrays with literals', () => {
      const result = transform('[1, 2, 3]');
      expect(result.kind).toBe('array');
      if (result.kind === 'array') {
        expect(result.elements).toHaveLength(3);
        expect(result.elements[0]).toMatchObject({ kind: 'literal', value: 1 });
        expect(result.elements[1]).toMatchObject({ kind: 'literal', value: 2 });
        expect(result.elements[2]).toMatchObject({ kind: 'literal', value: 3 });
      }
    });

    it('transforms arrays with references', () => {
      const result = transform('[Foo, Bar, Baz]');
      expect(result.kind).toBe('array');
      if (result.kind === 'array') {
        expect(result.elements).toHaveLength(3);
        expect(result.elements[0]).toMatchObject({ kind: 'reference', name: 'Foo' });
        expect(result.elements[1]).toMatchObject({ kind: 'reference', name: 'Bar' });
        expect(result.elements[2]).toMatchObject({ kind: 'reference', name: 'Baz' });
      }
    });

    it('transforms arrays with spread elements', () => {
      const result = transform('[...items, extra]');
      expect(result.kind).toBe('array');
      if (result.kind === 'array') {
        expect(result.elements).toHaveLength(2);
        expect(result.elements[0]).toMatchObject({ kind: 'spread' });
        if (result.elements[0]!.kind === 'spread') {
          expect(result.elements[0].target).toMatchObject({ kind: 'reference', name: 'items' });
        }
        expect(result.elements[1]).toMatchObject({ kind: 'reference', name: 'extra' });
      }
    });

    it('handles omitted elements', () => {
      const result = transform('[1, , 3]');
      expect(result.kind).toBe('array');
      if (result.kind === 'array') {
        expect(result.elements).toHaveLength(3);
        expect(result.elements[1]).toMatchObject({ kind: 'literal', value: undefined });
      }
    });
  });

  describe('objects', () => {
    it('transforms empty objects', () => {
      const result = transform('{}');
      expect(result).toMatchObject({ kind: 'object' });
      if (result.kind === 'object') {
        expect(result.properties.size).toBe(0);
        expect(result.methods.size).toBe(0);
      }
    });

    it('transforms objects with properties', () => {
      const result = transform('{ name: "foo", value: 42 }');
      expect(result.kind).toBe('object');
      if (result.kind === 'object') {
        expect(result.properties.size).toBe(2);
        expect(result.properties.get('name')).toMatchObject({ kind: 'literal', value: 'foo' });
        expect(result.properties.get('value')).toMatchObject({ kind: 'literal', value: 42 });
      }
    });

    it('transforms shorthand properties', () => {
      const result = transform('{ foo, bar }');
      expect(result.kind).toBe('object');
      if (result.kind === 'object') {
        expect(result.properties.get('foo')).toMatchObject({ kind: 'reference', name: 'foo' });
        expect(result.properties.get('bar')).toMatchObject({ kind: 'reference', name: 'bar' });
      }
    });

    it('transforms objects with methods', () => {
      const result = transform('{ register(c) { return c; } }');
      expect(result.kind).toBe('object');
      if (result.kind === 'object') {
        expect(result.methods.size).toBe(1);
        expect(result.methods.has('register')).toBe(true);
        const method = result.methods.get('register')!;
        expect(method.params).toHaveLength(1);
        expect(method.params[0]?.name).toBe('c');
        const span = getPropertyKeySpan(result, 'register');
        expect(span).toBeDefined();
        expect(span!.start).toBeLessThan(span!.end);
      }
    });

    it('transforms computed property names with string literals', () => {
      const result = transform('{ ["key"]: "value" }');
      expect(result.kind).toBe('object');
      if (result.kind === 'object') {
        expect(result.properties.get('key')).toMatchObject({ kind: 'literal', value: 'value' });
      }
    });

    it('handles spread properties', () => {
      const result = transform('{ ...base, extra: 1 }');
      expect(result.kind).toBe('object');
      if (result.kind === 'object') {
        // Spread is stored with a special key
        const spreadKey = [...result.properties.keys()].find(k => k.startsWith('__spread_'));
        expect(spreadKey).toBeDefined();
        expect(result.properties.get(spreadKey!)).toMatchObject({ kind: 'spread' });
        expect(result.properties.get('extra')).toMatchObject({ kind: 'literal', value: 1 });
      }
    });
  });

  describe('property access', () => {
    it('transforms property access', () => {
      const result = transform('obj.property');
      expect(result).toMatchObject({
        kind: 'propertyAccess',
        property: 'property',
      });
      if (result.kind === 'propertyAccess') {
        expect(result.base).toMatchObject({ kind: 'reference', name: 'obj' });
      }
    });

    it('transforms chained property access', () => {
      const result = transform('a.b.c');
      expect(result.kind).toBe('propertyAccess');
      if (result.kind === 'propertyAccess') {
        expect(result.property).toBe('c');
        expect(result.base.kind).toBe('propertyAccess');
        if (result.base.kind === 'propertyAccess') {
          expect(result.base.property).toBe('b');
          expect(result.base.base).toMatchObject({ kind: 'reference', name: 'a' });
        }
      }
    });

    it('transforms element access with string literal', () => {
      const result = transform('obj["property"]');
      expect(result).toMatchObject({
        kind: 'propertyAccess',
        property: 'property',
      });
    });

    it('transforms element access with numeric literal', () => {
      const result = transform('arr[0]');
      expect(result).toMatchObject({
        kind: 'propertyAccess',
        property: '0',
      });
    });

    it('returns unknown for dynamic element access', () => {
      const result = transform('obj[key]');
      expect(result.kind).toBe('unknown');
    });
  });

  describe('calls', () => {
    it('transforms simple function calls', () => {
      const result = transform('foo()');
      expect(result.kind).toBe('call');
      if (result.kind === 'call') {
        expect(result.callee).toMatchObject({ kind: 'reference', name: 'foo' });
        expect(result.args).toHaveLength(0);
      }
    });

    it('transforms calls with arguments', () => {
      const result = transform('register(A, B, C)');
      expect(result.kind).toBe('call');
      if (result.kind === 'call') {
        expect(result.args).toHaveLength(3);
        expect(result.args[0]).toMatchObject({ kind: 'reference', name: 'A' });
        expect(result.args[1]).toMatchObject({ kind: 'reference', name: 'B' });
        expect(result.args[2]).toMatchObject({ kind: 'reference', name: 'C' });
      }
    });

    it('transforms method calls', () => {
      const result = transform('container.register(Foo)');
      expect(result.kind).toBe('call');
      if (result.kind === 'call') {
        expect(result.callee).toMatchObject({
          kind: 'propertyAccess',
          property: 'register',
        });
      }
    });

    it('transforms calls with spread arguments', () => {
      const result = transform('register(...items)');
      expect(result.kind).toBe('call');
      if (result.kind === 'call') {
        expect(result.args).toHaveLength(1);
        expect(result.args[0]).toMatchObject({ kind: 'spread' });
      }
    });

    it('transforms chained calls', () => {
      const result = transform('a().b().c()');
      expect(result.kind).toBe('call');
      if (result.kind === 'call') {
        expect(result.callee.kind).toBe('propertyAccess');
      }
    });
  });

  describe('new expressions', () => {
    it('transforms new expressions', () => {
      const result = transform('new Aurelia()');
      expect(result.kind).toBe('new');
      if (result.kind === 'new') {
        expect(result.callee).toMatchObject({ kind: 'reference', name: 'Aurelia' });
        expect(result.args).toHaveLength(0);
      }
    });

    it('transforms new with arguments', () => {
      const result = transform('new Map([["a", 1]])');
      expect(result.kind).toBe('new');
      if (result.kind === 'new') {
        expect(result.args).toHaveLength(1);
        expect(result.args[0]?.kind).toBe('array');
      }
    });
  });

  describe('functions', () => {
    it('transforms arrow functions with expression body', () => {
      const result = transform('() => 42');
      expect(result.kind).toBe('function');
      if (result.kind === 'function') {
        expect(result.name).toBeNull();
        expect(result.params).toHaveLength(0);
        expect(result.body).toHaveLength(1);
        expect(result.body[0]?.kind).toBe('return');
      }
    });

    it('transforms arrow functions with block body', () => {
      const result = transform('(x) => { return x * 2; }');
      expect(result.kind).toBe('function');
      if (result.kind === 'function') {
        expect(result.params).toHaveLength(1);
        expect(result.params[0]?.name).toBe('x');
        expect(result.body).toHaveLength(1);
      }
    });

    it('transforms function expressions', () => {
      const result = transform('function foo(a, b) { return a + b; }');
      expect(result.kind).toBe('function');
      if (result.kind === 'function') {
        expect(result.name).toBe('foo');
        expect(result.params).toHaveLength(2);
      }
    });

    it('handles rest parameters', () => {
      const result = transform('(...args) => args');
      expect(result.kind).toBe('function');
      if (result.kind === 'function') {
        expect(result.params[0]?.isRest).toBe(true);
      }
    });

    it('handles default parameters', () => {
      const result = transform('(x = 10) => x');
      expect(result.kind).toBe('function');
      if (result.kind === 'function') {
        expect(result.params[0]?.defaultValue).toMatchObject({ kind: 'literal', value: 10 });
      }
    });
  });

  describe('type assertions', () => {
    it('strips as expressions', () => {
      const result = transform('value as string');
      expect(result).toMatchObject({ kind: 'reference', name: 'value' });
    });

    it('strips type assertions', () => {
      const result = transform('<string>value');
      expect(result).toMatchObject({ kind: 'reference', name: 'value' });
    });

    it('strips non-null assertions', () => {
      const result = transform('value!');
      expect(result).toMatchObject({ kind: 'reference', name: 'value' });
    });

    it('strips satisfies expressions', () => {
      const result = transform('value satisfies Type');
      expect(result).toMatchObject({ kind: 'reference', name: 'value' });
    });
  });

  describe('unsupported expressions', () => {
    it('returns unknown for template literals with substitutions', () => {
      const result = transform('`hello ${name}`');
      expect(result.kind).toBe('unknown');
    });

    it('returns unknown for conditional expressions', () => {
      const result = transform('cond ? a : b');
      expect(result.kind).toBe('unknown');
    });

    it('returns unknown for binary expressions', () => {
      const result = transform('a + b');
      expect(result.kind).toBe('unknown');
    });

    it('returns unknown for await expressions', () => {
      const result = transform('await promise');
      expect(result.kind).toBe('unknown');
    });
  });
});

// =============================================================================
// Statement Transformation Tests
// =============================================================================

describe('transformStatement', () => {
  describe('return statements', () => {
    it('transforms return with value', () => {
      const result = transformStmtStr('return 42;');
      expect(result.kind).toBe('return');
      if (result.kind === 'return') {
        expect(result.value).toMatchObject({ kind: 'literal', value: 42 });
      }
    });

    it('transforms return without value', () => {
      const result = transformStmtStr('return;');
      expect(result.kind).toBe('return');
      if (result.kind === 'return') {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('expression statements', () => {
    it('transforms expression statements', () => {
      const result = transformStmtStr('foo();');
      expect(result.kind).toBe('expression');
      if (result.kind === 'expression') {
        expect(result.value.kind).toBe('call');
      }
    });
  });

  describe('variable statements', () => {
    it('transforms const declarations', () => {
      const result = transformStmtStr('const x = 42;');
      expect(result.kind).toBe('variable');
      if (result.kind === 'variable') {
        expect(result.declarations).toHaveLength(1);
        expect(result.declarations[0]?.name).toBe('x');
        expect(result.declarations[0]?.init).toMatchObject({ kind: 'literal', value: 42 });
      }
    });

    it('transforms multiple declarations', () => {
      const result = transformStmtStr('const a = 1, b = 2;');
      expect(result.kind).toBe('variable');
      if (result.kind === 'variable') {
        expect(result.declarations).toHaveLength(2);
        expect(result.declarations[0]?.name).toBe('a');
        expect(result.declarations[1]?.name).toBe('b');
      }
    });

    it('handles declarations without initializers', () => {
      const result = transformStmtStr('let x;');
      expect(result.kind).toBe('variable');
      if (result.kind === 'variable') {
        expect(result.declarations[0]?.init).toBeNull();
      }
    });
  });

  describe('if statements', () => {
    it('transforms if without else', () => {
      const result = transformStmtStr('if (cond) { doIt(); }');
      expect(result.kind).toBe('if');
      if (result.kind === 'if') {
        expect(result.condition).toMatchObject({ kind: 'reference', name: 'cond' });
        expect(result.thenBranch).toHaveLength(1);
        expect(result.elseBranch).toBeUndefined();
      }
    });

    it('transforms if-else', () => {
      const result = transformStmtStr('if (cond) { a(); } else { b(); }');
      expect(result.kind).toBe('if');
      if (result.kind === 'if') {
        expect(result.thenBranch).toHaveLength(1);
        expect(result.elseBranch).toHaveLength(1);
      }
    });

    it('transforms if without braces', () => {
      const result = transformStmtStr('if (cond) doIt();');
      expect(result.kind).toBe('if');
      if (result.kind === 'if') {
        expect(result.thenBranch).toHaveLength(1);
      }
    });
  });

  describe('for-of statements', () => {
    it('transforms for-of loops', () => {
      const result = transformStmtStr('for (const item of items) { process(item); }');
      expect(result.kind).toBe('forOf');
      if (result.kind === 'forOf') {
        expect(result.variable).toBe('item');
        expect(result.iterable).toMatchObject({ kind: 'reference', name: 'items' });
        expect(result.body).toHaveLength(1);
      }
    });
  });

  describe('unsupported statements', () => {
    it('returns unknownStatement for traditional for loops', () => {
      const result = transformStmtStr('for (let i = 0; i < 10; i++) {}');
      expect(result.kind).toBe('unknownStatement');
    });

    it('returns unknownStatement for while loops', () => {
      const result = transformStmtStr('while (true) {}');
      expect(result.kind).toBe('unknownStatement');
    });

    it('returns unknownStatement for switch statements', () => {
      const result = transformStmtStr('switch (x) { case 1: break; }');
      expect(result.kind).toBe('unknownStatement');
    });

    it('returns unknownStatement for try statements', () => {
      const result = transformStmtStr('try { } catch (e) { }');
      expect(result.kind).toBe('unknownStatement');
    });
  });
});

// =============================================================================
// Method Transformation Tests
// =============================================================================

describe('transformMethod', () => {
  it('transforms a method declaration', () => {
    const { method: methodDecl, sf } = parseMethod('register(container) { container.register(Foo); }');
    const result = transformMethod(methodDecl, sf);

    expect(result.kind).toBe('method');
    expect(result.name).toBe('register');
    expect(result.params).toHaveLength(1);
    expect(result.params[0]?.name).toBe('container');
    expect(result.body).toHaveLength(1);
  });

  it('handles multiple parameters', () => {
    const { method: methodDecl, sf } = parseMethod('foo(a, b, c) { return a; }');
    const result = transformMethod(methodDecl, sf);

    expect(result.params).toHaveLength(3);
    expect(result.params.map(p => p.name)).toEqual(['a', 'b', 'c']);
  });

  it('handles empty body', () => {
    const { method: methodDecl, sf } = parseMethod('empty() { }');
    const result = transformMethod(methodDecl, sf);

    expect(result.body).toHaveLength(0);
  });
});

// =============================================================================
// Module Export Transformation Tests
// =============================================================================

describe('transformModuleExports', () => {
  it('extracts exported const declarations', () => {
    const sf = parseModule(`
      export const Config = { name: 'test' };
      export const Value = 42;
    `);
    const exports = transformModuleExports(sf);

    expect(exports.size).toBe(2);
    expect(exports.has('Config')).toBe(true);
    expect(exports.has('Value')).toBe(true);
    expect(exports.get('Value')).toMatchObject({ kind: 'literal', value: 42 });
  });

  it('extracts exported functions', () => {
    const sf = parseModule(`
      export function createConfig() { return {}; }
    `);
    const exports = transformModuleExports(sf);

    expect(exports.has('createConfig')).toBe(true);
    expect(exports.get('createConfig')?.kind).toBe('function');
  });

  it('extracts export default', () => {
    const sf = parseModule(`
      export default { name: 'default' };
    `);
    const exports = transformModuleExports(sf);

    expect(exports.has('default')).toBe(true);
    expect(exports.get('default')?.kind).toBe('object');
  });

  it('ignores non-exported declarations', () => {
    const sf = parseModule(`
      const internal = 'private';
      export const external = 'public';
    `);
    const exports = transformModuleExports(sf);

    expect(exports.size).toBe(1);
    expect(exports.has('internal')).toBe(false);
    expect(exports.has('external')).toBe(true);
  });

  it('handles exported class declarations', () => {
    const sf = parseModule(`
      export class MyElement {}
    `);
    const exports = transformModuleExports(sf);

    expect(exports.has('MyElement')).toBe(true);
    // Classes are stored as references, not full class values
    expect(exports.get('MyElement')?.kind).toBe('reference');
  });
});

// =============================================================================
// Complex Pattern Tests
// =============================================================================

describe('complex patterns', () => {
  it('transforms IRegistry pattern', () => {
    const result = transform(`{
      register(container) {
        container.register(FooElement, BarAttribute);
        return container;
      }
    }`);

    expect(result.kind).toBe('object');
    if (result.kind === 'object') {
      expect(result.methods.has('register')).toBe(true);
      const method = result.methods.get('register')!;
      expect(method.body).toHaveLength(2); // expression + return
      expect(method.body[0]?.kind).toBe('expression');
    }
  });

  it('transforms factory function pattern', () => {
    const sf = parseModule(`
      export function createConfig(options) {
        return {
          register(container) {
            if (options.includeX) {
              container.register(X);
            }
            container.register(...DefaultComponents);
          }
        };
      }
    `);
    const exports = transformModuleExports(sf);

    expect(exports.has('createConfig')).toBe(true);
    const fn = exports.get('createConfig')!;
    expect(fn.kind).toBe('function');
    if (fn.kind === 'function') {
      expect(fn.body).toHaveLength(1);
      expect(fn.body[0]?.kind).toBe('return');
      if (fn.body[0]?.kind === 'return' && fn.body[0].value) {
        expect(fn.body[0].value.kind).toBe('object');
      }
    }
  });

  it('transforms spread in register call', () => {
    const result = transform('container.register(...DefaultComponents)');

    expect(result.kind).toBe('call');
    if (result.kind === 'call') {
      expect(result.args).toHaveLength(1);
      expect(result.args[0]?.kind).toBe('spread');
      if (result.args[0]?.kind === 'spread') {
        expect(result.args[0].target).toMatchObject({ kind: 'reference', name: 'DefaultComponents' });
      }
    }
  });

  it('transforms Aurelia.register chain', () => {
    const result = transform('new Aurelia().register(Config)');

    expect(result.kind).toBe('call');
    if (result.kind === 'call') {
      expect(result.callee.kind).toBe('propertyAccess');
      if (result.callee.kind === 'propertyAccess') {
        expect(result.callee.property).toBe('register');
        expect(result.callee.base.kind).toBe('new');
      }
    }
  });

  it('preserves spans for diagnostics', () => {
    const { expr, sf } = parseExpr('{ register(c) { c.register(Foo); } }');
    const result = transformExpression(expr, sf);

    expect(result.span).toBeDefined();
    if (result.kind === 'object') {
      const method = result.methods.get('register')!;
      expect(method.span).toBeDefined();
      expect(method.body[0]?.span).toBeDefined();
    }
  });
});

