import type { InstructionRow, TemplateHostRef, TemplateIR } from "../../model/ir.js";
import { collectControllers } from "./controller-lowering.js";
import { lowerElementAttributes } from "./element-lowering.js";
import type { DomIdAllocator, P5Node, P5Template, ProjectionMap } from "./lower-shared.js";
import { findAttr, isElement, isText } from "./lower-shared.js";
import { lowerLetElement } from "./let-lowering.js";
import { lowerTextNode } from "./text-lowering.js";
import type { TemplateBuildContext } from "./template-builders.js";
import type { LowerContext } from "./lower-context.js";
import { getControllerConfig } from "../../schema/registry.js";
import { resolvePromiseBranchKind } from "../shared/controller-decisions.js";

export function collectRows(
  p: { childNodes?: P5Node[] },
  ids: DomIdAllocator,
  lowerCtx: LowerContext,
  nestedTemplates: TemplateIR[],
  rows: InstructionRow[],
  ctx: TemplateBuildContext,
  skipTags?: Set<string>,
  projectionMap?: ProjectionMap,
): void {
  const { attrParser, catalog } = lowerCtx;
  ids.withinChildren(() => {
    const kids = p.childNodes ?? [];
    for (const n of kids) {
      if (isElement(n)) {
        const tag = n.nodeName.toLowerCase();

        // Skip meta elements (they're extracted separately)
        // But process their children - parse5 may have nested content inside them
        if (skipTags?.has(tag)) {
          // Recursively process children
          collectRows(n, ids, lowerCtx, nestedTemplates, rows, ctx, skipTags, projectionMap);
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
            instructions: [lowerLetElement(n, lowerCtx)],
          });
          ids.exitElement();
          continue;
        }

        const host: TemplateHostRef = { templateId: ctx.templateId, nodeId: target };
        const ctrlRows = collectControllers(n, lowerCtx, nestedTemplates, collectRows, ctx, host);
        const nodeRows =
          ctrlRows.length > 0
            ? ctrlRows
            : lowerElementAttributes(n, lowerCtx, projectionMap).instructions;
        if (nodeRows.length) rows.push({ target, instructions: nodeRows });

        const skipChildren = !!projectionMap?.has(n);
        if (!ctrlRows.length && !skipChildren) {
          if (tag === "template") {
            // Skip promise branch templates - their content is handled by injectPromiseBranchesIntoDef
            const isPromiseBranch = hasPromiseBranchMarker(n as P5Template, attrParser, catalog);
            if (!isPromiseBranch) {
              collectRows(
                (n as P5Template).content,
                ids,
                lowerCtx,
                nestedTemplates,
                rows,
                ctx,
                skipTags,
                projectionMap,
              );
            }
          } else {
            collectRows(n, ids, lowerCtx, nestedTemplates, rows, ctx, skipTags, projectionMap);
          }
        }
        ids.exitElement();
        continue;
      }

      if (isText(n)) {
        const target = ids.nextText();
        const textInstructions = lowerTextNode(n, lowerCtx.table);
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

function hasPromiseBranchMarker(
  template: P5Template,
  attrParser: LowerContext["attrParser"],
  catalog: LowerContext["catalog"],
): boolean {
  for (const attr of template.attrs ?? []) {
    const parsed = attrParser.parse(attr.name, attr.value ?? "");
    const config = getControllerConfig(parsed.target) ?? catalog.resources.controllers[parsed.target];
    if (resolvePromiseBranchKind(config)) return true;
  }
  return false;
}
