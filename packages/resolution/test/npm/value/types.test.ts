/**
 * Value Model Types Tests
 *
 * Tests for the AnalyzableValue type hierarchy and utility functions.
 */

import { describe, it, expect } from 'vitest';
import type { NormalizedPath } from '@aurelia-ls/compiler';
import { gap } from '../../../src/extraction/types.js';
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
  unknown,
  method,
  // Statement constructors
  returnStmt,
  exprStmt,
  varStmt,
  varDecl,
  ifStmt,
  forOfStmt,
  unknownStmt,
  // Type guards
  isResolved,
  hasMethod,
  isRegistryShape,
  isClassValue,
  isResolvedClassRef,
  getResolvedValue,
  // Types
  type AnalyzableValue,
  type ObjectValue,
  type MethodValue,
} from '../../../src/npm/value/index.js';

describe('Value Model Types', () => {
  // ===========================================================================
  // Value Constructors
  // ===========================================================================

  describe('value constructors', () => {
    it('creates literal values', () => {
      expect(literal('hello')).toEqual({ kind: 'literal', value: 'hello' });
      expect(literal(42)).toEqual({ kind: 'literal', value: 42 });
      expect(literal(true)).toEqual({ kind: 'literal', value: true });
      expect(literal(null)).toEqual({ kind: 'literal', value: null });
      expect(literal(undefined)).toEqual({ kind: 'literal', value: undefined });
    });

    it('creates literal with span', () => {
      const span = { start: 0, end: 5 };
      expect(literal('test', span)).toEqual({ kind: 'literal', value: 'test', span });
    });

    it('creates array values', () => {
      const elements = [literal(1), literal(2), literal(3)];
      const arr = array(elements);

      expect(arr.kind).toBe('array');
      expect(arr.elements).toHaveLength(3);
      expect(arr.elements[0]).toEqual({ kind: 'literal', value: 1 });
    });

    it('creates object values', () => {
      const props = new Map<string, AnalyzableValue>([
        ['name', literal('foo')],
        ['value', literal(42)],
      ]);
      const obj = object(props);

      expect(obj.kind).toBe('object');
      expect(obj.properties.get('name')).toEqual({ kind: 'literal', value: 'foo' });
      expect(obj.methods.size).toBe(0);
    });

    it('creates object with methods', () => {
      const props = new Map<string, AnalyzableValue>();
      const methods = new Map<string, MethodValue>([
        ['register', method('register', [{ name: 'container' }], [])],
      ]);
      const obj = object(props, methods);

      expect(obj.kind).toBe('object');
      expect(obj.methods.has('register')).toBe(true);
      expect(obj.methods.get('register')?.params[0]?.name).toBe('container');
    });

    it('creates reference values', () => {
      const unresolved = ref('Config');
      expect(unresolved).toEqual({ kind: 'reference', name: 'Config' });

      const resolved = ref('Config', literal('resolved'));
      expect(resolved.kind).toBe('reference');
      expect(resolved.name).toBe('Config');
      expect(resolved.resolved).toEqual({ kind: 'literal', value: 'resolved' });
    });

    it('creates import values', () => {
      const imp = importVal('./config', 'Config');
      expect(imp.kind).toBe('import');
      expect(imp.specifier).toBe('./config');
      expect(imp.exportName).toBe('Config');
      expect(imp.resolvedPath).toBeUndefined();
      expect(imp.resolved).toBeUndefined();
    });

    it('creates import with resolved path', () => {
      const imp = importVal('./config', 'Config', '/pkg/src/config.ts' as NormalizedPath);
      expect(imp.resolvedPath).toBe('/pkg/src/config.ts');
    });

    it('creates property access values', () => {
      const base = ref('container');
      const access = propAccess(base, 'register');

      expect(access.kind).toBe('propertyAccess');
      expect(access.base).toBe(base);
      expect(access.property).toBe('register');
    });

    it('creates call values', () => {
      const callee = propAccess(ref('container'), 'register');
      const args = [ref('FooElement'), ref('BarAttribute')];
      const callVal = call(callee, args);

      expect(callVal.kind).toBe('call');
      expect(callVal.callee).toBe(callee);
      expect(callVal.args).toBe(args);
      expect(callVal.returnValue).toBeUndefined();
    });

    it('creates call with return value', () => {
      const callee = ref('createConfig');
      const callVal = call(callee, [], object(new Map()));

      expect(callVal.returnValue?.kind).toBe('object');
    });

    it('creates spread values', () => {
      const target = ref('DefaultComponents');
      const spreadVal = spread(target);

      expect(spreadVal.kind).toBe('spread');
      expect(spreadVal.target).toBe(target);
      expect(spreadVal.expanded).toBeUndefined();
    });

    it('creates spread with expanded elements', () => {
      const elements = [classVal('A', '/a.ts' as NormalizedPath), classVal('B', '/b.ts' as NormalizedPath)];
      const spreadVal = spread(ref('arr'), elements);

      expect(spreadVal.expanded).toHaveLength(2);
    });

    it('creates class values', () => {
      const cls = classVal('FooElement', '/src/foo.ts' as NormalizedPath);

      expect(cls.kind).toBe('class');
      expect(cls.className).toBe('FooElement');
      expect(cls.filePath).toBe('/src/foo.ts');
    });

    it('creates unknown values', () => {
      const reason = gap('value', { kind: 'dynamic-value', expression: 'config[key]' }, 'Cannot analyze');
      const unk = unknown(reason);

      expect(unk.kind).toBe('unknown');
      expect(unk.reason).toBe(reason);
    });

    it('creates method values', () => {
      const params = [{ name: 'container' }];
      const body = [exprStmt(call(propAccess(ref('container'), 'register'), [ref('Foo')]))];
      const m = method('register', params, body);

      expect(m.kind).toBe('method');
      expect(m.name).toBe('register');
      expect(m.params).toHaveLength(1);
      expect(m.body).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Statement Constructors
  // ===========================================================================

  describe('statement constructors', () => {
    it('creates return statements', () => {
      const ret = returnStmt(literal(42));
      expect(ret.kind).toBe('return');
      expect(ret.value).toEqual({ kind: 'literal', value: 42 });
    });

    it('creates return with null value', () => {
      const ret = returnStmt(null);
      expect(ret.kind).toBe('return');
      expect(ret.value).toBeNull();
    });

    it('creates expression statements', () => {
      const expr = exprStmt(call(ref('foo'), []));
      expect(expr.kind).toBe('expression');
      expect(expr.value.kind).toBe('call');
    });

    it('creates variable statements', () => {
      const stmt = varStmt([
        varDecl('x', literal(1)),
        varDecl('y', literal(2)),
      ]);

      expect(stmt.kind).toBe('variable');
      expect(stmt.declarations).toHaveLength(2);
      expect(stmt.declarations[0]?.name).toBe('x');
    });

    it('creates if statements', () => {
      const condition = ref('enabled');
      const thenBranch = [exprStmt(call(ref('doSomething'), []))];
      const elseBranch = [exprStmt(call(ref('doOther'), []))];
      const stmt = ifStmt(condition, thenBranch, elseBranch);

      expect(stmt.kind).toBe('if');
      expect(stmt.condition).toBe(condition);
      expect(stmt.thenBranch).toBe(thenBranch);
      expect(stmt.elseBranch).toBe(elseBranch);
    });

    it('creates for-of statements', () => {
      const stmt = forOfStmt('item', ref('items'), [
        exprStmt(call(propAccess(ref('container'), 'register'), [ref('item')])),
      ]);

      expect(stmt.kind).toBe('forOf');
      expect(stmt.variable).toBe('item');
      expect(stmt.iterable.kind).toBe('reference');
      expect(stmt.body).toHaveLength(1);
    });

    it('creates unknown statements', () => {
      const reason = gap('statement', { kind: 'dynamic-value', expression: 'complex' }, 'Skip');
      const stmt = unknownStmt(reason);

      expect(stmt.kind).toBe('unknownStatement');
      expect(stmt.reason).toBe(reason);
    });
  });

  // ===========================================================================
  // Type Guards
  // ===========================================================================

  describe('type guards', () => {
    describe('isResolved', () => {
      it('returns true for literal values', () => {
        expect(isResolved(literal('test'))).toBe(true);
        expect(isResolved(literal(42))).toBe(true);
        expect(isResolved(literal(null))).toBe(true);
      });

      it('returns true for class values', () => {
        expect(isResolved(classVal('Foo', '/foo.ts' as NormalizedPath))).toBe(true);
      });

      it('returns true for arrays with resolved elements', () => {
        expect(isResolved(array([literal(1), literal(2)]))).toBe(true);
      });

      it('returns false for arrays with unresolved elements', () => {
        expect(isResolved(array([literal(1), ref('unknown')]))).toBe(false);
      });

      it('returns false for unresolved references', () => {
        expect(isResolved(ref('Config'))).toBe(false);
      });

      it('returns true for resolved references', () => {
        expect(isResolved(ref('Config', literal('value')))).toBe(true);
      });

      it('returns false for unknown values', () => {
        const reason = gap('x', { kind: 'dynamic-value', expression: 'x' }, 'n/a');
        expect(isResolved(unknown(reason))).toBe(false);
      });

      it('handles nested resolution', () => {
        // Resolved nested reference
        const resolved = ref('outer', ref('inner', literal('value')));
        expect(isResolved(resolved)).toBe(true);

        // Unresolved nested reference
        const unresolved = ref('outer', ref('inner'));
        expect(isResolved(unresolved)).toBe(false);
      });
    });

    describe('hasMethod', () => {
      it('returns true when object has the method', () => {
        const obj = object(new Map(), new Map([['register', method('register', [], [])]]));
        expect(hasMethod(obj, 'register')).toBe(true);
      });

      it('returns false when object lacks the method', () => {
        const obj = object(new Map(), new Map());
        expect(hasMethod(obj, 'register')).toBe(false);
      });

      it('returns false for non-object values', () => {
        expect(hasMethod(literal('test'), 'register')).toBe(false);
        expect(hasMethod(array([]), 'register')).toBe(false);
        expect(hasMethod(ref('x'), 'register')).toBe(false);
      });
    });

    describe('isRegistryShape', () => {
      it('returns true for objects with register method', () => {
        const registry = object(new Map(), new Map([['register', method('register', [{ name: 'c' }], [])]]));
        expect(isRegistryShape(registry)).toBe(true);
      });

      it('returns false for objects without register method', () => {
        const notRegistry = object(new Map([['name', literal('test')]]));
        expect(isRegistryShape(notRegistry)).toBe(false);
      });

      it('returns false for non-objects', () => {
        expect(isRegistryShape(literal('test'))).toBe(false);
      });
    });

    describe('isClassValue', () => {
      it('returns true for class values', () => {
        expect(isClassValue(classVal('Foo', '/foo.ts' as NormalizedPath))).toBe(true);
      });

      it('returns false for non-class values', () => {
        expect(isClassValue(literal('test'))).toBe(false);
        expect(isClassValue(ref('Foo'))).toBe(false);
      });
    });

    describe('isResolvedClassRef', () => {
      it('returns true for reference resolved to class', () => {
        const resolved = ref('Foo', classVal('FooElement', '/foo.ts' as NormalizedPath));
        expect(isResolvedClassRef(resolved)).toBe(true);
      });

      it('returns false for unresolved reference', () => {
        expect(isResolvedClassRef(ref('Foo'))).toBe(false);
      });

      it('returns false for reference resolved to non-class', () => {
        expect(isResolvedClassRef(ref('Foo', literal('not a class')))).toBe(false);
      });

      it('returns false for non-reference', () => {
        expect(isResolvedClassRef(classVal('Foo', '/foo.ts' as NormalizedPath))).toBe(false);
      });
    });

    describe('getResolvedValue', () => {
      it('returns the value itself for non-references', () => {
        const lit = literal('test');
        expect(getResolvedValue(lit)).toBe(lit);
      });

      it('returns resolved value for references', () => {
        const inner = literal('resolved');
        const resolved = ref('x', inner);
        expect(getResolvedValue(resolved)).toBe(inner);
      });

      it('follows reference chains', () => {
        const innermost = literal('deep');
        const chain = ref('a', ref('b', ref('c', innermost)));
        expect(getResolvedValue(chain)).toBe(innermost);
      });

      it('returns the reference if unresolved', () => {
        const unresolved = ref('x');
        expect(getResolvedValue(unresolved)).toBe(unresolved);
      });

      it('follows import resolution', () => {
        const inner = classVal('Foo', '/foo.ts' as NormalizedPath);
        const imp = importVal('./foo', 'Foo', '/foo.ts' as NormalizedPath, inner);
        expect(getResolvedValue(imp)).toBe(inner);
      });
    });
  });

  // ===========================================================================
  // Complex Scenarios
  // ===========================================================================

  describe('complex scenarios', () => {
    it('models IRegistry pattern', () => {
      // { register(container) { container.register(FooElement, BarAttribute) } }
      const registerBody = [
        exprStmt(call(
          propAccess(ref('container'), 'register'),
          [
            ref('FooElement', classVal('FooElement', '/foo.ts' as NormalizedPath)),
            ref('BarAttribute', classVal('BarAttribute', '/bar.ts' as NormalizedPath)),
          ]
        ))
      ];

      const registry = object(
        new Map(),
        new Map([['register', method('register', [{ name: 'container' }], registerBody)]])
      );

      expect(isRegistryShape(registry)).toBe(true);
      expect(registry.methods.get('register')?.body).toHaveLength(1);

      const stmt = registry.methods.get('register')!.body[0]!;
      expect(stmt.kind).toBe('expression');
      if (stmt.kind === 'expression') {
        expect(stmt.value.kind).toBe('call');
        if (stmt.value.kind === 'call') {
          expect(stmt.value.args).toHaveLength(2);
          expect(isResolvedClassRef(stmt.value.args[0]!)).toBe(true);
        }
      }
    });

    it('models spread in register call', () => {
      // container.register(...DefaultComponents)
      const defaultComponents = array([
        classVal('A', '/a.ts' as NormalizedPath),
        classVal('B', '/b.ts' as NormalizedPath),
      ]);

      const spreadArg = spread(ref('DefaultComponents', defaultComponents), defaultComponents.elements);
      const registerCall = call(propAccess(ref('container'), 'register'), [spreadArg]);

      expect(registerCall.args).toHaveLength(1);
      const arg = registerCall.args[0]!;
      expect(arg.kind).toBe('spread');
      if (arg.kind === 'spread') {
        expect(arg.expanded).toHaveLength(2);
        expect(arg.expanded![0]!.kind).toBe('class');
      }
    });

    it('models factory pattern', () => {
      // function createConfig() { return { register(c) { ... } } }
      const returnedObject = object(
        new Map(),
        new Map([['register', method('register', [{ name: 'c' }], [])]])
      );

      const factory: AnalyzableValue = {
        kind: 'function',
        name: 'createConfig',
        params: [],
        body: [returnStmt(returnedObject)],
      };

      expect(factory.kind).toBe('function');
      if (factory.kind === 'function') {
        const ret = factory.body[0];
        expect(ret?.kind).toBe('return');
        if (ret?.kind === 'return' && ret.value) {
          expect(isRegistryShape(ret.value)).toBe(true);
        }
      }
    });

    it('models conditional registration', () => {
      // if (options.includeX) { container.register(X) }
      const ifStatement = ifStmt(
        propAccess(ref('options'), 'includeX'),
        [exprStmt(call(propAccess(ref('container'), 'register'), [ref('X')]))],
        undefined
      );

      expect(ifStatement.kind).toBe('if');
      expect(ifStatement.thenBranch).toHaveLength(1);
      expect(ifStatement.elseBranch).toBeUndefined();
    });
  });
});
