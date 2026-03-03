/**
 * Source-Faithful Template Parser
 *
 * Lightweight markup walker that produces an abstract tree from template
 * HTML strings. Designed for template analysis, NOT for spec-compliant
 * HTML parsing.
 *
 * Key properties:
 * - Source-faithful: walks tags as-written. No auto-closing, no implicit
 *   element creation, no foster parenting. The tree matches what the
 *   developer sees in their editor.
 * - Positional: preserves source byte offsets for every node and attribute.
 * - Namespace-aware: tracks HTML/SVG/MathML namespace via a simple stack.
 * - No dependencies: no parse5, no external parser.
 *
 * For AOT compilation mode, a parse5 adapter can produce the same
 * TemplateNode interface with spec-compliant parsing. The analysis
 * callbacks consume the abstract interface, never the parser directly.
 */

// =============================================================================
// Public Types — The Abstract Tree Interface
// =============================================================================

export interface TemplateTree {
  readonly children: readonly TemplateNode[];
  readonly source: string;
}

export type TemplateNode = ElementNode | TextNode | CommentNode;

export interface ElementNode {
  readonly kind: 'element';
  readonly tagName: string;
  readonly namespace: Namespace;
  readonly attrs: readonly TemplateAttr[];
  readonly children: readonly TemplateNode[];
  readonly selfClosing: boolean;
  readonly sourceSpan: Span;
}

export interface TextNode {
  readonly kind: 'text';
  readonly content: string;
  readonly sourceSpan: Span;
}

export interface CommentNode {
  readonly kind: 'comment';
  readonly content: string;
  readonly sourceSpan: Span;
}

export interface TemplateAttr {
  readonly name: string;
  readonly value: string;
  readonly nameSpan: Span;
  readonly valueSpan: Span | null;
}

export interface Span {
  readonly start: number;
  readonly end: number;
}

export type Namespace = 'html' | 'svg' | 'mathml';

// =============================================================================
// Namespace Switching
// =============================================================================

/** Elements that switch namespace context when entered. */
const NAMESPACE_SWITCHES: ReadonlyMap<string, Namespace> = new Map([
  ['svg', 'svg'],
  ['math', 'mathml'],
]);

/** Elements that return to HTML namespace from within SVG/MathML. */
const NAMESPACE_RETURNS = new Set(['foreignobject', 'desc', 'title']);

// =============================================================================
// Void Elements (self-closing in HTML)
// =============================================================================

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// =============================================================================
// Parser
// =============================================================================

/**
 * Parse a template string into a source-faithful tree.
 *
 * The parser is intentionally simple — it handles well-formed templates
 * (the test fixture case) and degrades gracefully on incomplete markup
 * (the IDE editing case) by treating unparseable regions as text.
 */
export function parseTemplate(source: string): TemplateTree {
  const parser = new TemplateParser(source);
  const children = parser.parseChildren('html', null);
  return { children, source };
}

class TemplateParser {
  private pos = 0;
  private readonly src: string;

  constructor(source: string) {
    this.src = source;
  }

  parseChildren(ns: Namespace, parentTag: string | null): TemplateNode[] {
    const children: TemplateNode[] = [];

    while (this.pos < this.src.length) {
      // Check for closing tag of parent
      if (parentTag !== null && this.lookingAt('</')) {
        const closeTag = this.peekCloseTag();
        if (closeTag !== null && closeTag.toLowerCase() === parentTag.toLowerCase()) {
          break;
        }
      }

      const node = this.parseNode(ns);
      if (node === null) break;
      children.push(node);
    }

    return children;
  }

  private parseNode(ns: Namespace): TemplateNode | null {
    if (this.pos >= this.src.length) return null;

    if (this.lookingAt('<!--')) {
      return this.parseComment();
    }

    if (this.lookingAt('</')) {
      // Stray close tag — consume it as text to avoid infinite loop
      const start = this.pos;
      const end = this.src.indexOf('>', this.pos);
      if (end === -1) {
        this.pos = this.src.length;
      } else {
        this.pos = end + 1;
      }
      return { kind: 'text', content: this.src.slice(start, this.pos), sourceSpan: { start, end: this.pos } };
    }

    if (this.lookingAt('<') && this.pos + 1 < this.src.length && /[a-zA-Z]/.test(this.src[this.pos + 1]!)) {
      return this.parseElement(ns);
    }

    return this.parseText(ns);
  }

  private parseComment(): CommentNode {
    const start = this.pos;
    this.pos += 4; // skip '<!--'
    const endIdx = this.src.indexOf('-->', this.pos);
    let content: string;
    if (endIdx === -1) {
      content = this.src.slice(this.pos);
      this.pos = this.src.length;
    } else {
      content = this.src.slice(this.pos, endIdx);
      this.pos = endIdx + 3;
    }
    return { kind: 'comment', content, sourceSpan: { start, end: this.pos } };
  }

  private parseElement(parentNs: Namespace): ElementNode {
    const start = this.pos;
    this.pos++; // skip '<'

    const tagName = this.readTagName();
    const tagLower = tagName.toLowerCase();

    // Determine namespace
    let ns = parentNs;
    if (NAMESPACE_SWITCHES.has(tagLower)) {
      ns = NAMESPACE_SWITCHES.get(tagLower)!;
    } else if (parentNs !== 'html' && NAMESPACE_RETURNS.has(tagLower)) {
      ns = 'html';
    }

    const attrs = this.parseAttributes();

    // Check for self-closing syntax (/>) or void element
    let selfClosing = false;
    this.skipWhitespace();

    if (this.lookingAt('/>')) {
      selfClosing = true;
      this.pos += 2;
    } else if (this.lookingAt('>')) {
      this.pos++; // skip '>'
      // In HTML namespace, void elements don't have children
      if (ns === 'html' && VOID_ELEMENTS.has(tagLower)) {
        selfClosing = true;
      }
    } else {
      // Malformed — no closing '>' found. Treat rest as part of this element.
      this.pos = this.src.length;
      selfClosing = true;
    }

    let children: TemplateNode[] = [];
    if (!selfClosing) {
      children = this.parseChildren(ns, tagName);

      // Consume the closing tag
      if (this.lookingAt('</')) {
        const closeEnd = this.src.indexOf('>', this.pos);
        if (closeEnd !== -1) {
          this.pos = closeEnd + 1;
        } else {
          this.pos = this.src.length;
        }
      }
    }

    return {
      kind: 'element',
      tagName,
      namespace: ns,
      attrs,
      children,
      selfClosing,
      sourceSpan: { start, end: this.pos },
    };
  }

  private parseAttributes(): TemplateAttr[] {
    const attrs: TemplateAttr[] = [];

    while (this.pos < this.src.length) {
      this.skipWhitespace();

      // End of open tag
      if (this.lookingAt('>') || this.lookingAt('/>')) break;

      const attr = this.parseAttribute();
      if (attr === null) break;
      attrs.push(attr);
    }

    return attrs;
  }

  private parseAttribute(): TemplateAttr | null {
    this.skipWhitespace();
    if (this.pos >= this.src.length) return null;

    const ch = this.src[this.pos]!;
    if (ch === '>' || ch === '/') return null;

    // Attribute name
    const nameStart = this.pos;
    while (this.pos < this.src.length) {
      const c = this.src[this.pos]!;
      if (c === '=' || c === '>' || c === '/' || /\s/.test(c)) break;
      this.pos++;
    }
    const nameEnd = this.pos;
    const name = this.src.slice(nameStart, nameEnd);

    if (!name) return null;

    // Check for = (value)
    this.skipWhitespace();
    if (!this.lookingAt('=')) {
      // Boolean attribute (no value)
      return {
        name,
        value: '',
        nameSpan: { start: nameStart, end: nameEnd },
        valueSpan: null,
      };
    }

    this.pos++; // skip '='
    this.skipWhitespace();

    // Attribute value
    let value: string;
    let valueSpan: Span;

    if (this.lookingAt('"') || this.lookingAt("'")) {
      const quote = this.src[this.pos]!;
      this.pos++; // skip opening quote
      const valStart = this.pos;
      const endQuote = this.src.indexOf(quote, this.pos);
      if (endQuote === -1) {
        value = this.src.slice(valStart);
        this.pos = this.src.length;
        valueSpan = { start: valStart, end: this.pos };
      } else {
        value = this.src.slice(valStart, endQuote);
        valueSpan = { start: valStart, end: endQuote };
        this.pos = endQuote + 1;
      }
    } else {
      // Unquoted value
      const valStart = this.pos;
      while (this.pos < this.src.length && !/[\s>]/.test(this.src[this.pos]!)) {
        this.pos++;
      }
      value = this.src.slice(valStart, this.pos);
      valueSpan = { start: valStart, end: this.pos };
    }

    return {
      name,
      value,
      nameSpan: { start: nameStart, end: nameEnd },
      valueSpan,
    };
  }

  private parseText(ns: Namespace): TextNode {
    const start = this.pos;
    while (this.pos < this.src.length) {
      if (this.lookingAt('<')) break;
      this.pos++;
    }
    const content = this.src.slice(start, this.pos);
    return { kind: 'text', content, sourceSpan: { start, end: this.pos } };
  }

  private readTagName(): string {
    const start = this.pos;
    while (this.pos < this.src.length) {
      const c = this.src[this.pos]!;
      if (/[\s/>]/.test(c)) break;
      this.pos++;
    }
    return this.src.slice(start, this.pos);
  }

  private peekCloseTag(): string | null {
    // Peek at </tagname> without advancing position
    if (!this.lookingAt('</')) return null;
    let i = this.pos + 2;
    const start = i;
    while (i < this.src.length && !/[\s/>]/.test(this.src[i]!)) i++;
    if (start === i) return null;
    return this.src.slice(start, i);
  }

  private skipWhitespace(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos]!)) {
      this.pos++;
    }
  }

  private lookingAt(str: string): boolean {
    return this.src.startsWith(str, this.pos);
  }
}
