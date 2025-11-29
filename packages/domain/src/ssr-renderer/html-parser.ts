/**
 * HTML Skeleton Parser
 *
 * Parses SSR HTML skeleton with hydration markers.
 *
 * Markers:
 * - data-au-hid="N"  : Hydration ID for dynamic nodes
 * - <!--au:tb HID@I expr=EXPRID--> : Text binding interpolation marker
 * - <!--au:ctrl HID ... --> : Controller marker (repeat, if, etc)
 */

export interface HtmlNode {
  kind: "element" | "text" | "comment";
  tag?: string;
  text?: string;
  attrs?: Array<{ name: string; value: string | null }>;
  children?: HtmlNode[];
  hid?: string | null;
  markers?: HtmlMarker[];
}

export interface HtmlMarker {
  kind: "textBinding" | "controller";
  hid: string;
  index?: number;
  exprId?: string;
  controllerType?: string;
}

/**
 * Parse HTML skeleton into a tree structure.
 *
 * @param html - HTML string with SSR markers
 * @returns Array of root nodes
 */
export function parseHtmlSkeleton(html: string): HtmlNode[] {
  const parser = new HtmlParser(html);
  return parser.parse();
}

class HtmlParser {
  private html: string;
  private pos = 0;

  constructor(html: string) {
    this.html = html;
  }

  parse(): HtmlNode[] {
    const nodes: HtmlNode[] = [];

    while (this.pos < this.html.length) {
      const char = this.html[this.pos];

      if (char === "<") {
        if (this.peekString("<!--au:")) {
          // Skip SSR marker (will be handled during rendering)
          this.skipMarker();
        } else if (this.peekString("<!--")) {
          // Regular HTML comment
          const comment = this.parseComment();
          if (comment) nodes.push(comment);
        } else {
          // Element
          const elem = this.parseElement();
          if (elem) nodes.push(elem);
        }
      } else {
        // Text node
        const text = this.parseText();
        if (text && text.text?.trim()) {
          nodes.push(text);
        } else if (text) {
          this.pos += text.text?.length ?? 0;
        }
      }
    }

    return nodes;
  }

  private parseElement(): HtmlNode | null {
    if (this.html[this.pos] !== "<") return null;

    const startPos = this.pos;
    this.pos++; // skip '<'

    // Check for self-closing or void elements
    const match = this.html.slice(this.pos).match(/^(\w+)([\s>])/);
    if (!match) return null;

    const tag = match[1]!.toLowerCase();
    this.pos += match[0].length;

    // Parse attributes
    const attrs: Array<{ name: string; value: string | null }> = [];
    let hid: string | undefined;

    while (this.html[this.pos] !== ">" && this.pos < this.html.length) {
      this.skipWhitespace();
      if (this.html[this.pos] === ">") break;

      const attr = this.parseAttribute();
      if (attr) {
        attrs.push(attr);
        if (attr.name === "data-au-hid") {
          hid = attr.value ?? undefined;
        }
      } else {
        this.pos++;
      }
    }

    if (this.html[this.pos] === ">") this.pos++;

    const node: HtmlNode = { kind: "element", tag, attrs, hid: hid ?? null };

    // Check for void elements
    const voidElements = new Set([
      "area",
      "base",
      "br",
      "col",
      "embed",
      "hr",
      "img",
      "input",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr",
    ]);

    if (!voidElements.has(tag)) {
      // Parse children until closing tag
      node.children = [];
      while (
        this.pos < this.html.length &&
        !this.peekString(`</${tag}>`)
      ) {
        const char = this.html[this.pos];

        if (char === "<") {
          if (this.peekString("<!--au:")) {
            // SSR marker
            this.skipMarker();
          } else if (this.peekString("<!--")) {
            const comment = this.parseComment();
            if (comment) node.children.push(comment);
          } else {
            const child = this.parseElement();
            if (child) node.children.push(child);
          }
        } else {
          const text = this.parseText();
          if (text && text.text?.trim()) {
            node.children.push(text);
          } else if (text) {
            this.pos += text.text?.length ?? 0;
          }
        }
      }

      // Skip closing tag
      if (this.peekString(`</${tag}>`)) {
        this.pos += `</${tag}>`.length;
      }
    }

    return node;
  }

  private parseAttribute(): {
    name: string;
    value: string | null;
  } | null {
    const match = this.html
      .slice(this.pos)
      .match(/^([\w\-:]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/);

    if (!match) return null;

    const name = match[1]!;
    const value = match[2] ?? match[3] ?? match[4] ?? null;
    this.pos += match[0].length;

    return { name, value };
  }

  private parseText(): HtmlNode | null {
    const endPos = this.html.indexOf("<", this.pos);
    const text =
      endPos === -1
        ? this.html.slice(this.pos)
        : this.html.slice(this.pos, endPos);

    if (!text) return null;

    this.pos += text.length;
    return { kind: "text", text };
  }

  private parseComment(): HtmlNode | null {
    if (!this.peekString("<!--")) return null;

    const endPos = this.html.indexOf("-->", this.pos);
    if (endPos === -1) return null;

    const text = this.html.slice(this.pos + 4, endPos);
    this.pos = endPos + 3;

    return { kind: "comment", text };
  }

  private skipMarker(): void {
    const endPos = this.html.indexOf("-->", this.pos);
    if (endPos !== -1) {
      this.pos = endPos + 3;
    } else {
      this.pos = this.html.length;
    }
  }

  private skipWhitespace(): void {
    while (
      this.pos < this.html.length &&
      /\s/.test(this.html[this.pos]!)
    ) {
      this.pos++;
    }
  }

  private peekString(str: string): boolean {
    return this.html.startsWith(str, this.pos);
  }
}
