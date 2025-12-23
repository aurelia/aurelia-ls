/**
 * Entry Point Analyzer
 *
 * Analyzes Aurelia entry points (main.ts) to detect:
 * - How Aurelia is initialized (static vs instance API)
 * - Whether StandardConfiguration is used (explicit or implicit)
 * - Other registrations that need to be preserved
 */

import ts from "typescript";
import type {
  EntryPointAnalysis,
  AureliaImport,
  ImportSpecifier,
  PreservedRegistration,
  ConfigLocation,
  InitChain,
  ChainMethod,
} from "./types.js";
import { isKnownConfiguration } from "./types.js";

/**
 * Analyze an entry point file for Aurelia patterns.
 */
export function analyzeEntryPoint(source: string): EntryPointAnalysis {
  const sourceFile = ts.createSourceFile(
    "entry.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  const analysis: EntryPointAnalysis = {
    initPattern: "unknown",
    hasStandardConfiguration: false,
    preservedRegistrations: [],
    imports: {
      primarySource: null,
      aureliaImports: [],
      otherImports: [],
    },
  };

  // First pass: collect imports
  collectImports(sourceFile, analysis, source);

  // Second pass: find Aurelia initialization patterns
  findInitializationPatterns(sourceFile, analysis, source);

  return analysis;
}

/**
 * Collect import declarations and categorize them.
 */
function collectImports(
  sourceFile: ts.SourceFile,
  analysis: EntryPointAnalysis,
  source: string
): void {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;

    const moduleSpecifier = statement.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) continue;

    const importSource = moduleSpecifier.text;

    if (isAureliaImport(importSource)) {
      const aureliaImport = parseAureliaImport(statement, importSource, source);
      analysis.imports.aureliaImports.push(aureliaImport);

      // Track primary source (prefer 'aurelia' over scoped packages)
      if (importSource === "aurelia") {
        analysis.imports.primarySource = importSource;
      } else if (!analysis.imports.primarySource) {
        analysis.imports.primarySource = importSource;
      }
    } else {
      analysis.imports.otherImports.push({
        start: statement.getStart(),
        end: statement.getEnd(),
      });
    }
  }
}

/**
 * Check if an import source is from Aurelia.
 */
function isAureliaImport(source: string): boolean {
  return source === "aurelia" || source.startsWith("@aurelia/");
}

/**
 * Parse an Aurelia import declaration.
 */
function parseAureliaImport(
  node: ts.ImportDeclaration,
  importSource: string,
  source: string
): AureliaImport {
  const result: AureliaImport = {
    source: importSource,
    specifiers: [],
    hasDefault: false,
    span: { start: node.getStart(), end: node.getEnd() },
  };

  const importClause = node.importClause;
  if (!importClause) return result;

  // Default import: import Aurelia from 'aurelia'
  if (importClause.name) {
    result.hasDefault = true;
    result.defaultName = importClause.name.text;
  }

  // Named imports: import { X, Y } from 'aurelia'
  const namedBindings = importClause.namedBindings;
  if (namedBindings && ts.isNamedImports(namedBindings)) {
    for (const element of namedBindings.elements) {
      const specifier: ImportSpecifier = {
        name: element.name.text,
        span: { start: element.getStart(), end: element.getEnd() },
      };
      if (element.propertyName) {
        specifier.alias = element.name.text;
        specifier.name = element.propertyName.text;
      }
      result.specifiers.push(specifier);
    }
  }

  return result;
}

/**
 * Find Aurelia initialization patterns in the source.
 */
function findInitializationPatterns(
  sourceFile: ts.SourceFile,
  analysis: EntryPointAnalysis,
  source: string
): void {
  // Find the Aurelia default import name (usually "Aurelia")
  let aureliaName = "Aurelia";
  for (const imp of analysis.imports.aureliaImports) {
    if (imp.hasDefault && imp.defaultName) {
      aureliaName = imp.defaultName;
      break;
    }
  }

  // Track processed call expressions to avoid duplicates
  const processedCalls = new Set<ts.CallExpression>();

  // Walk the AST looking for Aurelia usage
  const visitor = (node: ts.Node): void => {
    // Look for call expressions that are the OUTERMOST in a chain
    // (i.e., not the expression part of another call)
    if (ts.isCallExpression(node) && !processedCalls.has(node)) {
      // Check if this call is the expression of a parent call
      // If so, skip it - we'll process it when we hit the parent
      const parent = node.parent;
      if (
        parent &&
        ts.isPropertyAccessExpression(parent) &&
        parent.parent &&
        ts.isCallExpression(parent.parent)
      ) {
        // This call is part of a chain, skip it
        ts.forEachChild(node, visitor);
        return;
      }

      const chain = parseCallChain(node, aureliaName, source);
      if (chain) {
        // Mark all calls in this chain as processed
        markChainAsProcessed(node, processedCalls);
        processCallChain(chain, analysis, source);
      }
    }

    // Look for explicit StandardConfiguration in any .register() call
    if (ts.isCallExpression(node)) {
      checkForStandardConfiguration(node, analysis, source);
    }

    ts.forEachChild(node, visitor);
  };

  ts.forEachChild(sourceFile, visitor);
}

/**
 * Mark all call expressions in a chain as processed.
 */
function markChainAsProcessed(
  node: ts.CallExpression,
  processed: Set<ts.CallExpression>
): void {
  let current: ts.Node = node;
  while (ts.isCallExpression(current)) {
    processed.add(current);
    const expr = current.expression;
    if (ts.isPropertyAccessExpression(expr)) {
      current = expr.expression;
    } else {
      break;
    }
  }
}

/**
 * Parse a call chain starting from Aurelia.
 * e.g., Aurelia.register(X).app(Y).start()
 */
function parseCallChain(
  node: ts.CallExpression,
  aureliaName: string,
  source: string
): ParsedChain | null {
  const methods: ChainMethod[] = [];
  let current: ts.Node = node;
  let isAureliaChain = false;
  let isStaticApi = false;
  let rootSpan = { start: node.getStart(), end: node.getEnd() };

  // Walk up the call chain
  while (ts.isCallExpression(current)) {
    const callExpr = current as ts.CallExpression;
    const expr = callExpr.expression;

    if (ts.isPropertyAccessExpression(expr)) {
      const methodName = expr.name.text;
      const args = callExpr.arguments.map((arg) =>
        source.slice(arg.getStart(), arg.getEnd())
      );

      methods.unshift({
        name: methodName,
        args,
        span: { start: callExpr.getStart(), end: callExpr.getEnd() },
      });

      // Check if this is Aurelia.something (static API)
      if (ts.isIdentifier(expr.expression)) {
        if (expr.expression.text === aureliaName) {
          isAureliaChain = true;
          isStaticApi = true;
          rootSpan = { start: expr.expression.getStart(), end: node.getEnd() };
        }
      }

      // Check if this is new Aurelia().something (instance API)
      if (ts.isNewExpression(expr.expression)) {
        const newExpr = expr.expression;
        if (
          ts.isIdentifier(newExpr.expression) &&
          newExpr.expression.text === aureliaName
        ) {
          isAureliaChain = true;
          isStaticApi = false;
          rootSpan = { start: newExpr.getStart(), end: node.getEnd() };
        }
      }

      // Continue up the chain
      current = expr.expression;
    } else if (ts.isIdentifier(expr)) {
      // Direct call: Aurelia(...)  - unlikely but handle it
      if (expr.text === aureliaName) {
        isAureliaChain = true;
      }
      break;
    } else if (ts.isNewExpression(expr)) {
      // new Aurelia().method() case - already handled above
      break;
    } else {
      break;
    }
  }

  if (!isAureliaChain) return null;

  return {
    methods,
    isStaticApi,
    rootSpan,
  };
}

interface ParsedChain {
  methods: ChainMethod[];
  isStaticApi: boolean;
  rootSpan: { start: number; end: number };
}

/**
 * Process a parsed Aurelia call chain.
 */
function processCallChain(
  chain: ParsedChain,
  analysis: EntryPointAnalysis,
  source: string
): void {
  analysis.initPattern = chain.isStaticApi ? "static-api" : "instance-api";

  // Static API (Aurelia.app()) implies StandardConfiguration
  if (chain.isStaticApi) {
    const hasAppCall = chain.methods.some((m) => m.name === "app");
    if (hasAppCall) {
      analysis.hasStandardConfiguration = true;
      analysis.configLocation = {
        type: "implicit",
        span: chain.rootSpan,
      };
    }
  }

  // Build init chain info
  analysis.initChain = {
    span: chain.rootSpan,
    methods: chain.methods,
  };

  // Extract component from .app() call
  const appCall = chain.methods.find((m) => m.name === "app");
  if (appCall && appCall.args.length > 0) {
    const arg = appCall.args[0]!;
    // Could be component class or config object
    if (!arg.startsWith("{")) {
      analysis.initChain.component = arg;
    }
  }

  // Extract preserved registrations from .register() calls
  for (const method of chain.methods) {
    if (method.name === "register") {
      for (const arg of method.args) {
        // Skip StandardConfiguration - we're replacing it
        if (arg === "StandardConfiguration") continue;

        const registration: PreservedRegistration = {
          expression: arg,
          span: method.span,
          isKnownConfig: isKnownConfiguration(arg),
        };
        analysis.preservedRegistrations.push(registration);
      }
    }
  }
}

/**
 * Check for explicit StandardConfiguration in any .register() call.
 */
function checkForStandardConfiguration(
  node: ts.CallExpression,
  analysis: EntryPointAnalysis,
  source: string
): void {
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return;
  if (expr.name.text !== "register") return;

  for (const arg of node.arguments) {
    if (ts.isIdentifier(arg) && arg.text === "StandardConfiguration") {
      analysis.hasStandardConfiguration = true;
      analysis.configLocation = {
        type: "explicit",
        span: { start: arg.getStart(), end: arg.getEnd() },
      };
    }
  }
}

/**
 * Check if an entry point should be transformed.
 * Returns a reason string if it should NOT be transformed, undefined if it should.
 */
export function shouldTransformEntryPoint(
  analysis: EntryPointAnalysis
): string | undefined {
  if (!analysis.hasStandardConfiguration) {
    return "No StandardConfiguration detected - cannot safely tree-shake";
  }

  if (analysis.initPattern === "unknown") {
    return "Could not determine Aurelia initialization pattern";
  }

  return undefined;
}
