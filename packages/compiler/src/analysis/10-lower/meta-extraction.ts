/**
 * Meta Element Extraction
 *
 * Extracts HTML meta elements (<import>, <bindable>, etc.) from templates
 * with full provenance for LSP features and refactoring.
 *
 * Meta elements are:
 * - NOT DOM (no NodeIds, no instruction rows)
 * - Stripped from output HTML
 * - Preserved in IR for downstream consumers
 */

import type { DefaultTreeAdapterMap, Token } from "parse5";
import type {
  AliasMetaIR,
  BindableMetaIR,
  CaptureMetaIR,
  ContainerlessMetaIR,
  ImportMetaIR,
  Located,
  MetaElementBase,
  ShadowDomMetaIR,
  SourceSpan,
  TemplateMetaIR,
} from "../../model/ir.js";
import type { SourceFile } from "../../model/source.js";
import { attrNameLoc, toSpan, type P5Element } from "./lower-shared.js";
import { META_ELEMENT_TAGS } from "./dom-builder.js";

type P5DocumentFragment = DefaultTreeAdapterMap["documentFragment"];
type ElementLocation = Token.ElementLocation;

/** Attribute-based meta on <template> element */
const TEMPLATE_META_ATTRS = new Set(["use-shadow-dom", "containerless", "capture", "alias", "bindable"]);

/**
 * Result of meta extraction.
 */
export interface MetaExtractionResult {
  /** Extracted meta elements with full provenance */
  meta: TemplateMetaIR;
  /** Ranges to remove from source HTML [start, end][] */
  removeRanges: Array<[number, number]>;
}

/**
 * Extract meta elements from a parsed HTML document.
 *
 * Traverses the tree, finds meta elements and template attributes,
 * extracts with full provenance, and records ranges for stripping.
 */
export function extractMeta(
  root: P5DocumentFragment,
  source: SourceFile,
  sourceText: string
): MetaExtractionResult {
  const imports: ImportMetaIR[] = [];
  const bindables: BindableMetaIR[] = [];
  let shadowDom: ShadowDomMetaIR | null = null;
  const aliases: AliasMetaIR[] = [];
  let containerless: ContainerlessMetaIR | null = null;
  let capture: CaptureMetaIR | null = null;
  let hasSlot = false;

  const removeRanges: Array<[number, number]> = [];

  // Traverse the tree
  traverse(root, (node) => {
    const tag = node.tagName?.toLowerCase();

    // Check for <slot> elements
    if (tag === "slot") {
      hasSlot = true;
      return; // Don't remove slots
    }

    // Skip <template as-custom-element> - those are local element definitions
    if (tag === "template" && hasAttr(node, "as-custom-element")) {
      return;
    }

    // Handle <template> with meta attributes
    if (tag === "template") {
      extractTemplateMetaAttrs(node, source, sourceText, {
        onShadowDom: (sd) => { shadowDom = sd; },
        onContainerless: (c) => { containerless = c; },
        onCapture: (cp) => { capture = cp; },
        onAlias: (a) => aliases.push(a),
        onBindable: (b) => bindables.push(b),
        addRemoveRange: (r) => removeRanges.push(r),
      });
      return;
    }

    // Handle meta element tags
    if (META_ELEMENT_TAGS.has(tag ?? "")) {
      const loc = node.sourceCodeLocation as ElementLocation | undefined;
      if (!loc) return;

      // Collect ranges to remove (start tag and optional end tag)
      if (loc.endTag) {
        removeRanges.push([loc.endTag.startOffset, loc.endTag.endOffset]);
      }
      if (loc.startTag) {
        removeRanges.push([loc.startTag.startOffset, loc.startTag.endOffset]);
      }

      // Extract based on tag type
      switch (tag) {
        case "import":
        case "require": {
          const imp = extractImport(node, tag, source, sourceText);
          if (imp) imports.push(imp);
          break;
        }

        case "bindable": {
          const bind = extractBindable(node, source, sourceText);
          if (bind) bindables.push(bind);
          break;
        }

        case "use-shadow-dom":
          shadowDom = extractShadowDom(node, source, sourceText);
          break;

        case "containerless":
          containerless = extractFlag(node, source, sourceText);
          break;

        case "capture":
          capture = extractFlag(node, source, sourceText);
          break;

        case "alias": {
          const al = extractAlias(node, source, sourceText);
          if (al) aliases.push(al);
          break;
        }
      }
    }
  });

  return {
    meta: {
      imports,
      bindables,
      shadowDom,
      aliases,
      containerless,
      capture,
      hasSlot,
    },
    removeRanges,
  };
}

/**
 * Traverse the document tree, calling callback for each element.
 * Skips content inside <template as-custom-element>.
 */
function traverse(
  node: P5DocumentFragment | P5Element,
  callback: (el: P5Element) => void
): void {
  const children = "childNodes" in node ? node.childNodes : [];
  for (const child of children) {
    const el = child as P5Element;
    if (!el.tagName) continue;

    callback(el);

    // Skip descending into <template as-custom-element>
    if (el.tagName === "template" && hasAttr(el, "as-custom-element")) {
      continue;
    }

    // Descend into children
    if (el.childNodes) {
      traverse(el, callback);
    }

    // For <template>, also descend into content
    const template = child as DefaultTreeAdapterMap["template"];
    if (template.content?.childNodes) {
      traverse(template.content, callback);
    }
  }
}

// =============================================================================
// Individual Meta Element Extractors
// =============================================================================

function extractImport(
  el: P5Element,
  kind: "import" | "require",
  source: SourceFile,
  sourceText: string
): ImportMetaIR | null {
  const fromAttr = getAttr(el, "from");
  if (!fromAttr) return null; // `from` is required

  const loc = el.sourceCodeLocation as ElementLocation | undefined;
  if (!loc) return null;

  const from = extractAttrValue(el, "from", fromAttr.value, source, sourceText);

  // Default alias: as="..."
  const asAttr = getAttr(el, "as");
  const defaultAlias = asAttr
    ? extractAttrValue(el, "as", asAttr.value, source, sourceText)
    : null;

  // Named aliases: X.as="Y" attributes
  // Note: parse5 lowercases attribute names, so we extract the original case from source
  const namedAliases: ImportMetaIR["namedAliases"] = [];
  for (const attr of el.attrs ?? []) {
    if (attr.name.endsWith(".as") && attr.name !== ".as") {
      const alias = attr.value;

      // Get spans and extract original case-sensitive export name from source
      const namedSpans = extractNamedAliasSpans(el, attr.name, source);
      const exportName = sourceText.slice(namedSpans.exportNameLoc.start, namedSpans.exportNameLoc.end);
      const aliasSpan = extractAttrValue(el, attr.name, alias, source, sourceText);

      namedAliases.push({
        exportName: { value: exportName, loc: namedSpans.exportNameLoc },
        asLoc: namedSpans.asLoc,
        alias: aliasSpan,
      });
    }
  }

  return {
    kind,
    from,
    defaultAlias,
    namedAliases,
    elementLoc: getElementSpan(loc, source),
    tagLoc: getTagNameSpan(loc, kind, source, sourceText),
  };
}

function extractBindable(
  el: P5Element,
  source: SourceFile,
  sourceText: string
): BindableMetaIR | null {
  const nameAttr = getAttr(el, "name");
  if (!nameAttr) return null; // `name` is required

  const loc = el.sourceCodeLocation as ElementLocation | undefined;
  if (!loc) return null;

  const name = extractAttrValue(el, "name", nameAttr.value, source, sourceText);

  const modeAttr = getAttr(el, "mode");
  const mode = modeAttr
    ? extractAttrValue(el, "mode", modeAttr.value, source, sourceText)
    : null;

  const attrAttr = getAttr(el, "attribute");
  const attribute = attrAttr
    ? extractAttrValue(el, "attribute", attrAttr.value, source, sourceText)
    : null;

  return {
    name,
    mode,
    attribute,
    elementLoc: getElementSpan(loc, source),
    tagLoc: getTagNameSpan(loc, "bindable", source, sourceText),
  };
}

function extractShadowDom(
  el: P5Element,
  source: SourceFile,
  sourceText: string
): ShadowDomMetaIR {
  const loc = el.sourceCodeLocation as ElementLocation | undefined;

  const modeAttr = getAttr(el, "mode");
  const modeValue: "open" | "closed" = modeAttr?.value === "closed" ? "closed" : "open";

  // If mode attribute exists, get its value span; otherwise use element span
  const modeLocated: Located<"open" | "closed"> = modeAttr && loc
    ? extractAttrValue(el, "mode", modeValue, source, sourceText)
    : { value: modeValue, loc: getElementSpan(loc, source) };

  return {
    mode: modeLocated,
    elementLoc: getElementSpan(loc, source),
    tagLoc: getTagNameSpan(loc, "use-shadow-dom", source, sourceText),
  };
}

function extractAlias(
  el: P5Element,
  source: SourceFile,
  sourceText: string
): AliasMetaIR | null {
  const nameAttr = getAttr(el, "name");
  if (!nameAttr) return null;

  const loc = el.sourceCodeLocation as ElementLocation | undefined;
  if (!loc) return null;

  // Names can be comma-separated: name="foo, bar"
  const names = parseCommaSeparatedNames(
    el,
    "name",
    nameAttr.value,
    source,
    sourceText
  );

  return {
    names,
    elementLoc: getElementSpan(loc, source),
    tagLoc: getTagNameSpan(loc, "alias", source, sourceText),
  };
}

function extractFlag(
  el: P5Element,
  source: SourceFile,
  sourceText: string
): MetaElementBase {
  const loc = el.sourceCodeLocation as ElementLocation | undefined;
  const tag = el.tagName.toLowerCase();

  return {
    elementLoc: getElementSpan(loc, source),
    tagLoc: getTagNameSpan(loc, tag, source, sourceText),
  };
}

// =============================================================================
// Template Attribute Extractors (for <template containerless> etc.)
// =============================================================================

interface TemplateMetaCallbacks {
  onShadowDom: (sd: ShadowDomMetaIR) => void;
  onContainerless: (c: ContainerlessMetaIR) => void;
  onCapture: (cp: CaptureMetaIR) => void;
  onAlias: (a: AliasMetaIR) => void;
  onBindable: (b: BindableMetaIR) => void;
  addRemoveRange: (range: [number, number]) => void;
}

function extractTemplateMetaAttrs(
  el: P5Element,
  source: SourceFile,
  sourceText: string,
  callbacks: TemplateMetaCallbacks
): void {
  const loc = el.sourceCodeLocation as ElementLocation | undefined;
  if (!loc?.attrs) return;

  for (const attr of el.attrs ?? []) {
    const attrName = attr.name.toLowerCase();
    const attrLoc = loc.attrs[attr.name];
    if (!attrLoc) continue;

    if (!TEMPLATE_META_ATTRS.has(attrName)) continue;

    // Record range for removal
    callbacks.addRemoveRange([attrLoc.startOffset, attrLoc.endOffset]);

    // Create a synthetic element span for the attribute
    const attrSpan = toSpan(attrLoc, source) ?? createEmptySpan(source);
    const attrNameSpan = toSpan(attrNameLoc(el, attr.name, sourceText), source) ?? attrSpan;

    switch (attrName) {
      case "use-shadow-dom": {
        const modeValue = attr.value === "closed" ? "closed" : "open";
        callbacks.onShadowDom({
          mode: extractAttrValue(el, attr.name, modeValue, source, sourceText),
          elementLoc: attrSpan,
          tagLoc: attrNameSpan, // For attribute form, tag span = attribute name
        });
        break;
      }

      case "containerless":
        callbacks.onContainerless({
          elementLoc: attrSpan,
          tagLoc: attrNameSpan,
        });
        break;

      case "capture":
        callbacks.onCapture({
          elementLoc: attrSpan,
          tagLoc: attrNameSpan,
        });
        break;

      case "alias": {
        const names = parseCommaSeparatedNames(el, attr.name, attr.value, source, sourceText);
        callbacks.onAlias({
          names,
          elementLoc: attrSpan,
          tagLoc: attrNameSpan,
        });
        break;
      }

      case "bindable": {
        // <template bindable="firstName, lastName">
        const names = parseCommaSeparatedNames(el, attr.name, attr.value, source, sourceText);
        for (const name of names) {
          callbacks.onBindable({
            name,
            mode: null,
            attribute: null,
            elementLoc: attrSpan,
            tagLoc: attrNameSpan,
          });
        }
        break;
      }
    }
  }
}

// =============================================================================
// Span Helpers
// =============================================================================

/**
 * Get the full element span (start tag to end tag, or just start tag).
 */
function getElementSpan(loc: ElementLocation | undefined, source: SourceFile): SourceSpan {
  if (!loc) return createEmptySpan(source);

  const start = loc.startTag?.startOffset ?? loc.startOffset ?? 0;
  const end = loc.endTag?.endOffset ?? loc.startTag?.endOffset ?? loc.endOffset ?? start;

  return {
    file: source.id,
    start,
    end,
  };
}

/**
 * Get the span of just the tag name within the start tag.
 * For `<import from="...">`, returns the span of "import".
 */
function getTagNameSpan(
  loc: ElementLocation | undefined,
  tagName: string,
  source: SourceFile,
  sourceText: string
): SourceSpan {
  if (!loc?.startTag) return createEmptySpan(source);

  // Tag name starts after '<' and is `tagName.length` characters
  const tagStart = loc.startTag.startOffset + 1; // Skip '<'
  const tagEnd = tagStart + tagName.length;

  // Verify by checking the source text
  if (sourceText.slice(tagStart, tagEnd).toLowerCase() !== tagName.toLowerCase()) {
    // Fallback to start tag span if verification fails
    return {
      file: source.id,
      start: loc.startTag.startOffset,
      end: loc.startTag.endOffset,
    };
  }

  return {
    file: source.id,
    start: tagStart,
    end: tagEnd,
  };
}

/**
 * Extract an attribute value with its span.
 * Returns Located<string> with the value and span of just the value (not the attribute name).
 */
function extractAttrValue<T extends string>(
  el: P5Element,
  attrName: string,
  value: T,
  source: SourceFile,
  sourceText: string
): Located<T> {
  const loc = el.sourceCodeLocation as ElementLocation | undefined;
  const attrLoc = loc?.attrs?.[attrName];
  const nameLoc = attrLoc ? (toSpan(attrNameLoc(el, attrName, sourceText), source) ?? null) : null;

  if (!attrLoc) {
    return { value, loc: createEmptySpan(source), nameLoc };
  }

  // Parse the attribute text to find value boundaries
  const attrStart = attrLoc.startOffset;
  const attrEnd = attrLoc.endOffset;
  const attrText = sourceText.slice(attrStart, attrEnd);

  const eqIdx = attrText.indexOf("=");
  if (eqIdx === -1) {
    // Boolean attribute, no value
    return { value, loc: toSpan(attrLoc, source) ?? createEmptySpan(source), nameLoc };
  }

  // Find value start (skip whitespace and opening quote)
  let valueStart = eqIdx + 1;
  while (valueStart < attrText.length && /\s/.test(attrText[valueStart]!)) {
    valueStart++;
  }
  const openQuote = attrText[valueStart];
  if (openQuote === '"' || openQuote === "'") {
    valueStart++;
  }

  // Find value end (before closing quote)
  let valueEnd = attrText.length;
  const closeQuote = attrText[valueEnd - 1];
  if (closeQuote === '"' || closeQuote === "'") {
    valueEnd--;
  }

  return {
    value,
    loc: {
      file: source.id,
      start: attrStart + valueStart,
      end: attrStart + valueEnd,
    },
    nameLoc,
  };
}

/**
 * Extract the span for the export name in a named alias attribute.
 * For `Foo.as="bar"`, returns the span of "Foo".
 */
function extractNamedAliasSpans(
  el: P5Element,
  attrName: string,
  source: SourceFile,
): { exportNameLoc: SourceSpan; asLoc: SourceSpan | null } {
  const loc = el.sourceCodeLocation as ElementLocation | undefined;
  const attrLoc = loc?.attrs?.[attrName];

  if (!attrLoc) {
    return { exportNameLoc: createEmptySpan(source), asLoc: null };
  }

  // Export name is from start of attribute to ".as"
  const exportName = attrName.slice(0, -3);
  const start = attrLoc.startOffset;
  const end = start + exportName.length;

  const exportNameLoc: SourceSpan = { file: source.id, start, end };
  const asLoc: SourceSpan = { file: source.id, start: end, end: end + 3 };

  return { exportNameLoc, asLoc };
}

/**
 * Parse comma-separated names with individual spans.
 * For `name="foo, bar, baz"`, returns three Located<string> entries.
 */
function parseCommaSeparatedNames(
  el: P5Element,
  attrName: string,
  value: string,
  source: SourceFile,
  sourceText: string
): Located<string>[] {
  const loc = el.sourceCodeLocation as ElementLocation | undefined;
  const attrLoc = loc?.attrs?.[attrName];
  const nameLoc = attrLoc ? (toSpan(attrNameLoc(el, attrName, sourceText), source) ?? null) : null;

  if (!attrLoc) {
    // No location info, return simple parse
    return value.split(",").map(s => s.trim()).filter(Boolean).map(name => ({
      value: name,
      loc: createEmptySpan(source),
      nameLoc,
    }));
  }

  // Find the value start position
  const attrStart = attrLoc.startOffset;
  const attrText = sourceText.slice(attrStart, attrLoc.endOffset);
  const eqIdx = attrText.indexOf("=");
  if (eqIdx === -1) {
    return [{ value, loc: toSpan(attrLoc, source) ?? createEmptySpan(source), nameLoc }];
  }

  let valueOffset = eqIdx + 1;
  while (valueOffset < attrText.length && /\s/.test(attrText[valueOffset]!)) {
    valueOffset++;
  }
  const openQuote = attrText[valueOffset];
  if (openQuote === '"' || openQuote === "'") {
    valueOffset++;
  }

  const valueStartInSource = attrStart + valueOffset;

  // Parse each name with its relative position
  const results: Located<string>[] = [];
  let currentOffset = 0;

  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) {
      currentOffset += part.length + 1; // +1 for comma
      continue;
    }

    // Find the trimmed name's start within the part
    const leadingWs = part.length - part.trimStart().length;
    const nameStart = valueStartInSource + currentOffset + leadingWs;
    const nameEnd = nameStart + trimmed.length;

    results.push({
      value: trimmed,
      loc: {
        file: source.id,
        start: nameStart,
        end: nameEnd,
      },
      nameLoc,
    });

    currentOffset += part.length + 1; // +1 for comma
  }

  return results;
}

/**
 * Create an empty span (for error recovery).
 */
function createEmptySpan(source: SourceFile): SourceSpan {
  return { file: source.id, start: 0, end: 0 };
}

// =============================================================================
// Utility Helpers
// =============================================================================

function hasAttr(el: P5Element, name: string): boolean {
  return (el.attrs ?? []).some(a => a.name === name);
}

function getAttr(el: P5Element, name: string): Token.Attribute | undefined {
  return (el.attrs ?? []).find(a => a.name === name);
}

/**
 * Strip meta elements from HTML source.
 * Returns the cleaned HTML with meta elements removed.
 */
export function stripMetaFromHtml(html: string, removeRanges: Array<[number, number]>): string {
  if (removeRanges.length === 0) return html;

  // Sort by start position
  const sorted = [...removeRanges].sort((a, b) => a[0] - b[0]);

  let result = "";
  let lastIdx = 0;

  for (const [start, end] of sorted) {
    result += html.slice(lastIdx, start);
    lastIdx = end;
  }
  result += html.slice(lastIdx);

  return result;
}

// =============================================================================
// Convenience API
// =============================================================================

import { parseFragment } from "parse5";
import { resolveSourceFile } from "../../model/source.js";

/**
 * Extract template meta from HTML string.
 *
 * Convenience function that handles parse5 parsing internally.
 * Use this when you only need the meta elements, not the full DOM tree.
 *
 * @param html - HTML template content
 * @param filePath - Path to the template file (for provenance)
 * @returns Extracted template meta with full provenance
 *
 * @example
 * ```typescript
 * const meta = extractTemplateMeta('<import from="./foo"><div></div>', '/app/my.html');
 * console.log(meta.imports[0].from.value); // "./foo"
 * ```
 */
export function extractTemplateMeta(html: string, filePath: string): TemplateMetaIR {
  const p5 = parseFragment(html, { sourceCodeLocationInfo: true });
  const source = resolveSourceFile(filePath);
  const { meta } = extractMeta(p5, source, html);
  return meta;
}
