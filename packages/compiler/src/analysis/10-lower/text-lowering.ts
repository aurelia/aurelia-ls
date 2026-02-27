import type { InstructionIR } from "../../model/ir.js";
import type { ExprTable, P5Text } from "./lower-shared.js";
import { toInterpIR, toSpan, sourceSlice } from "./lower-shared.js";

export function lowerTextNode(node: P5Text, table: ExprTable): InstructionIR[] {
  // Use sourceSlice (not node.value) so that character offsets align with
  // sourceCodeLocation positions.  See L1 template-analysis.md
  // §Source Coordinate Fidelity.
  const loc = node.sourceCodeLocation;
  const raw = sourceSlice(loc, table.sourceText);
  if (!raw.includes("${")) return [];
  const from = toInterpIR(raw, loc, table);
  // The raw source text preserves \r\n for correct offset alignment, but
  // HTML spec requires text content to be normalized (\r\n → \n, \r → \n).
  // Normalize the interpolation parts so the compiled output matches spec.
  for (let i = 0; i < from.parts.length; i++) {
    from.parts[i] = from.parts[i]!.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }
  return [{ type: "textBinding", from, loc: toSpan(loc, table.source) }];
}
