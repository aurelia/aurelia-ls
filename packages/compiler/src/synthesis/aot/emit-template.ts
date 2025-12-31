/* =============================================================================
 * AOT EMIT-TEMPLATE - Transform AotPlanModule to compiled HTML with markers
 * -----------------------------------------------------------------------------
 * Consumes: AotPlanModule (from plan stage)
 * Produces: HTML string with hydration markers matching Aurelia's format
 *
 * Marker format (matching Aurelia runtime expectations):
 * - All targets: <!--au--> comment placed BEFORE the target node
 * - Template controllers: <!--au--><!--au-start--><!--au-end--> structure
 * - Indexing is implicit via document order (markers[i] = instructions[i])
 *
 * The runtime collects markers by walking the DOM for comments with text 'au'.
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
import { debug } from "../../shared/debug.js";

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

/**
 * Hierarchical nested template HTML structure.
 * Matches the structure of SerializedDefinition.nestedTemplates.
 */
export interface NestedTemplateHtmlNode {
  /** HTML content for this nested template */
  html: string;
  /** HTML for nested templates within this one */
  nested: NestedTemplateHtmlNode[];
}

/**
 * Collect HTML for all nested templates (controller content).
 *
 * Returns HTML strings in the same order that emit.ts creates
 * nested template definitions (depth-first tree walk order).
 *
 * Each nested template HTML is the content that goes inside
 * `<!--au-start-->...<!--au-end-->` markers.
 *
 * @deprecated Use collectNestedTemplateHtmlTree for hierarchical structure
 */
export function collectNestedTemplateHtml(
  plan: AotPlanModule,
  options: TemplateEmitOptions = {},
): string[] {
  const ctx = new TemplateEmitContext(options);
  const htmlStrings: string[] = [];
  collectNestedFromNode(plan.root, htmlStrings, ctx);
  return htmlStrings;
}

/**
 * Collect HTML for nested templates in a hierarchical structure.
 *
 * Returns a structure that matches SerializedDefinition.nestedTemplates,
 * making it easy to match HTML with the correct nested definition.
 */
export function collectNestedTemplateHtmlTree(
  plan: AotPlanModule,
  options: TemplateEmitOptions = {},
): NestedTemplateHtmlNode[] {
  const ctx = new TemplateEmitContext(options);
  return collectNestedFromNodeTree(plan.root, ctx);
}

/**
 * Walk the tree and collect nested template HTML in order.
 */
function collectNestedFromNode(
  node: PlanNode,
  htmlStrings: string[],
  ctx: TemplateEmitContext,
): void {
  switch (node.kind) {
    case "element":
      collectNestedFromElement(node, htmlStrings, ctx);
      break;
    case "fragment":
      for (const child of node.children) {
        collectNestedFromNode(child, htmlStrings, ctx);
      }
      break;
    // text and comment nodes don't have nested templates
  }
}

/**
 * Collect nested template HTML from an element and its children.
 */
function collectNestedFromElement(
  node: PlanElementNode,
  htmlStrings: string[],
  ctx: TemplateEmitContext,
): void {
  // Process controllers - each controller has template(s) that become nested definitions
  for (const ctrl of node.controllers) {
    // Get template(s) from this controller
    const templates = getControllerTemplates(ctrl);

    for (const template of templates) {
      // Create a child context with fresh local-to-global mapping
      // but shared global counter for unique marker IDs
      const nestedCtx = ctx.forNestedTemplate();

      // Emit the template content
      const content = emitNode(template, nestedCtx);
      htmlStrings.push(content);

      // Recurse into the template to find more nested controllers
      // Use the nested context to continue with the same global counter
      collectNestedFromNode(template, htmlStrings, nestedCtx);
    }
  }

  // Recurse into children (will be empty when controllers exist,
  // but handled via ctrl.template above)
  for (const child of node.children) {
    collectNestedFromNode(child, htmlStrings, ctx);
  }
}

/* =============================================================================
 * Tree-based nested template collection
 * ============================================================================= */

/**
 * Collect nested template HTML in a hierarchical tree structure.
 * This matches the structure of SerializedDefinition.nestedTemplates.
 */
function collectNestedFromNodeTree(
  node: PlanNode,
  ctx: TemplateEmitContext,
): NestedTemplateHtmlNode[] {
  switch (node.kind) {
    case "element":
      return collectNestedFromElementTree(node, ctx);
    case "fragment": {
      // Collect from all children and flatten
      const results: NestedTemplateHtmlNode[] = [];
      for (const child of node.children) {
        results.push(...collectNestedFromNodeTree(child, ctx));
      }
      return results;
    }
    default:
      return [];
  }
}

/**
 * Collect nested template HTML from an element in tree structure.
 *
 * For each controller on an element, we:
 * 1. Emit the HTML for the controller's main template
 * 2. Collect branch templates as nested children (matching emit.ts structure)
 * 3. Recursively collect any further nested templates
 * 4. Then collect from the element's children (which are empty if controllers exist)
 *
 * This produces a hierarchical structure that matches SerializedDefinition.nestedTemplates:
 * - switch_0.nestedTemplates = [case_0, case_1]
 * - nestedHtmlTree[0].nested = [caseHtml_0, caseHtml_1]
 */
function collectNestedFromElementTree(
  node: PlanElementNode,
  ctx: TemplateEmitContext,
): NestedTemplateHtmlNode[] {
  const results: NestedTemplateHtmlNode[] = [];

  // Process controllers - each controller creates one nested definition
  for (const ctrl of node.controllers) {
    const nestedCtx = ctx.forNestedTemplate();

    // Emit HTML for the controller's main template
    const html = emitNode(ctrl.template, nestedCtx);

    // Collect nested templates:
    // - For controllers with branches (switch/promise): branches ARE the nested content
    // - For other controllers: recursively collect from the template tree
    const nested: NestedTemplateHtmlNode[] = [];

    if (ctrl.branches) {
      // Add branch templates (these match emit.ts emitControllerBranches)
      // The branches contain all nested controllers for this controller.
      // Don't also walk ctrl.template - it would find the same case/branch controllers
      // again since they're attached to elements in the template tree.
      for (const branchCtrl of ctrl.branches) {
        const branchCtx = ctx.forNestedTemplate();
        const branchHtml = emitNode(branchCtrl.template, branchCtx);
        // Recursively collect nested templates within the branch
        const branchNested = collectNestedFromNodeTree(branchCtrl.template, branchCtx);
        nested.push({ html: branchHtml, nested: branchNested });
      }
      debug.aot("emit.nestedHtml.branches", {
        controller: ctrl.resource,
        branchCount: ctrl.branches.length,
        branchHtmlLengths: nested.map(n => n.html.length),
      });
    } else {
      // No branches - collect nested templates from within the main template
      nested.push(...collectNestedFromNodeTree(ctrl.template, nestedCtx));
    }

    debug.aot("emit.nestedHtml", {
      controller: ctrl.resource,
      htmlLength: html.length,
      nestedCount: nested.length,
    });
    results.push({ html, nested });
  }

  // Also collect from element's children
  // (empty when controllers exist, but still check)
  for (const child of node.children) {
    results.push(...collectNestedFromNodeTree(child, ctx));
  }

  return results;
}

/**
 * Get all templates from a controller.
 * Config-driven: uses ctrl.branches for child branch controllers.
 */
function getControllerTemplates(ctrl: PlanController): PlanNode[] {
  const templates: PlanNode[] = [];

  // Main template (most controllers have one)
  if (ctrl.template) {
    templates.push(ctrl.template);
  }

  // Child branch templates (switch cases, promise branches)
  if (ctrl.branches) {
    for (const branch of ctrl.branches) {
      if (branch.template) {
        templates.push(branch.template);
      }
    }
  }

  return templates;
}

/* =============================================================================
 * Emit Context
 * ============================================================================= */

class TemplateEmitContext {
  readonly options: TemplateEmitOptions;

  constructor(options: TemplateEmitOptions) {
    this.options = options;
  }

  /**
   * Create a child context for a nested template.
   * Each nested template uses LOCAL indices (starting from 0).
   */
  forNestedTemplate(): TemplateEmitContext {
    return new TemplateEmitContext(this.options);
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
 * Otherwise, emit the element directly (with <!--au--> marker if it has bindings).
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
 * <!--au:N--><!--au-start--><!--au-end-->
 *
 * IMPORTANT: The element content is NOT included in the parent template.
 * The content (including the element itself) goes in the nested template,
 * which is collected separately via collectNestedTemplateHtml().
 */
function emitElementWithControllers(
  node: PlanElementNode,
  ctx: TemplateEmitContext,
): string {
  // Controllers are stored in inside-out order, but we emit outside-in
  // So we reverse to get the outermost controller first
  const controllers = [...node.controllers].reverse();

  // Start with empty content - the actual element goes in the nested template
  // The au-start/au-end markers are placeholders that the runtime replaces
  let content = "";

  // Wrap with each controller's markers (inside-out → outside-in)
  for (const ctrl of controllers) {
    content = emitControllerWrapper(ctrl, content, ctx);
  }

  return content;
}

/**
 * Emit a standard element (no template controllers).
 * If the element is a binding target, emit <!--au--> before it.
 */
function emitStandardElement(node: PlanElementNode, ctx: TemplateEmitContext): string {
  const tag = node.tag;
  const attrs = buildAttributes(node, ctx);
  const children = node.children.map(child => emitNode(child, ctx)).join("");

  // Build the element HTML
  let elementHtml: string;
  if (isVoidElement(tag)) {
    elementHtml = `<${tag}${attrs}>`;
  } else {
    elementHtml = `<${tag}${attrs}>${children}</${tag}>`;
  }

  // If this element is a target, prepend marker
  if (node.targetIndex !== undefined) {
    return `<!--au-->${elementHtml}`;
  }

  return elementHtml;
}

/**
 * Build attribute string for an element.
 */
function buildAttributes(node: PlanElementNode, _ctx: TemplateEmitContext): string {
  const parts: string[] = [];

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
 * Format: <!--au--><!--au-start-->...content...<!--au-end-->
 */
function emitControllerWrapper(
  ctrl: PlanController,
  content: string,
  _ctx: TemplateEmitContext,
): string {
  return `<!--au--><!--au-start-->${content}<!--au-end-->`;
}

/**
 * Emit a text node.
 *
 * Static text: emit content as-is
 * Interpolation: emit ONLY the marker, not the static parts.
 *
 * The static parts are stored in the TextBindingInstruction's Interpolation
 * and are evaluated by the runtime. If we include them here too, they would
 * be duplicated in the output.
 */
function emitText(node: PlanTextNode, _ctx: TemplateEmitContext): string {
  // Static text
  if (!node.interpolation) {
    return escapeHtml(node.content ?? "");
  }

  // Text interpolation - emit marker followed by a space (the text node target)
  // The runtime will evaluate the full interpolation (parts + expressions)
  // and replace the marker's nextSibling text node with the result.
  return `<!--au--> `;
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
