/**
 * Green Extraction — AnalyzableValue → GreenValue
 *
 * Recursively strips span annotations from the annotated (red) layer
 * to produce the structural (green) layer. The green value carries
 * only structural content — no spans, no diagnostic text.
 *
 * This is the boundary between the interpreter's internal representation
 * (AnnotatedValue / AnalyzableValue with spans) and the dependency model's
 * cutoff token (interned GreenValue).
 */

import type {
  AnalyzableValue,
  MethodValue,
  StatementValue,
  ParameterInfo,
  DecoratorApplication,
  BindableMember,
  VariableDeclaration,
} from '../project-semantics/evaluate/value/types.js';

import type {
  GreenValue,
  GreenMethod,
  GreenStatement,
  GreenParameter,
  GreenDecorator,
  GreenBindable,
  GreenVariableDecl,
} from './green.js';

/**
 * Extract the green (structural) layer from an annotated value.
 *
 * Strips all TextSpan fields, converts AnalysisGap to reasonKind string.
 * The result is suitable for interning and cutoff comparison.
 */
export function extractGreen(value: AnalyzableValue): GreenValue {
  switch (value.kind) {
    case 'literal':
      return { kind: 'literal', value: value.value };

    case 'array':
      return { kind: 'array', elements: value.elements.map(extractGreen) };

    case 'object':
      return {
        kind: 'object',
        properties: mapValues(value.properties, extractGreen),
        methods: mapValues(value.methods, extractGreenMethod),
      };

    case 'function':
      return {
        kind: 'function',
        name: value.name,
        params: value.params.map(extractGreenParam),
        body: value.body.map(extractGreenStatement),
      };

    case 'class':
      return {
        kind: 'class',
        className: value.className,
        filePath: value.filePath,
        decorators: value.decorators.map(extractGreenDecorator),
        staticMembers: mapValues(value.staticMembers, extractGreen),
        bindableMembers: value.bindableMembers.map(extractGreenBindable),
        gapKinds: value.gaps.map(g => g.why.kind),
      };

    case 'reference': {
      const green: GreenValue = { kind: 'reference', name: value.name };
      if (value.resolved) return { ...green, resolved: extractGreen(value.resolved) };
      return green;
    }

    case 'import': {
      const green: GreenValue = {
        kind: 'import',
        specifier: value.specifier,
        exportName: value.exportName,
      };
      const parts: Partial<{ resolvedPath: typeof value.resolvedPath; resolved: GreenValue }> = {};
      if (value.resolvedPath) parts.resolvedPath = value.resolvedPath;
      if (value.resolved) parts.resolved = extractGreen(value.resolved);
      return Object.keys(parts).length > 0 ? { ...green, ...parts } : green;
    }

    case 'propertyAccess':
      return {
        kind: 'propertyAccess',
        base: extractGreen(value.base),
        property: value.property,
      };

    case 'call': {
      const green: GreenValue = {
        kind: 'call',
        callee: extractGreen(value.callee),
        args: value.args.map(extractGreen),
      };
      if (value.returnValue) return { ...green, returnValue: extractGreen(value.returnValue) };
      return green;
    }

    case 'spread': {
      const green: GreenValue = {
        kind: 'spread',
        target: extractGreen(value.target),
      };
      if (value.expanded) return { ...green, expanded: value.expanded.map(extractGreen) };
      return green;
    }

    case 'new':
      return {
        kind: 'new',
        callee: extractGreen(value.callee),
        args: value.args.map(extractGreen),
      };

    case 'unknown':
      return { kind: 'unknown', reasonKind: value.reason.why.kind };
  }
}

function extractGreenMethod(m: MethodValue): GreenMethod {
  return {
    kind: 'method',
    name: m.name,
    params: m.params.map(extractGreenParam),
    body: m.body.map(extractGreenStatement),
  };
}

function extractGreenParam(p: ParameterInfo): GreenParameter {
  const green: GreenParameter = { name: p.name };
  const parts: Partial<{ defaultValue: GreenValue; isRest: boolean }> = {};
  if (p.defaultValue) parts.defaultValue = extractGreen(p.defaultValue);
  if (p.isRest) parts.isRest = true;
  return Object.keys(parts).length > 0 ? { ...green, ...parts } : green;
}

function extractGreenDecorator(d: DecoratorApplication): GreenDecorator {
  return { name: d.name, args: d.args.map(extractGreen) };
}

function extractGreenBindable(b: BindableMember): GreenBindable {
  const green: GreenBindable = { name: b.name, args: b.args.map(extractGreen) };
  if (b.type) return { ...green, type: b.type };
  return green;
}

function extractGreenStatement(s: StatementValue): GreenStatement {
  switch (s.kind) {
    case 'return':
      return { kind: 'return', value: s.value ? extractGreen(s.value) : null };

    case 'expression':
      return { kind: 'expression', value: extractGreen(s.value) };

    case 'variable':
      return { kind: 'variable', declarations: s.declarations.map(extractGreenVarDecl) };

    case 'if': {
      const green: GreenStatement = {
        kind: 'if',
        condition: extractGreen(s.condition),
        thenBranch: s.thenBranch.map(extractGreenStatement),
      };
      if (s.elseBranch) return { ...green, elseBranch: s.elseBranch.map(extractGreenStatement) };
      return green;
    }

    case 'forOf':
      return {
        kind: 'forOf',
        variable: s.variable,
        iterable: extractGreen(s.iterable),
        body: s.body.map(extractGreenStatement),
      };

    case 'unknownStatement':
      return { kind: 'unknownStatement', reasonKind: s.reason.why.kind };
  }
}

function extractGreenVarDecl(d: VariableDeclaration): GreenVariableDecl {
  return { name: d.name, init: d.init ? extractGreen(d.init) : null };
}

function mapValues<K, V, R>(map: ReadonlyMap<K, V>, fn: (v: V) => R): ReadonlyMap<K, R> {
  const result = new Map<K, R>();
  for (const [k, v] of map) result.set(k, fn(v));
  return result;
}
