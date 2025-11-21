import { parseFragment } from "parse5";

import type { IrModule, TemplateIR, InstructionRow, TemplateNode, NodeId } from "../../model/ir.js";
import type { AttributeParser } from "../../language/syntax.js";
import type { Semantics } from "../../language/registry.js";
import { DEFAULT as DEFAULT_SEMANTICS } from "../../language/registry.js";
import type { IExpressionParser } from "../../../parsers/expression-api.js";
import { buildDomRoot } from "./dom-builder.js";
import { collectRows } from "./row-collector.js";
import { normalizeFileForHash, ExprTable, NodeIdGen } from "./lower-shared.js";

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
  const ids = new NodeIdGen();
  const table = new ExprTable(opts.exprParser, normalizeFileForHash(opts.file ?? opts.name ?? ""));
  const nestedTemplates: TemplateIR[] = [];

  const domRoot: TemplateNode = buildDomRoot(p5, ids, undefined, table.file);
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
