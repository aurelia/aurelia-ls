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
  RefTargetEntity,
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
  /** Expression ID, when the entity is an expression. */
  readonly exprId?: ExprId;
  /** Node ID, when the entity is a DOM node (CE tag). */
  readonly nodeId?: NodeId;
  /** Pre-rendered expression label for hover display (e.g., "$parent.items[0].name"). */
  readonly expressionLabel?: string;
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
      const exprAst = findExprAstById(compilation.exprTable, expr.exprId) as ExpressionAst | null;
      const labelAtOffset = exprAst ? expressionLabelAtOffset(exprAst, offset) : null;
      const expressionLabel = chooseExpressionLabel(labelAtOffset, expr.memberPath) ?? 'expression';
      return {
        entity, confidence, compositeConfidence: computeConfidence(confidence),
        exprId: expr.exprId,
        expressionLabel,
      };
    }
  }

  // 2. Template controller at offset (repeat.for, if.bind, etc.)
  const controller = query.controllerAt(offset);
  if (controller) {
    const entity = resolveControllerEntity(controller, compilation, syntax);
    if (entity) {
      const confidence = computeResourceConfidence(entity);
      return { entity, confidence, compositeConfidence: computeConfidence(confidence) };
    }
  }

  // 3. DOM node at offset (custom element tags, native elements)
  //    Only produce a CE entity when the cursor is on the tag name span,
  //    not on attributes within the element. Attribute-level entities
  //    (bindable, CA, command) are resolved by step 4 (instructions).
  const node = query.nodeAt(offset);
  if (node) {
    const onTagName = !node.tagLoc || spanContainsOffset(node.tagLoc, offset);
    if (onTagName) {
      const entity = resolveNodeEntity(compilation, node, offset);
      if (entity) {
        const confidence = computeResourceConfidence(entity);
        return { entity, confidence, compositeConfidence: computeConfidence(confidence), nodeId: node.id };
      }
    }
  }

  // 4. Instruction hits (attribute bindings, events, property bindings)
  const instrEntity = resolveInstructionEntity(compilation, offset, syntax);
  if (instrEntity) {
    const confidence = computeResourceConfidence(instrEntity);
    return { entity: instrEntity, confidence, compositeConfidence: computeConfidence(confidence) };
  }

  // 5. Special attributes (as-element) — not linked instructions, but DOM-level
  const asElementEntity = resolveAsElementEntity(compilation, offset);
  if (asElementEntity) {
    const confidence = computeResourceConfidence(asElementEntity);
    return { entity: asElementEntity, confidence, compositeConfidence: computeConfidence(confidence) };
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
  // Check for value converter / binding behavior at this offset.
  // VC/BB identification comes from the expression AST (pipe/ampersand operators),
  // not from semantics. The converter/behavior sig is optional enrichment.
  const vcHit = findValueConverterAtOffset(compilation.exprTable, offset);
  if (vcHit) {
    const vcSig = semantics?.resources?.valueConverters?.[vcHit.name] ?? null;
    return {
      kind: 'value-converter',
      name: vcHit.name,
      converter: vcSig,
      span: vcHit.span ?? expr.span,
      ref: null,
    } satisfies ValueConverterEntity;
  }

  const bbHit = findBindingBehaviorAtOffset(compilation.exprTable, offset);
  if (bbHit) {
    const bbSig = semantics?.resources?.bindingBehaviors?.[bbHit.name] ?? null;
    return {
      kind: 'binding-behavior',
      name: bbHit.name,
      behavior: bbSig,
      span: bbHit.span ?? expr.span,
      ref: null,
    } satisfies BindingBehaviorEntity;
  }

  // Derive vmRef: the owning CE's ConvergenceRef for cross-domain traversal.
  // Walk linked rows to find the CE node whose template contains this expression.
  const vmRef = findOwnerVmRef(compilation);

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
        vmRef,
        span: expr.span,
      };
    }
    if (astKind === 'AccessMember') {
      const memberName = ((exprAst as { name?: string }).name) ?? 'unknown';
      const memberType = getInferredType(compilation, expr.exprId);
      return {
        kind: 'member-access',
        memberName,
        parentType: undefined,
        memberType,
        vmRef,
        span: expr.span,
      };
    }
  }

  // Fallback: generic scope identifier from member path
  return {
    kind: 'scope-identifier',
    name: expr.memberPath ?? 'expression',
    type: getInferredType(compilation, expr.exprId),
    vmRef,
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
  compilation: TemplateCompilation,
  syntax?: TemplateSyntaxRegistry | null,
): CursorEntity | null {
  const name = controller.name ?? controller.kind;
  const config = syntax?.controllers?.[name] ?? null;
  const iteratorCode = findControllerIteratorCode(compilation, name, controller.span);
  return {
    kind: 'tc-attr',
    attribute: null as unknown as AttrRes, // placeholder — will be projected from view
    controller: config,
    name,
    span: controller.span,
    ref: null,
    iteratorCode,
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
  // Walk linked instructions looking for one that covers this offset.
  // For hydrate instructions with child props (CA/TC/CE):
  // - Child props with DISTINCT loc (multi-binding: sub-value span) take priority
  // - Children with the SAME loc as parent (single-binding) defer to parent
  // This ensures: CA name hover → CAAttrEntity; multi-binding prop hover → BindableEntity
  for (const template of compilation.linked.templates) {
    for (const row of template.rows) {
      for (const ins of row.instructions) {
        const insLoc = (ins as { loc?: SourceSpan }).loc;

        // Check child props — only match children with DISTINCT spans from parent
        if ('props' in ins && Array.isArray((ins as { props?: unknown }).props)) {
          for (const prop of (ins as { props: LinkedInstruction[] }).props) {
            const propLoc = (prop as { loc?: SourceSpan }).loc;
            // Child has its own span (different from parent) — check it independently
            if (propLoc && (!insLoc || propLoc.start !== insLoc.start || propLoc.end !== insLoc.end)) {
              const propEntity = matchInstruction(prop, offset, syntax);
              if (propEntity) return propEntity;
            }
          }
        }

        // Check the parent instruction
        const entity = matchInstruction(ins, offset, syntax);
        if (entity) return entity;
      }
    }
  }
  return null;
}

// ============================================================================
// As-Element Resolution
// ============================================================================

function resolveAsElementEntity(
  compilation: TemplateCompilation,
  offset: number,
): CursorEntity | null {
  // Walk IR DOM tree looking for as-element attributes at the cursor position
  for (const template of compilation.ir.templates ?? []) {
    const hit = findAsElementInDom(template.dom, offset, compilation);
    if (hit) return hit;
  }
  return null;
}

function findAsElementInDom(
  node: { kind: string; attrs?: readonly { name: string; value: string | null; loc?: SourceSpan | null; valueLoc?: SourceSpan | null }[]; children?: readonly { kind: string; attrs?: readonly { name: string; value: string | null; loc?: SourceSpan | null; valueLoc?: SourceSpan | null }[]; children?: readonly any[] }[] },
  offset: number,
  compilation: TemplateCompilation,
): CursorEntity | null {
  // Check attributes on this node
  if (node.attrs) {
    for (const attr of node.attrs) {
      if (attr.name === 'as-element' && attr.value) {
        const span = attr.loc ?? attr.valueLoc;
        if (span && spanContainsOffset(span, offset)) {
          // Find the target CE definition
          const ceName = attr.value.toLowerCase();
          const targetDef = findCEDefByName(compilation, ceName);
          return {
            kind: 'as-element',
            targetCEName: attr.value,
            targetCE: targetDef,
            span: span,
            ref: (targetDef as { __convergenceRef?: ConvergenceRef } | null)?.__convergenceRef ?? null,
          } as CursorEntity;
        }
      }
    }
  }
  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      const hit = findAsElementInDom(child as typeof node, offset, compilation);
      if (hit) return hit;
    }
  }
  return null;
}

function findCEDefByName(
  compilation: TemplateCompilation,
  name: string,
): ElementRes | null {
  for (const template of compilation.linked.templates) {
    for (const row of template.rows) {
      if (row.node.kind === 'element' && row.node.custom?.def?.name === name) {
        return row.node.custom.def;
      }
    }
  }
  return null;
}

function matchInstruction(
  ins: LinkedInstruction,
  offset: number,
  syntax: TemplateSyntaxRegistry | null | undefined,
): CursorEntity | null {
  // Use nameLoc for cursor matching when available — it covers the attribute NAME only.
  // Falls back to loc (full attribute span) for instructions without nameLoc or when
  // the instruction kind needs value-position matching (translation, ref, set*).
  const insNameLoc = (ins as { nameLoc?: SourceSpan }).nameLoc;
  const fullLoc = (ins as { loc?: SourceSpan }).loc;
  // For most instructions, match against nameLoc. For value-centric instructions
  // (translation, ref, static set), match against the full span.
  const valueCentricKinds = new Set(['translationBinding', 'refBinding', 'setProperty', 'setAttribute']);
  const loc = (valueCentricKinds.has(ins.kind) ? fullLoc : insNameLoc) ?? fullLoc;
  if (!loc || !spanContainsOffset(loc, offset)) return null;

  switch (ins.kind) {
    case 'propertyBinding':
    case 'attributeBinding':
    case 'stylePropertyBinding': {
      // Check for binding command — cursor on the command suffix (after the dot).
      // The command name is preserved on the instruction from lowering.
      const cmdName = (ins as { command?: string }).command;
      const to = (ins as { to?: string }).to ?? '';
      if (cmdName && syntax?.bindingCommands?.[cmdName]) {
        // Attribute name is "target.command" — command starts after "target."
        const commandStart = loc.start + to.length + 1; // +1 for the dot
        if (offset >= commandStart) {
          return {
            kind: 'command',
            command: syntax.bindingCommands[cmdName]!,
            name: cmdName,
            span: loc,
          } satisfies CommandEntity;
        }
      }

      // Check for resolved bindable target — produces BindableEntity
      const target = (ins as { target?: BindableTarget }).target;
      if (target?.kind === 'element.bindable' || target?.kind === 'attribute.bindable' || target?.kind === 'controller.prop') {
        const bindable = target.bindable;
        if (bindable) {
          const parentName = resolveBindableParentName(target);
          const parentKind = target.kind === 'element.bindable' ? 'element'
            : target.kind === 'attribute.bindable' ? 'attribute'
            : 'controller';
          return {
            kind: 'bindable',
            bindable,
            parentKind,
            parentName,
            effectiveMode: (ins as { effectiveMode?: BindingMode }).effectiveMode ?? bindable.mode ?? null,
            span: loc,
            parentRef: null,
          } satisfies BindableEntity;
        }
      }

      // Fallback: plain attribute binding (no resolved bindable, no command)
      return {
        kind: 'plain-attr-binding',
        attributeName: (ins as { to?: string }).to ?? '',
        domProperty: undefined,
        effectiveMode: (ins as { effectiveMode?: BindingMode }).effectiveMode ?? null,
        span: loc,
      } satisfies PlainAttrBindingEntity;
    }
    case 'listenerBinding': {
      // Listener bindings now carry the command name from lowering.
      const lCmdName = (ins as { command?: string }).command;
      const lTo = (ins as { to?: string }).to ?? '';
      if (lCmdName && syntax?.bindingCommands?.[lCmdName]) {
        const commandStart = loc.start + lTo.length + 1; // +1 for the dot
        if (offset >= commandStart) {
          return {
            kind: 'command',
            command: syntax.bindingCommands[lCmdName]!,
            name: lCmdName,
            span: loc,
          } satisfies CommandEntity;
        }
      }
      return {
        kind: 'plain-attr-binding',
        attributeName: lTo,
        domProperty: undefined,
        effectiveMode: null,
        span: loc,
      } satisfies PlainAttrBindingEntity;
    }
    case 'hydrateAttribute': {
      const res = (ins as { res?: { def: AttrRes } }).res;
      const def = res?.def;
      if (def) {
        return {
          kind: 'ca-attr',
          attribute: def,
          name: def.name,
          usedAlias: null,
          span: loc,
          ref: (def as { __convergenceRef?: ConvergenceRef }).__convergenceRef ?? null,
        } satisfies CAAttrEntity;
      }
      return null;
    }
    case 'hydrateTemplateController': {
      const controllerName = (ins as { res?: string }).res ?? '';
      const config = syntax?.controllers?.[controllerName] ?? null;
      // Command-position detection: if the cursor is on the command suffix
      // (e.g., "bind" in "if-not.bind"), return CommandEntity instead of
      // TCAttrEntity. Commands are binding mechanics, not navigable symbols.
      const tcCmdName = (ins as { command?: string }).command;
      if (tcCmdName && syntax?.bindingCommands?.[tcCmdName]) {
        const commandStart = loc.start + controllerName.length + 1; // +1 for the dot
        if (offset >= commandStart) {
          return {
            kind: 'command',
            command: syntax.bindingCommands[tcCmdName]!,
            name: tcCmdName,
            span: loc,
          } satisfies CommandEntity;
        }
      }
      const props = (ins as { props?: readonly { kind?: string; forOf?: { code?: string } }[] }).props;
      const iteratorProp = props?.find((p) => p.kind === 'iteratorBinding');
      return {
        kind: 'tc-attr',
        attribute: null as unknown as AttrRes,
        controller: config,
        name: controllerName,
        span: loc,
        ref: null,
        iteratorCode: iteratorProp?.forOf?.code ?? null,
      } satisfies TCAttrEntity;
    }
    case 'translationBinding': {
      // Translation bindings (i18n) — produce a plain-attr-binding for now.
      // A dedicated TranslationEntity can be added if i18n features need richer hover.
      const tTo = (ins as { to?: string }).to ?? '';
      const tKey = (ins as { keyValue?: string }).keyValue ?? '';
      return {
        kind: 'plain-attr-binding',
        attributeName: tKey || tTo || 't',
        domProperty: undefined,
        effectiveMode: null,
        span: loc,
      } satisfies PlainAttrBindingEntity;
    }
    case 'refBinding': {
      const to = (ins as { to?: string }).to ?? '';
      return {
        kind: 'ref-target',
        targetName: to,
        variableName: to,
        span: loc,
      } satisfies RefTargetEntity;
    }
    case 'setProperty':
    case 'setAttribute': {
      // Static binding (no command) — check for resolved bindable target
      const target = (ins as { target?: BindableTarget }).target;
      if (target?.kind === 'element.bindable' || target?.kind === 'attribute.bindable' || target?.kind === 'controller.prop') {
        const bindable = target.bindable;
        if (bindable) {
          const parentName = resolveBindableParentName(target);
          const parentKind = target.kind === 'element.bindable' ? 'element'
            : target.kind === 'attribute.bindable' ? 'attribute'
            : 'controller';
          return {
            kind: 'bindable',
            bindable,
            parentKind,
            parentName,
            effectiveMode: bindable.mode ?? null,
            span: loc,
            parentRef: null,
          } satisfies BindableEntity;
        }
      }
      // No resolved bindable — static native attribute, no entity
      return null;
    }
    default:
      return null;
  }
}

// Bindable target shape from linked instructions
interface BindableTarget {
  kind: string;
  bindable?: Bindable;
  element?: { def: { name: string } };
  attribute?: { def: { name: string } };
  controller?: { res: string };
}

function resolveBindableParentName(target: BindableTarget): string {
  if (target.element?.def?.name) return target.element.def.name;
  if (target.attribute?.def?.name) return target.attribute.def.name;
  if (target.controller?.res) return target.controller.res;
  return 'unknown';
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

/**
 * Find the owning CE's ConvergenceRef for a template compilation.
 *
 * A template compilation belongs to exactly one CE (the view-model class
 * whose template this is). The CE's ConvergenceRef enables the cross-domain
 * traversal: template expression → owning CE → resource identity → epistemic
 * provenance → source location.
 *
 * Walks the linked rows looking for the first CE node with a convergence ref.
 * Returns null if the template has no identifiable CE owner (e.g., standalone
 * template or root template without explicit CE decoration).
 */
/**
 * Find the iterator declaration code for a template controller at a given span.
 *
 * Walks all linked instructions looking for a hydrateTemplateController
 * matching the controller name AND overlapping the controller span,
 * then extracts the iterator code from its iteratorBinding child prop.
 */
function findControllerIteratorCode(
  compilation: TemplateCompilation,
  controllerName: string,
  controllerSpan: SourceSpan,
): string | null {
  for (const template of compilation.linked.templates) {
    for (const row of template.rows) {
      for (const ins of row.instructions) {
        if (ins.kind === 'hydrateTemplateController' && ins.res === controllerName) {
          // Match by checking if the instruction's loc overlaps the controller span
          const insLoc = (ins as { loc?: SourceSpan }).loc;
          if (insLoc && insLoc.start <= controllerSpan.start && insLoc.end >= controllerSpan.end) {
            const props = (ins as { props?: readonly { kind?: string; forOf?: { code?: string } }[] }).props;
            const iteratorProp = props?.find((p) => p.kind === 'iteratorBinding');
            if (iteratorProp?.forOf?.code) return iteratorProp.forOf.code;
          }
          // Also check row-level instruction without loc — the instruction may wrap the whole element
          if (!insLoc) {
            const props = (ins as { props?: readonly { kind?: string; forOf?: { code?: string } }[] }).props;
            const iteratorProp = props?.find((p) => p.kind === 'iteratorBinding');
            if (iteratorProp?.forOf?.code) return iteratorProp.forOf.code;
          }
        }
      }
    }
  }
  return null;
}

function findOwnerVmRef(compilation: TemplateCompilation): ConvergenceRef | null {
  for (const template of compilation.linked.templates) {
    for (const row of template.rows) {
      if (row.node.kind === 'element' && row.node.custom?.def?.__convergenceRef) {
        return row.node.custom.def.__convergenceRef;
      }
    }
  }
  return null;
}

function findExprAstById(exprTable: readonly ExprTableEntry[], exprId: ExprId): unknown | null {
  for (const entry of exprTable) {
    if (entry.id === exprId) return entry.ast;
  }
  return null;
}

function getInferredType(compilation: TemplateCompilation, exprId: ExprId): string | undefined {
  // Type resolution is now deferred to TS quickinfo at diagnostic/hover time.
  // Return expected type as fallback for cursor entity metadata.
  return compilation.typecheck?.expectedByExpr?.get(exprId)
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

// Inline VC/BB finders — walk the expression tail chain (BB wraps VC wraps core).
// AST node kinds: 'ValueConverter', 'BindingBehavior' (not *Expression suffix).
// The `name` field is an Identifier { name: string, span: SourceSpan }.

// VC/BB finders — walk the expression tail chain.
// AST $kind values: 'ValueConverter', 'BindingBehavior'.
// AST name is Identifier { $kind, name: string, span: SourceSpan }.
// Spans are already absolute (rebased by the expression parser when baseSpan is provided).

type ExprNode = { $kind?: string; name?: { name?: string; span?: SourceSpan }; expression?: ExprNode; span?: SourceSpan; expressions?: ExprNode[] };

function findValueConverterAtOffset(
  exprTable: readonly ExprTableEntry[],
  offset: number,
): { name: string; exprId: ExprId; span?: SourceSpan } | null {
  for (const entry of exprTable) {
    const hit = findPipeNameAtOffset(entry.ast as ExprNode, offset, 'ValueConverter');
    if (hit) return { name: hit.name, exprId: entry.id, span: hit.span };
  }
  return null;
}

function findBindingBehaviorAtOffset(
  exprTable: readonly ExprTableEntry[],
  offset: number,
): { name: string; exprId: ExprId; span?: SourceSpan } | null {
  for (const entry of exprTable) {
    const hit = findPipeNameAtOffset(entry.ast as ExprNode, offset, 'BindingBehavior');
    if (hit) return { name: hit.name, exprId: entry.id, span: hit.span };
  }
  return null;
}

function findPipeNameAtOffset(
  node: ExprNode | undefined | null,
  offset: number,
  kind: 'ValueConverter' | 'BindingBehavior',
): { name: string; span?: SourceSpan } | null {
  if (!node || !node.$kind) return null;
  if (node.$kind === kind && node.name?.name && node.name.span && spanContainsOffset(node.name.span, offset)) {
    return { name: node.name.name, span: node.name.span };
  }
  // Walk inner expression (BB wraps VC wraps core)
  if (node.expression) {
    const hit = findPipeNameAtOffset(node.expression, offset, kind);
    if (hit) return hit;
  }
  // Walk Interpolation sub-expressions
  if (node.expressions) {
    for (const sub of node.expressions) {
      const hit = findPipeNameAtOffset(sub, offset, kind);
      if (hit) return hit;
    }
  }
  return null;
}

// ============================================================================
// Expression Label Rendering
// ============================================================================
//
// Computes a human-readable label for the expression node at the cursor.
// This is used by hover to display e.g. "(expression) $parent.items[0].name".
// The label captures the structural identity of the expression position.

type ExpressionAst = {
  $kind: string;
  span?: SourceSpan;
  name?: { $kind?: string; span?: SourceSpan; name: string };
  expression?: ExpressionAst;
  object?: ExpressionAst;
  func?: ExpressionAst;
  args?: ExpressionAst[];
  left?: ExpressionAst;
  right?: ExpressionAst;
  condition?: ExpressionAst;
  yes?: ExpressionAst;
  no?: ExpressionAst;
  target?: ExpressionAst;
  value?: unknown;
  key?: ExpressionAst;
  parts?: ExpressionAst[];
  expressions?: ExpressionAst[];
  elements?: ExpressionAst[];
  values?: ExpressionAst[];
  body?: ExpressionAst;
  params?: ExpressionAst[];
  declaration?: ExpressionAst;
  iterable?: ExpressionAst;
  ancestor?: number;
  optional?: boolean;
};

function expressionLabelAtOffset(ast: ExpressionAst, offset: number): string | null {
  const hit = findLabelAst(ast, offset);
  if (!hit) return null;
  return renderExpressionLabel(hit);
}

function findLabelAst(node: ExpressionAst | null | undefined, offset: number): ExpressionAst | null {
  if (!node || !node.span || !spanContainsOffset(node.span, offset)) return null;
  // Walk children depth-first for the most specific label
  for (const child of collectExprAstChildren(node)) {
    const hit = findLabelAst(child, offset);
    if (hit) return hit;
  }
  return isLabelCandidate(node) ? node : null;
}

function collectExprAstChildren(node: ExpressionAst): ExpressionAst[] {
  const children: ExpressionAst[] = [];
  const push = (child?: ExpressionAst | null) => { if (child) children.push(child); };
  push(node.expression);
  push(node.object);
  push(node.func);
  push(node.left);
  push(node.right);
  push(node.condition);
  push(node.yes);
  push(node.no);
  push(node.target);
  push(node.key);
  push(node.declaration);
  push(node.iterable);
  push(node.body);
  if (node.args) node.args.forEach(push);
  if (node.parts) node.parts.forEach(push);
  if (node.expressions) node.expressions.forEach(push);
  if (node.elements) node.elements.forEach(push);
  if (node.values) node.values.forEach(push);
  if (node.params) node.params.forEach(push);
  return children;
}

function isLabelCandidate(node: ExpressionAst): boolean {
  switch (node.$kind) {
    case 'AccessScope':
    case 'AccessMember':
    case 'AccessKeyed':
    case 'AccessGlobal':
    case 'AccessThis':
    case 'AccessBoundary':
    case 'CallScope':
    case 'CallMember':
    case 'CallGlobal':
    case 'CallFunction':
    case 'ValueConverter':
    case 'BindingBehavior':
    case 'Unary':
      return true;
    default:
      return false;
  }
}

function renderExpressionLabel(node: ExpressionAst): string | null {
  switch (node.$kind) {
    case 'AccessScope': return renderScopedName(node.ancestor, node.name?.name ?? null);
    case 'AccessMember': return renderMemberName(node.object, node.name?.name ?? null);
    case 'AccessKeyed': return renderKeyedName(node.object, node.key);
    case 'AccessGlobal': return node.name?.name ?? null;
    case 'AccessThis': return renderThisName(node.ancestor);
    case 'AccessBoundary': return 'this';
    case 'CallScope': return renderScopedName(node.ancestor, node.name?.name ?? null);
    case 'CallMember': return renderMemberName(node.object, node.name?.name ?? null);
    case 'CallGlobal': return node.name?.name ?? null;
    case 'CallFunction': return node.func ? renderExpressionLabel(node.func) : null;
    case 'ValueConverter':
    case 'BindingBehavior': return node.name?.name ?? null;
    case 'Unary': {
      const inner = node.expression ? renderExpressionLabel(node.expression) : null;
      const op = (node as { operation?: string }).operation ?? '';
      if (!inner) return null;
      const pos = (node as { pos?: number }).pos ?? 0;
      return pos === 0 ? `${op}${inner}` : `${inner}${op}`;
    }
    default: return null;
  }
}

function renderScopedName(ancestor: number | undefined, name: string | null): string | null {
  if (!name) return null;
  const prefix = renderAncestorPrefix(ancestor ?? 0);
  return prefix ? `${prefix}.${name}` : name;
}

function renderThisName(ancestor: number | undefined): string {
  const count = ancestor ?? 0;
  if (count <= 0) return '$this';
  return renderAncestorPrefix(count);
}

function renderAncestorPrefix(count: number): string {
  if (count <= 0) return '';
  return Array.from({ length: count }, () => '$parent').join('.');
}

function renderMemberName(object: ExpressionAst | null | undefined, name: string | null): string | null {
  if (!name) return null;
  const base = object ? renderExpressionLabel(object) : null;
  return base ? `${base}.${name}` : name;
}

function renderKeyedName(object: ExpressionAst | null | undefined, key: ExpressionAst | null | undefined): string | null {
  const base = object ? renderExpressionLabel(object) : null;
  if (!base) return null;
  const keyLabel = renderKeyLabel(key) ?? '?';
  return `${base}[${keyLabel}]`;
}

function renderKeyLabel(node: ExpressionAst | null | undefined): string | null {
  if (!node) return null;
  switch (node.$kind) {
    case 'PrimitiveLiteral': return formatLiteral(node.value);
    case 'AccessScope':
    case 'AccessMember':
    case 'AccessKeyed':
    case 'AccessGlobal':
    case 'AccessThis':
    case 'AccessBoundary':
    case 'CallScope':
    case 'CallMember':
    case 'CallGlobal':
    case 'CallFunction':
      return renderExpressionLabel(node);
    default: return null;
  }
}

function formatLiteral(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}

function chooseExpressionLabel(primary: string | null | undefined, secondary: string | null | undefined): string | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary ?? null;
  if (!secondary) return primary ?? null;
  return primary.length >= secondary.length ? primary : secondary;
}
