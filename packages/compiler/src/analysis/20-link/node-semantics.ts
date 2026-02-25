import type { DOMNode, SourceSpan } from "../../model/ir.js";
import type { SemanticsLookup } from "../../schema/registry.js";
import type { DomElementRef, ElementResRef, NodeSem } from "./types.js";

export function resolveNodeSem(n: DOMNode | undefined, lookup: SemanticsLookup): NodeSem {
  if (!n) return { kind: "comment" }; // rows may target synthetic nodes (e.g., wrapper templates)
  switch (n.kind) {
    case "element": {
      const asElementAttr = n.attrs?.find((a) => a.name === "as-element");
      const asElement = asElementAttr?.value;
      const tag = (asElement ?? n.tag).toLowerCase();
      // Custom component wins when both exist
      const customDef = lookup.element(tag);
      const nativeDef = lookup.domElement(tag);
      const custom: ElementResRef | null = customDef ? { def: customDef } : null;
      const native: DomElementRef | null = nativeDef ? { def: nativeDef } : null;
      // Carry positional provenance from the IR DOM — tag spans and
      // as-element value span survive the link boundary for downstream
      // consumers (references, rename, semantic tokens).
      const asElementValueSpan: SourceSpan | null = asElementAttr?.valueLoc ?? null;
      return {
        kind: "element",
        tag,
        custom,
        native,
        tagSpan: n.tagLoc ?? null,
        closeTagSpan: n.closeTagLoc ?? null,
        asElementValueSpan,
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
