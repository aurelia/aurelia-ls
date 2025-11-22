import type { InstructionIR } from "../../model/ir.js";
import type { ExprTable, P5Text } from "./lower-shared.js";
import { toInterpIR, toSpan } from "./lower-shared.js";

export function lowerTextNode(node: P5Text, table: ExprTable): InstructionIR[] {
  const raw = node.value ?? "";
  if (!raw.includes("${")) return [];
  const from = toInterpIR(raw, node.sourceCodeLocation, table);
  return [{ type: "textBinding", from, loc: toSpan(node.sourceCodeLocation, table.source) }];
}
