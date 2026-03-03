/**
 * Template Lowering — Single-Pass Template Semantic Analysis
 *
 * Replaces the three-stage pipeline (10-lower → 20-link → 30-bind)
 * with a single callback that consumes the new resource types directly.
 *
 * Input:
 * - Template HTML string (parsed by the source-faithful walker)
 * - ResourceCatalogGreen (resource lookup with FieldValue<T>)
 * - VocabularyGreen (BC + AP lookup)
 * - ScopeCompleteness (negative assertion safety)
 *
 * Output:
 * - TemplateSemantics: per-element semantic analysis with classification,
 *   binding targets, effective modes, scope frames, and gap tracking —
 *   all in a single pass.
 *
 * Design principles:
 * - FieldValue<T> three-state awareness throughout — no unwrapping,
 *   no information loss at the pivot point
 * - Config-driven TC handling via ControllerSemanticsGreen (from 30-bind's
 *   approach, not hardcoded controller names)
 * - Gap propagation: upstream unknown fields produce classification
 *   uncertainty that flows to diagnostics as demotion signals
 * - Source-faithful spans (from template-parser.ts, no parse5)
 */

import {
  parseTemplate,
  type TemplateTree,
  type TemplateNode,
  type ElementNode,
  type TemplateAttr,
  type Namespace,
  type Span,
} from './template-parser.js';

import type { BindingMode, AnyBindingExpression, ForOfStatement, Interpolation, IsBindingBehavior, ExpressionType } from '../../model/ir.js';

import type {
  FieldValue,
  ResourceKind,
  CustomElementGreen,
  CustomAttributeGreen,
  TemplateControllerGreen,
  BindableGreen,
  BindingCommandGreen,
  AttributePatternGreen,
  VocabularyGreen,
  ResourceCatalogGreen,
  ScopeCompleteness,
  CaptureValue,
  ProcessContentValue,
  PatternInterpret,
  ExpressionEntry,
  ControllerSemanticsGreen,
} from '../resource/types.js';

import type { AttributeParser, AttrSyntax as RealAttrSyntax } from '../../parsing/attribute-parser.js';
import type { IExpressionParser } from '../../parsing/expression-parser.js';
import type { DomSchema, TwoWayDefaults, Naming } from '../../schema/types.js';

// =============================================================================
// Output Types
// =============================================================================

/**
 * The complete semantic analysis of a template — the combined output
 * of what was previously lower + link + bind.
 */
export interface TemplateSemantics {
  readonly elements: readonly ElementSemantics[];
  readonly texts: readonly TextSemantics[];
  readonly scopeOwner: string;
  /** Gap signals from upstream resources that affect this template. */
  readonly upstreamGaps: readonly GapSignal[];
}

/**
 * Complete semantic analysis of a single element.
 */
export interface ElementSemantics {
  readonly tagName: string;
  readonly namespace: Namespace;
  readonly span: Span;
  /** How the element was resolved (CE, plain HTML, not found). */
  readonly resolution: ElementResolution;
  /** Per-attribute semantic analysis. */
  readonly attributes: readonly AttributeSemantics[];
  /** Scope frame at this element's content position. */
  readonly frame: ScopeFrame;
  /** TC wrapping order (outermost first). */
  readonly controllers: readonly ControllerSemantics[];
}

// -- Element Resolution --

export type ElementResolution =
  | { readonly kind: 'custom-element'; readonly resource: CustomElementGreen; readonly via: 'tag-name' | 'as-element' | 'alias' }
  | { readonly kind: 'plain-html'; readonly tagName: string }
  | { readonly kind: 'not-found'; readonly tagName: string; readonly grounded: boolean };

// -- Attribute Semantics --

/**
 * Complete semantic analysis of a single attribute.
 * Carries classification, binding target, and effective mode in one record.
 */
export interface AttributeSemantics {
  readonly rawName: string;
  readonly rawValue: string;
  readonly span: Span;
  /** AP parse result. */
  readonly syntax: { readonly target: string; readonly command: string | null };
  /** 8-step classification with gap tracking. */
  readonly classification: Classification;
  /** Resolved binding target and mode (null for steps that don't produce bindings). */
  readonly binding: BindingTarget | null;
}

export interface Classification {
  readonly step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  readonly category: ClassificationCategory;
  /** When classification depends on an upstream FieldValue that is 'unknown',
   *  this records the gap. Diagnostics use this for demotion. */
  readonly uncertainty?: GapSignal;
}

export type ClassificationCategory =
  | 'special'
  | 'captured'
  | 'spread-transferred'
  | 'override-command'
  | 'spread-value'
  | 'element-bindable'
  | 'custom-attribute'
  | 'template-controller'
  | 'plain-attribute';

/**
 * Resolved binding target — where a binding lands and what mode applies.
 *
 * This is the combined output of what was previously lower's instruction
 * construction + link's target resolution + link's mode computation.
 */
export type BindingTarget =
  | { readonly kind: 'bindable'; readonly resource: CustomElementGreen | CustomAttributeGreen | TemplateControllerGreen; readonly bindable: BindableGreen; readonly effectiveMode: BindingMode; readonly expressionEntry: ExpressionEntry; readonly expression?: AnyBindingExpression }
  | { readonly kind: 'command'; readonly command: BindingCommandGreen; readonly effectiveMode: BindingMode; readonly targetProperty: string; readonly expression?: AnyBindingExpression }
  | { readonly kind: 'native-prop'; readonly tagName: string; readonly property: string; readonly effectiveMode: BindingMode; readonly expressionEntry: ExpressionEntry; readonly expression?: AnyBindingExpression }
  | { readonly kind: 'attribute'; readonly attrName: string; readonly expressionEntry: ExpressionEntry; readonly expression?: AnyBindingExpression }
  | { readonly kind: 'interpolation'; readonly targetProperty: string; readonly expression?: Interpolation }
  | { readonly kind: 'listener'; readonly eventName: string; readonly capture: boolean; readonly modifier: string | null; readonly expression?: AnyBindingExpression }
  | { readonly kind: 'ref'; readonly target: string; readonly expression?: AnyBindingExpression }
  | { readonly kind: 'iterator'; readonly itemVar: string; readonly iterableProperty: string; readonly expressionEntry: ExpressionEntry; readonly expression?: ForOfStatement }
  | { readonly kind: 'set-property'; readonly targetProperty: string; readonly value: string }
  | { readonly kind: 'translation'; readonly target: string; readonly isExpression: boolean; readonly expression?: AnyBindingExpression }
  | { readonly kind: 'multi-binding'; readonly resource: CustomAttributeGreen; readonly bindings: readonly BindingTarget[] };

// -- Scope Frame --

/**
 * A scope frame — what identifiers are available at a template position.
 *
 * Config-driven: the frame shape is determined by ControllerSemanticsGreen,
 * not by hardcoded TC names. A user-defined TC with `scope: 'overlay'`
 * and `injects.contextuals: ['$index']` gets the same frame construction
 * as repeat.
 */
export interface ScopeFrame {
  readonly kind: ScopeFrameKind;
  /** Variables introduced by this frame. */
  readonly locals: readonly LocalBinding[];
  /** Parent frame (null at CE boundary). */
  readonly parent: ScopeFrame | null;
  /** Is this a CE boundary? (stops bare identifier resolution) */
  readonly isBoundary: boolean;
}

export type ScopeFrameKind =
  | 'ce-boundary'
  | 'iterator'
  | 'value-overlay'
  | 'let'
  | 'passthrough';

export interface LocalBinding {
  readonly name: string;
  readonly source: 'iterator-var' | 'contextual' | 'let-binding' | 'alias' | 'vm-property';
}

// -- Controller Semantics --

/**
 * Resolved TC semantics at a template position.
 */
export interface ControllerSemantics {
  readonly name: string;
  readonly resource: TemplateControllerGreen;
  readonly order: number;
  /** The frame this TC creates (null for passthrough). */
  readonly frame: ScopeFrame | null;
}

// -- Gap Signal --

/**
 * A gap signal carried through template analysis.
 *
 * When an upstream FieldValue is 'unknown', this signal flows downstream
 * so diagnostics can demote severity. The gap PRESENCE is structural
 * (it affects classification). The gap DETAIL (reason, remediation)
 * is on the red layer and queried separately.
 */
export interface GapSignal {
  readonly fieldPath: string;
  readonly reasonKind: string;
  readonly resourceKind: ResourceKind;
  readonly resourceName: string;
}

// -- Text Semantics --

export interface TextSemantics {
  readonly content: string;
  readonly span: Span;
  readonly hasInterpolation: boolean;
}

// =============================================================================
// Lowering Entry Point
// =============================================================================

export interface LoweringInput {
  /** Template HTML source. */
  readonly html: string;
  /** CE that owns this template (for scope boundary). */
  readonly scopeOwner: string;
  /** All resources visible in this template's scope. */
  readonly catalog: ResourceCatalogGreen;
  /** Frozen vocabulary (BCs + APs). */
  readonly vocabulary: VocabularyGreen;
  /** Scope completeness for negative assertion safety. */
  readonly completeness: ScopeCompleteness;
  /**
   * Real attribute parser (route-recognizer scoring, pattern caching,
   * freeze invariant). When provided, replaces the built-in AP simulation
   * with production-grade pattern matching.
   */
  readonly attrParser?: AttributeParser;
  /**
   * Expression parser. When provided, binding values are parsed into ASTs
   * and attached to the binding target as `expression`. Without this,
   * bindings carry raw expression strings only.
   */
  readonly exprParser?: IExpressionParser;
  /**
   * DOM schema (from dom-registry.generated.ts). When provided, replaces
   * the inline element sets with the full generated registry for
   * element recognition, isTwoWay defaults, and attrToProp mapping.
   */
  readonly dom?: DomSchema;
  /**
   * Two-way binding defaults (from registry.ts). When provided, uses
   * the exhaustive per-element per-property table instead of the inline
   * heuristic.
   */
  readonly twoWayDefaults?: TwoWayDefaults;
  /**
   * Naming conventions (attrToProp mappings). When provided, uses the
   * full global + per-tag mapping table.
   */
  readonly naming?: Naming;
}

/**
 * Lower a template into its semantic representation.
 *
 * Single pass: parse → walk → classify → resolve → bind → scope.
 * No intermediate IR. No separate link phase. No re-resolution.
 */
export function lowerTemplate(input: LoweringInput): TemplateSemantics {
  const tree = parseTemplate(input.html);
  const ctx = createLoweringContext(input);
  const elements: ElementSemantics[] = [];
  const texts: TextSemantics[] = [];

  const rootFrame: ScopeFrame = {
    kind: 'ce-boundary',
    locals: [], // VM properties come from type analysis, not template lowering
    parent: null,
    isBoundary: true,
  };

  walkNodes(tree.children, ctx, rootFrame, elements, texts);

  return {
    elements,
    texts,
    scopeOwner: input.scopeOwner,
    upstreamGaps: ctx.gaps,
  };
}

// =============================================================================
// Lowering Context
// =============================================================================

interface LoweringContext {
  readonly catalog: ResourceCatalogGreen;
  readonly vocabulary: VocabularyGreen;
  readonly completeness: ScopeCompleteness;
  readonly attrParser: AttributeParser | null;
  readonly exprParser: IExpressionParser | null;
  readonly dom: DomSchema | null;
  readonly twoWayDefaults: TwoWayDefaults | null;
  readonly naming: Naming | null;
  readonly gaps: GapSignal[];
}

function createLoweringContext(input: LoweringInput): LoweringContext {
  return {
    catalog: input.catalog,
    vocabulary: input.vocabulary,
    completeness: input.completeness,
    attrParser: input.attrParser ?? null,
    exprParser: input.exprParser ?? null,
    dom: input.dom ?? null,
    twoWayDefaults: input.twoWayDefaults ?? null,
    naming: input.naming ?? null,
    gaps: [],
  };
}

// =============================================================================
// Tree Walk
// =============================================================================

function walkNodes(
  nodes: readonly TemplateNode[],
  ctx: LoweringContext,
  parentFrame: ScopeFrame,
  elements: ElementSemantics[],
  texts: TextSemantics[],
): void {
  for (const node of nodes) {
    if (node.kind === 'text') {
      const hasInterpolation = node.content.includes('${');
      if (hasInterpolation) {
        texts.push({ content: node.content, span: node.sourceSpan, hasInterpolation: true });
      }
      continue;
    }
    if (node.kind === 'element') {
      const sem = analyzeElement(node, ctx, parentFrame);
      elements.push(sem);
      // Recurse into children with the element's content frame
      walkNodes(node.children, ctx, sem.frame, elements, texts);
    }
  }
}

// =============================================================================
// Element Analysis (combined lower + link + bind)
// =============================================================================

function analyzeElement(
  el: ElementNode,
  ctx: LoweringContext,
  parentFrame: ScopeFrame,
): ElementSemantics {
  // 1. Resolve element identity
  const resolution = resolveElement(el, ctx);

  // 2. Get CE definition if resolved
  const ceGreen = resolution.kind === 'custom-element' ? resolution.resource : null;

  // 3. Classify and resolve each attribute
  const attributes: AttributeSemantics[] = [];
  const controllers: ControllerSemantics[] = [];
  let controllerOrder = 0;

  for (const attr of el.attrs) {
    const syntax = parseAttrSyntax(attr.name, attr.value, ctx);
    const { classification, binding } = classifyAndResolve(attr, syntax, el, ceGreen, ctx);

    attributes.push({
      rawName: attr.name,
      rawValue: attr.value,
      span: attr.nameSpan,
      syntax,
      classification,
      binding,
    });

    // Collect TC attributes for scope chain construction
    if (classification.category === 'template-controller') {
      const tcGreen = findController(syntax.target, ctx);
      if (tcGreen) {
        const semantics = tcGreen.semantics;
        const tcFrame = semantics ? buildControllerFrame(semantics, el, attr, parentFrame) : null;
        controllers.push({
          name: syntax.target,
          resource: tcGreen,
          order: controllerOrder++,
          frame: tcFrame,
        });
      }
    }
  }

  // 4. Build scope frame for this element's content
  let contentFrame = parentFrame;

  // Apply TC scope effects (rightmost = innermost)
  for (const tc of controllers) {
    if (tc.frame) {
      contentFrame = tc.frame;
    }
  }

  // Handle <let> elements
  if (el.tagName.toLowerCase() === 'let') {
    const letLocals = extractLetBindings(el, ctx);
    if (letLocals.length > 0) {
      contentFrame = {
        kind: 'let',
        locals: letLocals,
        parent: contentFrame,
        isBoundary: false,
      };
    }
  }

  // CE boundary: child elements get a new boundary frame
  if (resolution.kind === 'custom-element') {
    contentFrame = {
      kind: 'ce-boundary',
      locals: [],
      parent: contentFrame,
      isBoundary: true,
    };
  }

  return {
    tagName: el.tagName,
    namespace: el.namespace,
    span: el.sourceSpan,
    resolution,
    attributes,
    frame: contentFrame,
    controllers,
  };
}

// =============================================================================
// Element Resolution
// =============================================================================

function resolveElement(el: ElementNode, ctx: LoweringContext): ElementResolution {
  const tagName = el.tagName.toLowerCase();

  // as-element override
  const asElement = el.attrs.find(a => a.name === 'as-element');
  if (asElement) {
    const ce = findElement(asElement.value, ctx);
    if (ce) return { kind: 'custom-element', resource: ce, via: 'as-element' };
  }

  // Direct CE lookup
  const ce = findElement(tagName, ctx);
  if (ce) {
    const via = ce.name === tagName ? 'tag-name' : 'alias';
    return { kind: 'custom-element', resource: ce, via: via as 'tag-name' | 'alias' };
  }

  // Known HTML/SVG → plain
  if (isKnownElement(tagName, el.namespace, ctx)) {
    return { kind: 'plain-html', tagName };
  }

  // Hyphenated → not-found with grounded flag
  if (tagName.includes('-')) {
    return { kind: 'not-found', tagName, grounded: ctx.completeness.complete };
  }

  return { kind: 'plain-html', tagName };
}

// =============================================================================
// 8-Step Classification + Resolution (combined)
// =============================================================================

function classifyAndResolve(
  attr: TemplateAttr,
  syntax: { target: string; command: string | null },
  el: ElementNode,
  ceGreen: CustomElementGreen | null,
  ctx: LoweringContext,
): { classification: Classification; binding: BindingTarget | null } {
  const { target, command } = syntax;

  // Step 1: Special attributes
  if (attr.name === 'as-element' || attr.name === 'containerless') {
    return { classification: { step: 1, category: 'special' }, binding: null };
  }

  // Step 2: Captured attributes
  // F3 §Step 2: captured attributes exclude au-slot, bindable properties
  // of this CE, and template controllers.
  if (ceGreen) {
    const captureResult = checkCapture(ceGreen, attr, syntax, ctx);
    if (captureResult.captured) {
      return {
        classification: { step: 2, category: 'captured', uncertainty: captureResult.uncertainty },
        binding: null,
      };
    }
  }

  // Step 3: Spread transferred
  if (attr.name === '...$attrs') {
    return { classification: { step: 3, category: 'spread-transferred' }, binding: null };
  }

  // Step 4: Override binding commands (ignoreAttr: true)
  if (command !== null) {
    const bc = ctx.vocabulary.commands[command];
    if (bc?.ignoreAttr) {
      return {
        classification: { step: 4, category: 'override-command' },
        binding: buildCommandBinding(bc, target, el),
      };
    }
  }

  // Step 5: Spread value
  if (attr.name.startsWith('...')) {
    return { classification: { step: 5, category: 'spread-value' }, binding: null };
  }

  // Step 6: CE bindable properties
  if (ceGreen) {
    const bindable = findBindable(ceGreen, target);
    if (bindable) {
      return {
        classification: { step: 6, category: 'element-bindable' },
        binding: buildBindableBinding(bindable, ceGreen, command, target, el, ctx, attr.value),
      };
    }
  }

  // Step 7: Custom attributes and template controllers
  const shouldCheckCa = el.namespace === 'html' || command !== null;
  if (shouldCheckCa) {
    const tcGreen = findController(target, ctx);
    if (tcGreen) {
      return {
        classification: { step: 7, category: 'template-controller' },
        binding: buildTcBinding(tcGreen, command, target, attr.value, el, ctx),
      };
    }

    const caGreen = findAttribute(target, ctx);
    if (caGreen) {
      return {
        classification: { step: 7, category: 'custom-attribute' },
        binding: buildCaBindingWithMulti(caGreen, command, target, attr.value, el, ctx),
      };
    }
  }

  // Step 8: Plain attribute
  return {
    classification: { step: 8, category: 'plain-attribute' },
    binding: buildPlainBinding(command, target, attr.value, el, ctx),
  };
}

// =============================================================================
// Capture Check (FieldValue-aware)
// =============================================================================

function checkCapture(
  ce: CustomElementGreen,
  attr: TemplateAttr,
  syntax: { target: string; command: string | null },
  ctx: LoweringContext,
): { captured: boolean; uncertainty?: GapSignal } {
  // F3 §Step 2 exclusions: au-slot, CE bindable properties, TCs, spread
  if (attr.name === 'au-slot' || attr.name === 'slot') return { captured: false };
  if (attr.name === '...$attrs' || attr.name.startsWith('...')) return { captured: false };
  if (findBindable(ce, syntax.target)) return { captured: false };
  if (findController(syntax.target, ctx)) return { captured: false };

  const captureField = ce.capture;

  switch (captureField.state) {
    case 'absent':
      return { captured: false };
    case 'unknown':
      // Analysis couldn't determine capture — classification uncertain
      return {
        captured: false,
        uncertainty: {
          fieldPath: 'capture',
          reasonKind: captureField.reasonKind,
          resourceKind: 'custom-element',
          resourceName: ce.name,
        },
      };
    case 'known':
      if (captureField.value === false) return { captured: false };
      if (captureField.value === true) return { captured: true };
      // CaptureFilter — opaque predicate, treat as captured with uncertainty
      return {
        captured: true,
        uncertainty: {
          fieldPath: 'capture',
          reasonKind: 'opaque-capture-filter',
          resourceKind: 'custom-element',
          resourceName: ce.name,
        },
      };
  }
}

// =============================================================================
// Binding Construction
// =============================================================================

function buildCommandBinding(
  bc: BindingCommandGreen,
  target: string,
  el: ElementNode,
): BindingTarget {
  switch (bc.commandKind) {
    case 'listener':
      return {
        kind: 'listener',
        eventName: target,
        capture: bc.capture ?? false,
        modifier: null,
      };
    case 'ref':
      return { kind: 'ref', target };
    case 'style':
      return { kind: 'command', command: bc, effectiveMode: 'toView', targetProperty: target };
    case 'attribute':
      return { kind: 'attribute', attrName: bc.forceAttribute ?? target, expressionEntry: bc.expressionEntry };
    case 'translation':
      return { kind: 'translation', target, isExpression: bc.name === 't.bind' };
    default:
      return { kind: 'command', command: bc, effectiveMode: bc.mode ?? 'toView', targetProperty: target };
  }
}

function buildBindableBinding(
  bindable: BindableGreen,
  resource: CustomElementGreen | CustomAttributeGreen | TemplateControllerGreen,
  command: string | null,
  target: string,
  el: ElementNode,
  ctx: LoweringContext,
  rawValue?: string,
): BindingTarget {
  if (command === null) {
    // No command — check for interpolation first
    if (rawValue && rawValue.includes('${') && ctx.exprParser) {
      const expression = tryParseExpression(rawValue, 'Interpolation', ctx.exprParser) as Interpolation | undefined;
      return { kind: 'interpolation', targetProperty: bindable.property, expression };
    }
    return {
      kind: 'set-property',
      targetProperty: bindable.property,
      value: rawValue ?? '',
    };
  }

  const bc = ctx.vocabulary.commands[command];
  if (!bc) {
    return { kind: 'set-property', targetProperty: bindable.property, value: rawValue ?? '' };
  }

  const effectiveMode = resolveEffectiveMode(command, bindable, el.tagName, target);
  const expression = rawValue && ctx.exprParser
    ? tryParseExpression(rawValue, bc.expressionEntry, ctx.exprParser)
    : undefined;

  return {
    kind: 'bindable',
    resource,
    bindable,
    effectiveMode,
    expressionEntry: bc.expressionEntry,
    expression,
  };
}

function buildTcBinding(
  tc: TemplateControllerGreen,
  command: string | null,
  target: string,
  rawValue: string,
  el: ElementNode,
  ctx: LoweringContext,
): BindingTarget {
  const semantics = tc.semantics;
  if (!semantics) {
    return { kind: 'set-property', targetProperty: 'value', value: rawValue };
  }

  switch (semantics.trigger.kind) {
    case 'iterator': {
      const expression = ctx.exprParser
        ? tryParseExpression(rawValue, 'IsIterator', ctx.exprParser) as ForOfStatement | undefined
        : undefined;
      return {
        kind: 'iterator',
        itemVar: extractIteratorVar(el, target),
        iterableProperty: semantics.trigger.prop,
        expressionEntry: 'IsIterator',
        expression,
      };
    }
    case 'value':
      return buildBindableBinding(
        findBindable(tc, semantics.trigger.prop) ?? defaultBindable(semantics.trigger.prop),
        tc, command, target, el, ctx, rawValue,
      );
    case 'branch':
    case 'marker':
      return { kind: 'set-property', targetProperty: 'value', value: rawValue };
  }
}

function buildCaBinding(
  ca: CustomAttributeGreen,
  command: string | null,
  target: string,
  el: ElementNode,
  ctx: LoweringContext,
  rawValue?: string,
): BindingTarget {
  const defaultProp = ca.defaultProperty.state === 'known'
    ? ca.defaultProperty.value
    : Object.keys(ca.bindables)[0] ?? 'value';
  const bindable = ca.bindables[defaultProp] ?? ca.bindables[Object.keys(ca.bindables)[0] ?? ''];
  if (bindable) {
    return buildBindableBinding(bindable, ca, command, target, el, ctx, rawValue);
  }
  return { kind: 'set-property', targetProperty: defaultProp, value: rawValue ?? '' };
}

function buildPlainBinding(
  command: string | null,
  target: string,
  rawValue: string,
  el: ElementNode,
  ctx: LoweringContext,
): BindingTarget | null {
  if (command !== null) {
    const bc = ctx.vocabulary.commands[command];
    if (bc) {
      const mappedTarget = mapAttrToProperty(el.tagName, target, ctx) ?? camelCase(target);
      const effectiveMode = command === 'bind'
        ? (isTwoWayDefault(el.tagName, target, ctx) ? 'twoWay' : 'toView')
        : (bc.mode ?? 'toView');

      // Parse expression when parser is available
      const expression = ctx.exprParser
        ? tryParseExpression(rawValue, bc.expressionEntry, ctx.exprParser)
        : undefined;

      return {
        kind: 'native-prop',
        tagName: el.tagName,
        property: mappedTarget,
        effectiveMode,
        expressionEntry: bc.expressionEntry,
        expression,
      };
    }
  }

  if (rawValue.includes('${')) {
    const mappedTarget = mapAttrToProperty(el.tagName, target, ctx) ?? camelCase(target);
    const expression = ctx.exprParser
      ? tryParseExpression(rawValue, 'Interpolation', ctx.exprParser) as Interpolation | undefined
      : undefined;
    return { kind: 'interpolation', targetProperty: mappedTarget, expression };
  }

  return null;
}

// =============================================================================
// Mode Resolution (FieldValue-aware)
// =============================================================================

function resolveEffectiveMode(
  command: string,
  bindable: BindableGreen,
  tagName: string,
  target: string,
): BindingMode {
  if (command !== 'bind') {
    return modeFromCommand(command);
  }

  // .bind contextual mode: check bindable's declared mode
  const declaredMode = bindable.mode;
  if (declaredMode.state === 'known') {
    const m = declaredMode.value;
    if (m !== 'default') return m;
  }
  // 'default' or absent/unknown → toView for bindables
  return 'toView';
}

function modeFromCommand(command: string): BindingMode {
  switch (command) {
    case 'one-time': return 'oneTime';
    case 'to-view': return 'toView';
    case 'from-view': return 'fromView';
    case 'two-way': return 'twoWay';
    case 'bind': return 'toView';
    default: return 'default';
  }
}

// =============================================================================
// Scope Frame Construction (config-driven)
// =============================================================================

function buildControllerFrame(
  semantics: ControllerSemanticsGreen,
  el: ElementNode,
  attr: TemplateAttr,
  parentFrame: ScopeFrame,
): ScopeFrame | null {
  if (semantics.scope === 'reuse') return null;

  // overlay → creates a new scope frame
  const locals: LocalBinding[] = [];

  // Iterator: extract item variable + contextuals
  if (semantics.trigger.kind === 'iterator') {
    const itemVar = extractIteratorVar(el, semantics.trigger.prop);
    locals.push({ name: itemVar, source: 'iterator-var' });

    if (semantics.injects?.contextuals) {
      for (const v of semantics.injects.contextuals) {
        locals.push({ name: v, source: 'contextual' });
      }
    }
  }

  // Alias injection (e.g., with → $this, then → then)
  if (semantics.injects?.alias) {
    locals.push({ name: semantics.injects.alias.defaultName, source: 'alias' });
  }

  return {
    kind: semantics.trigger.kind === 'iterator' ? 'iterator' : 'value-overlay',
    locals,
    parent: parentFrame,
    isBoundary: false,
  };
}

function extractLetBindings(el: ElementNode, ctx: LoweringContext): LocalBinding[] {
  const locals: LocalBinding[] = [];
  for (const attr of el.attrs) {
    if (attr.name === 'to-binding-context') continue;
    const syntax = parseAttrSyntax(attr.name, attr.value, ctx);
    locals.push({ name: camelCase(syntax.target), source: 'let-binding' });
  }
  return locals;
}

function extractIteratorVar(el: ElementNode, triggerProp: string): string {
  // Find the for-expression attribute and extract the iterator variable
  for (const attr of el.attrs) {
    if (attr.name.includes('.for') || attr.name.includes(':for')) {
      const match = attr.value.match(/^\s*(\w+)\s+of\s+/);
      if (match) return match[1]!;
    }
  }
  return 'item';
}

// =============================================================================
// Resource Lookup
// =============================================================================

function findElement(name: string, ctx: LoweringContext): CustomElementGreen | null {
  const normalized = name.toLowerCase();
  const direct = ctx.catalog.elements[normalized];
  if (direct) return direct;
  // Alias scan
  for (const ce of Object.values(ctx.catalog.elements)) {
    if (ce.aliases.state === 'known' && ce.aliases.value.includes(normalized)) return ce;
  }
  return null;
}

function findAttribute(name: string, ctx: LoweringContext): CustomAttributeGreen | null {
  const normalized = name.toLowerCase();
  const direct = ctx.catalog.attributes[normalized];
  if (direct) return direct;
  for (const ca of Object.values(ctx.catalog.attributes)) {
    if (ca.aliases.state === 'known' && ca.aliases.value.includes(normalized)) return ca;
  }
  return null;
}

function findController(name: string, ctx: LoweringContext): TemplateControllerGreen | null {
  const normalized = name.toLowerCase();
  return ctx.catalog.controllers[normalized] ?? null;
}

function findBindable(
  resource: { readonly bindables: Readonly<Record<string, BindableGreen>> },
  target: string,
): BindableGreen | null {
  return resource.bindables[camelCase(target)] ?? resource.bindables[target] ?? null;
}

function defaultBindable(prop: string): BindableGreen {
  return {
    property: prop,
    attribute: { state: 'known', value: prop },
    mode: { state: 'known', value: 'default' },
    primary: { state: 'known', value: true },
    type: { state: 'absent' },
  };
}

// =============================================================================
// Attribute Parsing (AP simulation)
// =============================================================================

function parseAttrSyntax(
  name: string,
  value: string,
  ctx: LoweringContext,
): { target: string; command: string | null; mode?: BindingMode | null; parts?: readonly string[] | null } {
  // Use real AttributeParser when available (production path)
  if (ctx.attrParser) {
    const result = ctx.attrParser.parse(name, value);
    return { target: result.target, command: result.command, mode: result.mode, parts: result.parts };
  }

  // Fallback: built-in AP simulation (test path)
  let best: { target: string; command: string | null; score: number } | null = null;

  for (const pattern of ctx.vocabulary.patterns) {
    const result = matchPattern(name, pattern);
    if (result && (best === null || result.score > best.score)) {
      best = result;
    }
  }

  return best ?? { target: name, command: null };
}

function matchPattern(
  name: string,
  pattern: AttributePatternGreen,
): { target: string; command: string | null; score: number } | null {
  const pat = pattern.pattern;

  // Exact literal match (no PART)
  if (!pat.includes('PART')) {
    if (name !== pat) return null;
    return interpretFixed(pattern.interpret, name, 1000);
  }

  // Build regex from pattern
  const symbols = pattern.symbols;
  const partMatch = symbols ? `[^${escapeRegex(symbols)}]+` : '.+';
  const segments = pat.split('PART');
  let regexStr = '^';
  let partCount = 0;

  for (let i = 0; i < segments.length; i++) {
    if (i > 0) { regexStr += `(${partMatch})`; partCount++; }
    if (segments[i]) regexStr += escapeRegex(segments[i]!);
  }
  regexStr += '$';

  const match = name.match(new RegExp(regexStr));
  if (!match) return null;

  const parts: string[] = [];
  for (let i = 1; i <= partCount; i++) parts.push(match[i]!);

  let statics = 0;
  for (const seg of segments) if (seg) statics++;
  const score = statics * 100 + partCount * 10;

  return interpretDynamic(pattern.interpret, parts, score);
}

function interpretFixed(
  interpret: PatternInterpret,
  name: string,
  score: number,
): { target: string; command: string | null; score: number } {
  switch (interpret.kind) {
    case 'fixed': return { target: interpret.target, command: interpret.command, score };
    case 'fixed-command': return { target: name, command: interpret.command, score };
    default: return { target: name, command: null, score };
  }
}

function interpretDynamic(
  interpret: PatternInterpret,
  parts: string[],
  score: number,
): { target: string; command: string | null; score: number } {
  switch (interpret.kind) {
    case 'target-command':
      if (parts.length === 2) return { target: parts[0]!, command: parts[1]!, score };
      if (parts.length === 3) return { target: `${parts[0]}.${parts[1]}`, command: parts[2]!, score };
      return { target: parts[0]!, command: null, score };
    case 'fixed-command':
      return { target: parts[0]!, command: interpret.command, score };
    case 'mapped-fixed-command': {
      const raw = parts[0]!;
      const target = interpret.targetMap?.[raw] ?? raw;
      return { target, command: interpret.command, score };
    }
    case 'event-modifier':
      return { target: parts[0]!, command: interpret.command, score };
    case 'passthrough':
      return { target: interpret.target, command: interpret.command, score };
    default:
      return { target: parts[0] ?? '', command: null, score };
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// DOM Helpers
// =============================================================================

const HTML_ELEMENTS = new Set([
  'html', 'head', 'title', 'base', 'link', 'meta', 'style', 'body',
  'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'main', 'nav', 'section', 'hgroup', 'search',
  'blockquote', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'hr',
  'li', 'menu', 'ol', 'p', 'pre', 'ul',
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data',
  'dfn', 'em', 'i', 'kbd', 'mark', 'q', 'rp', 'rt', 'ruby', 's',
  'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u',
  'var', 'wbr',
  'area', 'audio', 'img', 'map', 'track', 'video',
  'embed', 'iframe', 'object', 'picture', 'portal', 'source',
  'svg', 'math',
  'canvas', 'noscript', 'script',
  'del', 'ins',
  'caption', 'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr',
  'button', 'datalist', 'fieldset', 'form', 'input', 'label', 'legend',
  'meter', 'optgroup', 'option', 'output', 'progress', 'select',
  'textarea',
  'details', 'dialog', 'summary',
  'slot', 'template',
]);

const SVG_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'symbol', 'use', 'image',
  'circle', 'ellipse', 'line', 'polygon', 'polyline', 'rect', 'path',
  'text', 'tspan', 'textPath',
  'clipPath', 'mask', 'pattern',
  'linearGradient', 'radialGradient', 'stop',
  'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer',
  'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
  'feDisplacementMap', 'feDropShadow', 'feFlood',
  'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'feSpecularLighting',
  'feTile', 'feTurbulence',
  'animate', 'animateMotion', 'animateTransform', 'set',
  'foreignObject', 'a', 'title', 'desc', 'metadata', 'marker', 'switch',
]);

function isKnownElement(tag: string, ns: Namespace, ctx?: LoweringContext): boolean {
  if (ctx?.dom) {
    if (ns === 'html') return tag in ctx.dom.elements || tag === ctx.dom.base.tag;
    // SVG elements are in a separate schema merged at construction
    return tag in ctx.dom.elements;
  }
  if (ns === 'html') return HTML_ELEMENTS.has(tag);
  if (ns === 'svg') return SVG_ELEMENTS.has(tag);
  return false;
}

function isTwoWayDefault(tagName: string, target: string, ctx?: LoweringContext): boolean {
  if (ctx?.twoWayDefaults) {
    const td = ctx.twoWayDefaults;
    const byTag = td.byTag[tagName.toLowerCase()];
    if (byTag?.includes(target)) return true;
    if (td.globalProps.includes(target)) return true;
    if (td.conditional) {
      for (const c of td.conditional) {
        if (c.prop === target) return true; // simplified — full check needs attr presence
      }
    }
    return false;
  }
  // Fallback: inline heuristic
  const tag = tagName.toLowerCase();
  if (tag === 'input' && (target === 'value' || target === 'checked' || target === 'files')) return true;
  if (tag === 'textarea' && target === 'value') return true;
  if (tag === 'select' && target === 'value') return true;
  if (target === 'textContent' || target === 'innerHTML') return true;
  if (target === 'scrollTop' || target === 'scrollLeft') return true;
  return false;
}

function mapAttrToProperty(tagName: string, attrName: string, ctx?: LoweringContext): string | null {
  if (ctx?.naming) {
    const perTag = ctx.naming.perTag?.[tagName.toLowerCase()]?.[attrName.toLowerCase()];
    if (perTag) return perTag;
    const global = ctx.naming.attrToPropGlobal[attrName.toLowerCase()];
    if (global) return global;
  }
  if (ctx?.dom) {
    const el = ctx.dom.elements[tagName.toLowerCase()];
    const mapped = el?.attrToProp?.[attrName.toLowerCase()];
    if (mapped) return mapped;
    const baseMapped = ctx.dom.base.attrToProp?.[attrName.toLowerCase()];
    if (baseMapped) return baseMapped;
  }
  // Fallback: inline mapping
  switch (attrName) {
    case 'class': return 'className';
    case 'for': return 'htmlFor';
    case 'tabindex': return 'tabIndex';
    case 'readonly': return 'readOnly';
    case 'maxlength': return 'maxLength';
    case 'minlength': return 'minLength';
    case 'formaction': return 'formAction';
    case 'formenctype': return 'formEnctype';
    case 'formmethod': return 'formMethod';
    case 'formnovalidate': return 'formNoValidate';
    case 'formtarget': return 'formTarget';
    case 'innerhtml': return 'innerHTML';
    case 'textcontent': return 'textContent';
    default: return null;
  }
}

function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

// =============================================================================
// Expression Parsing
// =============================================================================

/**
 * Try to parse an expression string using the expression parser.
 * Returns undefined on failure (graceful degradation for IDE mode).
 */
function tryParseExpression(
  value: string,
  entry: ExpressionEntry,
  parser: IExpressionParser,
): AnyBindingExpression | undefined {
  try {
    return parser.parse(value, entry as ExpressionType);
  } catch {
    return undefined;
  }
}

// =============================================================================
// Multi-Binding Parsing
// =============================================================================

const Char_Backslash = 0x5C;
const Char_Colon = 0x3A;
const Char_Semicolon = 0x3B;
const Char_Dollar = 0x24;
const Char_OpenBrace = 0x7B;
const Char_Space = 0x20;

/**
 * Detect multi-binding syntax: "prop1: val; prop2.bind: expr"
 * Returns true if a colon is found before any interpolation marker.
 */
function hasMultiBindingSyntax(value: string): boolean {
  const len = value.length;
  for (let i = 0; i < len; i++) {
    const ch = value.charCodeAt(i);
    if (ch === Char_Backslash) { i++; }
    else if (ch === Char_Colon) { return true; }
    else if (ch === Char_Dollar && value.charCodeAt(i + 1) === Char_OpenBrace) { return false; }
  }
  return false;
}

/**
 * Parse multi-binding syntax into per-bindable binding targets.
 * "prop1: val1; prop2.bind: expr" → one BindingTarget per property.
 */
function parseMultiBindings(
  rawValue: string,
  ca: CustomAttributeGreen,
  el: ElementNode,
  ctx: LoweringContext,
): BindingTarget[] {
  const targets: BindingTarget[] = [];
  const len = rawValue.length;
  let start = 0;

  for (let i = 0; i < len; i++) {
    const ch = rawValue.charCodeAt(i);
    if (ch === Char_Backslash) { i++; continue; }
    if (ch !== Char_Colon) continue;

    const propPart = rawValue.slice(start, i).trim();
    while (++i < len && rawValue.charCodeAt(i) <= Char_Space);
    const valueStart = i;

    for (; i < len; i++) {
      const ch2 = rawValue.charCodeAt(i);
      if (ch2 === Char_Backslash) { i++; }
      else if (ch2 === Char_Semicolon) { break; }
    }

    const valuePart = rawValue.slice(valueStart, i).trim();
    const syntax = parseAttrSyntax(propPart, valuePart, ctx);
    const bindableName = camelCase(syntax.target);
    const bindable = ca.bindables[bindableName];

    if (bindable) {
      targets.push(buildBindableBinding(
        bindable, ca, syntax.command, syntax.target, el, ctx,
      ));
    }

    while (i < len && rawValue.charCodeAt(i + 1) <= Char_Space) i++;
    start = i + 1;
  }

  return targets;
}

/**
 * Check if a CA should use multi-binding and build accordingly.
 */
function buildCaBindingWithMulti(
  ca: CustomAttributeGreen,
  command: string | null,
  target: string,
  rawValue: string,
  el: ElementNode,
  ctx: LoweringContext,
): BindingTarget {
  // Multi-binding: no noMultiBindings, no command, colon before interpolation
  const allowMulti = ca.noMultiBindings.state !== 'known' || !ca.noMultiBindings.value;
  if (allowMulti && command === null && hasMultiBindingSyntax(rawValue)) {
    const bindings = parseMultiBindings(rawValue, ca, el, ctx);
    if (bindings.length > 0) {
      return { kind: 'multi-binding', resource: ca, bindings };
    }
  }

  return buildCaBinding(ca, command, target, el, ctx, rawValue);
}
