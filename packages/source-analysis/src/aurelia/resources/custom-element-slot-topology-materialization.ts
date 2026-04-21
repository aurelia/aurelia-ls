import { TemplateRef, type SourceFileRef, type SourceNodeRef } from '../refs.js';
import { AuthoredTemplateParser } from '../compiler/authored-template-parser.js';
import {
  AuthoredTemplateFragment,
  AuthoredElementNode,
  AuthoredTextNode,
  type AuthoredTemplateNode,
} from '../compiler/authored-template.js';
import type {
  CustomElementFieldProvenance,
  CustomElementTemplateSource,
} from './custom-element-support.js';
import {
  CustomElementDeclaredSlot,
  CustomElementSlotTopology,
} from './custom-element-slot-topology-support.js';

export function readCustomElementSlotTopology(
  ownerId: string,
  owner: SourceNodeRef,
  file: SourceFileRef,
  templateSource: CustomElementTemplateSource,
  hasSlotsProvenance: CustomElementFieldProvenance | null,
  explicitHasSlots: boolean | null,
  processContentDeclared: boolean,
): CustomElementSlotTopology {
  if (templateSource.kind !== 'inline-string' || templateSource.inlineText == null) {
    return new CustomElementSlotTopology(
      explicitHasSlots,
      [],
      hasSlotsProvenance == null ? [] : [hasSlotsProvenance],
      explicitHasSlots == null
        ? 'Slot topology stays open unless inline template source is available or hasSlots closes explicitly.'
        : 'Slot topology currently closes only through the explicit hasSlots surface because no inline template body was available to scan.',
    );
  }

  const templateRef = new TemplateRef(
    `template:${ownerId}:${owner.span.start}-${owner.span.end}`,
    owner,
    file,
    owner.span,
  );
  const authored = new AuthoredTemplateParser().parse(templateRef, templateSource.inlineText);
  const slots = authored.root.children.flatMap(collectSlots);
  const derivedHasSlots = slots.length > 0;
  const runtimeHasSlots = explicitHasSlots ?? (processContentDeclared ? null : derivedHasSlots);

  return new CustomElementSlotTopology(
    runtimeHasSlots,
    slots,
    hasSlotsProvenance == null ? [] : [hasSlotsProvenance],
    slots.length === 0
      ? processContentDeclared
        ? 'Inline template source was scanned and no authored <au-slot> elements were found, but runtime-equivalent slot closure remains open because processContent may still mutate host content before compilation.'
        : 'Inline template source was scanned and no <au-slot> elements were found.'
      : processContentDeclared
        ? 'Inline template source was scanned for authored <au-slot> elements and fallback bodies, but runtime-equivalent hasSlots remains open because processContent may still mutate template content before compilation.'
        : 'Inline template source was scanned for <au-slot> elements and fallback bodies.',
  );
}

function collectSlots(
  node: AuthoredTemplateNode,
): readonly CustomElementDeclaredSlot[] {
  if (!(node instanceof AuthoredElementNode)) {
    return [];
  }

  if (isLocalTemplateDeclaration(node)) {
    // NOTE: <template as-custom-element="..."> declares a nested local custom
    // element. Any <au-slot> inside that subtree belongs to the local element,
    // not to the outer custom element whose inline template we are scanning.
    return [];
  }

  const own = node.tagName === 'au-slot'
    ? [materializeSlot(node)]
    : [];
  return [
    ...own,
    ...node.children.flatMap(collectSlots),
  ];
}

function isLocalTemplateDeclaration(
  node: AuthoredElementNode,
): boolean {
  return node.tagName === 'template'
    && node.attributes.some((current) =>
      current.rawName === 'as-custom-element' && current.rawValue.trim().length > 0,
    );
}

function materializeSlot(
  node: AuthoredElementNode,
): CustomElementDeclaredSlot {
  const rawName = node.attributes.find((current) => current.rawName === 'name')?.rawValue ?? '';
  const slotName = rawName.length === 0 ? 'default' : rawName;
  return new CustomElementDeclaredSlot(
    slotName,
    slotName === 'default' ? 'default-slot' : 'named-slot',
    node.provenance.ref,
    hasMeaningfulFallbackContent(node),
    rawName.length === 0
      ? 'Slot topology recovered a default <au-slot> declaration from inline template source.'
      : 'Slot topology recovered a named <au-slot> declaration from inline template source.',
  );
}

function hasMeaningfulFallbackContent(
  node: AuthoredElementNode,
): boolean {
  return node.children.some((current) => {
    if (current instanceof AuthoredElementNode) {
      return true;
    }
    if (current instanceof AuthoredTextNode) {
      return current.value.trim().length > 0;
    }
    return current instanceof AuthoredTemplateFragment
      && current.children.length > 0;
  });
}
