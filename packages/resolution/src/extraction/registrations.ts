import ts from "typescript";
import type { TextSpan } from "@aurelia-ls/compiler";
import type { RegistrationCallFact, RegistrationArgFact } from "./types.js";

/**
 * Extract registration call facts from a source file.
 * Looks for patterns like:
 * - Aurelia.register(...)
 * - new Aurelia().register(...)
 * - container.register(...)
 * - au.register(...)
 */
export function extractRegistrationCalls(
  sf: ts.SourceFile,
  _checker: ts.TypeChecker,
): RegistrationCallFact[] {
  const results: RegistrationCallFact[] = [];

  // Walk all statements looking for .register() calls
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const fact = tryExtractRegisterCall(node, sf);
      if (fact) results.push(fact);
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sf, visit);
  return results;
}

function tryExtractRegisterCall(
  call: ts.CallExpression,
  sf: ts.SourceFile,
): RegistrationCallFact | null {
  // Check if this is a .register() call
  if (!ts.isPropertyAccessExpression(call.expression)) return null;
  if (call.expression.name.text !== "register") return null;

  const receiver = classifyReceiver(call.expression.expression);
  if (receiver === null) return null;

  const args = extractRegisterArgs(call.arguments, sf);
  const { line, character } = sf.getLineAndCharacterOfPosition(call.getStart());

  return {
    receiver,
    arguments: args,
    position: { line, character },
  };
}

function classifyReceiver(expr: ts.Expression): "Aurelia" | "container" | "unknown" | null {
  // Direct: Aurelia.register(...)
  if (ts.isIdentifier(expr)) {
    if (expr.text === "Aurelia") return "Aurelia";
    if (expr.text === "container" || expr.text === "ctn") return "container";
    // Could be a variable holding Aurelia/container - mark as unknown
    return "unknown";
  }

  // Chained: new Aurelia().register(...)
  if (ts.isNewExpression(expr)) {
    if (ts.isIdentifier(expr.expression) && expr.expression.text === "Aurelia") {
      return "Aurelia";
    }
  }

  // Property access: this.container.register(...), DI.createContainer().register(...)
  if (ts.isPropertyAccessExpression(expr)) {
    const propName = expr.name.text;
    if (propName === "container") return "container";
  }

  // Call expression: DI.createContainer().register(...)
  if (ts.isCallExpression(expr)) {
    // TODO: More sophisticated analysis for container factory patterns
    if (ts.isPropertyAccessExpression(expr.expression)) {
      const methodName = expr.expression.name.text;
      if (methodName === "createContainer") return "container";
      // Chained .register() on something that returned this
      if (methodName === "register") return "unknown";
    }
  }

  return "unknown";
}

function extractRegisterArgs(
  args: ts.NodeArray<ts.Expression>,
  sf: ts.SourceFile,
): RegistrationArgFact[] {
  const results: RegistrationArgFact[] = [];

  for (const arg of args) {
    results.push(extractSingleArg(arg, sf));
  }

  return results;
}

/**
 * Get a TextSpan from a TypeScript AST node.
 * Uses getStart() to skip leading trivia (whitespace, comments).
 */
function nodeSpan(node: ts.Node, sf: ts.SourceFile): TextSpan {
  return {
    start: node.getStart(sf),
    end: node.getEnd(),
  };
}

function extractSingleArg(expr: ts.Expression, sf: ts.SourceFile): RegistrationArgFact {
  const span = nodeSpan(expr, sf);

  // Identifier: MyElement
  if (ts.isIdentifier(expr)) {
    return { kind: "identifier", name: expr.text, span };
  }

  // Spread: ...resources
  if (ts.isSpreadElement(expr)) {
    if (ts.isIdentifier(expr.expression)) {
      return { kind: "spread", name: expr.expression.text, span };
    }
    return { kind: "unknown", span };
  }

  // Array literal: [A, B, C]
  if (ts.isArrayLiteralExpression(expr)) {
    const elements: RegistrationArgFact[] = [];
    for (const el of expr.elements) {
      elements.push(extractSingleArg(el, sf));
    }
    return { kind: "arrayLiteral", elements, span };
  }

  // TODO: Handle more complex patterns:
  // - Property access: SomeModule.SomeElement
  // - Call expressions: StandardConfiguration, RouterConfiguration.customize({...})
  // - Object literals for config

  return { kind: "unknown", span };
}
