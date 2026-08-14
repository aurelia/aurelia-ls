import {
  adjustedSvgAttributeName,
  adjustedSvgElementName,
} from './html-foreign-name-adjustments.js';
import { htmlAsciiLowercase, htmlAsciiUppercase } from './html-ascii.js';
import { HtmlNamespaceKind } from './html-ir.js';

/** DOM nodeName spelling seen by Aurelia after the browser parses authored markup. */
export function runtimeNodeName(
  tagName: string,
  namespace: HtmlNamespaceKind | undefined,
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
}

/** DOM localName spelling used by TypeScript's namespace-specific element maps. */
export function runtimeLocalName(
  tagName: string,
  namespace: HtmlNamespaceKind,
): string {
  switch (namespace) {
    case HtmlNamespaceKind.Html:
    case HtmlNamespaceKind.Unknown:
      return htmlAsciiLowercase(tagName);
    case HtmlNamespaceKind.Svg:
    case HtmlNamespaceKind.Math:
      return runtimeNodeName(tagName, namespace);
  }
}

/** DOM attribute spelling seen by Aurelia after the browser parses authored markup. */
export function runtimeAttributeName(
  attributeName: string,
  namespace: HtmlNamespaceKind | undefined,
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
}
