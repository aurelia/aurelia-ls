import { parseFragment } from "parse5";

import type { IrModule, TemplateIR, InstructionRow, TemplateNode } from "../../model/ir.js";
import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { Semantics } from "../../language/registry.js";
import { DEFAULT as DEFAULT_SEMANTICS } from "../../language/registry.js";
import type { IExpressionParser } from "../../parsing/expression-parser.js";
import { buildDomRoot } from "./dom-builder.js";
import { collectRows } from "./row-collector.js";
import { ExprTable, DomIdAllocator } from "./lower-shared.js";
import { resolveSourceFile } from "../../model/source.js";

export interface BuildIrOptions {
  file?: string;
  name?: string;
  attrParser: AttributeParser;
  exprParser: IExpressionParser;
  sem?: Semantics;
}

export function lowerDocument(html: string, opts: BuildIrOptions): IrModule {
  const p5 = parseFragment(html, { sourceCodeLocationInfo: true });
  const sem = opts.sem ?? DEFAULT_SEMANTICS;
  const source = resolveSourceFile(opts.file ?? opts.name ?? "");
  const ids = new DomIdAllocator();
  const table = new ExprTable(opts.exprParser, source);
  const nestedTemplates: TemplateIR[] = [];

  const domRoot: TemplateNode = buildDomRoot(p5, ids, table.source);
  const rows: InstructionRow[] = [];
  collectRows(p5, ids, opts.attrParser, table, nestedTemplates, rows, sem);

  const root: TemplateIR = { dom: domRoot, rows, name: opts.name! };

  return {
    version: "aurelia-ir@1",
    templates: [root, ...nestedTemplates],
    exprTable: table.entries,
    name: opts.name!,
  };
}
