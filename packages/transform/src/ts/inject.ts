/**
 * Transform Package - $au Injection
 *
 * Determines injection strategy and generates the necessary edits
 * to inject pre-compiled $au definitions into TypeScript source.
 *
 * Decorator detection uses resolution's authoritative list.
 * See docs/transform-package-design.md.
 */

import ts from "typescript";
import { RESOURCE_DECORATOR_NAMES } from "@aurelia-ls/resolution";
import type {
  ClassInfo,
  DecoratorInfo,
  InjectionPoint,
  InjectionStrategy,
  TypedSourceEdit,
  Span,
} from "./types.js";
import { detectDeclarationForm } from "./analyze.js";
import { replace, insert, del, extendSpanWithWhitespace } from "./edit.js";

/* =============================================================================
 * PUBLIC API
 * ============================================================================= */

export interface InjectOptions {
  /** Class name to inject into */
  className: string;

  /** Pre-generated artifact code (expression table + definitions) */
  artifactCode: string;

  /** Definition variable name (e.g., "myApp_$au") */
  definitionVar: string;

  /** Whether to remove existing decorator */
  removeDecorator?: boolean;

  /** Whether to remove @bindable property decorators */
  removeBindableDecorators?: boolean;

  /** Whether to preserve template import */
  preserveTemplateImport?: boolean;
}

export interface InjectResult {
  /** Edits to apply to the source */
  edits: TypedSourceEdit[];

  /** Warnings encountered */
  warnings: string[];

  /** Injection strategy used */
  strategy: InjectionStrategy;
}

/**
 * Determine the injection point for a class.
 */
export function analyzeInjectionPoint(
  classInfo: ClassInfo,
  options?: { removeDecorator?: boolean }
): InjectionPoint {
  const form = detectDeclarationForm(classInfo, classInfo.name);

  // If class already has static $au, replace it
  if (form.form === "static-au") {
    return {
      strategy: { type: "replace-static-au", span: form.span },
      classInfo,
    };
  }

  // If class has a decorator and we want to remove it
  if (
    (form.form === "decorator" || form.form === "decorator-config") &&
    options?.removeDecorator !== false
  ) {
    return {
      strategy: {
        type: "replace-decorator",
        decoratorSpan: form.decorator.span,
        classBodyStart: classInfo.bodyStart,
      },
      classInfo,
      decoratorToRemove: form.decorator,
    };
  }

  // Default: append after class
  return {
    strategy: { type: "append-after-class", classEnd: classInfo.end },
    classInfo,
  };
}

/**
 * Generate edits to inject $au definition into a class.
 */
export function generateInjectionEdits(
  source: string,
  classInfo: ClassInfo,
  options: InjectOptions
): InjectResult {
  const { className, artifactCode, definitionVar, removeDecorator = true, removeBindableDecorators = true } = options;

  const injectionPoint = analyzeInjectionPoint(classInfo, { removeDecorator });
  const edits: TypedSourceEdit[] = [];
  const warnings: string[] = [];

  switch (injectionPoint.strategy.type) {
    case "replace-static-au": {
      // Replace existing static $au with our compiled version
      const existingSpan = injectionPoint.strategy.span;

      // Insert artifact code before class
      edits.push(insert(classInfo.start, artifactCode + "\n\n"));

      // Replace static $au with reference to our definition
      const newStaticAu = `static $au = ${definitionVar};`;
      edits.push(replace(existingSpan, newStaticAu));

      break;
    }

    case "replace-decorator": {
      const { decoratorSpan } = injectionPoint.strategy;

      // Extend decorator span to include surrounding whitespace
      // This ensures clean removal of the decorator line
      const extendedSpan = extendSpanWithWhitespace(source, decoratorSpan);

      // Use a single REPLACE operation to atomically:
      // 1. Remove the decorator (and its whitespace)
      // 2. Insert the artifact code in its place
      // This avoids position conflicts that occur with separate insert + delete
      edits.push(replace(extendedSpan, artifactCode + "\n\n"));

      // Add static $au inside class body
      const staticAuCode = `  static $au = ${definitionVar};\n`;
      edits.push(insert(classInfo.bodyStart + 1, "\n" + staticAuCode));

      if (injectionPoint.decoratorToRemove) {
        warnings.push(
          `Removed @${injectionPoint.decoratorToRemove.name} decorator (replaced with static $au)`
        );
      }

      break;
    }

    case "append-after-class": {
      // Insert artifact code before class
      edits.push(insert(classInfo.start, artifactCode + "\n\n"));

      // Add static $au inside class body
      const staticAuCode = `  static $au = ${definitionVar};\n`;
      edits.push(insert(classInfo.bodyStart + 1, "\n" + staticAuCode));

      break;
    }

    case "insert-before-class": {
      // Insert artifact code before class
      edits.push(insert(injectionPoint.strategy.classStart, artifactCode + "\n\n"));

      // Add static $au inside class body
      const staticAuCode = `  static $au = ${definitionVar};\n`;
      edits.push(insert(classInfo.bodyStart + 1, "\n" + staticAuCode));

      break;
    }
  }

  // Remove @bindable property decorators if requested
  if (removeBindableDecorators) {
    const bindableSpans = findBindableDecoratorSpans(source, classInfo.name);
    for (const span of bindableSpans) {
      // For property decorators, only extend trailing whitespace (not leading)
      // to preserve line indentation
      const extendedSpan = extendSpanTrailingOnly(source, span);
      edits.push(del(extendedSpan));
    }
    if (bindableSpans.length > 0) {
      warnings.push(`Removed ${bindableSpans.length} @bindable decorator(s)`);
    }
  }

  return {
    edits,
    warnings,
    strategy: injectionPoint.strategy,
  };
}

/**
 * Find decorators that should be removed during transformation.
 * Uses resolution's authoritative list of resource decorators.
 */
export function findRemovableDecorators(classInfo: ClassInfo): DecoratorInfo[] {
  return classInfo.decorators.filter(d =>
    (RESOURCE_DECORATOR_NAMES as readonly string[]).includes(d.name)
  );
}

/**
 * Check if a class needs transformation.
 */
export function needsTransformation(classInfo: ClassInfo): boolean {
  // Already has static $au - may need update
  if (classInfo.hasStaticAu) {
    return true;
  }

  // Has Aurelia decorators
  if (findRemovableDecorators(classInfo).length > 0) {
    return true;
  }

  return false;
}

/* =============================================================================
 * INTERNAL HELPERS
 * ============================================================================= */

/**
 * Find all @bindable decorator spans on class properties.
 * Returns spans that can be used to delete the decorators.
 */
function findBindableDecoratorSpans(source: string, className: string): Span[] {
  const spans: Span[] = [];

  // Parse source to get the AST
  const sourceFile = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  // Find the class declaration and collect bindable decorator spans
  function visit(node: ts.Node): void {
    if (ts.isClassDeclaration(node) && node.name?.text === className) {
      // Found the class, iterate through its members
      for (const member of node.members) {
        if (!ts.isPropertyDeclaration(member)) continue;
        if (!ts.canHaveDecorators(member)) continue;

        const decorators = ts.getDecorators(member);
        if (!decorators) continue;

        for (const decorator of decorators) {
          if (isBindableDecorator(decorator)) {
            spans.push({
              start: decorator.getStart(sourceFile),
              end: decorator.getEnd(),
            });
          }
        }
      }
      return; // No need to recurse into the class
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return spans;
}

/**
 * Check if a decorator is @bindable.
 */
function isBindableDecorator(decorator: ts.Decorator): boolean {
  const expr = decorator.expression;

  // @bindable (no call)
  if (ts.isIdentifier(expr) && expr.text === "bindable") {
    return true;
  }

  // @bindable() or @bindable({...})
  if (ts.isCallExpression(expr)) {
    const callee = expr.expression;
    if (ts.isIdentifier(callee) && callee.text === "bindable") {
      return true;
    }
  }

  return false;
}

/**
 * Extend a span to include only trailing whitespace.
 * Used for property decorators where we want to preserve leading indentation.
 */
function extendSpanTrailingOnly(source: string, span: Span): Span {
  let end = span.end;

  // Extend to include trailing whitespace only (spaces and tabs, not newlines)
  while (end < source.length && (source[end] === " " || source[end] === "\t")) {
    end++;
  }

  return { start: span.start, end };
}
