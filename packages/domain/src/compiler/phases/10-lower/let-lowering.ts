import type { AttributeParser } from "../../language/syntax.js";
import type { LetBindingIR, HydrateLetElementIR } from "../../model/ir.js";
import type { ExprTable, P5Element } from "./lower-shared.js";
import { attrLoc, toBindingSource, toInterpIR, toSpan } from "./lower-shared.js";

export function lowerLetElement(
  el: P5Element,
  attrParser: AttributeParser,
  table: ExprTable
): HydrateLetElementIR {
  const { instructions, toBindingContext } = compileLet(el, attrParser, table);
  return {
    type: "hydrateLetElement",
    instructions,
    toBindingContext,
    loc: toSpan(el.sourceCodeLocation, table.file),
  };
}

function compileLet(
  el: P5Element,
  attrParser: AttributeParser,
  table: ExprTable
): { instructions: LetBindingIR[]; toBindingContext: boolean } {
  const out: LetBindingIR[] = [];
  let toBindingContext = false;

  for (const a of el.attrs ?? []) {
    if (a.name === "to-binding-context") {
      toBindingContext = true;
      continue;
    }
    const s = attrParser.parse(a.name, a.value ?? "");
    if (
      s.command === "bind" ||
      s.command === "one-time" ||
      s.command === "to-view" ||
      s.command === "two-way"
    ) {
      const loc = attrLoc(el, a.name);
      out.push({
        type: "letBinding",
        to: s.target,
        from: toBindingSource(a.value ?? "", loc, table, "IsProperty"),
        loc: toSpan(loc, table.file),
      });
      continue;
    }

    const raw = a.value ?? "";
    if (raw.includes("${")) {
      const loc = attrLoc(el, a.name);
      out.push({
        type: "letBinding",
        to: s.target,
        from: toInterpIR(raw, loc, table),
        loc: toSpan(loc, table.file),
      });
    }
  }
  return { instructions: out, toBindingContext };
}
