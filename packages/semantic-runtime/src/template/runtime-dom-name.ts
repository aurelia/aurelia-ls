import {
  adjustedSvgAttributeName,
  adjustedSvgElementName,
} from './html-foreign-name-adjustments.js';
import { htmlAsciiLowercase, htmlAsciiUppercase } from './html-ascii.js';
import { HtmlNamespaceKind } from './html-ir.js';

export type HtmlRuntimeNamespace = HtmlNamespaceKind | `${HtmlNamespaceKind}`;

/** DOM nodeName spelling seen by Aurelia after the browser parses authored markup. */
export function runtimeNodeName(
  tagName: string,
  namespace: HtmlRuntimeNamespace | undefined,
): string {
  switch (namespace) {
    case undefined:
    case HtmlNamespaceKind.Html:
      return htmlAsciiUppercase(tagName);
    case HtmlNamespaceKind.Svg:
      return adjustedSvgElementName(tagName);
    case HtmlNamespaceKind.Math:
      return htmlAsciiLowercase(tagName);
    case HtmlNamespaceKind.Unknown:
      return tagName;
  }
  throw new Error('Unsupported HTML runtime namespace.');
}

/** DOM localName spelling used by TypeScript's namespace-specific element maps. */
export function runtimeLocalName(
  tagName: string,
  namespace: HtmlRuntimeNamespace,
): string {
  switch (namespace) {
    case HtmlNamespaceKind.Html:
    case HtmlNamespaceKind.Unknown:
      return htmlAsciiLowercase(tagName);
    case HtmlNamespaceKind.Svg:
    case HtmlNamespaceKind.Math:
      return runtimeNodeName(tagName, namespace);
  }
  throw new Error('Unsupported HTML runtime namespace.');
}

/** Runtime lookup spelling used by TemplateCompiler for a custom-element tag. */
export function runtimeElementResourceName(
  tagName: string,
  namespace: HtmlRuntimeNamespace | undefined,
): string {
  // TemplateCompiler calls `.toLowerCase()` on DOM nodeName (and on the
  // `as-element` value). Keep that framework rule here instead of asking
  // presentation adapters to approximate it from authored spelling.
  return runtimeNodeName(tagName, namespace).toLowerCase();
}

/** Runtime lookup spelling used by TemplateCompiler for an `as-element` value. */
export function runtimeAsElementResourceName(value: string): string {
  return value.toLowerCase();
}

/** DOM attribute spelling seen by Aurelia after the browser parses authored markup. */
export function runtimeAttributeName(
  attributeName: string,
  namespace: HtmlRuntimeNamespace | undefined,
): string {
  switch (namespace) {
    case undefined:
    case HtmlNamespaceKind.Html:
      return htmlAsciiLowercase(attributeName);
    case HtmlNamespaceKind.Svg:
      return adjustedSvgAttributeName(attributeName);
    case HtmlNamespaceKind.Math:
      return htmlAsciiLowercase(attributeName) === 'definitionurl'
        ? 'definitionURL'
        : htmlAsciiLowercase(attributeName);
    case HtmlNamespaceKind.Unknown:
      return attributeName;
  }
  throw new Error('Unsupported HTML runtime namespace.');
}
