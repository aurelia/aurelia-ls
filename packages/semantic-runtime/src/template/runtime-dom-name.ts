import {
  runtimeSvgAttributeName,
  runtimeSvgElementName,
} from '../observation/svg-analyzer-data.generated.js';
import { HtmlNamespaceKind } from './html-ir.js';

/** DOM nodeName spelling seen by Aurelia after the browser parses authored markup. */
export function runtimeNodeName(
  tagName: string,
  namespace: HtmlNamespaceKind | undefined,
): string {
  switch (namespace) {
    case undefined:
    case HtmlNamespaceKind.Html:
      return tagName.toUpperCase();
    case HtmlNamespaceKind.Svg:
      return runtimeSvgElementName(tagName);
    case HtmlNamespaceKind.Math:
      return tagName.toLowerCase();
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
      return tagName.toLowerCase();
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
      return attributeName.toLowerCase();
    case HtmlNamespaceKind.Svg:
      return runtimeSvgAttributeName(attributeName);
    case HtmlNamespaceKind.Math:
      return attributeName.toLowerCase() === 'definitionurl'
        ? 'definitionURL'
        : attributeName.toLowerCase();
    case HtmlNamespaceKind.Unknown:
      return attributeName;
  }
}
