import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { LetBindingIR, HydrateLetElementIR } from "../../model/ir.js";
import type { ExprTable, P5Element } from "./lower-shared.js";
import { attrLoc, attrValueLoc, toBindingSource, toInterpIR, toSpan } from "./lower-shared.js";

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
    loc: toSpan(el.sourceCodeLocation, table.source),
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

    // <let> supports binding mode commands (bind, one-time, to-view, two-way, from-view)
    // but NOT event commands (trigger, capture) or ref commands
    // Runtime throws AU0704 for unsupported commands
    const validLetCommands = new Set(["bind", "one-time", "to-view", "two-way", "from-view"]);
    if (validLetCommands.has(s.command ?? "")) {
      const loc = attrLoc(el, a.name);
      const valueLoc = attrValueLoc(el, a.name, table.sourceText);
      out.push({
        type: "letBinding",
        to: s.target,
        from: toBindingSource(a.value ?? "", valueLoc, table, "IsProperty"),
        loc: toSpan(loc, table.source),
      });
      continue;
    }

    // Static value (no command) - only interpolations are processed
    // Note: Plain static values like foo="bar" require PrimitiveLiteralExpression handling (not yet implemented)
    if (s.command === null) {
      const raw = a.value ?? "";
      if (raw.includes("${")) {
        const loc = attrLoc(el, a.name);
        const valueLoc = attrValueLoc(el, a.name, table.sourceText);
        out.push({
          type: "letBinding",
          to: s.target,
          from: toInterpIR(raw, valueLoc, table),
          loc: toSpan(loc, table.source),
        });
      }
      // Plain static values without ${} are silently dropped for now
      // TODO: Support static literal binding (foo="bar" -> foo = "bar" string literal)
      continue;
    }

    // Any other command (e.g., .trigger, .capture) is invalid for <let>
    // Emit AU0704: Invalid <let> command
    const loc = attrLoc(el, a.name);
    table.addDiag(
      "AU0704",
      `Invalid command '.${s.command}' on <let>. Only bind, to-view, one-time, two-way, from-view are allowed.`,
      loc
    );
  }
  return { instructions: out, toBindingContext };
}
