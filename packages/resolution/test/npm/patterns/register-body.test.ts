/**
 * Register Body Analysis Tests
 *
 * Tests for extracting resources from IRegistry register() method bodies.
 */

import { describe, it, expect } from 'vitest';
import type { NormalizedPath } from '@aurelia-ls/compiler';
import type { ExtractedResource } from '../../../src/npm/types.js';
import {
  extractRegisterBodyResources,
  isContainerRegisterCall,
  isRegistrationPattern,
  type RegisterBodyContext,
} from '../../../src/npm/patterns/register-body.js';
import {
  method,
  exprStmt,
  varStmt,
  varDecl,
  returnStmt,
  ifStmt,
  forOfStmt,
  unknownStmt,
  call,
  propAccess,
  ref,
  array,
  spread,
  classVal,
  literal,
  object,
  importVal,
  unknown,
  type MethodValue,
  type ClassValue,
} from '../../../src/npm/value/types.js';
import { gap } from '../../../src/extraction/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

const TEST_FILE = '/pkg/src/test.ts' as NormalizedPath;

/**
 * Create a mock context that resolves classes to ExtractedResource.
 */
function createMockContext(
  classMap: Map<string, ExtractedResource> = new Map()
): RegisterBodyContext {
  return {
    resolveClass: (classVal: ClassValue) => classMap.get(classVal.className) ?? null,
    packagePath: '/pkg',
  };
}

/**
 * Create a simple ExtractedResource for testing.
 */
function createResource(className: string, kind: 'custom-element' | 'custom-attribute' = 'custom-element'): ExtractedResource {
  return {
    kind,
    name: className.replace(/Element$|CustomAttribute$/, '').toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, ''),
    className,
    bindables: [],
    aliases: [],
    source: { file: TEST_FILE, format: 'typescript' },
    evidence: { kind: 'static-au' },
  };
}

/**
 * Create a standard register method for testing.
 *
 * @param body - The method body statements
 * @param containerName - The container parameter name (default: 'container')
 */
function createRegisterMethod(
  body: ReturnType<typeof exprStmt>[],
  containerName = 'container'
): MethodValue {
  return method('register', [{ name: containerName }], body);
}

/**
 * Create a container.register(...args) call expression.
 */
function registerCall(containerName: string, args: Parameters<typeof call>[1]): ReturnType<typeof call> {
  return call(propAccess(ref(containerName), 'register'), args);
}

// =============================================================================
// Basic Extraction Tests
// =============================================================================

describe('extractRegisterBodyResources', () => {
  describe('basic class extraction', () => {
    it('extracts single direct class reference', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [fooClass])),
      ]);

      const classMap = new Map([['FooElement', createResource('FooElement')]]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('high');
      expect(result.gaps.length).toBe(0);
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.className).toBe('FooElement');
    });

    it('extracts multiple direct class references', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const barClass = classVal('BarAttribute', TEST_FILE);
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [fooClass, barClass])),
      ]);

      const classMap = new Map([
        ['FooElement', createResource('FooElement')],
        ['BarAttribute', createResource('BarAttribute', 'custom-attribute')],
      ]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('high');
      expect(result.value.length).toBe(2);
      expect(result.value.map(r => r.className).sort()).toEqual(['BarAttribute', 'FooElement']);
    });

    it('extracts class from resolved reference', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const resolvedRef = ref('Foo', fooClass);
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [resolvedRef])),
      ]);

      const classMap = new Map([['FooElement', createResource('FooElement')]]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('high');
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.className).toBe('FooElement');
    });

    it('extracts class from resolved import', () => {
      const fooClass = classVal('FooElement', '/pkg/src/foo.ts' as NormalizedPath);
      const resolvedImport = importVal('./foo', 'FooElement', '/pkg/src/foo.ts' as NormalizedPath, fooClass);
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [resolvedImport])),
      ]);

      const classMap = new Map([['FooElement', createResource('FooElement')]]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('high');
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.className).toBe('FooElement');
    });

    it('handles custom container parameter name', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('c', [fooClass])),
      ], 'c');

      const classMap = new Map([['FooElement', createResource('FooElement')]]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('high');
      expect(result.value.length).toBe(1);
    });

    it('deduplicates same class registered multiple times', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [fooClass])),
        exprStmt(registerCall('container', [fooClass])),
      ]);

      const classMap = new Map([['FooElement', createResource('FooElement')]]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.value.length).toBe(1);
    });
  });

  describe('array arguments', () => {
    it('extracts classes from array argument', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const barClass = classVal('BarElement', TEST_FILE);
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [array([fooClass, barClass])])),
      ]);

      const classMap = new Map([
        ['FooElement', createResource('FooElement')],
        ['BarElement', createResource('BarElement')],
      ]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('high');
      expect(result.value.length).toBe(2);
    });

    it('extracts from nested arrays', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const barClass = classVal('BarElement', TEST_FILE);
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [array([array([fooClass, barClass])])])),
      ]);

      const classMap = new Map([
        ['FooElement', createResource('FooElement')],
        ['BarElement', createResource('BarElement')],
      ]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.value.length).toBe(2);
    });
  });

  describe('spread arguments', () => {
    it('extracts from spread with expanded array', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const barClass = classVal('BarElement', TEST_FILE);
      const spreadVal = spread(ref('DefaultComponents'), [fooClass, barClass]);
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [spreadVal])),
      ]);

      const classMap = new Map([
        ['FooElement', createResource('FooElement')],
        ['BarElement', createResource('BarElement')],
      ]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('high');
      expect(result.value.length).toBe(2);
    });

    it('extracts from spread with resolved array target', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const barClass = classVal('BarElement', TEST_FILE);
      const resolvedArray = array([fooClass, barClass]);
      const spreadVal = spread(ref('DefaultComponents', resolvedArray));
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [spreadVal])),
      ]);

      const classMap = new Map([
        ['FooElement', createResource('FooElement')],
        ['BarElement', createResource('BarElement')],
      ]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('high');
      expect(result.value.length).toBe(2);
    });

    it('reports gap for unresolved spread', () => {
      const spreadVal = spread(ref('UnknownArray'));
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [spreadVal])),
      ]);

      const ctx = createMockContext();
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('manual');
      expect(result.value.length).toBe(0);
      expect(result.gaps.length).toBe(1);
      expect(result.gaps[0]!.why.kind).toBe('spread-unknown');
    });
  });

  describe('conditional registration', () => {
    it('extracts from both branches of if statement', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const barClass = classVal('BarElement', TEST_FILE);
      const registerMethod = createRegisterMethod([
        ifStmt(
          ref('options.useFoo'),
          [exprStmt(registerCall('container', [fooClass]))],
          [exprStmt(registerCall('container', [barClass]))]
        ),
      ]);

      const classMap = new Map([
        ['FooElement', createResource('FooElement')],
        ['BarElement', createResource('BarElement')],
      ]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('partial');
      expect(result.value.length).toBe(2);
      expect(result.gaps.length).toBe(1);
      expect(result.gaps[0]!.why.kind).toBe('conditional-registration');
    });

    it('extracts from then branch only (no else)', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const registerMethod = createRegisterMethod([
        ifStmt(
          ref('options.useFoo'),
          [exprStmt(registerCall('container', [fooClass]))]
        ),
      ]);

      const classMap = new Map([['FooElement', createResource('FooElement')]]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('partial');
      expect(result.value.length).toBe(1);
    });
  });

  describe('loop registration', () => {
    it('extracts from for-of with resolved iterable', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const barClass = classVal('BarElement', TEST_FILE);
      const resources = array([fooClass, barClass]);
      const registerMethod = createRegisterMethod([
        forOfStmt('r', ref('resources', resources), [
          exprStmt(registerCall('container', [ref('r')])),
        ]),
      ]);

      const classMap = new Map([
        ['FooElement', createResource('FooElement')],
        ['BarElement', createResource('BarElement')],
      ]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('partial');
      expect(result.value.length).toBe(2);
      expect(result.gaps.some(g => g.why.kind === 'loop-variable')).toBe(true);
    });
  });

  describe('DI service patterns (skip)', () => {
    it('skips Registration.singleton pattern', () => {
      const diCall = call(
        propAccess(ref('Registration'), 'singleton'),
        [ref('IFoo'), ref('Foo')]
      );
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [diCall])),
      ]);

      const ctx = createMockContext();
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.value.length).toBe(0);
      expect(result.gaps.length).toBe(0);
    });

    it('skips Registration.transient pattern', () => {
      const diCall = call(
        propAccess(ref('Registration'), 'transient'),
        [ref('IBar'), ref('Bar')]
      );
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [diCall])),
      ]);

      const ctx = createMockContext();
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.value.length).toBe(0);
      expect(result.gaps.length).toBe(0);
    });

    it('skips Registration.aliasTo pattern', () => {
      const diCall = call(
        propAccess(ref('Registration'), 'aliasTo'),
        [ref('IFoo'), ref('IBar')]
      );
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [diCall])),
      ]);

      const ctx = createMockContext();
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.value.length).toBe(0);
      expect(result.gaps.length).toBe(0);
    });

    it('skips DI.createInterface pattern', () => {
      const diCall = call(
        propAccess(ref('DI'), 'createInterface'),
        [literal('IFoo')]
      );
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [diCall])),
      ]);

      const ctx = createMockContext();
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.value.length).toBe(0);
      expect(result.gaps.length).toBe(0);
    });
  });

  describe('error handling', () => {
    it('reports gap for method with no container parameter', () => {
      const noParamMethod = method('register', [], []);

      const ctx = createMockContext();
      const result = extractRegisterBodyResources(noParamMethod, ctx);

      expect(result.confidence).toBe('manual');
      expect(result.gaps.length).toBe(1);
      expect(result.gaps[0]!.why.kind).toBe('parse-error');
    });

    it('reports gap for unresolved reference', () => {
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [ref('UnknownClass')])),
      ]);

      const ctx = createMockContext();
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('manual');
      expect(result.gaps.length).toBe(1);
      expect(result.gaps[0]!.why.kind).toBe('dynamic-value');
    });

    it('reports gap for unresolved import', () => {
      const unresolvedImport = importVal('./unknown', 'Foo');
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [unresolvedImport])),
      ]);

      const ctx = createMockContext();
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('manual');
      expect(result.gaps.length).toBe(1);
      expect(result.gaps[0]!.why.kind).toBe('unresolved-import');
    });

    it('reports gap for function call result', () => {
      const functionCall = call(ref('createResource'), [literal('foo')]);
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [functionCall])),
      ]);

      const ctx = createMockContext();
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('manual');
      expect(result.gaps.length).toBe(1);
      expect(result.gaps[0]!.why.kind).toBe('function-return');
    });

    it('reports gap for class that does not resolve to resource', () => {
      const nonResourceClass = classVal('PlainClass', TEST_FILE);
      const registerMethod = createRegisterMethod([
        exprStmt(registerCall('container', [nonResourceClass])),
      ]);

      // Context returns null for PlainClass (not a resource)
      const ctx = createMockContext(new Map());
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('manual');
      expect(result.gaps.length).toBe(1);
      expect(result.gaps[0]!.why.kind).toBe('invalid-resource-name');
    });

    it('propagates gaps from unknown statements', () => {
      const unknownGap = gap('unknown code', { kind: 'parse-error', message: 'unsupported' }, 'test');
      const registerMethod = createRegisterMethod([
        unknownStmt(unknownGap),
      ]);

      const ctx = createMockContext();
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.gaps.length).toBe(1);
      expect(result.gaps[0]!.why.kind).toBe('parse-error');
    });
  });

  describe('complex patterns', () => {
    it('handles mixed registration patterns', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const barClass = classVal('BarAttribute', TEST_FILE);
      const diCall = call(propAccess(ref('Registration'), 'singleton'), [ref('IService'), ref('Service')]);

      const registerMethod = createRegisterMethod([
        // Direct class
        exprStmt(registerCall('container', [fooClass])),
        // DI service (should be skipped)
        exprStmt(registerCall('container', [diCall])),
        // Array of classes
        exprStmt(registerCall('container', [array([barClass])])),
      ]);

      const classMap = new Map([
        ['FooElement', createResource('FooElement')],
        ['BarAttribute', createResource('BarAttribute', 'custom-attribute')],
      ]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('high');
      expect(result.value.length).toBe(2);
      expect(result.gaps.length).toBe(0);
    });

    it('handles return container.register(...)', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const registerMethod = createRegisterMethod([
        returnStmt(registerCall('container', [fooClass])),
      ]);

      const classMap = new Map([['FooElement', createResource('FooElement')]]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('high');
      expect(result.value.length).toBe(1);
    });

    it('handles variable declaration with register call', () => {
      const fooClass = classVal('FooElement', TEST_FILE);
      const registerMethod = createRegisterMethod([
        varStmt([varDecl('result', registerCall('container', [fooClass]))]),
      ]);

      const classMap = new Map([['FooElement', createResource('FooElement')]]);
      const ctx = createMockContext(classMap);
      const result = extractRegisterBodyResources(registerMethod, ctx);

      expect(result.confidence).toBe('high');
      expect(result.value.length).toBe(1);
    });
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('isContainerRegisterCall', () => {
  it('returns true for container.register call', () => {
    const callExpr = registerCall('container', []);
    expect(isContainerRegisterCall(callExpr, 'container')).toBe(true);
  });

  it('returns true for custom param name', () => {
    const callExpr = registerCall('c', []);
    expect(isContainerRegisterCall(callExpr, 'c')).toBe(true);
  });

  it('returns false for different method name', () => {
    const callExpr = call(propAccess(ref('container'), 'resolve'), []);
    expect(isContainerRegisterCall(callExpr, 'container')).toBe(false);
  });

  it('returns false for different receiver', () => {
    const callExpr = call(propAccess(ref('other'), 'register'), []);
    expect(isContainerRegisterCall(callExpr, 'container')).toBe(false);
  });

  it('returns false for non-property-access callee', () => {
    const callExpr = call(ref('register'), []);
    expect(isContainerRegisterCall(callExpr, 'container')).toBe(false);
  });
});

describe('isRegistrationPattern', () => {
  it('detects Registration.singleton', () => {
    const callExpr = call(propAccess(ref('Registration'), 'singleton'), []);
    expect(isRegistrationPattern(callExpr)).toBe(true);
  });

  it('detects Registration.transient', () => {
    const callExpr = call(propAccess(ref('Registration'), 'transient'), []);
    expect(isRegistrationPattern(callExpr)).toBe(true);
  });

  it('detects Registration.instance', () => {
    const callExpr = call(propAccess(ref('Registration'), 'instance'), []);
    expect(isRegistrationPattern(callExpr)).toBe(true);
  });

  it('detects Registration.callback', () => {
    const callExpr = call(propAccess(ref('Registration'), 'callback'), []);
    expect(isRegistrationPattern(callExpr)).toBe(true);
  });

  it('detects Registration.aliasTo', () => {
    const callExpr = call(propAccess(ref('Registration'), 'aliasTo'), []);
    expect(isRegistrationPattern(callExpr)).toBe(true);
  });

  it('detects DI.createInterface', () => {
    const callExpr = call(propAccess(ref('DI'), 'createInterface'), []);
    expect(isRegistrationPattern(callExpr)).toBe(true);
  });

  it('detects DI.inject', () => {
    const callExpr = call(propAccess(ref('DI'), 'inject'), []);
    expect(isRegistrationPattern(callExpr)).toBe(true);
  });

  it('returns false for container.register', () => {
    const callExpr = call(propAccess(ref('container'), 'register'), []);
    expect(isRegistrationPattern(callExpr)).toBe(false);
  });

  it('returns false for non-DI method', () => {
    const callExpr = call(propAccess(ref('Registration'), 'unknown'), []);
    expect(isRegistrationPattern(callExpr)).toBe(false);
  });

  it('returns false for non-property-access callee', () => {
    const callExpr = call(ref('singleton'), []);
    expect(isRegistrationPattern(callExpr)).toBe(false);
  });
});
