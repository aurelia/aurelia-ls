/**
 * Transform Package - TypeScript Source Analysis
 *
 * Analyzes TypeScript source to find classes and their declaration forms.
 * Uses TypeScript compiler API for robust parsing.
 *
 * Semantic knowledge (decorators, conventions) is imported from compiler
 * to avoid duplication.
 */

import ts from "typescript";
import {
  RESOURCE_DECORATOR_NAMES,
  toKebabCase,
  stripResourceSuffix,
} from "@aurelia-ls/compiler";
import type {
  ClassInfo,
  DecoratorInfo,
  DecoratorArgument,
  DetectedDeclarationForm,
  Span,
} from "./types.js";

/* =============================================================================
 * PUBLIC API
 * ============================================================================= */

/**
 * Parse source code into a TypeScript AST.
 */
export function parseSource(source: string, fileName = "source.ts"): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS
  );
}

/**
 * Find all class declarations in source code.
 */
export function findClasses(source: string): ClassInfo[] {
  const sourceFile = parseSource(source);
  const classes: ClassInfo[] = [];

  function visit(node: ts.Node): void {
    if (ts.isClassDeclaration(node) && node.name) {
      classes.push(extractClassInfo(node, sourceFile));
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return classes;
}

/**
 * Find a class by name.
 */
export function findClassByName(source: string, className: string): ClassInfo | null {
  const classes = findClasses(source);
  return classes.find(c => c.name === className) ?? null;
}

/**
 * Detect the declaration form of a class.
 */
export function detectDeclarationForm(
  classInfo: ClassInfo,
  className: string
): DetectedDeclarationForm {
  // Check for static $au first
  if (classInfo.hasStaticAu && classInfo.existingAuSpan) {
    return { form: "static-au", span: classInfo.existingAuSpan };
  }

  // Check for Aurelia decorators (using compiler-authoritative list)
  const aureliaDecorator = classInfo.decorators.find(d =>
    (RESOURCE_DECORATOR_NAMES as readonly string[]).includes(d.name)
  );

  if (aureliaDecorator) {
    // Check if it's a config form (has object argument)
    if (aureliaDecorator.isCall && aureliaDecorator.arguments?.some(a => a.type === "object")) {
      return { form: "decorator-config", decorator: aureliaDecorator };
    }
    return { form: "decorator", decorator: aureliaDecorator };
  }

  // Check for convention naming (using compiler-authoritative suffixes)
  if (isConventionName(className)) {
    return { form: "convention" };
  }

  return { form: "unknown" };
}

/**
 * Primary convention suffixes that unambiguously identify a resource.
 * These are the full suffixes (e.g., "CustomElement" not just "Element")
 * that clearly indicate the class follows Aurelia conventions.
 */
const PRIMARY_CONVENTION_SUFFIXES = [
  "CustomElement",
  "CustomAttribute",
  "ValueConverter",
  "BindingBehavior",
] as const;

/**
 * Check if a class name follows Aurelia conventions.
 * Only checks for primary suffixes (CustomElement, not Element) to avoid
 * false positives for short class names like "Element".
 */
export function isConventionName(className: string): boolean {
  return PRIMARY_CONVENTION_SUFFIXES.some(suffix => className.endsWith(suffix));
}

/**
 * Derive resource name from class name using Aurelia conventions.
 * Uses resolution's authoritative name derivation.
 */
export function deriveResourceName(className: string): string {
  // Remove suffix using resolution's helper, then convert to kebab-case
  const baseName = stripResourceSuffix(className);
  return toKebabCase(baseName);
}

/* =============================================================================
 * CLASS INFO EXTRACTION
 * ============================================================================= */

function extractClassInfo(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ClassInfo {
  const name = node.name!.text;

  // Get decorators (may extend before keyword)
  const decorators = extractDecorators(node, sourceFile);

  // Calculate class start - include decorators if present
  const decoratorStart = decorators.length > 0
    ? Math.min(...decorators.map(d => d.span.start))
    : null;
  const nodeStart = node.getStart(sourceFile);
  const start = decoratorStart !== null ? Math.min(decoratorStart, nodeStart) : nodeStart;

  // Class end
  const end = node.getEnd();

  // Find the opening brace of the class body
  const bodyStart = findOpenBrace(node, sourceFile);
  const bodyEnd = end - 1; // Before closing brace

  // Find static $au member
  const auInfo = findStaticAuMember(node, sourceFile);

  // Determine export type
  const exportType = getExportType(node);

  return {
    name,
    start,
    end,
    bodyStart,
    bodyEnd,
    decorators,
    hasStaticAu: auInfo !== null,
    existingAuSpan: auInfo ?? undefined,
    exportType,
  };
}

/* =============================================================================
 * DECORATOR EXTRACTION
 * ============================================================================= */

/**
 * Get decorators from a node.
 * Handles both legacy TS API and modern ts.getDecorators().
 */
function decoratorsOf(node: ts.Node): readonly ts.Decorator[] {
  if (ts.canHaveDecorators(node)) {
    return ts.getDecorators(node) ?? [];
  }
  // Fallback for older TypeScript versions
  const legacy = (node as ts.Node & { decorators?: readonly ts.Decorator[] }).decorators;
  return legacy ?? [];
}

/**
 * Extract decorators with span information.
 */
function extractDecorators(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): DecoratorInfo[] {
  const decorators: DecoratorInfo[] = [];

  for (const dec of decoratorsOf(node)) {
    const info = extractDecoratorInfo(dec, sourceFile);
    if (info) {
      decorators.push(info);
    }
  }

  return decorators;
}

/**
 * Extract information from a single decorator.
 */
function extractDecoratorInfo(dec: ts.Decorator, sourceFile: ts.SourceFile): DecoratorInfo | null {
  const expr = dec.expression;
  const start = dec.getStart(sourceFile);
  const end = dec.getEnd();
  const span: Span = { start, end };

  // @decorator (no call)
  if (ts.isIdentifier(expr)) {
    return {
      name: expr.text,
      span,
      isCall: false,
    };
  }

  // @decorator() or @decorator(args)
  if (ts.isCallExpression(expr)) {
    const callee = expr.expression;
    let name: string | null = null;

    if (ts.isIdentifier(callee)) {
      name = callee.text;
    } else if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) {
      // Handle namespaced decorators like @Aurelia.customElement
      name = callee.name.text;
    }

    if (!name) {
      return null;
    }

    const args = extractDecoratorArguments(expr.arguments, sourceFile);

    return {
      name,
      span,
      isCall: true,
      arguments: args,
    };
  }

  return null;
}

/**
 * Extract decorator arguments with type information.
 */
function extractDecoratorArguments(
  args: ts.NodeArray<ts.Expression>,
  sourceFile: ts.SourceFile
): DecoratorArgument[] {
  const result: DecoratorArgument[] = [];

  for (const arg of args) {
    const argStart = arg.getStart(sourceFile);
    const argEnd = arg.getEnd();
    const span: Span = { start: argStart, end: argEnd };

    if (ts.isStringLiteralLike(arg)) {
      result.push({
        type: "string",
        span,
        stringValue: arg.text,
      });
    } else if (ts.isObjectLiteralExpression(arg)) {
      result.push({
        type: "object",
        span,
      });
    } else if (ts.isIdentifier(arg)) {
      result.push({
        type: "identifier",
        span,
        identifierName: arg.text,
      });
    } else {
      result.push({
        type: "other",
        span,
      });
    }
  }

  return result;
}

/* =============================================================================
 * STATIC $au DETECTION
 * ============================================================================= */

/**
 * Check if a class member has the `static` modifier.
 */
function hasStaticModifier(node: ts.ClassElement): boolean {
  if (ts.canHaveModifiers(node)) {
    const modifiers = ts.getModifiers(node);
    return modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;
  }
  return false;
}

/**
 * Find static $au member and return its span.
 */
function findStaticAuMember(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): Span | null {
  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    if (!member.name || !ts.isIdentifier(member.name)) continue;
    if (member.name.text !== "$au") continue;
    if (!hasStaticModifier(member)) continue;

    const start = member.getStart(sourceFile);
    const end = member.getEnd();

    return { start, end };
  }

  return null;
}

/* =============================================================================
 * HELPERS
 * ============================================================================= */

/**
 * Find the position of the opening brace of the class body.
 */
function findOpenBrace(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): number {
  // Walk through children to find the opening brace
  const children = node.getChildren(sourceFile);
  for (const child of children) {
    if (child.kind === ts.SyntaxKind.OpenBraceToken) {
      return child.getStart(sourceFile);
    }
  }

  // Fallback: scan the text
  const text = sourceFile.text;
  const nodeStart = node.getStart(sourceFile);
  for (let i = nodeStart; i < text.length; i++) {
    if (text[i] === "{") {
      return i;
    }
  }

  return -1;
}

/**
 * Determine the export type of a class.
 */
function getExportType(node: ts.ClassDeclaration): "none" | "named" | "default" {
  if (!ts.canHaveModifiers(node)) {
    return "none";
  }

  const modifiers = ts.getModifiers(node);
  if (!modifiers) {
    return "none";
  }

  let hasExport = false;
  let hasDefault = false;

  for (const mod of modifiers) {
    if (mod.kind === ts.SyntaxKind.ExportKeyword) {
      hasExport = true;
    }
    if (mod.kind === ts.SyntaxKind.DefaultKeyword) {
      hasDefault = true;
    }
  }

  if (hasExport && hasDefault) {
    return "default";
  }
  if (hasExport) {
    return "named";
  }
  return "none";
}
