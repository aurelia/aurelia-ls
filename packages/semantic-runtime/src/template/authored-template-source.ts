import { isHtmlVoidElement } from './html-elements.js';

/** Authored-template child node family used by product-free source emitters. */
export enum AuthoredTemplateChildSourceKind {
  /** Raw authored text content, already escaped or intentionally carrying interpolation syntax. */
  Text = 'text',
}

/** Raw authored text child source. */
export interface AuthoredTemplateTextChildSource {
  readonly kind: AuthoredTemplateChildSourceKind.Text;
  readonly text: string;
}

/** Child source that can be nested under a structured authored-template element. */
export type AuthoredTemplateChildSource =
  | AuthoredTemplateElementSource
  | AuthoredTemplateTextChildSource;

/** Structured authored-template element source for product-free source emitters. */
export interface AuthoredTemplateElementSource {
  /** HTML tag or Aurelia custom-element resource name. */
  readonly tagName: string;
  /** Authored attributes without surrounding element text. */
  readonly attributes: readonly AuthoredTemplateAttributeSource[];
  /** Direct child text, or null when children own the body. */
  readonly childText: string | null;
  /** Structured child nodes nested under this element. */
  readonly children?: readonly AuthoredTemplateChildSource[];
}

/** Authored-template attribute source before it is joined into element text. */
export interface AuthoredTemplateAttributeSource {
  /** Authored attribute name. */
  readonly rawName: string;
  /** Authored attribute value before double-quoted attribute escaping; null emits a valueless attribute. */
  readonly rawValue?: string | null;
}

/** Escape a value for use inside a double-quoted authored template attribute. */
export function escapeDoubleQuotedAttributeValue(value: string): string {
  return value.replace(/"/g, '&quot;');
}

/** Escape plain authored text content that is not intended to contain markup or interpolation. */
export function authoredTemplateTextContentText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\$\{/g, '\\${');
}

/** Create a raw authored text child node. */
export function authoredTemplateTextChildSource(text: string): AuthoredTemplateTextChildSource {
  return {
    kind: AuthoredTemplateChildSourceKind.Text,
    text,
  };
}

/** Create an escaped plain text child node. */
export function authoredTemplatePlainTextChildSource(value: string): AuthoredTemplateTextChildSource {
  return authoredTemplateTextChildSource(authoredTemplateTextContentText(value));
}

/** Serialize one authored template attribute. */
export function authoredTemplateAttributeText(
  source: AuthoredTemplateAttributeSource,
): string {
  return source.rawValue == null
    ? source.rawName
    : `${source.rawName}="${escapeDoubleQuotedAttributeValue(source.rawValue)}"`;
}

/** Create structured authored-template element source. */
export function authoredTemplateElementSource(
  tagName: string,
  attributes: readonly AuthoredTemplateAttributeSource[],
  childText: string | null,
  children: readonly AuthoredTemplateChildSource[] = [],
): AuthoredTemplateElementSource {
  return {
    tagName,
    attributes,
    childText,
    children,
  };
}

/** Render structured authored-template element source to template text. */
export function authoredTemplateElementSourceText(
  source: AuthoredTemplateElementSource,
): string {
  const startTag = source.attributes.length === 0
    ? `<${source.tagName}>`
    : `<${source.tagName} ${source.attributes.map(authoredTemplateAttributeText).join(' ')}>`;
  const children = source.children ?? [];
  if (children.length > 0) {
    const childTexts = [
      ...(source.childText == null ? [] : [source.childText]),
      ...children.map(authoredTemplateChildSourceText),
    ];
    return `${startTag}
${childTexts.map(indentTemplateSource).join('\n')}
</${source.tagName}>`;
  }
  if (source.childText == null) {
    return isHtmlVoidElement(source.tagName)
      ? startTag
      : `${startTag}</${source.tagName}>`;
  }
  return `${startTag}${source.childText}</${source.tagName}>`;
}

/** Render one authored-template child source. */
export function authoredTemplateChildSourceText(
  source: AuthoredTemplateChildSource,
): string {
  return isAuthoredTemplateTextChildSource(source)
    ? source.text
    : authoredTemplateElementSourceText(source);
}

/** Add authored attributes to structured element source without reparsing rendered source text. */
export function appendAuthoredTemplateElementAttributes(
  source: AuthoredTemplateElementSource,
  attributes: readonly AuthoredTemplateAttributeSource[],
): AuthoredTemplateElementSource {
  return authoredTemplateElementSource(
    source.tagName,
    [
      ...source.attributes,
      ...attributes,
    ],
    source.childText,
    source.children ?? [],
  );
}

function indentTemplateSource(text: string): string {
  return text.split('\n').map((line) => `  ${line}`).join('\n');
}

function isAuthoredTemplateTextChildSource(
  source: AuthoredTemplateChildSource,
): source is AuthoredTemplateTextChildSource {
  return 'kind' in source && source.kind === AuthoredTemplateChildSourceKind.Text;
}
