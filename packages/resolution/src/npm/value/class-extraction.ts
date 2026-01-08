/**
 * Class Extraction for Enriched ClassValue
 *
 * Extracts class metadata using the value model (AnalyzableValue).
 * This replaces the separate ClassFacts extraction path.
 *
 * Usage:
 * ```typescript
 * const classValue = extractClassValue(classDecl, sourceFile, filePath);
 * // classValue.decorators, classValue.staticMembers, etc.
 * ```
 */

import * as ts from 'typescript';
import type { NormalizedPath, TextSpan } from '@aurelia-ls/compiler';
import type { AnalysisGap } from '../../extraction/types.js';
import { gap } from '../../extraction/types.js';
import type {
  AnalyzableValue,
  ClassValue,
  DecoratorApplication,
  BindableMember,
} from './types.js';
import { transformExpression } from './transform.js';

// =============================================================================
// Main Export
// =============================================================================

/**
 * Extract an enriched ClassValue from a TypeScript class declaration.
 *
 * This captures all metadata needed for pattern matching:
 * - Decorators with their arguments as AnalyzableValue
 * - Static members (including $au and dependencies)
 * - @bindable decorated instance members
 *
 * @param node - TypeScript class declaration AST
 * @param sf - Source file containing the class
 * @param filePath - Normalized path to the source file
 * @param checker - Optional TypeScript type checker for type inference
 */
export function extractClassValue(
  node: ts.ClassDeclaration,
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  checker?: ts.TypeChecker
): ClassValue {
  const className = node.name?.text ?? 'anonymous';
  const gaps: AnalysisGap[] = [];

  // Extract decorators
  const decorators = extractDecorators(node, sf);

  // Extract static members
  const staticMembers = extractStaticMembers(node, sf, gaps);

  // Extract @bindable members
  const bindableMembers = extractBindableMembers(node, sf, checker);

  return {
    kind: 'class',
    className,
    filePath,
    decorators,
    staticMembers,
    bindableMembers,
    gaps,
    span: nodeSpan(node, sf),
  };
}

// =============================================================================
// Decorator Extraction
// =============================================================================

/**
 * Extract decorators from a class declaration.
 */
function extractDecorators(
  node: ts.ClassDeclaration,
  sf: ts.SourceFile
): readonly DecoratorApplication[] {
  const result: DecoratorApplication[] = [];

  // Get decorators from modifiers (TS 5.0+)
  const decorators = ts.getDecorators(node);
  if (!decorators) return result;

  for (const decorator of decorators) {
    const application = extractDecoratorApplication(decorator, sf);
    if (application) {
      result.push(application);
    }
  }

  return result;
}

/**
 * Extract a single decorator application.
 */
function extractDecoratorApplication(
  decorator: ts.Decorator,
  sf: ts.SourceFile
): DecoratorApplication | null {
  const expr = decorator.expression;

  // @decoratorName (no parentheses)
  if (ts.isIdentifier(expr)) {
    return {
      name: expr.text,
      args: [],
      span: nodeSpan(decorator, sf),
    };
  }

  // @decoratorName(...args)
  if (ts.isCallExpression(expr)) {
    const callee = expr.expression;
    if (!ts.isIdentifier(callee)) {
      // Complex callee like @Foo.bar() - skip for now
      return null;
    }

    const args: AnalyzableValue[] = [];
    for (const arg of expr.arguments) {
      args.push(transformExpression(arg, sf));
    }

    return {
      name: callee.text,
      args,
      span: nodeSpan(decorator, sf),
    };
  }

  return null;
}

// =============================================================================
// Static Member Extraction
// =============================================================================

/**
 * Extract static members from a class declaration.
 *
 * Returns a Map of member name → AnalyzableValue.
 * Key members: "$au", "dependencies"
 */
function extractStaticMembers(
  node: ts.ClassDeclaration,
  sf: ts.SourceFile,
  gaps: AnalysisGap[]
): ReadonlyMap<string, AnalyzableValue> {
  const members = new Map<string, AnalyzableValue>();

  for (const member of node.members) {
    // Only process static property declarations
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!hasStaticModifier(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;

    const name = member.name.text;

    // Skip if no initializer
    if (!member.initializer) continue;

    // Transform the initializer to AnalyzableValue
    const value = transformExpression(member.initializer, sf);
    members.set(name, value);

    // Check for spread patterns in $au or dependencies that we should report
    if ((name === '$au' || name === 'dependencies') && containsSpread(value)) {
      const className = node.name?.text ?? 'anonymous';
      gaps.push(gap(
        `static ${name} for ${className}`,
        { kind: 'spread-unknown', spreadOf: '(object spread)' },
        `Replace spread with explicit properties for static analysis.`
      ));
    }
  }

  return members;
}

/**
 * Check if an AnalyzableValue contains a spread.
 */
function containsSpread(value: AnalyzableValue): boolean {
  switch (value.kind) {
    case 'spread':
      return true;
    case 'array':
      return value.elements.some(containsSpread);
    case 'object':
      for (const [key, prop] of value.properties) {
        if (key.startsWith('__spread_') || containsSpread(prop)) {
          return true;
        }
      }
      return false;
    default:
      return false;
  }
}

// =============================================================================
// Bindable Member Extraction
// =============================================================================

/**
 * Extract @bindable decorated members from a class declaration.
 */
function extractBindableMembers(
  node: ts.ClassDeclaration,
  sf: ts.SourceFile,
  checker?: ts.TypeChecker
): readonly BindableMember[] {
  const members: BindableMember[] = [];

  for (const member of node.members) {
    // Only process property declarations and accessors
    if (!ts.isPropertyDeclaration(member) &&
        !ts.isGetAccessorDeclaration(member) &&
        !ts.isSetAccessorDeclaration(member)) {
      continue;
    }

    if (!member.name || (!ts.isIdentifier(member.name) && !ts.isStringLiteral(member.name))) {
      continue;
    }

    const memberName = ts.isIdentifier(member.name) ? member.name.text : member.name.text;

    // Check for @bindable decorator
    const decorators = ts.getDecorators(member);
    if (!decorators) continue;

    for (const decorator of decorators) {
      const application = extractDecoratorApplication(decorator, sf);
      if (!application || application.name !== 'bindable') continue;

      // Get inferred type if checker is available
      let type: string | undefined;
      if (checker && ts.isPropertyDeclaration(member)) {
        type = inferTypeName(member, checker);
      }

      members.push({
        name: memberName,
        args: application.args,
        type,
        span: nodeSpan(member, sf),
      });
    }
  }

  return members;
}

/**
 * Infer the type name from a property declaration.
 */
function inferTypeName(
  member: ts.PropertyDeclaration,
  checker: ts.TypeChecker
): string | undefined {
  try {
    const type = checker.getTypeAtLocation(member);
    const typeStr = checker.typeToString(type);

    // Filter out unhelpful types
    if (typeStr === 'any' || typeStr === 'unknown') {
      return undefined;
    }

    return typeStr;
  } catch {
    return undefined;
  }
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if a member has the static modifier.
 */
function hasStaticModifier(member: ts.ClassElement): boolean {
  const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined;
  return modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;
}

/**
 * Get TextSpan from a node.
 */
function nodeSpan(node: ts.Node, sf: ts.SourceFile): TextSpan {
  return {
    start: node.getStart(sf),
    end: node.getEnd(),
  };
}
