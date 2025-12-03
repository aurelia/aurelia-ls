/* =============================================================================
 * AOT EMIT-TEMPLATE - Transform AotPlanModule to compiled HTML with markers
 * -----------------------------------------------------------------------------
 * Consumes: AotPlanModule (from plan stage)
 * Produces: HTML string with hydration markers matching Aurelia's format
 *
 * Marker formats (matching Aurelia runtime expectations):
 * - Element targets: au-hid="N" attribute
 * - Non-element targets: <!--au:N--> comment
 * - Template controllers: <!--au:N--><!--au-start--><!--au-end--> structure
 *
 * The runtime's _collectTargets() in dom.ts expects these exact formats.
 * ============================================================================= */

import type {
  AotPlanModule,
  PlanNode,
  PlanElementNode,
  PlanTextNode,
  PlanCommentNode,
  PlanFragmentNode,
  PlanController,
  PlanStaticAttr,
} from "./types.js";

/* =============================================================================
 * Public API
 * ============================================================================= */

export interface TemplateEmitResult {
  /** Compiled HTML with hydration markers */
  html: string;
}

export interface TemplateEmitOptions {
  /** Whether to include newlines for readability (default: false) */
  pretty?: boolean;
}

/**
 * Emit compiled template HTML from an AotPlanModule.
 *
 * The output HTML contains hydration markers that the Aurelia runtime
 * uses to find binding targets during hydration.
 */
export function emitTemplate(
  plan: AotPlanModule,
  options: TemplateEmitOptions = {},
): TemplateEmitResult {
  const ctx = new TemplateEmitContext(options);
  const html = emitNode(plan.root, ctx);
  return { html };
}

/* =============================================================================
 * Emit Context
 * ============================================================================= */

class TemplateEmitContext {
  readonly options: TemplateEmitOptions;

  constructor(options: TemplateEmitOptions) {
    this.options = options;
  }
}

/* =============================================================================
 * Node Emission
 * ============================================================================= */

function emitNode(node: PlanNode, ctx: TemplateEmitContext): string {
  switch (node.kind) {
    case "element":
      return emitElement(node, ctx);
    case "text":
      return emitText(node, ctx);
    case "comment":
      return emitComment(node, ctx);
    case "fragment":
      return emitFragment(node, ctx);
  }
}

/**
 * Emit an element node.
 *
 * If the element has template controllers, they wrap the element with markers.
 * Otherwise, emit the element directly with au-hid if it has bindings.
 */
function emitElement(node: PlanElementNode, ctx: TemplateEmitContext): string {
  // If element has template controllers, emit them (outermost first)
  if (node.controllers.length > 0) {
    return emitElementWithControllers(node, ctx);
  }

  // Standard element emission
  return emitStandardElement(node, ctx);
}

/**
 * Emit an element wrapped by template controllers.
 *
 * Template controllers create a marker structure:
 * <!--au:N--><!--au-start-->...content...<!--au-end-->
 */
function emitElementWithControllers(
  node: PlanElementNode,
  ctx: TemplateEmitContext,
): string {
  // Controllers are stored in inside-out order, but we emit outside-in
  // So we reverse to get the outermost controller first
  const controllers = [...node.controllers].reverse();

  // Start with the innermost content (the element without controllers)
  let content = emitElementContent(node, ctx);

  // Wrap with each controller's markers (inside-out → outside-in)
  for (const ctrl of controllers) {
    content = emitControllerWrapper(ctrl, content, ctx);
  }

  return content;
}

/**
 * Emit the content inside a controller (the element and its children).
 */
function emitElementContent(node: PlanElementNode, ctx: TemplateEmitContext): string {
  // Emit the element itself (may have au-hid if it has bindings)
  const tag = node.tag;
  const attrs = buildAttributes(node, ctx);

  // Children
  const children = node.children.map(child => emitNode(child, ctx)).join("");

  // Self-closing elements (void elements)
  if (isVoidElement(tag)) {
    return `<${tag}${attrs}>`;
  }

  return `<${tag}${attrs}>${children}</${tag}>`;
}

/**
 * Emit a standard element (no template controllers).
 */
function emitStandardElement(node: PlanElementNode, ctx: TemplateEmitContext): string {
  const tag = node.tag;
  const attrs = buildAttributes(node, ctx);
  const children = node.children.map(child => emitNode(child, ctx)).join("");

  // Self-closing elements (void elements)
  if (isVoidElement(tag)) {
    return `<${tag}${attrs}>`;
  }

  return `<${tag}${attrs}>${children}</${tag}>`;
}

/**
 * Build attribute string for an element.
 * Includes au-hid if element has a target index.
 */
function buildAttributes(node: PlanElementNode, _ctx: TemplateEmitContext): string {
  const parts: string[] = [];

  // Add au-hid if this is a target
  if (node.targetIndex !== undefined) {
    parts.push(`au-hid="${node.targetIndex}"`);
  }

  // Add static attributes
  for (const attr of node.staticAttrs) {
    parts.push(emitAttribute(attr));
  }

  return parts.length > 0 ? " " + parts.join(" ") : "";
}

/**
 * Emit a single attribute.
 */
function emitAttribute(attr: PlanStaticAttr): string {
  if (attr.value === null) {
    // Boolean attribute
    return attr.name;
  }
  // Escape attribute value
  return `${attr.name}="${escapeAttr(attr.value)}"`;
}

/**
 * Emit a template controller wrapper.
 *
 * Format: <!--au:N--><!--au-start-->...content...<!--au-end-->
 */
function emitControllerWrapper(
  ctrl: PlanController,
  content: string,
  _ctx: TemplateEmitContext,
): string {
  const targetIndex = ctrl.targetIndex ?? 0;
  return `<!--au:${targetIndex}--><!--au-start-->${content}<!--au-end-->`;
}

/**
 * Emit a text node.
 *
 * Static text: emit content as-is
 * Interpolation: emit parts with <!--au:N--> markers and space nodes
 */
function emitText(node: PlanTextNode, _ctx: TemplateEmitContext): string {
  // Static text
  if (!node.interpolation) {
    return escapeHtml(node.content ?? "");
  }

  // Text interpolation
  // Format: part0 <!--au:N--> part1 <!--au:N--> part2
  // Note: We add a space after the marker for cloning compatibility
  const { parts, exprIds } = node.interpolation;
  const result: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    // Emit static part
    result.push(escapeHtml(parts[i] ?? ""));

    // Emit marker if there's an expression after this part
    if (i < exprIds.length) {
      // Use the text node's target index
      const targetIndex = node.targetIndex ?? 0;
      // Each expression in interpolation shares the same target
      // The marker format includes the expression index for multi-expression interpolations
      result.push(`<!--au:${targetIndex}--> `);
    }
  }

  return result.join("");
}

/**
 * Emit a comment node.
 */
function emitComment(node: PlanCommentNode, _ctx: TemplateEmitContext): string {
  return `<!--${node.content}-->`;
}

/**
 * Emit a fragment node (root container).
 */
function emitFragment(node: PlanFragmentNode, ctx: TemplateEmitContext): string {
  return node.children.map(child => emitNode(child, ctx)).join("");
}

/* =============================================================================
 * Utility Functions
 * ============================================================================= */

/**
 * Check if a tag is a void (self-closing) element.
 */
function isVoidElement(tag: string): boolean {
  const voidElements = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
  ]);
  return voidElements.has(tag.toLowerCase());
}

/**
 * Escape HTML special characters in text content.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escape HTML special characters in attribute values.
 */
function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
