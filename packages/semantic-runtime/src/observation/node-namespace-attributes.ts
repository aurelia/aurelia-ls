/**
 * Namespace attributes handled specially by Aurelia's runtime-html NodeObserverLocator.
 *
 * This is not a general SVG/XML completeness list. It mirrors runtime-html's `nsAttributes` table, which is consulted
 * before the generic SVG/data-attribute accessor path and therefore selects `AttributeNSAccessor`.
 */
export class NodeNamespaceAttribute {
  constructor(
    /** Local name passed to getAttributeNS/setAttributeNS after the namespace is selected. */
    readonly localName: string,
    /** Namespace URI used by AttributeNSAccessor.forNs(...). */
    readonly namespace: string,
  ) {}
}

const xlinkNamespace = 'http://www.w3.org/1999/xlink';
const xmlNamespace = 'http://www.w3.org/XML/1998/namespace';
const xmlnsNamespace = 'http://www.w3.org/2000/xmlns/';

const namespaceAttributes = new Map<string, NodeNamespaceAttribute>([
  ['xlink:actuate', new NodeNamespaceAttribute('actuate', xlinkNamespace)],
  ['xlink:arcrole', new NodeNamespaceAttribute('arcrole', xlinkNamespace)],
  ['xlink:href', new NodeNamespaceAttribute('href', xlinkNamespace)],
  ['xlink:role', new NodeNamespaceAttribute('role', xlinkNamespace)],
  ['xlink:show', new NodeNamespaceAttribute('show', xlinkNamespace)],
  ['xlink:title', new NodeNamespaceAttribute('title', xlinkNamespace)],
  ['xlink:type', new NodeNamespaceAttribute('type', xlinkNamespace)],
  ['xml:lang', new NodeNamespaceAttribute('lang', xmlNamespace)],
  ['xml:space', new NodeNamespaceAttribute('space', xmlNamespace)],
  ['xmlns', new NodeNamespaceAttribute('xmlns', xmlnsNamespace)],
  ['xmlns:xlink', new NodeNamespaceAttribute('xlink', xmlnsNamespace)],
]);

export function nodeNamespaceAttribute(attributeName: string): NodeNamespaceAttribute | null {
  return namespaceAttributes.get(attributeName.toLowerCase()) ?? null;
}

export function isNodeNamespaceAttribute(attributeName: string): boolean {
  return nodeNamespaceAttribute(attributeName) != null;
}
