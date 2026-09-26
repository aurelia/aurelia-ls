import type { HydrateElementInstruction } from './instruction-ir.js';

/** Reconnect a regenerated browser-final hydrate instruction to its exact authored resource/capture site. */
export function sameHydrateElementOwnership(
  left: HydrateElementInstruction,
  right: HydrateElementInstruction,
): boolean {
  return left.definitionProductHandle === right.definitionProductHandle
    && left.elementName === right.elementName
    && left.resourceLookupName === right.resourceLookupName
    && left.sourceAddressHandle != null
    && left.sourceAddressHandle === right.sourceAddressHandle
    && left.captureSyntaxProductHandles.length === right.captureSyntaxProductHandles.length
    && left.captureSyntaxProductHandles.every((handle, index) => handle === right.captureSyntaxProductHandles[index]);
}
