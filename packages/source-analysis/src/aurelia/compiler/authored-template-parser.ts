import { SourceSpan, TemplateNodeRef, type TemplateRef } from '../refs.js';
import {
  AuthoredElementNode,
  AuthoredTemplate,
  AuthoredTemplateAttribute,
  AuthoredTemplateFragment,
  AuthoredTemplateNodeProvenance,
  AuthoredTemplateOpenSeam,
  AuthoredTextNode,
} from './authored-template.js';

interface MutableAttribute {
  readonly rawName: string;
  readonly rawValue: string;
  readonly span: SourceSpan;
}

interface MutableElement {
  readonly kind: 'element';
  readonly tagName: string;
  readonly span: SourceSpan;
  readonly attributes: MutableAttribute[];
  readonly children: MutableNode[];
  readonly selfClosing: boolean;
}

interface MutableText {
  readonly kind: 'text';
  readonly value: string;
  readonly span: SourceSpan;
}

interface MutableFragment {
  readonly kind: 'fragment';
  readonly span: SourceSpan;
  readonly children: MutableNode[];
}

type MutableNode =
  | MutableElement
  | MutableText;

const VOID_ELEMENT_NAMES = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

export class AuthoredTemplateParser {
  // NOTE: runtime JIT compilation starts from browser/DOM-owned parsed nodes.
  // The tool cannot safely reuse that posture because we need provenance over
  // imperfect authored HTML and we do not want browser/parser normalization to
  // silently rewrite malformed templates. This parser is therefore a deliberate
  // tooling-time deviation: more tolerant and more provenance-preserving than
  // runtime, but also less spec-complete than a full DOM parser.
  parse(
    template: TemplateRef,
    rawText: string,
  ): AuthoredTemplate {
    const root: MutableFragment = {
      kind: 'fragment',
      span: new SourceSpan(0, rawText.length),
      children: [],
    };
    const stack: MutableElement[] = [];
    const seams: AuthoredTemplateOpenSeam[] = [];
    let index = 0;

    const pushNode = (node: MutableNode) => {
      const parent = stack[stack.length - 1];
      if (parent == null) {
        root.children.push(node);
      } else {
        parent.children.push(node);
      }
    };

    while (index < rawText.length) {
      const current = rawText[index];
      if (current !== '<') {
        const next = rawText.indexOf('<', index);
        const end = next === -1 ? rawText.length : next;
        const value = rawText.slice(index, end);
        if (value.length > 0) {
          pushNode({
            kind: 'text',
            value,
            span: new SourceSpan(index, end),
          });
        }
        index = end;
        continue;
      }

      if (rawText.startsWith('<!--', index)) {
        const end = rawText.indexOf('-->', index + 4);
        if (end === -1) {
          seams.push(new AuthoredTemplateOpenSeam(
            'unterminated-comment',
            new SourceSpan(index, rawText.length),
            'Comment markup did not close before the end of the template source.',
          ));
          break;
        }
        index = end + 3;
        continue;
      }

      const next = rawText[index + 1];
      if (next === '/') {
        index = this.readCloseTag(rawText, index, stack, seams);
        continue;
      }

      if (next === '!' || next === '?') {
        const end = rawText.indexOf('>', index + 2);
        seams.push(new AuthoredTemplateOpenSeam(
          'unsupported-markup-declaration',
          new SourceSpan(index, end === -1 ? rawText.length : end + 1),
          'Markup declarations and processing instructions stay open in the current authored-template parser.',
        ));
        if (end === -1) {
          break;
        }
        index = end + 1;
        continue;
      }

      const openTag = this.readOpenTag(rawText, index, seams);
      if (openTag == null) {
        const nextText = index + 1;
        pushNode({
          kind: 'text',
          value: rawText[index] ?? '<',
          span: new SourceSpan(index, nextText),
        });
        index = nextText;
        continue;
      }

      pushNode(openTag.element);
      index = openTag.nextIndex;
      if (!openTag.element.selfClosing && !VOID_ELEMENT_NAMES.has(openTag.element.tagName)) {
        stack.push(openTag.element);
      }
    }

    while (stack.length > 0) {
      const current = stack.pop()!;
      seams.push(new AuthoredTemplateOpenSeam(
        'unclosed-element',
        current.span,
        `Element <${current.tagName}> did not close before the end of the authored template.`,
      ));
    }

    const authoredRoot = materializeFragment(template, root, []);
    return new AuthoredTemplate(
      template,
      rawText,
      authoredRoot,
      seams,
      'Tolerant authored-template tree over raw template source. This is intentionally provenance-first and does not try to normalize malformed markup into browser DOM behavior.',
    );
  }

  private readCloseTag(
    rawText: string,
    start: number,
    stack: MutableElement[],
    seams: AuthoredTemplateOpenSeam[],
  ): number {
    let index = start + 2;
    while (index < rawText.length && isWhitespace(rawText[index])) {
      index += 1;
    }

    const nameStart = index;
    while (index < rawText.length && isTagNameChar(rawText[index])) {
      index += 1;
    }
    const tagName = rawText.slice(nameStart, index).toLowerCase();
    const end = rawText.indexOf('>', index);
    if (end === -1) {
      seams.push(new AuthoredTemplateOpenSeam(
        'unterminated-tag',
        new SourceSpan(start, rawText.length),
        'Closing tag markup did not reach a terminating >.',
      ));
      return rawText.length;
    }

    if (tagName.length === 0) {
      seams.push(new AuthoredTemplateOpenSeam(
        'invalid-tag-open',
        new SourceSpan(start, end + 1),
        'Closing tag did not carry a recognizable tag name.',
      ));
      return end + 1;
    }

    const top = stack[stack.length - 1];
    if (top?.tagName === tagName) {
      stack.pop();
      return end + 1;
    }

    const matchIndex = findLastIndex(stack, (current) => current.tagName === tagName);
    if (matchIndex === -1) {
      seams.push(new AuthoredTemplateOpenSeam(
        'mismatched-close-tag',
        new SourceSpan(start, end + 1),
        `Closing tag </${tagName}> did not match any currently-open element.`,
      ));
      return end + 1;
    }

    seams.push(new AuthoredTemplateOpenSeam(
      'mismatched-close-tag',
      new SourceSpan(start, end + 1),
      `Closing tag </${tagName}> skipped over ${stack.length - matchIndex - 1} still-open element(s).`,
    ));
    stack.length = matchIndex;
    return end + 1;
  }

  private readOpenTag(
    rawText: string,
    start: number,
    seams: AuthoredTemplateOpenSeam[],
  ): {
    readonly element: MutableElement;
    readonly nextIndex: number;
  } | null {
    let index = start + 1;
    while (index < rawText.length && isWhitespace(rawText[index])) {
      index += 1;
    }

    const nameStart = index;
    while (index < rawText.length && isTagNameChar(rawText[index])) {
      index += 1;
    }
    const tagName = rawText.slice(nameStart, index).toLowerCase();
    if (tagName.length === 0) {
      seams.push(new AuthoredTemplateOpenSeam(
        'invalid-tag-open',
        new SourceSpan(start, Math.min(rawText.length, start + 1)),
        'Encountered < that did not begin a recognizable start tag.',
      ));
      return null;
    }

    const attributes: MutableAttribute[] = [];
    let selfClosing = false;

    while (index < rawText.length) {
      while (index < rawText.length && isWhitespace(rawText[index])) {
        index += 1;
      }

      if (index >= rawText.length) {
        seams.push(new AuthoredTemplateOpenSeam(
          'unterminated-tag',
          new SourceSpan(start, rawText.length),
          `Start tag <${tagName}> did not reach a terminating >.`,
        ));
        return {
          element: {
            kind: 'element',
            tagName,
            span: new SourceSpan(start, rawText.length),
            attributes,
            children: [],
            selfClosing,
          },
          nextIndex: rawText.length,
        };
      }

      const current = rawText[index];
      if (current === '>') {
        index += 1;
        break;
      }
      if (current === '/' && rawText[index + 1] === '>') {
        selfClosing = true;
        index += 2;
        break;
      }

      const attrStart = index;
      while (
        index < rawText.length
        && !isWhitespace(rawText[index])
        && rawText[index] !== '='
        && rawText[index] !== '>'
        && !(rawText[index] === '/' && rawText[index + 1] === '>')
      ) {
        index += 1;
      }
      const rawName = rawText.slice(attrStart, index);
      if (rawName.length === 0) {
        seams.push(new AuthoredTemplateOpenSeam(
          'attribute-parse-open',
          new SourceSpan(attrStart, Math.min(rawText.length, attrStart + 1)),
          `Attribute parsing stalled inside <${tagName}>.`,
        ));
        index += 1;
        continue;
      }

      while (index < rawText.length && isWhitespace(rawText[index])) {
        index += 1;
      }

      let rawValue = '';
      if (rawText[index] === '=') {
        index += 1;
        while (index < rawText.length && isWhitespace(rawText[index])) {
          index += 1;
        }
        if (index >= rawText.length) {
          seams.push(new AuthoredTemplateOpenSeam(
            'attribute-parse-open',
            new SourceSpan(attrStart, rawText.length),
            `Attribute ${rawName} in <${tagName}> ended after = without a value.`,
          ));
        } else {
          const quote = rawText[index];
          if (quote === '"' || quote === '\'') {
            index += 1;
            const valueStart = index;
            const valueEnd = rawText.indexOf(quote, index);
            if (valueEnd === -1) {
              rawValue = rawText.slice(valueStart);
              seams.push(new AuthoredTemplateOpenSeam(
                'attribute-parse-open',
                new SourceSpan(attrStart, rawText.length),
                `Quoted attribute ${rawName} in <${tagName}> did not close before EOF.`,
              ));
              index = rawText.length;
            } else {
              rawValue = rawText.slice(valueStart, valueEnd);
              index = valueEnd + 1;
            }
          } else {
            const valueStart = index;
            while (
              index < rawText.length
              && !isWhitespace(rawText[index])
              && rawText[index] !== '>'
              && !(rawText[index] === '/' && rawText[index + 1] === '>')
            ) {
              index += 1;
            }
            rawValue = rawText.slice(valueStart, index);
          }
        }
      }

      attributes.push({
        rawName,
        rawValue,
        span: new SourceSpan(attrStart, index),
      });
    }

    return {
      element: {
        kind: 'element',
        tagName,
        span: new SourceSpan(start, index),
        attributes,
        children: [],
        selfClosing,
      },
      nextIndex: index,
    };
  }
}

function materializeFragment(
  template: TemplateRef,
  fragment: MutableFragment,
  path: readonly number[],
): AuthoredTemplateFragment {
  const ref = new TemplateNodeRef(
    `${template.id}:fragment:${path.join('.') || 'root'}`,
    template,
    'fragment',
    path,
    null,
  );
  return new AuthoredTemplateFragment(
    ref.id,
    new AuthoredTemplateNodeProvenance(
      ref,
      fragment.span,
      'Template fragment provenance stays on the authored-template side because runtime does not expose a first-class fragment node ref here.',
    ),
    fragment.children.map((current, index) => materializeNode(template, current, [...path, index])),
  );
}

function materializeNode(
  template: TemplateRef,
  node: MutableNode,
  path: readonly number[],
): AuthoredElementNode | AuthoredTextNode {
  if (node.kind === 'text') {
    const ref = new TemplateNodeRef(
      `${template.id}:text:${path.join('.')}`,
      template,
      'text',
      path,
      null,
    );
    return new AuthoredTextNode(
      ref.id,
      node.value,
      new AuthoredTemplateNodeProvenance(ref, node.span),
    );
  }

  const ref = new TemplateNodeRef(
    `${template.id}:element:${path.join('.')}`,
    template,
    'element',
    path,
    null,
  );
  return new AuthoredElementNode(
    ref.id,
    node.tagName,
    new AuthoredTemplateNodeProvenance(ref, node.span),
    node.attributes.map((current, index) => materializeAttribute(template, current, path, index)),
    node.children.map((current, index) => materializeNode(template, current, [...path, index])),
    node.selfClosing,
  );
}

function materializeAttribute(
  template: TemplateRef,
  attribute: MutableAttribute,
  ownerPath: readonly number[],
  index: number,
): AuthoredTemplateAttribute {
  const path = [...ownerPath, index];
  const ref = new TemplateNodeRef(
    `${template.id}:attribute:${path.join('.')}`,
    template,
    'attribute',
    path,
    null,
  );
  return new AuthoredTemplateAttribute(
    ref.id,
    attribute.rawName,
    attribute.rawValue,
    new AuthoredTemplateNodeProvenance(ref, attribute.span),
  );
}

function isWhitespace(value: string | undefined): boolean {
  return value === ' ' || value === '\n' || value === '\r' || value === '\t' || value === '\f';
}

function isTagNameChar(value: string | undefined): boolean {
  return value != null && /[A-Za-z0-9:_-]/.test(value);
}

function findLastIndex<T>(
  values: readonly T[],
  predicate: (value: T) => boolean,
): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const current = values[index];
    if (current != null && predicate(current)) {
      return index;
    }
  }
  return -1;
}
