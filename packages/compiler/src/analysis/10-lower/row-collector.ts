import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { ResourceCatalog } from "../../language/registry.js";
import type { InstructionRow, TemplateHostRef, TemplateIR } from "../../model/ir.js";
import { collectControllers } from "./controller-lowering.js";
import { lowerElementAttributes } from "./element-lowering.js";
import type { ExprTable, DomIdAllocator, P5Node, P5Template, ProjectionMap } from "./lower-shared.js";
import { findAttr, isElement, isText } from "./lower-shared.js";
import { lowerLetElement } from "./let-lowering.js";
import { lowerTextNode } from "./text-lowering.js";
import type { TemplateBuildContext } from "./template-builders.js";

export function collectRows(
  p: { childNodes?: P5Node[] },
  ids: DomIdAllocator,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  rows: InstructionRow[],
  catalog: ResourceCatalog,
  ctx: TemplateBuildContext,
  skipTags?: Set<string>,
  projectionMap?: ProjectionMap,
): void {
  ids.withinChildren(() => {
    const kids = p.childNodes ?? [];
    for (const n of kids) {
      if (isElement(n)) {
        const tag = n.nodeName.toLowerCase();

        // Skip meta elements (they're extracted separately)
        // But process their children - parse5 may have nested content inside them
        if (skipTags?.has(tag)) {
          // Recursively process children
          collectRows(n, ids, attrParser, table, nestedTemplates, rows, catalog, ctx, skipTags, projectionMap);
          continue;
        }

        const target = ids.nextElement();

        if (tag === "template" && findAttr(n, "as-custom-element")) {
          ids.exitElement();
          continue;
        }

        if (tag === "let") {
          rows.push({
            target,
            instructions: [lowerLetElement(n, attrParser, table, catalog)],
          });
          ids.exitElement();
          continue;
        }

        const host: TemplateHostRef = { templateId: ctx.templateId, nodeId: target };
        const ctrlRows = collectControllers(n, attrParser, table, nestedTemplates, catalog, collectRows, ctx, host);
        const nodeRows =
          ctrlRows.length > 0
            ? ctrlRows
            : lowerElementAttributes(n, attrParser, table, catalog, projectionMap).instructions;
        if (nodeRows.length) rows.push({ target, instructions: nodeRows });

        const skipChildren = !!projectionMap?.has(n);
        if (!ctrlRows.length && !skipChildren) {
          if (tag === "template") {
            // Skip promise branch templates - their content is handled by injectPromiseBranchesIntoDef
            const isPromiseBranch = findAttr(n, "then") || findAttr(n, "catch") || findAttr(n, "pending");
            if (!isPromiseBranch) {
              collectRows(
                (n as P5Template).content,
                ids,
                attrParser,
                table,
                nestedTemplates,
                rows,
                catalog,
                ctx,
                skipTags,
                projectionMap,
              );
            }
          } else {
            collectRows(n, ids, attrParser, table, nestedTemplates, rows, catalog, ctx, skipTags, projectionMap);
          }
        }
        ids.exitElement();
        continue;
      }

      if (isText(n)) {
        const target = ids.nextText();
        const textInstructions = lowerTextNode(n, table);
        if (textInstructions.length) {
          rows.push({
            target,
            instructions: textInstructions,
          });
        }
      }
    }
  });
}
