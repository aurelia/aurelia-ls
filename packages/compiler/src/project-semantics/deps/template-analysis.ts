/**
 * Template Analysis — Classification, Resolution, Binding
 *
 * The consumption tier: sits on top of scope-visibility (tier 4) and
 * vocabulary (tier 5), consuming resource conclusions (tier 3) to
 * produce per-element, per-attribute semantic analysis.
 *
 * Currently a standalone evaluation function called from the test
 * harness. Wiring as graph nodes is a tier 7 concern.
 *
 * Core algorithm: 8-step attribute classification (deterministic total
 * function). Every attribute is classified into exactly one category.
 * Classification never fails, never gaps, but can silently misclassify
 * when upstream inputs are incomplete (NL-1).
 */

import {
  parseTemplate,
  type TemplateTree,
  type TemplateNode,
  type ElementNode,
  type TextNode,
  type TemplateAttr,
  type Namespace,
  type Span,
} from './template-parser.js';
import type { VocabularyGreen, BindingCommandEntry, AttributePatternEntry } from './vocabulary.js';
import type { ScopeVisibilityGreen, ScopeCompleteness } from './scope-visibility.js';
import type { ProjectDepGraph } from './types.js';
import { conclusionNodeId } from './types.js';

// =============================================================================
// Public Types — Template Analysis Output
// =============================================================================

export interface TemplateAnalysisResult {
  /** Per-element analysis results (depth-first order) */
  readonly elements: readonly ElementAnalysis[];
  /** Per-text-node binding results */
  readonly textBindings: readonly TextBindingAnalysis[];
  /** The CE whose template was analyzed */
  readonly scopeOwner: string;
}

export interface ElementAnalysis {
  readonly tagName: string;
  readonly namespace: Namespace;
  /** Element resolution result */
  readonly resolution: ElementResolution;
  /** Per-attribute classification and binding */
  readonly attributes: readonly AttributeAnalysis[];
  /** Source span of the element */
  readonly sourceSpan: Span;
}

export type ElementResolution =
  | { readonly kind: 'custom-element'; readonly resourceKey: string; readonly via: 'tag-name' | 'as-element' | 'alias' }
  | { readonly kind: 'plain-html' }
  | { readonly kind: 'not-found'; readonly grounded: boolean; readonly tagName: string };

export interface AttributeAnalysis {
  readonly rawName: string;
  readonly rawValue: string;
  /** AP parse result (null if no AP matched) */
  readonly syntax: AttrSyntax | null;
  /** Classification result */
  readonly classification: Classification;
  /** Binding info (populated for steps that produce instructions) */
  readonly binding: BindingInfo | null;
}

export interface AttrSyntax {
  readonly target: string;
  readonly command: string | null;
}

export interface Classification {
  readonly step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  readonly category: ClassificationCategory;
  /** For misclassification tracking: what step SHOULD have caught this */
  readonly expectedStep?: number;
  /** Upstream gap that caused misclassification */
  readonly upstreamGap?: string;
}

export type ClassificationCategory =
  | 'special-attribute'
  | 'captured-attribute'
  | 'spread-transferred'
  | 'override-bc'
  | 'spread-value'
  | 'ce-bindable'
  | 'custom-attribute'
  | 'template-controller'
  | 'plain-attribute';

export interface BindingInfo {
  readonly instructionType: string;
  readonly mode: BindingMode | null;
  readonly targetProperty: string | null;
  readonly expressionEntry: string | null;
}

export type BindingMode = 'oneTime' | 'toView' | 'fromView' | 'twoWay' | 'default';

export interface TextBindingAnalysis {
  readonly content: string;
  readonly hasInterpolation: boolean;
  readonly sourceSpan: Span;
}

// =============================================================================
// Attribute Pattern Simulation
// =============================================================================

/**
 * Simulates the subject's IAttributeParser behavior.
 * Matches attribute names against the vocabulary's registered patterns.
 * Returns { target, command } — the sole arbiter of binding syntax.
 *
 * IMPORTANT: This is the ONLY place where attribute names are decomposed
 * into target and command. No splitting on dots elsewhere.
 */
function parseAttrSyntax(
  name: string,
  patterns: readonly AttributePatternEntry[],
): AttrSyntax {
  // Try each pattern in order. The AP with the best match wins.
  // For simplicity, we implement the core patterns directly rather
  // than building a full SyntaxInterpreter. This covers the standard
  // patterns and plugin patterns.
  let bestMatch: { target: string; command: string | null; score: number } | null = null;

  for (const pattern of patterns) {
    const result = tryMatchPattern(name, pattern);
    if (result !== null) {
      if (bestMatch === null || result.score > bestMatch.score) {
        bestMatch = result;
      }
    }
  }

  if (bestMatch) {
    return { target: bestMatch.target, command: bestMatch.command };
  }

  // No pattern matched — bare attribute
  return { target: name, command: null };
}

interface PatternMatch {
  target: string;
  command: string | null;
  score: number;
}

function tryMatchPattern(
  name: string,
  pattern: AttributePatternEntry,
): PatternMatch | null {
  for (const pat of pattern.patterns) {
    const result = matchSinglePattern(name, pat, pattern.symbols);
    if (result !== null) return result;
  }
  return null;
}

/**
 * Match an attribute name against a single pattern string.
 *
 * The approach: build a regex from the pattern where PART matches
 * one or more non-symbol characters, and literal segments match exactly.
 * Symbol characters in the pattern match themselves literally.
 *
 * Score: statics > dynamics > symbols (per the subject's isBetterScore)
 */
function matchSinglePattern(
  name: string,
  pattern: string,
  symbols: string,
): PatternMatch | null {
  // Fast path for exact literal patterns (no PART)
  if (!pattern.includes('PART')) {
    if (name === pattern) {
      return { target: '', command: pattern, score: 1000 };
    }
    return null;
  }

  // Build a regex from the pattern:
  // - PART → capture group matching one or more non-symbol chars
  // - Literal text → escaped literal match
  // - Symbol chars → literal match
  const symbolSet = symbols ? `[${escapeRegex(symbols)}]` : '';
  const partMatch = symbols ? `[^${escapeRegex(symbols)}]+` : '.+';

  // Split pattern on PART boundaries
  const segments = pattern.split('PART');
  let regexStr = '^';
  let partCount = 0;

  for (let i = 0; i < segments.length; i++) {
    if (i > 0) {
      // Insert capture group for PART
      regexStr += `(${partMatch})`;
      partCount++;
    }
    // Escape the literal segment
    if (segments[i]!) {
      regexStr += escapeRegex(segments[i]!);
    }
  }
  regexStr += '$';

  const regex = new RegExp(regexStr);
  const match = name.match(regex);
  if (!match) return null;

  // Extract matched parts
  const resolvedParts: string[] = [];
  for (let i = 1; i <= partCount; i++) {
    resolvedParts.push(match[i]!);
  }

  // Count statics and dynamics for scoring
  let statics = 0;
  let dynamics = partCount;
  for (const seg of segments) {
    if (seg) statics++;
  }

  // Derive target and command from resolved parts based on pattern shape
  let target: string;
  let command: string | null;

  if (pattern === 'PART.PART') {
    target = resolvedParts[0]!;
    command = resolvedParts[1]!;
  } else if (pattern === 'PART.PART.PART') {
    target = resolvedParts[0]! + '.' + resolvedParts[1]!;
    command = resolvedParts[2]!;
  } else if (pattern === ':PART') {
    target = resolvedParts[0]!;
    command = 'bind';
  } else if (pattern === '@PART') {
    target = resolvedParts[0]!;
    command = 'trigger';
  } else if (pattern === '@PART:PART') {
    target = resolvedParts[0]!;
    command = resolvedParts[1]!;
  } else if (pattern === 'PART.trigger:PART') {
    target = resolvedParts[0]!;
    command = 'trigger';
  } else if (pattern === 'PART.capture:PART') {
    target = resolvedParts[0]!;
    command = 'capture';
  } else if (pattern === 'PART.ref') {
    target = resolvedParts[0]!;
    command = 'ref';
  } else if (pattern === 'ref') {
    target = 'element';
    command = 'ref';
  } else if (pattern === 'PART.state:PART') {
    target = resolvedParts[0]!;
    command = 'state';
  } else if (pattern === 'PART.dispatch:PART') {
    target = resolvedParts[0]!;
    command = 'dispatch';
  } else {
    target = resolvedParts[0] ?? name;
    command = resolvedParts.length > 1 ? resolvedParts[resolvedParts.length - 1]! : null;
  }

  const score = statics * 100 + dynamics * 10;
  return { target, command, score };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// DOM Schema — Product Postulates for HTML/SVG/ARIA Recognition
// =============================================================================

/**
 * Known HTML elements. These are NOT "unknown custom elements" — they
 * are standard HTML. The product must not flag them.
 */
const HTML_ELEMENTS = new Set([
  // Main root
  'html',
  // Document metadata
  'head', 'title', 'base', 'link', 'meta', 'style',
  // Sectioning root
  'body',
  // Content sectioning
  'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'main', 'nav', 'section', 'hgroup', 'search',
  // Text content
  'blockquote', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'hr',
  'li', 'menu', 'ol', 'p', 'pre', 'ul',
  // Inline text semantics
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data',
  'dfn', 'em', 'i', 'kbd', 'mark', 'q', 'rp', 'rt', 'ruby', 's',
  'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u',
  'var', 'wbr',
  // Image and multimedia
  'area', 'audio', 'img', 'map', 'track', 'video',
  // Embedded content
  'embed', 'iframe', 'object', 'picture', 'portal', 'source',
  // SVG and MathML (entry points handled by namespace switching)
  'svg', 'math',
  // Scripting
  'canvas', 'noscript', 'script',
  // Demarcating edits
  'del', 'ins',
  // Table content
  'caption', 'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr',
  // Forms
  'button', 'datalist', 'fieldset', 'form', 'input', 'label', 'legend',
  'meter', 'optgroup', 'option', 'output', 'progress', 'select',
  'textarea',
  // Interactive elements
  'details', 'dialog', 'summary',
  // Web Components
  'slot', 'template',
]);

/**
 * Known SVG elements.
 */
const SVG_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'symbol', 'use', 'image',
  'circle', 'ellipse', 'line', 'polygon', 'polyline', 'rect', 'path',
  'text', 'tspan', 'textPath',
  'clipPath', 'mask', 'pattern',
  'linearGradient', 'radialGradient', 'stop',
  'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer',
  'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
  'feDisplacementMap', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB',
  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge',
  'feMergeNode', 'feMorphology', 'feOffset', 'feSpecularLighting',
  'feTile', 'feTurbulence',
  'animate', 'animateMotion', 'animateTransform', 'set',
  'foreignObject',
  'a', 'title', 'desc', 'metadata',
  'marker', 'switch',
]);

/**
 * isTwoWay mapping: (element, property) → boolean.
 * Form elements where .bind defaults to twoWay mode.
 * Product knowledge from the runtime's AttributeMapper.
 */
function isTwoWay(tagName: string, target: string): boolean {
  const tag = tagName.toLowerCase();
  if (tag === 'input' && (target === 'value' || target === 'checked' || target === 'files')) return true;
  if (tag === 'textarea' && target === 'value') return true;
  if (tag === 'select' && target === 'value') return true;
  // contenteditable elements
  if (target === 'textContent' || target === 'innerHTML') return true;
  // Scrolling
  if (target === 'scrollTop' || target === 'scrollLeft') return true;
  return false;
}

/**
 * attrMapper.map() — maps HTML attribute names to DOM property names.
 * Product knowledge from the runtime's AttributeMapper.
 */
function mapAttrToProperty(tagName: string, attrName: string): string | null {
  // Standard attribute-to-property mappings
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

/** camelCase fallback when attrMapper.map() returns null */
function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Is this a known HTML element (not a custom element candidate)?
 */
function isKnownHtmlElement(tagName: string): boolean {
  return HTML_ELEMENTS.has(tagName.toLowerCase());
}

/**
 * Is this a known SVG element?
 */
function isKnownSvgElement(tagName: string): boolean {
  // SVG elements are case-sensitive in the spec, but the parser
  // lowercases them. Check against lowercased versions.
  return SVG_ELEMENTS.has(tagName) || SVG_ELEMENTS.has(tagName.toLowerCase());
}

/**
 * Is this a potential custom element (hyphenated tag name)?
 */
function isPotentialCustomElement(tagName: string): boolean {
  return tagName.includes('-');
}

/**
 * Does this attribute have Aurelia binding syntax?
 * Used for the intent precondition (F9/T1920): hyphenated elements
 * with no binding syntax get low confidence for "unknown element".
 */
function hasAureliaBindingSyntax(attrs: readonly TemplateAttr[]): boolean {
  for (const attr of attrs) {
    if (attr.name.includes('.') || attr.name.startsWith(':') || attr.name.startsWith('@')) {
      return true;
    }
    if (attr.value.includes('${')) {
      return true;
    }
  }
  return false;
}

// =============================================================================
// Special Attributes
// =============================================================================

const SPECIAL_ATTRIBUTES = new Set(['as-element', 'containerless']);

// =============================================================================
// 8-Step Classification Algorithm
// =============================================================================

interface ClassificationContext {
  /** The resolved CE definition for this element (null for plain HTML) */
  ceDefinition: CeDefinition | null;
  /** Vocabulary registry (tier 5) */
  vocabulary: VocabularyGreen;
  /** Scope-visibility for this template's scope */
  scopeVisibility: ScopeVisibilityGreen;
  /** Namespace of this element */
  namespace: Namespace;
  /** Tag name of this element */
  tagName: string;
  /** Graph for pulling conclusion values */
  graph: ProjectDepGraph;
}

interface CeDefinition {
  resourceKey: string;
  bindables: Map<string, BindableInfo>;
  capture: boolean;
  aliases: string[];
  hasGappedBindables: boolean;
}

interface BindableInfo {
  property: string;
  mode: number; // 0=default, 1=oneTime, 2=toView, 4=fromView, 6=twoWay
}

function classifyAttribute(
  attr: TemplateAttr,
  syntax: AttrSyntax,
  ctx: ClassificationContext,
): { classification: Classification; binding: BindingInfo | null } {
  const { target, command } = syntax;

  // Step 1: Special attributes
  if (SPECIAL_ATTRIBUTES.has(attr.name)) {
    return {
      classification: { step: 1, category: 'special-attribute' },
      binding: null,
    };
  }

  // Step 2: Captured attributes (CE with capture: true)
  if (ctx.ceDefinition?.capture) {
    // au-slot is excluded from capture
    if (attr.name !== 'au-slot') {
      return {
        classification: { step: 2, category: 'captured-attribute' },
        binding: null,
      };
    }
  }

  // Step 3: Spread transferred (..attrs)
  if (attr.name === '...$attrs') {
    return {
      classification: { step: 3, category: 'spread-transferred' },
      binding: null,
    };
  }

  // Step 4: Override binding commands (ignoreAttr: true)
  if (command !== null) {
    const bcEntry = ctx.vocabulary.commands.get(command);
    if (bcEntry && bcEntry.ignoreAttr) {
      return {
        classification: { step: 4, category: 'override-bc' },
        binding: buildBcBinding(bcEntry, target, null, ctx),
      };
    }
  }

  // Step 5: Spread value (..bindables)
  if (attr.name === '...$bindables') {
    return {
      classification: { step: 5, category: 'spread-value' },
      binding: null,
    };
  }

  // Step 6: CE bindable properties
  if (ctx.ceDefinition) {
    const bindable = ctx.ceDefinition.bindables.get(target);
    if (bindable) {
      const binding = buildBindableBinding(command, bindable, target, ctx);
      return {
        classification: { step: 6, category: 'ce-bindable' },
        binding,
      };
    }
  }

  // Step 7: Custom attributes and template controllers
  // LE-30: In non-HTML namespaces, only attributes with explicit
  // binding syntax (AP-parsed command) trigger CA lookup
  const shouldCheckCa = ctx.namespace === 'html' || command !== null;

  if (shouldCheckCa) {
    const caResource = findCustomAttribute(target, ctx);
    if (caResource) {
      const category = caResource.isTemplateController ? 'template-controller' : 'custom-attribute';
      return {
        classification: { step: 7, category },
        binding: { instructionType: caResource.isTemplateController ? 'HydrateTemplateController' : 'HydrateAttribute', mode: null, targetProperty: null, expressionEntry: null },
      };
    }
  }

  // Step 8: Plain attribute (fallback)
  const binding = buildPlainAttrBinding(command, target, attr.value, ctx);
  return {
    classification: { step: 8, category: 'plain-attribute' },
    binding,
  };
}

// =============================================================================
// Binding Construction Helpers
// =============================================================================

function buildBcBinding(
  bc: BindingCommandEntry,
  target: string,
  bindable: BindableInfo | null,
  ctx: ClassificationContext,
): BindingInfo {
  return {
    instructionType: bc.outputInstruction,
    mode: bc.name === 'trigger' || bc.name === 'capture' ? null : 'toView',
    targetProperty: target,
    expressionEntry: bc.expressionEntry,
  };
}

function buildBindableBinding(
  command: string | null,
  bindable: BindableInfo,
  target: string,
  ctx: ClassificationContext,
): BindingInfo {
  if (command === null) {
    // No BC — check for interpolation or set-property
    return {
      instructionType: 'SetProperty',
      mode: null,
      targetProperty: bindable.property,
      expressionEntry: null,
    };
  }

  const bc = ctx.vocabulary.commands.get(command);
  if (!bc) {
    // Unknown command on a bindable — treat as set-property
    return {
      instructionType: 'SetProperty',
      mode: null,
      targetProperty: bindable.property,
      expressionEntry: null,
    };
  }

  // `bind` command contextual mode: use bindable's declared mode
  if (command === 'bind') {
    const mode = resolveBindMode(bindable, ctx.tagName, target);
    return {
      instructionType: 'PropertyBinding',
      mode,
      targetProperty: bindable.property,
      expressionEntry: 'IsProperty',
    };
  }

  return {
    instructionType: bc.outputInstruction,
    mode: modeFromBcName(command),
    targetProperty: bindable.property,
    expressionEntry: bc.expressionEntry,
  };
}

function buildPlainAttrBinding(
  command: string | null,
  target: string,
  rawValue: string,
  ctx: ClassificationContext,
): BindingInfo | null {
  if (command !== null) {
    // Sub-path 8b: BC present on plain element
    const bc = ctx.vocabulary.commands.get(command);
    if (bc) {
      const mappedTarget = mapAttrToProperty(ctx.tagName, target) ?? camelCase(target);
      let mode: BindingMode | null = null;

      if (command === 'bind') {
        // Plain element path: use isTwoWay heuristic
        mode = isTwoWay(ctx.tagName, target) ? 'twoWay' : 'toView';
      } else {
        mode = modeFromBcName(command);
      }

      return {
        instructionType: bc.outputInstruction,
        mode,
        targetProperty: mappedTarget,
        expressionEntry: bc.expressionEntry,
      };
    }
  }

  // Sub-path 8c: Check for interpolation in value
  if (rawValue.includes('${')) {
    const mappedTarget = mapAttrToProperty(ctx.tagName, target) ?? camelCase(target);
    return {
      instructionType: 'InterpolationInstruction',
      mode: null,
      targetProperty: mappedTarget,
      expressionEntry: 'Interpolation',
    };
  }

  // Sub-path 8a: No BC, no interpolation — truly plain
  return null;
}

function resolveBindMode(
  bindable: BindableInfo,
  tagName: string,
  target: string,
): BindingMode {
  // If bindable has a declared mode (not 0/default), use it
  if (bindable.mode === 6) return 'twoWay';
  if (bindable.mode === 4) return 'fromView';
  if (bindable.mode === 2) return 'toView';
  if (bindable.mode === 1) return 'oneTime';

  // Mode 0 (default) or unspecified: fall back to toView
  return 'toView';
}

function modeFromBcName(command: string): BindingMode | null {
  switch (command) {
    case 'one-time': return 'oneTime';
    case 'to-view': return 'toView';
    case 'from-view': return 'fromView';
    case 'two-way': return 'twoWay';
    case 'bind': return 'toView'; // default for bind without bindable context
    case 'trigger': return null;
    case 'capture': return null;
    default: return null;
  }
}

// =============================================================================
// Resource Lookup Helpers
// =============================================================================

function findCustomAttribute(
  name: string,
  ctx: ClassificationContext,
): { resourceKey: string; isTemplateController: boolean } | null {
  const entry = ctx.scopeVisibility.visible.get(name);
  if (!entry) return null;

  // Check if it's a CA or TC
  if (entry.resourceKey.startsWith('custom-attribute:')) {
    return { resourceKey: entry.resourceKey, isTemplateController: false };
  }
  if (entry.resourceKey.startsWith('template-controller:')) {
    return { resourceKey: entry.resourceKey, isTemplateController: true };
  }

  return null;
}

function resolveElement(
  el: ElementNode,
  ctx: ClassificationContext,
): ElementResolution {
  const tagName = el.tagName.toLowerCase();

  // Check for as-element override
  const asElementAttr = el.attrs.find(a => a.name === 'as-element');
  if (asElementAttr) {
    const overrideName = asElementAttr.value;
    const entry = ctx.scopeVisibility.visible.get(overrideName);
    if (entry && entry.resourceKey.startsWith('custom-element:')) {
      return { kind: 'custom-element', resourceKey: entry.resourceKey, via: 'as-element' };
    }
    // as-element target not found — fall through to normal resolution
  }

  // Check scope-visibility for this tag name as a CE
  const entry = ctx.scopeVisibility.visible.get(tagName);
  if (entry && entry.resourceKey.startsWith('custom-element:')) {
    // Determine if resolution was via primary name or alias
    const primaryName = entry.resourceKey.slice('custom-element:'.length);
    const via = primaryName === tagName ? 'tag-name' : 'alias';
    return { kind: 'custom-element', resourceKey: entry.resourceKey, via };
  }

  // Known HTML element — not a CE, not "unknown"
  if (el.namespace === 'html' && isKnownHtmlElement(tagName)) {
    return { kind: 'plain-html' };
  }

  // Known SVG element
  if (el.namespace === 'svg' && isKnownSvgElement(tagName)) {
    return { kind: 'plain-html' };
  }

  // Hyphenated tag not found in resource catalog → not-found.
  // The grounded flag tells the diagnostic engine whether the negative
  // assertion is safe (scope complete) or needs demotion (scope incomplete).
  // The intent precondition (no binding syntax → low confidence) is a
  // diagnostic-level concern, not a classification concern.
  if (isPotentialCustomElement(tagName)) {
    const grounded = ctx.scopeVisibility.completeness.state === 'complete';
    return { kind: 'not-found', grounded, tagName };
  }

  // Non-hyphenated, unknown — just plain HTML (browser custom elements
  // require a hyphen per spec, so non-hyphenated is never a CE candidate)
  return { kind: 'plain-html' };
}

// =============================================================================
// CE Definition Resolution
// =============================================================================

function resolveCeDefinition(
  resourceKey: string,
  graph: ProjectDepGraph,
): CeDefinition | null {
  const kind = pullConclusionVal(graph, resourceKey, 'kind');
  if (kind !== 'custom-element') return null;

  // Gather bindables by scanning conclusion nodes.
  // Bindables are emitted as per-field observations:
  //   bindable:propName:property, bindable:propName:mode, etc.
  // We scan conclusion node IDs for the bindable: prefix.
  const bindables = new Map<string, BindableInfo>();
  let hasGappedBindables = false;

  const conclusionPrefix = `conclusion:${resourceKey}::bindable:`;
  const conclusionNodes = graph.nodesByPrefix(conclusionPrefix);
  const bindableNames = new Set<string>();

  for (const nodeId of conclusionNodes) {
    // nodeId format: conclusion:custom-element:my-widget::bindable:label:property
    const afterPrefix = nodeId.slice(conclusionPrefix.length);
    const colonIdx = afterPrefix.indexOf(':');
    if (colonIdx > 0) {
      bindableNames.add(afterPrefix.slice(0, colonIdx));
    }
  }

  for (const propName of bindableNames) {
    const property = pullConclusionVal(graph, resourceKey, `bindable:${propName}:property`);
    const modeVal = pullConclusionVal(graph, resourceKey, `bindable:${propName}:mode`);
    // Mode is stored as a string ('twoWay', 'fromView', etc.) by the interpreter
    const mode = typeof modeVal === 'string' ? bindingModeStringToNumber(modeVal)
               : typeof modeVal === 'number' ? modeVal
               : 2; // default toView
    bindables.set(propName, {
      property: typeof property === 'string' ? property : propName,
      mode,
    });
  }

  // Check for bindable list gaps (opaque bindable declarations)
  const bindablesCompleteness = pullConclusionVal(graph, resourceKey, 'bindables:completeness');
  if (bindablesCompleteness !== undefined) {
    hasGappedBindables = true;
  }

  // Capture flag
  const capture = pullConclusionVal(graph, resourceKey, 'capture') === true;

  // Aliases
  const aliasesVal = pullConclusionVal(graph, resourceKey, 'aliases');
  const aliases = Array.isArray(aliasesVal) ? aliasesVal.filter((a): a is string => typeof a === 'string') : [];

  return { resourceKey, bindables, capture, aliases, hasGappedBindables };
}

function bindingModeStringToNumber(mode: string): number {
  switch (mode) {
    case 'default': return 0;
    case 'oneTime': return 1;
    case 'toView': return 2;
    case 'fromView': return 4;
    case 'twoWay': return 6;
    default: return 2; // fall back to toView
  }
}

function pullConclusionVal(
  graph: ProjectDepGraph,
  resourceKey: string,
  fieldPath: string,
): unknown {
  const concId = conclusionNodeId(resourceKey, fieldPath);
  const sourced = graph.evaluation.pull<unknown>(concId);
  if (!sourced) return undefined;
  if (sourced.origin === 'source') {
    return sourced.state === 'known' ? sourced.value : undefined;
  }
  return sourced.value;
}

// =============================================================================
// Main Evaluation Entry Point
// =============================================================================

/**
 * Evaluate template analysis for a specific CE's template.
 *
 * Consumes:
 * - The template HTML string (from the CE's inline template observation)
 * - Vocabulary registry (tier 5)
 * - Scope-visibility data for this CE's scope (tier 4)
 * - Resource conclusions (tier 3) via the graph
 *
 * Produces per-element classification, resolution, and binding info.
 */
export function evaluateTemplateAnalysis(
  templateHtml: string,
  scopeOwner: string,
  vocabulary: VocabularyGreen,
  scopeVisibility: ScopeVisibilityGreen,
  graph: ProjectDepGraph,
): TemplateAnalysisResult {
  const tree = parseTemplate(templateHtml);
  const elements: ElementAnalysis[] = [];
  const textBindings: TextBindingAnalysis[] = [];

  walkTree(tree.children, vocabulary, scopeVisibility, graph, elements, textBindings);

  return { elements, textBindings, scopeOwner };
}

function walkTree(
  nodes: readonly TemplateNode[],
  vocabulary: VocabularyGreen,
  scopeVisibility: ScopeVisibilityGreen,
  graph: ProjectDepGraph,
  elements: ElementAnalysis[],
  textBindings: TextBindingAnalysis[],
): void {
  for (const node of nodes) {
    if (node.kind === 'text') {
      const hasInterpolation = node.content.includes('${');
      if (hasInterpolation) {
        textBindings.push({
          content: node.content,
          hasInterpolation: true,
          sourceSpan: node.sourceSpan,
        });
      }
      continue;
    }

    if (node.kind === 'element') {
      const elementAnalysis = analyzeElement(node, vocabulary, scopeVisibility, graph);
      elements.push(elementAnalysis);

      // Recurse into children
      walkTree(node.children, vocabulary, scopeVisibility, graph, elements, textBindings);
    }
  }
}

function analyzeElement(
  el: ElementNode,
  vocabulary: VocabularyGreen,
  scopeVisibility: ScopeVisibilityGreen,
  graph: ProjectDepGraph,
): ElementAnalysis {
  // Build classification context
  const ctx: ClassificationContext = {
    ceDefinition: null,
    vocabulary,
    scopeVisibility,
    namespace: el.namespace,
    tagName: el.tagName,
    graph,
  };

  // Resolve element identity
  const resolution = resolveElement(el, ctx);

  // If it's a CE, load its definition for classification
  if (resolution.kind === 'custom-element') {
    ctx.ceDefinition = resolveCeDefinition(resolution.resourceKey, graph);
  }

  // Classify each attribute
  const attributes: AttributeAnalysis[] = [];
  for (const attr of el.attrs) {
    const syntax = parseAttrSyntax(attr.name, [...vocabulary.patterns]);
    const { classification, binding } = classifyAttribute(attr, syntax, ctx);

    attributes.push({
      rawName: attr.name,
      rawValue: attr.value,
      syntax: syntax.command !== null ? syntax : null,
      classification,
      binding,
    });
  }

  return {
    tagName: el.tagName,
    namespace: el.namespace,
    resolution,
    attributes,
    sourceSpan: el.sourceSpan,
  };
}
