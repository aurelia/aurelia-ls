/**
 * Manifest Generator
 *
 * Generates hydration manifest from AOT instructions and state.
 * The manifest tells the client which views were SSR-rendered for each
 * template controller, enabling proper DOM adoption during hydration.
 */

import type { IInstruction } from "@aurelia/template-compiler";
import type { IControllerManifest, IViewManifest } from "@aurelia/runtime-html";
import type { HydrationManifest } from "./ssr-processor.js";

/* =============================================================================
 * Public API
 * ============================================================================= */

/**
 * Generate hydration manifest from instructions and state.
 *
 * @param instructions - The root-level AOT instructions
 * @param state - The component state used during SSR
 * @returns Hydration manifest with controller entries
 */
export function generateManifest(
  instructions: IInstruction[][],
  state: Record<string, unknown>,
): HydrationManifest {
  const controllers: Record<number, IControllerManifest> = {};

  // Track global target counter to compute view target indices
  let globalTargetCounter = 0;

  // Recursively process instructions
  globalTargetCounter = processInstructions(
    instructions,
    state,
    controllers,
    globalTargetCounter,
  );

  return {
    targetCount: globalTargetCounter,
    controllers,
  };
}

/**
 * Process a set of instructions, finding template controllers and
 * recursively processing their nested content.
 */
function processInstructions(
  instructions: IInstruction[][],
  state: Record<string, unknown>,
  controllers: Record<number, IControllerManifest>,
  startIndex: number,
): number {
  let globalTargetCounter = startIndex;

  for (let i = 0; i < instructions.length; i++) {
    const row = instructions[i];
    const currentTargetIndex = globalTargetCounter;
    globalTargetCounter++;

    if (!row || row.length === 0) {
      continue;
    }

    for (const ins of row) {
      if (isHydrateTemplateController(ins)) {
        const entry = processTemplateController(
          ins,
          state,
          currentTargetIndex,
          globalTargetCounter,
          controllers, // Pass controllers to allow recursive additions
        );
        if (entry) {
          controllers[currentTargetIndex] = entry.manifest;
          globalTargetCounter = entry.nextTargetIndex;
        }
      }
    }
  }

  return globalTargetCounter;
}

/* =============================================================================
 * Template Controller Processing
 * ============================================================================= */

interface ProcessResult {
  manifest: IControllerManifest;
  nextTargetIndex: number;
}

function processTemplateController(
  ins: HydrateTemplateControllerInstruction,
  state: Record<string, unknown>,
  targetIndex: number,
  startTargetIndex: number,
  controllers: Record<number, IControllerManifest>,
): ProcessResult | null {
  const resource = ins.res;
  const def = ins.def as NestedDefinition;

  // Get the binding expression for the controller
  const props = ins.props ?? [];

  let viewCount = 0;
  let items: unknown[] | null = null;

  // Determine view count based on controller type
  if (resource === "if") {
    // Find the value binding (if.bind=condition)
    const valueBinding = props.find((p: IInstruction) =>
      isPropertyBinding(p) && (p as PropertyBindingInstruction).to === "value"
    ) as PropertyBindingInstruction | undefined;

    if (valueBinding) {
      const conditionValue = evaluateExpressionAST(valueBinding.from, state);
      viewCount = conditionValue ? 1 : 0;
    }
  } else if (resource === "repeat") {
    // Find the items binding (repeat.for="item of items")
    const itemsBinding = props.find((p: IInstruction) =>
      isIteratorBinding(p)
    ) as IteratorBindingInstruction | undefined;

    if (itemsBinding && itemsBinding.forOf) {
      const forOf = itemsBinding.forOf as ForOfStatement;
      const iterableValue = evaluateExpressionAST(forOf.iterable, state);
      if (Array.isArray(iterableValue)) {
        items = iterableValue;
        viewCount = items.length;
      }
    }
  } else {
    // Other controllers (else, switch, etc.) - skip for now
    return null;
  }

  // If no views rendered, still create an entry with empty views
  if (viewCount === 0) {
    return {
      manifest: { type: resource, views: [] },
      nextTargetIndex: startTargetIndex,
    };
  }

  // Calculate targets for each view
  const views: IViewManifest[] = [];
  let currentTargetIndex = startTargetIndex;

  for (let v = 0; v < viewCount; v++) {
    const viewStartIndex = currentTargetIndex;
    const viewTargets: number[] = [];

    // For repeat, create a scope with the item
    let viewState = state;
    if (resource === "repeat" && items) {
      // Get the variable name from the forOf declaration
      const itemsBinding = props.find((p: IInstruction) =>
        isIteratorBinding(p)
      ) as IteratorBindingInstruction | undefined;
      if (itemsBinding?.forOf) {
        const forOf = itemsBinding.forOf as ForOfStatement;
        const varName = (forOf.declaration as { name?: string })?.name ?? "item";
        viewState = { ...state, [varName]: items[v] };
      }
    }

    // Recursively process nested instructions to find nested template controllers
    if (def && def.instructions) {
      currentTargetIndex = processInstructions(
        def.instructions,
        viewState,
        controllers,
        currentTargetIndex,
      );

      // Collect view targets (all targets in this view's range)
      const nestedTargetCount = def.instructions.length;
      for (let t = 0; t < nestedTargetCount; t++) {
        viewTargets.push(viewStartIndex + t);
      }
    }

    views.push({
      targets: viewTargets,
      nodeCount: 1, // Default to 1 root node per view
    });
  }

  return {
    manifest: { type: resource, views },
    nextTargetIndex: currentTargetIndex,
  };
}

/* =============================================================================
 * Simple Expression Evaluator
 * ============================================================================= */

interface ExpressionAST {
  $kind: string;
  [key: string]: unknown;
}

interface ForOfStatement {
  $kind: "ForOfStatement";
  declaration: unknown;
  iterable: ExpressionAST;
}

/**
 * Evaluate an expression AST against a state object.
 * Handles basic cases: AccessScope, AccessMember, Binary comparisons.
 */
function evaluateExpressionAST(
  expr: unknown,
  state: Record<string, unknown>,
): unknown {
  if (!expr || typeof expr !== "object") {
    return undefined;
  }

  const ast = expr as ExpressionAST;

  switch (ast.$kind) {
    case "AccessScope": {
      const name = ast.name as string;
      return getPropertyValue(state, name);
    }

    case "AccessMember": {
      const obj = evaluateExpressionAST(ast.object, state);
      const name = ast.name as string;
      if (obj && typeof obj === "object") {
        return getPropertyValue(obj as Record<string, unknown>, name);
      }
      return undefined;
    }

    case "Binary": {
      const left = evaluateExpressionAST(ast.left, state);
      const right = evaluateExpressionAST(ast.right, state);
      const op = ast.operation as string;
      return evaluateBinaryOp(left, right, op);
    }

    case "Conditional": {
      const condition = evaluateExpressionAST(ast.condition, state);
      return condition
        ? evaluateExpressionAST(ast.yes, state)
        : evaluateExpressionAST(ast.no, state);
    }

    case "PrimitiveLiteral": {
      return ast.value;
    }

    case "ArrayLiteral": {
      const elements = ast.elements as unknown[];
      return elements.map(e => evaluateExpressionAST(e, state));
    }

    case "Unary": {
      const value = evaluateExpressionAST(ast.expression, state);
      const op = ast.operation as string;
      if (op === "!") return !value;
      if (op === "-") return -(value as number);
      return value;
    }

    default:
      return undefined;
  }
}

function getPropertyValue(
  obj: Record<string, unknown>,
  name: string,
): unknown {
  // Try direct property access
  if (name in obj) {
    return obj[name];
  }

  // Try getter (computed properties)
  const descriptor = Object.getOwnPropertyDescriptor(obj, name);
  if (descriptor?.get) {
    return descriptor.get.call(obj);
  }

  return undefined;
}

function evaluateBinaryOp(
  left: unknown,
  right: unknown,
  op: string,
): unknown {
  switch (op) {
    case "===": return left === right;
    case "!==": return left !== right;
    case "==": return left == right;
    case "!=": return left != right;
    case ">": return (left as number) > (right as number);
    case "<": return (left as number) < (right as number);
    case ">=": return (left as number) >= (right as number);
    case "<=": return (left as number) <= (right as number);
    case "&&": return left && right;
    case "||": return left || right;
    case "+": return (left as number) + (right as number);
    case "-": return (left as number) - (right as number);
    case "*": return (left as number) * (right as number);
    case "/": return (left as number) / (right as number);
    default: return undefined;
  }
}

/* =============================================================================
 * Type Guards and Interfaces
 * ============================================================================= */

interface HydrateTemplateControllerInstruction extends IInstruction {
  type: "rc"; // HydrateTemplateController type code
  res: string;
  def: unknown;
  props?: IInstruction[];
}

interface PropertyBindingInstruction extends IInstruction {
  type: "rg" | "rf"; // PropertyBinding or InterpolationBinding
  from: unknown;
  to: string;
}

interface IteratorBindingInstruction extends IInstruction {
  type: "rk";
  forOf: unknown;
  to: string;
}

interface NestedDefinition {
  template: string;
  instructions: IInstruction[][];
  name: string;
  needsCompile: boolean;
}

function isHydrateTemplateController(ins: IInstruction): ins is HydrateTemplateControllerInstruction {
  return (ins as HydrateTemplateControllerInstruction).type === "rc";
}

function isPropertyBinding(ins: IInstruction): ins is PropertyBindingInstruction {
  const type = (ins as PropertyBindingInstruction).type;
  return type === "rg" || type === "rf";
}

function isIteratorBinding(ins: IInstruction): ins is IteratorBindingInstruction {
  return (ins as IteratorBindingInstruction).type === "rk";
}

/**
 * Count the number of target positions in a nested definition.
 */
function countTargets(def: NestedDefinition): number {
  if (!def || !def.instructions) return 0;
  return def.instructions.length;
}
