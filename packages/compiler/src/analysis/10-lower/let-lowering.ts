import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { ResourceCatalog } from "../../schema/registry.js";
import type { LetBindingIR, HydrateLetElementIR } from "../../model/ir.js";
import type { P5Element } from "./lower-shared.js";
import { attrLoc, attrValueLoc, toBindingSource, toInterpIR, toSpan } from "./lower-shared.js";
import type { LowerContext } from "./lower-context.js";
import type { ExprTable } from "./lower-shared.js";

export function lowerLetElement(
  el: P5Element,
  lowerCtx: LowerContext,
): HydrateLetElementIR {
  const { attrParser, table, catalog } = lowerCtx;
  const { instructions, toBindingContext } = compileLet(el, attrParser, table, catalog);
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
  table: ExprTable,
  catalog: ResourceCatalog
): { instructions: LetBindingIR[]; toBindingContext: boolean } {
  const out: LetBindingIR[] = [];
  let toBindingContext = false;

  for (const a of el.attrs ?? []) {
    if (a.name === "to-binding-context") {
      toBindingContext = true;
      continue;
    }
    const s = attrParser.parse(a.name, a.value ?? "");

    // <let> supports property binding commands (bind, one-time, to-view, two-way, from-view)
    // but NOT event commands (trigger, capture) or ref commands
    // Runtime throws AUR0704 for unsupported commands
    const cmdConfig = s.command ? catalog.bindingCommands[s.command] : null;
    if (cmdConfig?.kind === "property") {
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
    // Emit aurelia/invalid-command-usage: Invalid <let> command
    const loc = attrLoc(el, a.name);
    const validCommands = Object.entries(catalog.bindingCommands)
      .filter(([, cfg]) => cfg.kind === "property")
      .map(([name]) => name)
      .join(", ");
    table.reportDiagnostic(
      "aurelia/invalid-command-usage",
      `Invalid command '.${s.command}' on <let>. Valid commands: ${validCommands}.`,
      loc,
      { aurCode: "AUR0704" },
    );
  }
  return { instructions: out, toBindingContext };
}
