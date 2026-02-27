import type { InstructionIR } from "../../model/ir.js";
import type { ExprTable, P5Text } from "./lower-shared.js";
import { toInterpIR, toSpan } from "./lower-shared.js";

export function lowerTextNode(node: P5Text, table: ExprTable): InstructionIR[] {
  // Use the original source text (not node.value) so that character offsets
  // align with sourceCodeLocation positions.  Parse5 normalizes \r\n → \n in
  // text node values, but sourceCodeLocation offsets reference the original
  // text.  Mixing the two causes a 1-byte drift per \r\n line ending.
  const loc = node.sourceCodeLocation;
  const raw = loc
    ? table.sourceText.slice(loc.startOffset, loc.endOffset)
    : (node.value ?? "");
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
