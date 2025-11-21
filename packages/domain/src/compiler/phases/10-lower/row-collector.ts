import type { AttributeParser } from "../../language/syntax.js";
import type { Semantics } from "../../language/registry.js";
import type { InstructionRow, NodeId, TemplateIR } from "../../model/ir.js";
import { collectControllers } from "./controller-lowering.js";
import { lowerElementAttributes } from "./element-lowering.js";
import type { ExprTable, NodeIdGen, P5Node, P5Template } from "./lower-shared.js";
import { findAttr, isElement, isText } from "./lower-shared.js";
import { lowerLetElement } from "./let-lowering.js";
import { lowerTextNode } from "./text-lowering.js";

export function collectRows(
  p: { childNodes?: P5Node[] },
  ids: NodeIdGen,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  rows: InstructionRow[],
  sem: Semantics
): void {
  const kids = p.childNodes ?? [];
  let elIdx = 0;
  let textIdx = 0;

  for (const n of kids) {
    if (isElement(n)) {
      const tag = n.nodeName.toLowerCase();
      const target = ids.pushElement(elIdx++) as NodeId;

      if (tag === "template" && findAttr(n, "as-custom-element")) {
        ids.pop();
        continue;
      }

      if (tag === "let") {
        rows.push({
          target,
          instructions: [lowerLetElement(n, attrParser, table)],
        });
        ids.pop();
        continue;
      }

      const ctrlRows = collectControllers(n, attrParser, table, nestedTemplates, sem, collectRows);
      const nodeRows =
        ctrlRows.length > 0 ? ctrlRows : lowerElementAttributes(n, attrParser, table, sem).instructions;
      if (nodeRows.length) rows.push({ target, instructions: nodeRows });

      if (!ctrlRows.length) {
        if (tag === "template") {
          collectRows(
            (n as P5Template).content,
            ids,
            attrParser,
            table,
            nestedTemplates,
            rows,
            sem
          );
        } else {
          collectRows(n, ids, attrParser, table, nestedTemplates, rows, sem);
        }
      }
      ids.pop();
      continue;
    }

    if (isText(n)) {
      const target = `${ids.current()}#text@${textIdx++}` as NodeId;
      const textInstructions = lowerTextNode(n, table);
      if (textInstructions.length) {
        rows.push({
          target,
          instructions: textInstructions,
        });
      }
    }
  }
}
