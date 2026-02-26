/**
 * Expression Semantic Model — demand-driven expression type resolution (Tiers 1-3).
 *
 * Provides type-enriched expression resolution without requiring full template compilation.
 * The model is ALWAYS available during editing because its inputs (DOM tree, VM class type,
 * TS checker) are always available.
 *
 * STATELESS with respect to TypeScript types: every query goes fresh to the TS checker.
 * Currency is inherited from TypeScript's own language service caching.
 *
 * The evaluateType function is ISOMORPHIC to the Aurelia runtime's astEvaluate:
 * same switch structure, same scope walk semantics, but operating on ts.Type instead
 * of runtime values. Completeness comes from structural correspondence with the runtime.
 *
 * derived_from:
 *   l1: models/attractor/l1/template-analysis.md §The Expression Semantic Model
 *   l2: models/attractor/l2/template-pipeline.ts §Expression Semantic Model
 *   runtime: aurelia-60/packages/runtime/src/ast.eval.ts (astEvaluate)
 *   runtime: aurelia-60/packages/runtime/src/scope.ts (Scope.getContext)
 */

import type {
  IrModule,
  TemplateIR,
  InstructionRow,
  InstructionIR,
  HydrateTemplateControllerIR,
  HydrateLetElementIR,
  IteratorBindingIR,
  PropertyBindingIR,
  ExprTableEntry,
  ForOfStatement,
  DOMNode,
  SourceSpan,
  NormalizedPath,
  ExprId,
  ScopeSymbol,
  FrameOrigin,
  ControllerConfig,
  ControllerTrigger,
  ControllerInjects,

  // Expression AST types — mirrors runtime's $kind discriminants
  AccessScopeExpression,
  AccessMemberExpression,
  AccessKeyedExpression,
  AccessThisExpression,
  AccessBoundaryExpression,
  AccessGlobalExpression,
  CallScopeExpression,
  CallMemberExpression,
  CallGlobalExpression,
  CallFunctionExpression,
  BinaryExpression,
  ConditionalExpression,
  UnaryExpression,
  PrimitiveLiteralExpression,
  ValueConverterExpression,
  BindingBehaviorExpression,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  TemplateExpression,
  TaggedTemplateExpression,
  NewExpression,
  ParenExpression,
  ArrowFunction,
  AssignExpression,
  Interpolation,
  BadExpression,
  CustomExpression,
  BindingIdentifier,
  IsBindingBehavior,
  IsLeftHandSide,
  IsAssign,
  AnyBindingExpression,
} from "@aurelia-ls/compiler";

import { getControllerConfig } from "@aurelia-ls/compiler";

import type {
  ExpressionSemanticModel,
  ExpressionScopeContext,
  ExpressionTypeInfo,
  ExpressionCompletion,
  ExpressionResolutionTier,
  LightweightScopeFrame,
  VmClassRef,
} from "@aurelia-ls/compiler";

import type { ExpressionTypeChecker, PropertyInfo } from "./typescript/expression-checker.js";

import type ts from "typescript";

// ============================================================================
// Factory
// ============================================================================

export interface ExpressionModelDeps {
  ir: IrModule;
  checker: ExpressionTypeChecker;
  vmClass: VmClassRef | null;
  /** Controller config lookup — falls back to builtins via getControllerConfig. */
  controllerConfigLookup?: (name: string) => ControllerConfig | null;
  /** Whether the template compilation is current (not stale). */
  compilationCurrent?: boolean;
}

/**
 * Build the expression semantic model for a template.
 * Per-template, on-demand. Cheap to create — no cached type state.
 */
export function buildExpressionSemanticModel(deps: ExpressionModelDeps): ExpressionSemanticModel {
  const { ir, checker, vmClass, compilationCurrent } = deps;
  const configLookup = deps.controllerConfigLookup ?? getControllerConfig;

  // Build the expression table index once (ExprId → ExprTableEntry).
  const exprIndex = new Map<ExprId, ExprTableEntry>();
  if (ir.exprTable) {
    for (const entry of ir.exprTable) {
      exprIndex.set(entry.id, entry);
    }
  }

  // Pre-build the frame tree for the entire template.
  // This is a Tier 1 operation — structural only, no type resolution.
  const { frames, spanToFrame } = buildFrameTree(ir, configLookup, exprIndex);

  // Build the TypeScope that evaluateType uses.
  const typeScope: TypeScope = {
    vmClass,
    frames,
    exprIndex,
    ir,
  };

  return {
    getScopeAt(offset: number): ExpressionScopeContext {
      const frameId = resolveFrameAtOffset(offset, spanToFrame, frames);
      return { vmClass, frameId, frames };
    },

    resolveIdentifier(name: string, scope: ExpressionScopeContext): ExpressionTypeInfo {
      const tsType = resolveIdentifierToType(name, scope, checker, typeScope);
      const typeStr = tsType ? checker.typeToString(tsType) : undefined;

      // Determine memberOf: if resolved from VM class, memberOf = className
      let memberOf: string | undefined;
      if (tsType && scope.vmClass) {
        const classType = checker.getClassInstanceType(scope.vmClass.file, scope.vmClass.className);
        if (classType) {
          const vmProp = checker.getPropertyTsType(classType, name);
          if (vmProp && vmProp === tsType) {
            memberOf = scope.vmClass.className;
          }
        }
      }

      return {
        tier: tsType ? (memberOf ? 2 : 3) : 1,
        type: typeStr ?? (CONTEXTUAL_TYPES[name] || undefined),
        symbol: name,
        memberOf,
        confidence: tsType ? "high" : (CONTEXTUAL_TYPES[name] ? "high" : "low"),
      };
    },

    getTypeAt(offset: number): ExpressionTypeInfo | null {
      const scope = this.getScopeAt(offset);
      const exprEntry = findExpressionAtOffset(offset, ir);
      if (!exprEntry) return null;

      // Walk the expression AST to find the narrowest sub-node at the offset.
      const subNode = findExpressionNodeAtOffset(exprEntry.ast, offset);
      const target = subNode ?? exprEntry.ast;

      // Special case: ForOfStatement with cursor on the declaration side
      // (`item` in `item of items`). Return the ELEMENT type, not the
      // iterable's collection type.
      if (target.$kind === "ForOfStatement") {
        const forOf = target as ForOfStatement;
        const iterableTsType = evaluateType(forOf.iterable as AnyBindingExpression, scope, checker, typeScope);
        if (iterableTsType) {
          const elemType = checker.getElementTypeOfCollection(iterableTsType);
          if (elemType) {
            return {
              tier: 3,
              type: checker.typeToString(elemType),
              symbol: undefined,
              memberOf: undefined,
              confidence: "high",
            };
          }
        }
      }

      // Evaluate the target node's type.
      const tsType = evaluateType(target as AnyBindingExpression, scope, checker, typeScope);
      return buildTypeInfo(target as AnyBindingExpression, tsType, scope, checker, typeScope);
    },

    getCompletionsAt(offset: number): ExpressionCompletion[] {
      const scope = this.getScopeAt(offset);
      // Scope-root completions: scope symbols + overlay members + VM class properties + contextuals.
      // Member-access completions are handled separately via getMemberCompletionsAt(),
      // called from the completions engine when the scanner detects a dot token.
      return collectScopeCompletions(scope, checker, typeScope);
    },

    getMemberCompletionsAt(offset: number): ExpressionCompletion[] {
      const scope = this.getScopeAt(offset);

      // Find the expression containing the cursor or the dot before it.
      // Try several offsets: the cursor position, dot position (offset-1),
      // and the char before the dot (offset-2) to handle `item.`, `item?.`.
      const entry = findExpressionAtOffset(offset, ir)
        ?? findExpressionAtOffset(offset - 1, ir)
        ?? findExpressionAtOffset(offset - 2, ir);
      if (!entry) return [];

      // Strategy 1: Find an AccessMember/CallMember node in the AST where
      // the cursor is at or after the dot. Use its .object as left-hand.
      for (const probeOffset of [offset, offset - 1, offset + 1]) {
        const leftExpr = findMemberAccessObject(entry.ast, probeOffset);
        if (leftExpr) {
          const objType = evaluateType(leftExpr, scope, checker, typeScope);
          if (objType) {
            return buildMemberCompletions(objType, checker);
          }
        }
      }

      // Strategy 2: Find the narrowest expression node just before the dot.
      // If cursor is right after `item.`, offset-2 lands on the last char
      // of `item`. Evaluate that node and enumerate its members.
      for (const probeOffset of [offset - 1, offset - 2]) {
        const node = findExpressionNodeAtOffset(entry.ast, probeOffset);
        if (node) {
          // If it's an AccessMember, use its OBJECT (not the whole thing).
          const evalTarget = (node.$kind === "AccessMember")
            ? (node as AccessMemberExpression).object as AnyBindingExpression
            : node as AnyBindingExpression;
          const objType = evaluateType(evalTarget, scope, checker, typeScope);
          if (objType) {
            return buildMemberCompletions(objType, checker);
          }
        }
      }

      return [];
    },

    getMemberCompletionsForChain(chain: string, offset: number): ExpressionCompletion[] {
      const scope = this.getScopeAt(offset);
      const segments = chain.split(".").map(s => s.trim()).filter(Boolean);
      if (segments.length === 0) return [];

      // Resolve the first segment. Handle scope tokens specially.
      const first = segments[0]!;
      let currentType: ReturnType<typeof resolveIdentifierToType> = null;

      if (first === "$this") {
        // $this: innermost scope's binding context
        currentType = resolveBindingContextType(scope.frameId, scope, checker, typeScope);
      } else if (first === "this") {
        // this (AccessBoundary): nearest CE boundary
        const frameById = new Map(scope.frames.map((f) => [f.id, f]));
        let frame = frameById.get(scope.frameId);
        while (frame && !frame.isBoundary) {
          frame = frame.parent ? frameById.get(frame.parent) : undefined;
        }
        if (frame) {
          currentType = resolveBindingContextType(frame.id, scope, checker, typeScope);
        }
      } else if (first === "$parent") {
        // $parent: hop one parent frame
        const frameById = new Map(scope.frames.map((f) => [f.id, f]));
        let frame = frameById.get(scope.frameId);
        if (frame?.parent) {
          frame = frameById.get(frame.parent);
        }
        if (frame) {
          currentType = resolveBindingContextType(frame.id, scope, checker, typeScope);
        }
      } else {
        // Regular identifier: resolve via scope walk
        currentType = resolveIdentifierToType(first, scope, checker, typeScope);
      }

      if (!currentType) return [];

      // Walk remaining segments as property accesses.
      for (let i = 1; i < segments.length; i++) {
        const propType = checker.getPropertyTsType(currentType, segments[i]!);
        if (!propType) return [];
        currentType = propType;
      }

      // Enumerate members of the final type.
      return buildMemberCompletions(currentType, checker);
    },

    availableTier(): ExpressionResolutionTier {
      return compilationCurrent ? 4 : 3;
    },
  };
}

// ============================================================================
// TypeScope — carries the evaluation context
// ============================================================================

interface TypeScope {
  vmClass: VmClassRef | null;
  frames: LightweightScopeFrame[];
  exprIndex: Map<ExprId, ExprTableEntry>;
  ir: IrModule;
}

// ============================================================================
// evaluateType — THE UNIFIED TYPE EVALUATOR
// ============================================================================
//
// Isomorphic to the Aurelia runtime's astEvaluate (ast.eval.ts).
// Same switch structure, same scope walk semantics, operating on ts.Type
// instead of runtime values.
//
// The runtime evaluates: ast.evaluate(scope) → value
// The type evaluator:   evaluateType(ast, scope) → ts.Type | null

function evaluateType(
  node: AnyBindingExpression,
  scope: ExpressionScopeContext,
  checker: ExpressionTypeChecker,
  typeScope: TypeScope,
): ts.Type | null {
  if (!node || !("$kind" in node)) return null;

  switch (node.$kind) {
    // ── AccessThis ──
    // Runtime: walks ancestor parents, returns currentScope.bindingContext
    case "AccessThis": {
      const n = node as AccessThisExpression;
      if (n.ancestor === 0) {
        // $this: innermost scope's binding context type.
        return resolveBindingContextType(scope.frameId, scope, checker, typeScope);
      }
      // $parent (ancestor > 0): hop N parent frames.
      const frameById = new Map(scope.frames.map((f) => [f.id, f]));
      let frame = frameById.get(scope.frameId);
      let i = n.ancestor;
      while (i > 0 && frame) {
        frame = frame.parent ? frameById.get(frame.parent) : undefined;
        i--;
      }
      if (i >= 1 || !frame) return undefined as unknown as ts.Type | null;
      return resolveBindingContextType(frame.id, scope, checker, typeScope);
    }

    // ── AccessBoundary ──
    // Runtime: walks to nearest isBoundary scope, returns bindingContext
    case "AccessBoundary": {
      const frameById = new Map(scope.frames.map((f) => [f.id, f]));
      let frame = frameById.get(scope.frameId);
      while (frame && !frame.isBoundary) {
        frame = frame.parent ? frameById.get(frame.parent) : undefined;
      }
      if (!frame) return null;
      return resolveBindingContextType(frame.id, scope, checker, typeScope);
    }

    // ── AccessScope ──
    // Runtime: getContext(s, name, ancestor) → obj[name]
    case "AccessScope": {
      const n = node as AccessScopeExpression;
      // Mirror runtime: if ancestor > 0, hop first then resolve.
      if (n.ancestor > 0) {
        const frameById = new Map(scope.frames.map((f) => [f.id, f]));
        let frame = frameById.get(scope.frameId);
        let i = n.ancestor;
        while (i > 0 && frame) {
          frame = frame.parent ? frameById.get(frame.parent) : undefined;
          i--;
        }
        if (!frame) return null;
        // At target frame: check overrideContext (symbols) then bindingContext
        const sym = frame.symbols.find((s) => s.name === n.name.name);
        if (sym) {
          return resolveSymbolTsType(sym, frame, scope, checker, typeScope);
        }
        // Check binding context (VM class at boundary, or iterator item type)
        const bcType = resolveBindingContextType(frame.id, scope, checker, typeScope);
        if (bcType) {
          return checker.getPropertyTsType(bcType, n.name.name);
        }
        return null;
      }
      // ancestor === 0: normal scope walk via getContext algorithm
      return resolveIdentifierToType(n.name.name, scope, checker, typeScope);
    }

    // ── AccessGlobal ──
    // Runtime: globalThis[name]
    case "AccessGlobal": {
      const n = node as AccessGlobalExpression;
      return checker.getGlobalType(n.name.name);
    }

    // ── CallGlobal ──
    // Runtime: globalThis[name](...args)
    case "CallGlobal": {
      const n = node as CallGlobalExpression;
      const globalType = checker.getGlobalType(n.name.name);
      if (!globalType) return null;
      return checker.getCallReturnType(globalType);
    }

    // ── AccessMember ──
    // Runtime: evaluate(object)[name]
    case "AccessMember": {
      const n = node as AccessMemberExpression;
      const objectType = evaluateType(n.object as AnyBindingExpression, scope, checker, typeScope);
      if (!objectType) return null;
      // Recovery: empty name means `obj.` with no identifier after the dot.
      // Return the object's type — callers (completions) will enumerate members.
      if (!n.name.name) return objectType;
      const propType = checker.getPropertyTsType(objectType, n.name.name);
      if (!propType && n.optional) return null;
      if (n.optional && propType) {
        const undef = checker.getPrimitiveType("undefined");
        if (undef) return checker.getUnionType([propType, undef]);
      }
      return propType;
    }

    // ── AccessKeyed ──
    // Runtime: evaluate(object)[evaluate(key)]
    case "AccessKeyed": {
      const n = node as AccessKeyedExpression;
      const objectType = evaluateType(n.object as AnyBindingExpression, scope, checker, typeScope);
      if (!objectType) return null;
      // For numeric index: try element type of collection.
      const elemType = checker.getElementTypeOfCollection(objectType);
      if (elemType) return elemType;
      // For string key: try to resolve statically
      return null;
    }

    // ── CallScope ──
    // Runtime: getContext(s, name, ancestor) → context[name](...args)
    case "CallScope": {
      const n = node as CallScopeExpression;
      const funcType = resolveIdentifierToType(n.name.name, scope, checker, typeScope);
      if (!funcType) return null;
      return checker.getCallReturnType(funcType);
    }

    // ── CallMember ──
    // Runtime: evaluate(object)[name](...args)
    case "CallMember": {
      const n = node as CallMemberExpression;
      const objectType = evaluateType(n.object as AnyBindingExpression, scope, checker, typeScope);
      if (!objectType) return null;
      return checker.getMethodReturnType(objectType, n.name.name);
    }

    // ── CallFunction ──
    // Runtime: evaluate(func)(...args)
    case "CallFunction": {
      const n = node as CallFunctionExpression;
      const funcType = evaluateType(n.func as AnyBindingExpression, scope, checker, typeScope);
      if (!funcType) return null;
      return checker.getCallReturnType(funcType);
    }

    // ── PrimitiveLiteral ──
    // Runtime: return value
    case "PrimitiveLiteral": {
      const n = node as PrimitiveLiteralExpression;
      if (n.value === null) return checker.getPrimitiveType("null");
      if (n.value === undefined) return checker.getPrimitiveType("undefined");
      switch (typeof n.value) {
        case "string": return checker.getPrimitiveType("string");
        case "number": return checker.getPrimitiveType("number");
        case "boolean": return checker.getPrimitiveType("boolean");
      }
      return null;
    }

    // ── ArrayLiteral ──
    // Runtime: elements.map(evaluate)
    case "ArrayLiteral": {
      // Try to infer element type from first element.
      const n = node as ArrayLiteralExpression;
      if (n.elements.length > 0) {
        const firstType = evaluateType(n.elements[0] as AnyBindingExpression, scope, checker, typeScope);
        // If we got a type, return T[] — simplified but useful.
        if (firstType) {
          // Can't easily create an array type without checker internals.
          // Return null and let the string fallback produce "T[]".
        }
      }
      return null;
    }

    // ── ObjectLiteral ──
    // Runtime: build object from keys/values
    case "ObjectLiteral": {
      // Object literal types are complex to synthesize. Return null.
      return null;
    }

    // ── Template ──
    // Runtime: concatenate cooked + evaluate(expressions) → string
    case "Template": {
      return checker.getPrimitiveType("string");
    }

    // ── TaggedTemplate ──
    // Runtime: evaluate(func)(cooked, ...results)
    case "TaggedTemplate": {
      const n = node as TaggedTemplateExpression;
      const funcType = evaluateType(n.func as AnyBindingExpression, scope, checker, typeScope);
      if (!funcType) return null;
      return checker.getCallReturnType(funcType);
    }

    // ── Unary ──
    // Runtime: per-operator evaluation
    case "Unary": {
      const n = node as UnaryExpression;
      switch (n.operation as string) {
        case "void": return checker.getPrimitiveType("undefined");
        case "typeof": return checker.getPrimitiveType("string");
        case "!": return checker.getPrimitiveType("boolean");
        case "-":
        case "+":
        case "--":
        case "++":
          return checker.getPrimitiveType("number");
        default: return null;
      }
    }

    // ── Binary ──
    // Runtime: per-operator evaluation on left/right
    case "Binary": {
      const n = node as BinaryExpression;
      switch (n.operation as string) {
        // Boolean operators
        case "==": case "===": case "!=": case "!==":
        case "instanceof": case "in":
        case "<": case ">": case "<=": case ">=":
          return checker.getPrimitiveType("boolean");
        // Arithmetic operators
        case "-": case "*": case "/": case "%": case "**":
          return checker.getPrimitiveType("number");
        // + is polymorphic: string + string = string, number + number = number
        case "+": {
          const leftType = evaluateType(n.left as AnyBindingExpression, scope, checker, typeScope);
          if (leftType) {
            const leftStr = checker.typeToString(leftType);
            if (leftStr === "string") return checker.getPrimitiveType("string");
          }
          const rightType = evaluateType(n.right as AnyBindingExpression, scope, checker, typeScope);
          if (rightType) {
            const rightStr = checker.typeToString(rightType);
            if (rightStr === "string") return checker.getPrimitiveType("string");
          }
          // Default to number for + if neither is string
          return checker.getPrimitiveType("number");
        }
        // Short-circuit operators: return type depends on operands
        case "&&": {
          // T && U → U (if T is truthy, which we assume for type purposes)
          return evaluateType(n.right as AnyBindingExpression, scope, checker, typeScope);
        }
        case "||": {
          // T || U → T | U
          const leftType = evaluateType(n.left as AnyBindingExpression, scope, checker, typeScope);
          const rightType = evaluateType(n.right as AnyBindingExpression, scope, checker, typeScope);
          if (leftType && rightType) return checker.getUnionType([leftType, rightType]);
          return leftType ?? rightType;
        }
        case "??": {
          // T ?? U → NonNullable<T> | U (simplified: T | U)
          const leftType = evaluateType(n.left as AnyBindingExpression, scope, checker, typeScope);
          const rightType = evaluateType(n.right as AnyBindingExpression, scope, checker, typeScope);
          if (leftType && rightType) return checker.getUnionType([leftType, rightType]);
          return leftType ?? rightType;
        }
        default: return null;
      }
    }

    // ── Conditional ──
    // Runtime: condition ? yes : no
    case "Conditional": {
      const n = node as ConditionalExpression;
      const yesType = evaluateType(n.yes as AnyBindingExpression, scope, checker, typeScope);
      const noType = evaluateType(n.no as AnyBindingExpression, scope, checker, typeScope);
      if (yesType && noType) {
        // If same type, return it directly. Otherwise union.
        if (yesType === noType) return yesType;
        return checker.getUnionType([yesType, noType]);
      }
      return yesType ?? noType;
    }

    // ── Assign ──
    // Runtime: evaluate(value), assign to target, return value
    case "Assign": {
      const n = node as AssignExpression;
      return evaluateType(n.value as AnyBindingExpression, scope, checker, typeScope);
    }

    // ── ValueConverter ──
    // Runtime: evaluator.useConverter(name, 'toView', evaluate(expression), args)
    // Type boundary: converter signatures are opaque (unknown → unknown).
    case "ValueConverter": {
      return null;
    }

    // ── BindingBehavior ──
    // Runtime: passthrough → evaluate(expression)
    case "BindingBehavior": {
      const n = node as BindingBehaviorExpression;
      return evaluateType(n.expression as AnyBindingExpression, scope, checker, typeScope);
    }

    // ── ArrowFunction ──
    // Runtime: creates closure with params, evaluates body
    // Rare in templates. Return null.
    case "ArrowFunction": {
      return null;
    }

    // ── New ──
    // Runtime: new (evaluate(func))(...args)
    case "New": {
      const n = node as NewExpression;
      const funcType = evaluateType(n.func as AnyBindingExpression, scope, checker, typeScope);
      if (!funcType) return null;
      return checker.getConstructReturnType(funcType);
    }

    // ── ForOfStatement ──
    // Runtime: evaluate(iterable)
    case "ForOfStatement": {
      const n = node as ForOfStatement;
      return evaluateType(n.iterable as AnyBindingExpression, scope, checker, typeScope);
    }

    // ── Interpolation ──
    // Runtime: concatenate parts + expressions → string
    case "Interpolation": {
      return checker.getPrimitiveType("string");
    }

    // ── Paren ──
    // Passthrough: evaluate inner expression
    case "Paren": {
      const n = node as ParenExpression;
      return evaluateType(n.expression as AnyBindingExpression, scope, checker, typeScope);
    }

    // ── BindingIdentifier, Custom, Bad, and other non-expression nodes ──
    default:
      return null;
  }
}

// ============================================================================
// Scope Walk — mirrors Scope.getContext() from runtime/src/scope.ts
// ============================================================================

/**
 * Resolve an identifier to a ts.Type by walking the scope chain.
 *
 * Mirrors the runtime's Scope.getContext(scope, name, ancestor=0):
 * Walk from innermost scope outward while:
 *   - not at a boundary
 *   - name not in overrideContext (symbols)
 *   - name not in bindingContext (VM class / iterator item / overlay value)
 * Then check overrideContext first, then bindingContext.
 */
function resolveIdentifierToType(
  name: string,
  scope: ExpressionScopeContext,
  checker: ExpressionTypeChecker,
  typeScope: TypeScope,
): ts.Type | null {
  const frameById = new Map(scope.frames.map((f) => [f.id, f]));
  let frame = frameById.get(scope.frameId);

  while (frame) {
    // Check overrideContext: frame symbols (TC locals, contextuals, let bindings)
    const sym = frame.symbols.find((s) => s.name === name);
    if (sym) {
      return resolveSymbolTsType(sym, frame, scope, checker, typeScope);
    }

    // Check bindingContext at this scope level:
    // For overlay frames (with.bind): the value's properties ARE the bindingContext
    if (frame.kind === "overlay" && frame.origin?.kind === "valueOverlay") {
      const bcType = resolveValueOverlayType(frame, scope, checker, typeScope);
      if (bcType) {
        const propType = checker.getPropertyTsType(bcType, name);
        if (propType) return propType;
      }
    }

    // Stop at CE boundary — VM properties (bindingContext) checked below
    if (frame.isBoundary) break;
    frame = frame.parent ? frameById.get(frame.parent) : undefined;
  }

  // Fell through to boundary (or root): check VM class properties (bindingContext)
  if (scope.vmClass) {
    const classType = checker.getClassInstanceType(scope.vmClass.file, scope.vmClass.className);
    if (classType) {
      return checker.getPropertyTsType(classType, name);
    }
  }

  return null;
}

/**
 * Resolve the binding context type at a given frame.
 *
 * Mirrors the runtime's Scope.bindingContext at each scope level:
 * - CE boundary (root): VM class instance type
 * - Iterator scope: element type of the iterable (the iteration item)
 * - Value overlay (with.bind): the with value's type
 * - Promise scope: empty object {}
 * - Other: delegates to parent
 */
function resolveBindingContextType(
  frameId: string,
  scope: ExpressionScopeContext,
  checker: ExpressionTypeChecker,
  typeScope: TypeScope,
): ts.Type | null {
  const frameById = new Map(scope.frames.map((f) => [f.id, f]));
  const frame = frameById.get(frameId);
  if (!frame) return null;

  // CE boundary: VM class instance type
  if (frame.isBoundary) {
    if (scope.vmClass) {
      return checker.getClassInstanceType(scope.vmClass.file, scope.vmClass.className);
    }
    return null;
  }

  // Iterator scope: the bindingContext is { [local]: item } where item is
  // the element type. For $this/$parent, we return the whole binding context
  // which in the runtime is the BindingContext object. The closest type-level
  // equivalent is the element type itself (since that's what's accessible).
  if (frame.origin?.kind === "iterator") {
    return resolveIteratorElementTsType(frame, scope, checker, typeScope);
  }

  // Value overlay (with.bind): bindingContext = the value itself
  if (frame.origin?.kind === "valueOverlay") {
    return resolveValueOverlayType(frame, scope, checker, typeScope);
  }

  // Promise scope: bindingContext = empty object {}
  if (frame.origin?.kind === "promiseValue") {
    return null;
  }

  // Promise branch: shares parent promise's scope
  if (frame.origin?.kind === "promiseBranch") {
    if (frame.parent) {
      return resolveBindingContextType(frame.parent, scope, checker, typeScope);
    }
  }

  // Other/unknown: delegate to parent
  if (frame.parent) {
    return resolveBindingContextType(frame.parent, scope, checker, typeScope);
  }

  return null;
}

// ============================================================================
// Symbol Type Resolution — inline, per-kind (OQ-B rules)
// ============================================================================

/** Well-known contextual variable types. */
const CONTEXTUAL_TYPES: Record<string, string> = {
  "$index": "number",
  "$first": "boolean",
  "$last": "boolean",
  "$even": "boolean",
  "$odd": "boolean",
  "$middle": "boolean",
  "$length": "number",
};

/**
 * Resolve a scope symbol to a ts.Type.
 * Each symbol kind has specific resolution rules (OQ-B).
 */
function resolveSymbolTsType(
  sym: ScopeSymbol,
  frame: LightweightScopeFrame,
  scope: ExpressionScopeContext,
  checker: ExpressionTypeChecker,
  typeScope: TypeScope,
): ts.Type | null {
  switch (sym.kind) {
    case "contextual": {
      if (sym.name === "$previous") {
        // $previous is T | undefined where T = collection element type
        const elemType = resolveIteratorElementTsType(frame, scope, checker, typeScope);
        if (elemType) {
          const undef = checker.getPrimitiveType("undefined");
          if (undef) return checker.getUnionType([elemType, undef]);
        }
        return null;
      }
      const ct = CONTEXTUAL_TYPES[sym.name];
      if (ct) return checker.getPrimitiveType(ct as "string" | "number" | "boolean");
      return null;
    }

    case "iteratorLocal": {
      return resolveIteratorElementTsType(frame, scope, checker, typeScope);
    }

    case "alias": {
      if (sym.aliasKind === "catch") return null; // catch is `any` (untyped)
      if (sym.aliasKind === "then") {
        return resolvePromiseAliasTsType(frame, scope, checker, typeScope);
      }
      // "value" alias: resolve the value expression's type
      return resolveValueAliasTsType(frame, scope, checker, typeScope);
    }

    case "let": {
      // Resolve the <let> binding expression's type via expression table.
      return resolveLetSymbolTsType(sym, frame, scope, checker, typeScope);
    }

    case "syntheticLocal": {
      if (sym.type) {
        // syntheticLocal carries a type string but not a ts.Type.
        // We'd need to resolve the string to a type, which requires context.
        return null;
      }
      return null;
    }
  }
}

/** Resolve iterator element type: iterable expression → element type. */
function resolveIteratorElementTsType(
  frame: LightweightScopeFrame,
  scope: ExpressionScopeContext,
  checker: ExpressionTypeChecker,
  typeScope: TypeScope,
): ts.Type | null {
  if (frame.origin?.kind !== "iterator") return null;

  const forOfEntry = typeScope.exprIndex.get(frame.origin.forOfAstId);
  if (!forOfEntry || forOfEntry.ast.$kind !== "ForOfStatement") return null;

  const forOf = forOfEntry.ast as ForOfStatement;
  const iterableTsType = evaluateType(forOf.iterable as AnyBindingExpression, scope, checker, typeScope);
  if (!iterableTsType) return null;
  return checker.getElementTypeOfCollection(iterableTsType);
}

/** Resolve promise alias (then branch): promise expression → Awaited<T>. */
function resolvePromiseAliasTsType(
  frame: LightweightScopeFrame,
  scope: ExpressionScopeContext,
  checker: ExpressionTypeChecker,
  typeScope: TypeScope,
): ts.Type | null {
  // Find the parent frame with promiseValue origin.
  const frameById = new Map(scope.frames.map((f) => [f.id, f]));
  let parentFrame = frame.parent ? frameById.get(frame.parent) : undefined;
  while (parentFrame) {
    if (parentFrame.origin?.kind === "promiseValue") break;
    parentFrame = parentFrame.parent ? frameById.get(parentFrame.parent) : undefined;
  }
  if (!parentFrame?.origin || parentFrame.origin.kind !== "promiseValue") return null;

  const entry = typeScope.exprIndex.get(parentFrame.origin.valueExprId);
  if (!entry) return null;

  const promiseTsType = evaluateType(entry.ast as AnyBindingExpression, scope, checker, typeScope);
  if (!promiseTsType) return null;
  return checker.getAwaitedType(promiseTsType);
}

/** Resolve value alias (with.bind): value expression → type. */
function resolveValueAliasTsType(
  frame: LightweightScopeFrame,
  scope: ExpressionScopeContext,
  checker: ExpressionTypeChecker,
  typeScope: TypeScope,
): ts.Type | null {
  if (frame.origin?.kind !== "valueOverlay") return null;
  const entry = typeScope.exprIndex.get(frame.origin.valueExprId);
  if (!entry) return null;
  return evaluateType(entry.ast as AnyBindingExpression, scope, checker, typeScope);
}

/** Resolve the with.bind value's type for overlay frames. */
function resolveValueOverlayType(
  frame: LightweightScopeFrame,
  scope: ExpressionScopeContext,
  checker: ExpressionTypeChecker,
  typeScope: TypeScope,
): ts.Type | null {
  if (frame.origin?.kind !== "valueOverlay") return null;
  const entry = typeScope.exprIndex.get(frame.origin.valueExprId);
  if (!entry) return null;
  return evaluateType(entry.ast as AnyBindingExpression, scope, checker, typeScope);
}

/** Resolve let symbol type: find the let binding expression and evaluate it. */
function resolveLetSymbolTsType(
  sym: ScopeSymbol,
  frame: LightweightScopeFrame,
  scope: ExpressionScopeContext,
  checker: ExpressionTypeChecker,
  typeScope: TypeScope,
): ts.Type | null {
  // Search the IR for HydrateLetElement instructions to find the binding
  // expression for this let symbol.
  for (const template of typeScope.ir.templates) {
    for (const row of template.rows) {
      for (const ins of row.instructions) {
        if (ins.type === "hydrateLetElement") {
          const letIns = ins as HydrateLetElementIR;
          for (const binding of letIns.instructions) {
            if (binding.to === sym.name && binding.from && "id" in binding.from) {
              const entry = typeScope.exprIndex.get(binding.from.id);
              if (entry) {
                return evaluateType(entry.ast as AnyBindingExpression, scope, checker, typeScope);
              }
            }
          }
        }
      }
    }
  }
  return null;
}

// ============================================================================
// ExpressionTypeInfo Builder — wraps ts.Type with presentation metadata
// ============================================================================

function buildTypeInfo(
  node: AnyBindingExpression,
  tsType: ts.Type | null,
  scope: ExpressionScopeContext,
  checker: ExpressionTypeChecker,
  typeScope: TypeScope,
): ExpressionTypeInfo | null {
  if (!node || !("$kind" in node)) return null;

  const typeStr = tsType ? checker.typeToString(tsType) : undefined;

  switch (node.$kind) {
    case "AccessScope": {
      const n = node as AccessScopeExpression;
      let memberOf: string | undefined;
      if (scope.vmClass && tsType) {
        const classType = checker.getClassInstanceType(scope.vmClass.file, scope.vmClass.className);
        if (classType && checker.getPropertyTsType(classType, n.name.name) === tsType) {
          memberOf = scope.vmClass.className;
        }
      }
      return {
        tier: tsType ? (memberOf ? 2 : 3) : 1,
        type: typeStr,
        symbol: n.name.name,
        memberOf,
        confidence: tsType ? "high" : "low",
      };
    }

    case "AccessMember": {
      const n = node as AccessMemberExpression;
      // Recovery: empty name means `obj.` — show the object's type info
      if (!n.name.name) {
        const objectType = evaluateType(n.object as AnyBindingExpression, scope, checker, typeScope);
        const objectTypeStr = objectType ? checker.typeToString(objectType) : undefined;
        return {
          tier: tsType ? 3 : 1,
          type: objectTypeStr,
          symbol: undefined,
          memberOf: undefined,
          confidence: objectType ? "high" : "low",
        };
      }
      const objectType = evaluateType(n.object as AnyBindingExpression, scope, checker, typeScope);
      const objectTypeStr = objectType ? checker.typeToString(objectType) : undefined;
      return {
        tier: 3,
        type: typeStr,
        symbol: n.name.name,
        memberOf: objectTypeStr,
        confidence: tsType ? "high" : "low",
      };
    }

    case "CallScope": {
      const n = node as CallScopeExpression;
      return {
        tier: 3,
        type: typeStr,
        symbol: n.name.name,
        memberOf: scope.vmClass?.className,
        confidence: tsType ? "high" : "low",
      };
    }

    case "CallMember": {
      const n = node as CallMemberExpression;
      const objectType = evaluateType(n.object as AnyBindingExpression, scope, checker, typeScope);
      const objectTypeStr = objectType ? checker.typeToString(objectType) : undefined;
      return {
        tier: 3,
        type: typeStr,
        symbol: n.name.name,
        memberOf: objectTypeStr,
        confidence: tsType ? "high" : "low",
      };
    }

    case "AccessGlobal": {
      const n = node as AccessGlobalExpression;
      return {
        tier: 3,
        type: typeStr,
        symbol: n.name.name,
        memberOf: undefined,
        confidence: tsType ? "high" : "medium",
      };
    }

    case "AccessThis": {
      const n = node as AccessThisExpression;
      return {
        tier: tsType ? 2 : 1,
        type: typeStr,
        symbol: n.ancestor === 0 ? "$this" : "$parent",
        memberOf: undefined,
        confidence: tsType ? "high" : "low",
      };
    }

    case "AccessBoundary": {
      return {
        tier: tsType ? 2 : 1,
        type: typeStr,
        symbol: "this",
        memberOf: undefined,
        confidence: tsType ? "high" : "low",
      };
    }

    default:
      return {
        tier: tsType ? 3 : 0,
        type: typeStr,
        symbol: undefined,
        memberOf: undefined,
        confidence: tsType ? "high" : "low",
      };
  }
}

// ============================================================================
// Frame Tree Builder (Tier 1 — structural scope from IR)
// ============================================================================

interface FrameSpan {
  frameId: string;
  start: number;
  end: number;
}

interface FrameTreeResult {
  frames: LightweightScopeFrame[];
  spanToFrame: FrameSpan[];
}

function buildFrameTree(
  ir: IrModule,
  configLookup: (name: string) => ControllerConfig | null,
  exprIndex: Map<ExprId, ExprTableEntry>,
): FrameTreeResult {
  const frames: LightweightScopeFrame[] = [];
  const spanToFrame: FrameSpan[] = [];
  let frameCounter = 0;

  function nextFrameId(label: string): string {
    return `${label}-${frameCounter++}`;
  }

  // Process each template in the module (usually one root + nested TC templates).
  for (const template of ir.templates) {
    const rootId = nextFrameId("root");
    frames.push({
      id: rootId,
      parent: null,
      kind: "root",
      symbols: [],
      isBoundary: true,
    });

    // Map the root template's full span to the root frame.
    if (template.dom.loc) {
      spanToFrame.push({ frameId: rootId, start: template.dom.loc.start, end: template.dom.loc.end });
    }

    walkRows(template.rows, rootId, template, frames, spanToFrame, configLookup, exprIndex, nextFrameId);
  }

  return { frames, spanToFrame };
}

function walkRows(
  rows: readonly InstructionRow[],
  currentFrameId: string,
  template: TemplateIR,
  frames: LightweightScopeFrame[],
  spanToFrame: FrameSpan[],
  configLookup: (name: string) => ControllerConfig | null,
  exprIndex: Map<ExprId, ExprTableEntry>,
  nextFrameId: (label: string) => string,
): void {
  for (const row of rows) {
    for (const ins of row.instructions) {
      switch (ins.type) {
        case "hydrateTemplateController": {
          processTemplateController(
            ins, currentFrameId, frames, spanToFrame,
            configLookup, exprIndex, nextFrameId,
          );
          break;
        }
        case "hydrateLetElement": {
          processLetElement(ins, currentFrameId, frames, spanToFrame, nextFrameId);
          break;
        }
        // Other instruction types don't create scope frames.
      }
    }
  }
}

function processTemplateController(
  ins: HydrateTemplateControllerIR,
  parentFrameId: string,
  frames: LightweightScopeFrame[],
  spanToFrame: FrameSpan[],
  configLookup: (name: string) => ControllerConfig | null,
  exprIndex: Map<ExprId, ExprTableEntry>,
  nextFrameId: (label: string) => string,
): void {
  const config = configLookup(ins.res);
  if (!config) {
    // Unknown TC — recurse into nested template with current frame.
    walkRows(ins.def.rows, parentFrameId, ins.def, frames, spanToFrame, configLookup, exprIndex, nextFrameId);
    return;
  }

  // Determine the frame for this TC.
  let frameId: string;
  if (config.scope === "overlay") {
    // Create a new overlay frame.
    frameId = nextFrameId(`tc-${ins.res}`);
    const symbols = materializeSymbols(ins, config, exprIndex);
    const origin = deriveFrameOrigin(ins, config, exprIndex);

    frames.push({
      id: frameId,
      parent: parentFrameId,
      kind: "overlay",
      symbols,
      isBoundary: false,
      origin,
    });
  } else {
    // scope === "reuse" — no new frame, use parent.
    frameId = parentFrameId;
  }

  // Map the TC's content span to the frame.
  const contentSpan = computeNestedTemplateSpan(ins.def);
  if (contentSpan) {
    spanToFrame.push({
      frameId,
      start: contentSpan.start,
      end: contentSpan.end,
    });
  }

  // Recurse into nested template rows.
  walkRows(ins.def.rows, frameId, ins.def, frames, spanToFrame, configLookup, exprIndex, nextFrameId);
}

/**
 * Compute the span of a nested template's content by finding the min/max
 * offsets across all DOM nodes and instruction rows.
 */
function computeNestedTemplateSpan(template: TemplateIR): { start: number; end: number } | null {
  if (template.dom.loc) return template.dom.loc;

  let min = Infinity;
  let max = -Infinity;

  function walkNodes(nodes: readonly DOMNode[]): void {
    for (const node of nodes) {
      if (node.loc) {
        if (node.loc.start < min) min = node.loc.start;
        if (node.loc.end > max) max = node.loc.end;
      }
      if ("children" in node && node.children) {
        walkNodes(node.children);
      }
    }
  }
  walkNodes(template.dom.children);

  for (const row of template.rows) {
    for (const ins of row.instructions) {
      if (ins.loc) {
        if (ins.loc.start < min) min = ins.loc.start;
        if (ins.loc.end > max) max = ins.loc.end;
      }
    }
  }

  if (min === Infinity || max === -Infinity) return null;
  return { start: min, end: max };
}

function processLetElement(
  ins: HydrateLetElementIR,
  currentFrameId: string,
  frames: LightweightScopeFrame[],
  spanToFrame: FrameSpan[],
  nextFrameId: (label: string) => string,
): void {
  const symbols: ScopeSymbol[] = ins.instructions.map((binding) => ({
    kind: "let" as const,
    name: binding.to,
    span: binding.loc ?? null,
  }));

  if (symbols.length === 0) return;

  const frameId = nextFrameId("let");
  frames.push({
    id: frameId,
    parent: currentFrameId,
    kind: "overlay",
    symbols,
    isBoundary: false,
  });

  if (ins.loc) {
    spanToFrame.push({
      frameId,
      start: ins.loc.end,
      end: Number.MAX_SAFE_INTEGER,
    });
  }
}

// ============================================================================
// Symbol Materialization (config-driven, pattern-based)
// ============================================================================

function materializeSymbols(
  ins: HydrateTemplateControllerIR,
  config: ControllerConfig,
  exprIndex: Map<ExprId, ExprTableEntry>,
): ScopeSymbol[] {
  const symbols: ScopeSymbol[] = [];
  const trigger = config.trigger;

  if (trigger.kind === "iterator" && config.scope === "overlay") {
    const iteratorBinding = ins.props.find(
      (p): p is IteratorBindingIR => p.type === "iteratorBinding",
    );
    if (iteratorBinding) {
      const forOfEntry = exprIndex.get(iteratorBinding.forOf.astId);
      if (forOfEntry && forOfEntry.ast.$kind === "ForOfStatement") {
        const forOf = forOfEntry.ast as ForOfStatement;
        collectBindingNames(forOf.declaration, symbols);
      }
    }

    if (config.injects?.contextuals) {
      for (const name of config.injects.contextuals) {
        symbols.push({ kind: "contextual", name });
      }
    }
  } else if (trigger.kind === "value" && config.scope === "overlay") {
    if (config.injects?.alias) {
      const aliasKind = ins.branch?.kind === "then" ? "then"
        : ins.branch?.kind === "catch" ? "catch"
        : "value" as const;
      symbols.push({
        kind: "alias",
        name: config.injects.alias.defaultName,
        aliasKind,
      });
    }
  } else if (trigger.kind === "branch") {
    if (config.injects?.alias) {
      const aliasKind = ins.branch?.kind === "then" ? "then"
        : ins.branch?.kind === "catch" ? "catch"
        : "value" as const;
      symbols.push({
        kind: "alias",
        name: config.injects.alias.defaultName,
        aliasKind,
      });
    }
    if (config.injects?.contextuals) {
      for (const name of config.injects.contextuals) {
        symbols.push({ kind: "contextual", name });
      }
    }
  }

  return symbols;
}

function collectBindingNames(decl: ForOfStatement["declaration"], symbols: ScopeSymbol[]): void {
  if (!decl) return;
  switch (decl.$kind) {
    case "BindingIdentifier":
      symbols.push({ kind: "iteratorLocal", name: (decl as BindingIdentifier).name.name });
      break;
    case "ArrayBindingPattern":
      for (const el of (decl as any).elements) {
        collectBindingNames(el, symbols);
      }
      break;
    case "ObjectBindingPattern":
      for (const prop of (decl as any).properties) {
        collectBindingNames(prop.value, symbols);
      }
      break;
    case "BindingPatternDefault":
      collectBindingNames((decl as any).target, symbols);
      break;
  }
}

function deriveFrameOrigin(
  ins: HydrateTemplateControllerIR,
  config: ControllerConfig,
  exprIndex: Map<ExprId, ExprTableEntry>,
): FrameOrigin | null {
  const trigger = config.trigger;

  if (trigger.kind === "iterator" && config.scope === "overlay") {
    const iteratorBinding = ins.props.find(
      (p): p is IteratorBindingIR => p.type === "iteratorBinding",
    );
    if (iteratorBinding) {
      return {
        kind: "iterator",
        forOfAstId: iteratorBinding.forOf.astId,
        controller: ins.res,
        file: ins.loc?.file,
        span: ins.loc ?? undefined,
      } as FrameOrigin;
    }
  }

  if (trigger.kind === "value" && config.scope === "overlay") {
    const valueProp = ins.props.find(
      (p): p is PropertyBindingIR => p.type === "propertyBinding" && p.to === trigger.prop,
    );
    if (valueProp && "id" in valueProp.from) {
      const isPromise = config.branches !== undefined;
      return {
        kind: isPromise ? "promiseValue" : "valueOverlay",
        valueExprId: valueProp.from.id,
        controller: ins.res,
        file: ins.loc?.file,
        span: ins.loc ?? undefined,
      } as FrameOrigin;
    }
  }

  if (trigger.kind === "branch") {
    return {
      kind: "promiseBranch",
      branch: ins.branch?.kind === "catch" ? "catch" : "then",
      controller: ins.res,
      file: ins.loc?.file,
      span: ins.loc ?? undefined,
    } as FrameOrigin;
  }

  return null;
}

// ============================================================================
// Frame Resolution (offset → frame)
// ============================================================================

function resolveFrameAtOffset(
  offset: number,
  spanToFrame: FrameSpan[],
  frames: LightweightScopeFrame[],
): string {
  let bestFrameId: string | null = null;
  let bestSize = Infinity;

  for (const entry of spanToFrame) {
    if (offset >= entry.start && offset < entry.end) {
      const size = entry.end - entry.start;
      if (size < bestSize) {
        bestSize = size;
        bestFrameId = entry.frameId;
      }
    }
  }

  return bestFrameId ?? frames[0]?.id ?? "root-0";
}

// ============================================================================
// Expression Finder (offset → expression entry)
// ============================================================================

function findExpressionAtOffset(offset: number, ir: IrModule): ExprTableEntry | null {
  if (!ir.exprTable) return null;

  let best: ExprTableEntry | null = null;
  let bestSize = Infinity;

  for (const entry of ir.exprTable) {
    const span = entry.ast.span;
    if (span && offset >= span.start && offset < span.end) {
      const size = span.end - span.start;
      if (size < bestSize) {
        bestSize = size;
        best = entry;
      }
    }
  }

  return best;
}

/** Walk an expression AST to find the narrowest node containing the offset. */
function findExpressionNodeAtOffset(
  ast: AnyBindingExpression,
  offset: number,
): AnyBindingExpression | null {
  if (!ast || !("$kind" in ast)) return null;
  if (!ast.span || offset < ast.span.start || offset >= ast.span.end) return null;

  switch (ast.$kind) {
    case "AccessMember": {
      const n = ast as AccessMemberExpression;
      return findExpressionNodeAtOffset(n.object as AnyBindingExpression, offset) ?? ast;
    }
    case "AccessKeyed": {
      const n = ast as AccessKeyedExpression;
      return findExpressionNodeAtOffset(n.object as AnyBindingExpression, offset)
        ?? findExpressionNodeAtOffset(n.key as AnyBindingExpression, offset)
        ?? ast;
    }
    case "CallMember": {
      const n = ast as CallMemberExpression;
      return findExpressionNodeAtOffset(n.object as AnyBindingExpression, offset) ?? ast;
    }
    case "CallScope": {
      return ast;
    }
    case "CallFunction": {
      const n = ast as CallFunctionExpression;
      return findExpressionNodeAtOffset(n.func as AnyBindingExpression, offset) ?? ast;
    }
    case "Binary": {
      const n = ast as BinaryExpression;
      return findExpressionNodeAtOffset(n.left as AnyBindingExpression, offset)
        ?? findExpressionNodeAtOffset(n.right as AnyBindingExpression, offset)
        ?? ast;
    }
    case "Conditional": {
      const n = ast as ConditionalExpression;
      return findExpressionNodeAtOffset(n.condition as AnyBindingExpression, offset)
        ?? findExpressionNodeAtOffset(n.yes as AnyBindingExpression, offset)
        ?? findExpressionNodeAtOffset(n.no as AnyBindingExpression, offset)
        ?? ast;
    }
    case "BindingBehavior": {
      const n = ast as BindingBehaviorExpression;
      return findExpressionNodeAtOffset(n.expression as AnyBindingExpression, offset) ?? ast;
    }
    case "ValueConverter": {
      const n = ast as ValueConverterExpression;
      return findExpressionNodeAtOffset(n.expression as AnyBindingExpression, offset) ?? ast;
    }
    case "ForOfStatement": {
      const n = ast as ForOfStatement;
      const iterableMatch = findExpressionNodeAtOffset(n.iterable as AnyBindingExpression, offset);
      if (iterableMatch) return iterableMatch;
      return ast;
    }
    case "Assign": {
      const n = ast as AssignExpression;
      return findExpressionNodeAtOffset(n.value as AnyBindingExpression, offset)
        ?? findExpressionNodeAtOffset(n.target as AnyBindingExpression, offset)
        ?? ast;
    }
    case "Paren": {
      const n = ast as ParenExpression;
      return findExpressionNodeAtOffset(n.expression as AnyBindingExpression, offset) ?? ast;
    }
    case "Unary": {
      const n = ast as UnaryExpression;
      return findExpressionNodeAtOffset(n.expression as AnyBindingExpression, offset) ?? ast;
    }
    case "Interpolation": {
      // Walk into the inner expressions to find the one containing the offset.
      const n = ast as Interpolation;
      for (const expr of n.expressions) {
        const match = findExpressionNodeAtOffset(expr as AnyBindingExpression, offset);
        if (match) return match;
      }
      return ast;
    }
    default:
      return ast;
  }
}

// ============================================================================
// Scope Completions
// ============================================================================

function collectScopeCompletions(
  scope: ExpressionScopeContext,
  checker: ExpressionTypeChecker,
  typeScope: TypeScope,
): ExpressionCompletion[] {
  const completions: ExpressionCompletion[] = [];
  const seen = new Set<string>();
  const frameById = new Map(scope.frames.map((f) => [f.id, f]));
  let frame = frameById.get(scope.frameId);
  let priority = 0;

  // Two-pass: non-contextuals first (locals, aliases, let bindings, overlay
  // members, VM properties), then contextuals last.
  const deferredContextuals: { sym: ScopeSymbol; frame: LightweightScopeFrame }[] = [];

  // Pass 1: non-contextual scope symbols + overlay members.
  while (frame) {
    for (const sym of frame.symbols) {
      if (seen.has(sym.name)) continue;
      if (sym.kind === "contextual") {
        deferredContextuals.push({ sym, frame });
        continue;
      }
      seen.add(sym.name);

      const tsType = resolveSymbolTsType(sym, frame, scope, checker, typeScope);
      const typeStr = tsType ? checker.typeToString(tsType) : undefined;
      completions.push({
        label: sym.name,
        kind: "variable",
        type: typeStr,
        insertText: undefined,
        tier: tsType ? 3 : 1,
        sortPriority: priority,
      });
    }

    // For overlay frames (with.bind): enumerate value's type members.
    if (frame.kind === "overlay" && frame.origin?.kind === "valueOverlay") {
      const overlayType = resolveValueOverlayType(frame, scope, checker, typeScope);
      if (overlayType) {
        const members = checker.getPropertiesOfType(overlayType);
        for (const m of members) {
          if (seen.has(m.name)) continue;
          seen.add(m.name);
          completions.push({
            label: m.name,
            kind: m.isMethod ? "method" : "property",
            type: m.type,
            insertText: undefined,
            tier: 3,
            sortPriority: priority,
          });
        }
      }
    }

    priority++;

    if (frame.isBoundary) break;
    frame = frame.parent ? frameById.get(frame.parent) : undefined;
  }

  // VM class properties (Tier 2).
  if (scope.vmClass) {
    const classType = checker.getClassInstanceType(scope.vmClass.file, scope.vmClass.className);
    if (classType) {
      const members = checker.getPropertiesOfType(classType);
      for (const m of members) {
        if (seen.has(m.name)) continue;
        seen.add(m.name);
        completions.push({
          label: m.name,
          kind: m.isMethod ? "method" : "property",
          type: m.type,
          insertText: undefined,
          tier: 2,
          sortPriority: priority,
        });
      }
    }
  }
  priority++;

  // Pass 2: contextuals ($index, $first, etc.) — after VM properties.
  for (const { sym } of deferredContextuals) {
    if (seen.has(sym.name)) continue;
    seen.add(sym.name);

    const resolvedType = CONTEXTUAL_TYPES[sym.name];
    completions.push({
      label: sym.name,
      kind: "contextual",
      type: resolvedType,
      insertText: undefined,
      tier: 1,
      sortPriority: priority,
    });
  }

  return completions;
}

// ============================================================================
// Member Completions
// ============================================================================

function buildMemberCompletions(
  objectType: ts.Type,
  checker: ExpressionTypeChecker,
): ExpressionCompletion[] {
  const members = checker.getPropertiesOfType(objectType);
  return members.map((m, i) => ({
    label: m.name,
    kind: (m.isMethod ? "method" : "property") as ExpressionCompletion["kind"],
    type: m.type,
    insertText: undefined,
    tier: 3 as ExpressionResolutionTier,
    sortPriority: i,
  }));
}

/**
 * Walk the AST to find an AccessMember whose member name starts at or after
 * the given offset. Returns the .object (left-hand expression) for member
 * completion enumeration.
 */
function findMemberAccessObject(
  ast: AnyBindingExpression,
  offset: number,
): AnyBindingExpression | null {
  if (!ast || !("$kind" in ast)) return null;
  if (!ast.span || offset < ast.span.start || offset > ast.span.end) return null;

  switch (ast.$kind) {
    case "AccessMember": {
      const n = ast as AccessMemberExpression;
      // Recovery: empty name means `obj.` — always return the object
      if (!n.name.name) {
        return n.object as AnyBindingExpression;
      }
      if (n.name.span && offset >= n.name.span.start) {
        return n.object as AnyBindingExpression;
      }
      return findMemberAccessObject(n.object as AnyBindingExpression, offset);
    }
    case "CallMember": {
      const n = ast as CallMemberExpression;
      if (n.name.span && offset >= n.name.span.start) {
        return n.object as AnyBindingExpression;
      }
      return findMemberAccessObject(n.object as AnyBindingExpression, offset);
    }
    case "AccessKeyed": {
      const n = ast as AccessKeyedExpression;
      return findMemberAccessObject(n.object as AnyBindingExpression, offset);
    }
    case "BindingBehavior": {
      const n = ast as BindingBehaviorExpression;
      return findMemberAccessObject(n.expression as AnyBindingExpression, offset);
    }
    case "ValueConverter": {
      const n = ast as ValueConverterExpression;
      return findMemberAccessObject(n.expression as AnyBindingExpression, offset);
    }
    case "Interpolation": {
      // Walk into the inner expressions to find one with a member access.
      const n = ast as Interpolation;
      for (const expr of n.expressions) {
        const match = findMemberAccessObject(expr as AnyBindingExpression, offset);
        if (match) return match;
      }
      return null;
    }
    default:
      return null;
  }
}

// ============================================================================
// Type String Helpers (fallback when ts.Type is not available)
// ============================================================================

function extractElementTypeFromString(typeStr: string): string | undefined {
  if (typeStr.endsWith("[]")) {
    return typeStr.slice(0, -2);
  }
  const arrayMatch = /^Array<(.+)>$/.exec(typeStr);
  if (arrayMatch) return arrayMatch[1];
  const readonlyMatch = /^readonly (.+)\[\]$/.exec(typeStr);
  if (readonlyMatch) return readonlyMatch[1];
  return undefined;
}
