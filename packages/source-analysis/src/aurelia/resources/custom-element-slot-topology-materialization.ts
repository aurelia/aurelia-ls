import type { SourceFileRef, SourceNodeRef } from '../refs.js';
import type {
  CustomElementFieldProvenance,
  CustomElementTemplateSource,
} from './custom-element-support.js';
import {
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

  return new CustomElementSlotTopology(
    explicitHasSlots,
    [],
    hasSlotsProvenance == null ? [] : [hasSlotsProvenance],
    explicitHasSlots == null
      ? `Inline template source is present for ${ownerId}, but slot topology scanning is intentionally offline until the new HTML/template parser lands.`
      : `Inline template source is present for ${ownerId}, but slot topology currently closes only through the explicit hasSlots surface until the new HTML/template parser lands.`,
  );
}
