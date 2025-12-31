import { parseFragment } from "parse5";

import type { IrModule, TemplateIR, InstructionRow, TemplateNode, DOMNode } from "../../model/ir.js";
import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { Semantics } from "../../language/registry.js";
import { DEFAULT as DEFAULT_SEMANTICS } from "../../language/registry.js";
import type { IExpressionParser } from "../../parsing/expression-parser.js";
import { buildDomRoot } from "./dom-builder.js";
import { collectRows } from "./row-collector.js";
import { ExprTable, DomIdAllocator } from "./lower-shared.js";
import { resolveSourceFile } from "../../model/source.js";
import { NOOP_TRACE, CompilerAttributes, type CompileTrace } from "../../shared/trace.js";

export interface BuildIrOptions {
  file?: string;
  name?: string;
  attrParser: AttributeParser;
  exprParser: IExpressionParser;
  sem?: Semantics;
  /** Optional trace for instrumentation. Defaults to NOOP_TRACE. */
  trace?: CompileTrace;
}

export function lowerDocument(html: string, opts: BuildIrOptions): IrModule {
  const trace = opts.trace ?? NOOP_TRACE;

  return trace.span("lower.document", () => {
    trace.setAttributes({
      [CompilerAttributes.TEMPLATE]: opts.name ?? opts.file ?? "<unknown>",
      "lower.html_length": html.length,
    });

    // Parse HTML with parse5
    trace.event("lower.parse_start");
    const p5 = parseFragment(html, { sourceCodeLocationInfo: true });
    trace.event("lower.parse_complete");

    const sem = opts.sem ?? DEFAULT_SEMANTICS;
    const source = resolveSourceFile(opts.file ?? opts.name ?? "");
    const ids = new DomIdAllocator();
    const table = new ExprTable(opts.exprParser, source, html);
    const nestedTemplates: TemplateIR[] = [];

    // Build DOM tree
    trace.event("lower.dom_start");
    const domRoot: TemplateNode = buildDomRoot(p5, ids, table.source);
    trace.event("lower.dom_complete");

    // Collect instruction rows
    trace.event("lower.rows_start");
    const rows: InstructionRow[] = [];
    collectRows(p5, ids, opts.attrParser, table, nestedTemplates, rows, sem);
    trace.event("lower.rows_complete");

    const root: TemplateIR = { dom: domRoot, rows, name: opts.name! };

    const result: IrModule = {
      version: "aurelia-ir@1",
      templates: [root, ...nestedTemplates],
      exprTable: table.entries,
      name: opts.name!,
    };

    // Include diagnostics if any were collected
    if (table.diags.length > 0) {
      result.diags = table.diags;
    }

    // Record output metrics
    trace.setAttributes({
      [CompilerAttributes.NODE_COUNT]: countNodes(domRoot),
      [CompilerAttributes.EXPR_COUNT]: table.entries.length,
      [CompilerAttributes.ROW_COUNT]: rows.length,
      "lower.template_count": result.templates.length,
      [CompilerAttributes.DIAG_COUNT]: result.diags?.length ?? 0,
    });

    return result;
  });
}

/** Count total nodes in the DOM tree. */
function countNodes(node: DOMNode): number {
  let count = 1;
  if (node.kind === "element" || node.kind === "template") {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}
