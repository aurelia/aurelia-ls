// Cursor Entity Resolution — shared position → entity mapping
//
// Given a compiled template and an HTML offset, resolves the semantic entity
// at that position. All features (hover, definition, references, rename,
// semantic tokens, diagnostics) call this first, then project what they need.
//
// This replaces the scattered per-feature resolution logic (hover.ts's nodeAt/
// exprAt/controllerAt/findInstructionHits). Resolution happens once; features
// consume the result.

import type { SourceSpan, ExprId, NodeId, ExprTableEntry } from "../model/ir.js";
import type { NormalizedPath } from "../model/index.js";
import type {
  TemplateCompilation,
  TemplateDiagnostics,
} from "../facade.js";
import type { LinkModule, LinkedRow, LinkedInstruction, LinkedTemplate } from "../analysis/index.js";
import type { IrModule, TemplateIR } from "../model/ir.js";
import type {
  ElementRes,
  AttrRes,
  Bindable,
  BindingCommandConfig,
  ControllerConfig,
  ValueConverterSig,
  BindingBehaviorSig,
  BindingMode,
  ConfidenceLevel,
  ConfidenceSignals,
  ResourceScopeId,
  ConvergenceRef,
  TemplateSyntaxRegistry,
  MaterializedSemantics,
} from "./types.js";
import { computeConfidence } from "./types.js";
import type {
  CursorEntity,
  CETagEntity,
  CAAttrEntity,
  TCAttrEntity,
  BindableEntity,
  CommandEntity,
  ValueConverterEntity,
  BindingBehaviorEntity,
  InterpolationEntity,
  ImportFromEntity,
  PlainAttrBindingEntity,
} from "./cursor-entity.js";
import { spanContainsOffset } from "../model/span.js";

// ============================================================================
// Resolution Input
// ============================================================================

export interface CursorResolutionInput {
  readonly compilation: TemplateCompilation;
  readonly offset: number;
  readonly syntax?: TemplateSyntaxRegistry | null;
  readonly semantics?: MaterializedSemantics | null;
}

// ============================================================================
// Resolution Output
// ============================================================================

export interface CursorResolutionResult {
  readonly entity: CursorEntity;
  readonly confidence: ConfidenceSignals;
  readonly compositeConfidence: ConfidenceLevel;
}

// ============================================================================
// Resolver Implementation
// ============================================================================

/**
 * Resolve the semantic entity at a cursor offset.
 *
 * Returns null for non-semantic positions (whitespace, plain HTML,
 * positions where no compilation data maps).
 */
export function resolveCursorEntity(
  input: CursorResolutionInput,
): CursorResolutionResult | null {
  const { compilation, offset, syntax, semantics } = input;
  const query = compilation.query;

  // Priority order: expression > controller > node > instruction
  // This matches LSP convention: most specific entity wins.

  // 1. Expression at offset (binding expressions, interpolations)
  const expr = query.exprAt(offset);
  if (expr) {
    const entity = resolveExpressionEntity(compilation, expr, offset, semantics);
    if (entity) {
      const confidence = computeExpressionConfidence(entity, compilation);
      return { entity, confidence, compositeConfidence: computeConfidence(confidence) };
    }
  }

  // 2. Template controller at offset (repeat.for, if.bind, etc.)
  const controller = query.controllerAt(offset);
  if (controller) {
    const entity = resolveControllerEntity(controller, syntax);
    if (entity) {
      const confidence = computeResourceConfidence(entity);
      return { entity, confidence, compositeConfidence: computeConfidence(confidence) };
    }
  }

  // 3. DOM node at offset (custom element tags, native elements)
  const node = query.nodeAt(offset);
  if (node) {
    const entity = resolveNodeEntity(compilation, node, offset);
    if (entity) {
      const confidence = computeResourceConfidence(entity);
      return { entity, confidence, compositeConfidence: computeConfidence(confidence) };
    }
  }

  // 4. Instruction hits (attribute bindings, events, property bindings)
  const entity = resolveInstructionEntity(compilation, offset, syntax);
  if (entity) {
    const confidence = computeResourceConfidence(entity);
    return { entity, confidence, compositeConfidence: computeConfidence(confidence) };
  }

  return null;
}

// ============================================================================
// Expression Resolution
// ============================================================================

interface ExprAtResult {
  readonly exprId: ExprId;
  readonly span: SourceSpan;
  readonly frameId?: unknown;
  readonly memberPath?: string;
}

function resolveExpressionEntity(
  compilation: TemplateCompilation,
  expr: ExprAtResult,
  offset: number,
  semantics?: MaterializedSemantics | null,
): CursorEntity | null {
  // Check for value converter at this offset
  const vcHit = findValueConverterAtOffset(compilation.exprTable, offset);
  if (vcHit && semantics) {
    const vcSig = semantics.resources.valueConverters[vcHit.name] ?? null;
    return {
      kind: 'value-converter',
      name: vcHit.name,
      converter: vcSig,
      span: vcHit.span ?? expr.span,
      ref: null, // TODO: wire from convergence entries
    } satisfies ValueConverterEntity;
  }

  // Check for binding behavior at this offset
  const bbHit = findBindingBehaviorAtOffset(compilation.exprTable, offset);
  if (bbHit && semantics) {
    const bbSig = semantics.resources.bindingBehaviors[bbHit.name] ?? null;
    return {
      kind: 'binding-behavior',
      name: bbHit.name,
      behavior: bbSig,
      span: bbHit.span ?? expr.span,
      ref: null, // TODO: wire from convergence entries
    } satisfies BindingBehaviorEntity;
  }

  // Generic expression (scope identifier, member access, etc.)
  const exprAst = findExprAstById(compilation.exprTable, expr.exprId);
  if (exprAst) {
    const astKind = (exprAst as { $kind?: string }).$kind;
    if (astKind === 'AccessScope') {
      const name = ((exprAst as { name?: { name?: string } }).name?.name) ?? 'unknown';
      const type = getInferredType(compilation, expr.exprId);
      return {
        kind: 'scope-identifier',
        name,
        type,
        span: expr.span,
      };
    }
    if (astKind === 'AccessMember') {
      const memberName = ((exprAst as { name?: string }).name) ?? 'unknown';
      const memberType = getInferredType(compilation, expr.exprId);
      return {
        kind: 'member-access',
        memberName,
        parentType: undefined, // TODO: derive from parent expression
        memberType,
        span: expr.span,
      };
    }
  }

  // Fallback: generic scope identifier from member path
  return {
    kind: 'scope-identifier',
    name: expr.memberPath ?? 'expression',
    type: getInferredType(compilation, expr.exprId),
    span: expr.span,
  };
}

// ============================================================================
// Controller Resolution
// ============================================================================

interface ControllerAtResult {
  readonly kind: string;
  readonly name?: string;
  readonly span: SourceSpan;
}

function resolveControllerEntity(
  controller: ControllerAtResult,
  syntax?: TemplateSyntaxRegistry | null,
): CursorEntity | null {
  const name = controller.name ?? controller.kind;
  const config = syntax?.controllers?.[name] ?? null;
  return {
    kind: 'tc-attr',
    attribute: null as unknown as AttrRes, // placeholder — will be projected from view
    controller: config,
    name,
    span: controller.span,
    ref: null,
  } satisfies TCAttrEntity;
}

// ============================================================================
// Node Resolution
// ============================================================================

interface NodeAtResult {
  readonly id: NodeId;
  readonly templateIndex: number;
  readonly hostKind?: string;
  readonly span: SourceSpan;
}

function resolveNodeEntity(
  compilation: TemplateCompilation,
  node: NodeAtResult,
  offset: number,
): CursorEntity | null {
  const row = findRowByNodeId(compilation.linked.templates, node.templateIndex, node.id);
  if (!row) return null;

  if (row.node.kind === 'element') {
    const customDef = row.node.custom?.def;
    if (customDef) {
      return {
        kind: 'ce-tag',
        element: customDef,
        name: customDef.name,
        scopeId: null, // TODO: wire from template context
        span: node.span,
        ref: customDef.__convergenceRef ?? null,
      } satisfies CETagEntity;
    }
  }

  return null;
}

// ============================================================================
// Instruction Resolution
// ============================================================================

function resolveInstructionEntity(
  compilation: TemplateCompilation,
  offset: number,
  syntax?: TemplateSyntaxRegistry | null,
): CursorEntity | null {
  // Walk linked instructions looking for one that covers this offset
  for (const template of compilation.linked.templates) {
    for (const row of template.rows) {
      for (const ins of row.instructions) {
        const entity = matchInstruction(ins, offset, syntax);
        if (entity) return entity;

        // Check props for hydrate instructions
        if ('props' in ins && Array.isArray((ins as { props?: unknown }).props)) {
          for (const prop of (ins as { props: LinkedInstruction[] }).props) {
            const propEntity = matchInstruction(prop, offset, syntax);
            if (propEntity) return propEntity;
          }
        }
      }
    }
  }
  return null;
}

function matchInstruction(
  ins: LinkedInstruction,
  offset: number,
  syntax?: TemplateSyntaxRegistry | null,
): CursorEntity | null {
  const loc = (ins as { loc?: SourceSpan }).loc;
  if (!loc || !spanContainsOffset(loc, offset)) return null;

  switch (ins.kind) {
    case 'propertyBinding':
    case 'attributeBinding':
    case 'stylePropertyBinding': {
      // Check if the cursor is on the command part
      const command = (ins as { command?: string }).command;
      if (command && syntax?.bindingCommands?.[command]) {
        return {
          kind: 'command',
          command: syntax.bindingCommands[command]!,
          name: command,
          span: loc,
        } satisfies CommandEntity;
      }
      // On the binding target
      return {
        kind: 'plain-attr-binding',
        attributeName: (ins as { to?: string }).to ?? '',
        domProperty: undefined,
        effectiveMode: (ins as { effectiveMode?: BindingMode }).effectiveMode ?? null,
        span: loc,
      } satisfies PlainAttrBindingEntity;
    }
    case 'listenerBinding': {
      return {
        kind: 'plain-attr-binding',
        attributeName: (ins as { to?: string }).to ?? '',
        domProperty: undefined,
        effectiveMode: null,
        span: loc,
      } satisfies PlainAttrBindingEntity;
    }
    default:
      return null;
  }
}

// ============================================================================
// Confidence Computation
// ============================================================================

function computeExpressionConfidence(
  entity: CursorEntity,
  compilation: TemplateCompilation,
): ConfidenceSignals {
  // Expression confidence: did it parse? do we have type info?
  const hasType = entity.kind === 'scope-identifier'
    ? entity.type !== undefined
    : entity.kind === 'member-access'
    ? entity.memberType !== undefined
    : true;

  return {
    resource: 'high',
    type: hasType ? 'high' : 'medium',
    scope: 'high', // TODO: check catalog scope completeness
    expression: 'high', // parsed successfully (otherwise we wouldn't have an entity)
  };
}

function computeResourceConfidence(entity: CursorEntity): ConfidenceSignals {
  switch (entity.kind) {
    case 'ce-tag': {
      // Check if the element has a convergence ref (fully discovered)
      const hasRef = entity.ref !== null;
      return {
        resource: hasRef ? 'high' : 'medium',
        type: 'high',
        scope: 'high',
        expression: 'high',
      };
    }
    case 'tc-attr': {
      const hasController = entity.controller !== null;
      return {
        resource: hasController ? 'high' : 'low',
        type: 'high',
        scope: 'high',
        expression: 'high',
      };
    }
    case 'value-converter': {
      const hasConverter = entity.converter !== null;
      return {
        resource: hasConverter ? 'high' : 'low',
        type: 'high',
        scope: 'high',
        expression: 'high',
      };
    }
    case 'binding-behavior': {
      const hasBehavior = entity.behavior !== null;
      return {
        resource: hasBehavior ? 'high' : 'low',
        type: 'high',
        scope: 'high',
        expression: 'high',
      };
    }
    default:
      return { resource: 'high', type: 'high', scope: 'high', expression: 'high' };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function findExprAstById(exprTable: readonly ExprTableEntry[], exprId: ExprId): unknown | null {
  for (const entry of exprTable) {
    if (entry.id === exprId) return entry.ast;
  }
  return null;
}

function getInferredType(compilation: TemplateCompilation, exprId: ExprId): string | undefined {
  return compilation.typecheck?.inferredByExpr?.get(exprId)
    ?? compilation.typecheck?.expectedByExpr?.get(exprId)
    ?? undefined;
}

function findRowByNodeId(
  templates: readonly LinkedTemplate[],
  templateIndex: number,
  nodeId: NodeId,
): LinkedRow | null {
  const t = templates[templateIndex];
  if (!t) return null;
  for (const row of t.rows) {
    if (row.target === nodeId) return row;
  }
  return null;
}

// Inline VC/BB finders (simplified from workspace query-helpers)
function findValueConverterAtOffset(
  exprTable: readonly ExprTableEntry[],
  offset: number,
): { name: string; exprId: ExprId; span?: SourceSpan } | null {
  for (const entry of exprTable) {
    const ast = entry.ast as { $kind?: string; name?: string; expression?: { span?: SourceSpan }; span?: SourceSpan };
    if (ast.$kind === 'ValueConverterExpression' && ast.name && ast.span && spanContainsOffset(ast.span, offset)) {
      return { name: ast.name, exprId: entry.id, span: ast.span };
    }
  }
  return null;
}

function findBindingBehaviorAtOffset(
  exprTable: readonly ExprTableEntry[],
  offset: number,
): { name: string; exprId: ExprId; span?: SourceSpan } | null {
  for (const entry of exprTable) {
    const ast = entry.ast as { $kind?: string; name?: string; span?: SourceSpan };
    if (ast.$kind === 'BindingBehaviorExpression' && ast.name && ast.span && spanContainsOffset(ast.span, offset)) {
      return { name: ast.name, exprId: entry.id, span: ast.span };
    }
  }
  return null;
}
