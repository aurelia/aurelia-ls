import { parseFragment } from "parse5";

import type { IrModule, TemplateIR, InstructionRow, TemplateNode, DOMNode, NodeId } from "../../model/ir.js";
import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { ResourceCatalog } from "../../language/registry.js";
import type { IExpressionParser } from "../../parsing/expression-parser.js";
import { buildDomRoot, META_ELEMENT_TAGS } from "./dom-builder.js";
import { collectRows } from "./row-collector.js";
import { ExprTable, DomIdAllocator, type P5Node, type LowerDiagnosticEmitter } from "./lower-shared.js";
import { resolveSourceFile } from "../../model/source.js";
import { NOOP_TRACE, CompilerAttributes, type CompileTrace } from "../../shared/trace.js";
import { extractMeta, stripMetaFromHtml } from "./meta-extraction.js";
import { applyProjectionOrigins, buildProjectionIndex, type TemplateBuildContext } from "./template-builders.js";
import { TemplateIdAllocator } from "../../model/identity.js";

export interface BuildIrOptions {
  file?: string;
  name?: string;
  attrParser: AttributeParser;
  exprParser: IExpressionParser;
  catalog: ResourceCatalog;
  diagnostics: LowerDiagnosticEmitter;
  /** Optional trace for instrumentation. Defaults to NOOP_TRACE. */
  trace?: CompileTrace;
}

export function lowerDocument(html: string, opts: BuildIrOptions): IrModule {
  const trace = opts.trace ?? NOOP_TRACE;

  return trace.span("lower.document", () => {
    trace.setAttributes({
      [CompilerAttributes.TEMPLATE]: opts.name ?? opts.file ?? "<unknown>",
      "lower.htmlLength": html.length,
    });

    // Parse HTML with parse5
    trace.event("lower.parse.start");
    const p5 = parseFragment(html, { sourceCodeLocationInfo: true });
    trace.event("lower.parse.complete");

    const catalog = opts.catalog;
    const source = resolveSourceFile(opts.file ?? opts.name ?? "");
    const ids = new DomIdAllocator();
    let diagCount = 0;
    const emitter: LowerDiagnosticEmitter = {
      emit: (code, input) => {
        const diag = opts.diagnostics.emit(code, input);
        diagCount += 1;
        return diag;
      },
    };
    const table = new ExprTable(opts.exprParser, source, html, emitter);
    const nestedTemplates: TemplateIR[] = [];
    const templateIds = new TemplateIdAllocator();
    const rootTemplateId = templateIds.allocate();
    const rootCtx: TemplateBuildContext = { templateId: rootTemplateId, templateIds };

    // Extract meta elements (<import>, <bindable>, etc.) before DOM building
    trace.event("lower.meta.start");
    const { meta: templateMeta, removeRanges } = extractMeta(p5, source, html);
    trace.event("lower.meta.complete");

    // Tags to skip during DOM building and row collection
    const skipTags = META_ELEMENT_TAGS;

    const projectionIndex = buildProjectionIndex(
      p5,
      opts.attrParser,
      table,
      nestedTemplates,
      catalog,
      collectRows,
      rootCtx,
      skipTags,
    );

    // Build DOM tree (skipping meta elements)
    trace.event("lower.dom.start");
    const domIdMap = new WeakMap<P5Node, NodeId>();
    const domRoot: TemplateNode = buildDomRoot(p5, ids, table.source, html, domIdMap, skipTags, projectionIndex.map);
    trace.event("lower.dom.complete");

    // Collect instruction rows (skipping meta elements)
    trace.event("lower.rows.start");
    const rows: InstructionRow[] = [];
    collectRows(p5, ids, opts.attrParser, table, nestedTemplates, rows, catalog, rootCtx, skipTags, projectionIndex.map);
    trace.event("lower.rows.complete");

    applyProjectionOrigins(projectionIndex.entries, domIdMap, rootTemplateId);

    // Build root template with meta
    const root: TemplateIR = {
      id: rootTemplateId,
      dom: domRoot,
      rows,
      name: opts.name!,
      templateMeta,
      origin: { kind: "root", file: table.source.id },
    };

    const result: IrModule = {
      version: "aurelia-ir@1",
      templates: [root, ...nestedTemplates],
      exprTable: table.entries,
      name: opts.name!,
      // Store stripped HTML for emit-template (meta elements removed)
      meta: removeRanges.length > 0
        ? { strippedHtml: stripMetaFromHtml(html, removeRanges) }
        : undefined,
    };

    // Record output metrics
    trace.setAttributes({
      [CompilerAttributes.NODE_COUNT]: countNodes(domRoot),
      [CompilerAttributes.EXPR_COUNT]: table.entries.length,
      [CompilerAttributes.ROW_COUNT]: rows.length,
      "lower.templateCount": result.templates.length,
      "lower.metaImports": templateMeta.imports.length,
      "lower.metaBindables": templateMeta.bindables.length,
      [CompilerAttributes.DIAG_COUNT]: diagCount,
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
