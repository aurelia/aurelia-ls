import type { DOMNode } from "../../model/ir.js";
import type { SemanticsLookup } from "../../language/registry.js";
import type { DomElementRef, ElementResRef, NodeSem } from "./types.js";

export function resolveNodeSem(n: DOMNode | undefined, lookup: SemanticsLookup): NodeSem {
  if (!n) return { kind: "comment" }; // rows may target synthetic nodes (e.g., wrapper templates)
  switch (n.kind) {
    case "element": {
      const asElement = n.attrs?.find((a) => a.name === "as-element")?.value;
      const tag = (asElement ?? n.tag).toLowerCase();
      // Custom component wins when both exist
      const customDef = lookup.element(tag);
      const nativeDef = lookup.domElement(tag);
      const custom: ElementResRef | null = customDef ? { def: customDef } : null;
      const native: DomElementRef | null = nativeDef ? { def: nativeDef } : null;
      return {
        kind: "element",
        tag,
        custom,
        native,
      };
    }
    case "template":
      return { kind: "template" };
    case "text":
      return { kind: "text" };
    case "comment":
      return { kind: "comment" };
    default:
      return { kind: "comment" };
  }
}
