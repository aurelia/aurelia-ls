/**
 * Reduce a LinkedSemanticsModule into a compact intent:
 * - items: simplified view of property/attribute/event/controller/iterator/ref/style
 * - diags: AU11xx diagnostics (code only + message kept for debugging)
 *
 * NOTE: We only traverse the ROOT linked template. For resolve-host we care
 * about linking decisions on the rows; nested defs are visited by later phases.
 */
export function reduceLinkedToIntent(linked) {
  const out = { items: [], diags: [] };
  const root = linked.templates?.[0];
  if (!root) return out;

  for (const row of root.rows ?? []) {
    for (const ins of row.instructions ?? []) {
      switch (ins.kind) {
        case "propertyBinding":
          out.items.push({
            kind: "prop",
            to: ins.to,
            target: mapTarget(ins.target),
            effectiveMode: ins.effectiveMode,
          });
          break;

        case "attributeBinding":
          out.items.push({
            kind: "attr",
            attr: ins.attr,
            to: ins.to,
            target: mapTarget(ins.target),
          });
          break;

        case "listenerBinding":
          out.items.push({
            kind: "event",
            to: ins.to,
            type: typeName(ins.eventType),
            capture: !!ins.capture,
            modifier: ins.modifier ?? null,
          });
          break;

        case "refBinding":
          out.items.push({
            kind: "ref",
            on: ins.to,
          });
          break;

        case "stylePropertyBinding":
          out.items.push({
            kind: "style",
            to: ins.to,
            target: "style",
          });
          break;

        case "hydrateTemplateController":
          // Capture controller props at the outer frame (we don't descend into def here).
          for (const p of ins.props ?? []) {
            if (p.kind === "propertyBinding") {
              out.items.push({
                kind: "ctrlProp",
                res: ins.res,
                to: p.to,
                target: "controller",
                effectiveMode: p.effectiveMode,
              });
            } else if (p.kind === "iteratorBinding") {
              out.items.push({
                kind: "iterator",
                res: ins.res,
                to: p.to, // should equal semantics.resources.controllers.repeat.iteratorProp
              });
            }
          }
          break;

        default:
          // setAttribute/setClass/setStyle/setProperty etc. are not the focus of this phase’s tests
          break;
      }
    }
  }

  for (const d of linked.diags ?? []) {
    out.diags.push({ code: d.code, message: d.message });
  }
  return out;
}

function mapTarget(t) {
  switch (t?.kind) {
    case "element.bindable": return "bindable";
    case "element.nativeProp": return "native";
    case "controller.prop": return "controller";
    case "attribute": return "attribute";
    case "unknown": return "unknown";
    default: return "unknown";
  }
}

function typeName(t) {
  return t && t.kind === "ts" ? t.name : "unknown";
}
