import type { AttributeParser } from "../../language/syntax.js";
import type { Semantics } from "../../language/registry.js";
import type {
  ElementBindableIR,
  HydrateAttributeIR,
  HydrateElementIR,
  InstructionIR,
  SetPropertyIR,
} from "../../model/ir.js";
import type { ExprTable, P5Element, P5Loc } from "./lower-shared.js";
import {
  attrLoc,
  camelCase,
  findAttr,
  toBindingSource,
  toExprRef,
  toInterpIR,
  toMode,
  toSpan,
} from "./lower-shared.js";
import { resolveAttrDef, resolveElementDef } from "./resource-utils.js";

export interface ElementLoweringResult {
  instructions: InstructionIR[];
  containerless: boolean;
}

export function lowerElementAttributes(
  el: P5Element,
  attrParser: AttributeParser,
  table: ExprTable,
  sem: Semantics
): ElementLoweringResult {
  const attrs = el.attrs ?? [];
  const authoredTag = el.nodeName.toLowerCase();
  const asElement = findAttr(el, "as-element");
  const effectiveTag = (asElement?.value ?? authoredTag).toLowerCase();
  const elementDef = resolveElementDef(effectiveTag, sem);
  const containerless = !!elementDef?.containerless || !!findAttr(el, "containerless");

  const hydrateElementProps: ElementBindableIR[] = [];
  const hydrateAttributes: HydrateAttributeIR[] = [];
  const tail: InstructionIR[] = [];

  const lowerBindable = (
    sink: ElementBindableIR[],
    target: string,
    attrName: string,
    raw: string,
    loc: P5Loc,
    command: string | null
  ) => {
    const to = camelCase(target);
    if (command) {
      sink.push({
        type: "propertyBinding",
        to,
        from: toBindingSource(raw, loc, table, "IsProperty"),
        mode: toMode(command, attrName),
        loc: toSpan(loc, table.source),
      });
      return;
    }
    if (raw.includes("${")) {
      sink.push({
        type: "attributeBinding",
        attr: attrName,
        to,
        from: toInterpIR(raw, loc, table),
        loc: toSpan(loc, table.source),
      });
      return;
    }
    if (raw.length === 0) return;
    sink.push({
      type: "setProperty",
      to,
      value: raw,
      loc: toSpan(loc, table.source),
    } as SetPropertyIR);
  };

  for (const a of attrs) {
    const loc = attrLoc(el, a.name);
    const s = attrParser.parse(a.name, a.value ?? "");
    const raw = a.value ?? "";

    if (a.name === "as-element" || a.name === "containerless") continue;
    if (isControllerAttr(s, sem)) continue;

    if (s.command === "trigger" || s.command === "capture") {
      tail.push({
        type: "listenerBinding",
        to: s.target,
        from: toExprRef(raw, loc, table, "IsFunction"),
        capture: s.command === "capture",
        modifier: s.parts?.[2] ?? s.parts?.[1] ?? null,
        loc: toSpan(loc, table.source),
      });
      continue;
    }

    if (s.command === "ref") {
      tail.push({
        type: "refBinding",
        to: s.target,
        from: toExprRef(raw, loc, table, "IsProperty"),
        loc: toSpan(loc, table.source),
      });
      continue;
    }

    if (s.command === "style") {
      tail.push({
        type: "stylePropertyBinding",
        to: s.target,
        from: toBindingSource(raw, loc, table, "IsProperty"),
        loc: toSpan(loc, table.source),
      });
      continue;
    }
    if (s.command === "class") {
      tail.push({
        type: "attributeBinding",
        attr: "class",
        to: "class",
        from: toBindingSource(raw, loc, table, "IsProperty"),
        loc: toSpan(loc, table.source),
      });
      continue;
    }
    if (s.command === "attr") {
      tail.push({
        type: "attributeBinding",
        attr: s.target,
        to: s.target,
        from: toBindingSource(raw, loc, table, "IsProperty"),
        loc: toSpan(loc, table.source),
      });
      continue;
    }

    const bindable = elementDef?.bindables[camelCase(s.target)];
    if (bindable) {
      lowerBindable(hydrateElementProps, bindable.name, a.name, raw, loc, s.command);
      continue;
    }

    const attrDef = resolveAttrDef(s.target, sem);
    if (attrDef && !attrDef.isTemplateController) {
      const targetBindableName =
        attrDef.bindables[camelCase(s.target)]
          ? camelCase(s.target)
          : attrDef.primary ?? Object.keys(attrDef.bindables)[0] ?? null;
      const props: ElementBindableIR[] = [];
      if (targetBindableName) {
        lowerBindable(props, targetBindableName, a.name, raw, loc, s.command);
      }
      hydrateAttributes.push({
        type: "hydrateAttribute",
        res: attrDef.name,
        props,
        alias: attrDef.name !== s.target ? s.target : null,
        loc: toSpan(loc, table.source),
      });
      continue;
    }

    if (s.command) {
      tail.push({
        type: "propertyBinding",
        to: camelCase(s.target),
        from: toBindingSource(raw, loc, table, "IsProperty"),
        mode: toMode(s.command, a.name),
        loc: toSpan(loc, table.source),
      });
      continue;
    }

    if (raw.includes("${")) {
      tail.push({
        type: "attributeBinding",
        attr: a.name,
        to: camelCase(a.name),
        from: toInterpIR(raw, loc, table),
        loc: toSpan(loc, table.source),
      });
      continue;
    }

    switch (a.name) {
      case "class":
        tail.push({
          type: "setClassAttribute",
          value: raw,
          loc: toSpan(loc, table.source),
        });
        break;
      case "style":
        tail.push({
          type: "setStyleAttribute",
          value: raw,
          loc: toSpan(loc, table.source),
        });
        break;
      default:
        tail.push({
          type: "setAttribute",
          to: a.name,
          value: raw || null,
          loc: toSpan(loc, table.source),
        });
        break;
    }
  }

  const instructions: InstructionIR[] = [];
  if (elementDef) {
    instructions.push({
      type: "hydrateElement",
      res: elementDef.name,
      props: hydrateElementProps,
      containerless,
      loc: toSpan(el.sourceCodeLocation, table.source),
    } satisfies HydrateElementIR);
  }
  instructions.push(...hydrateAttributes);
  instructions.push(...tail);

  return { instructions, containerless };
}

export type ControllerName = keyof Semantics["resources"]["controllers"];

export function resolveControllerAttr(
  s: { target: string; command: string | null },
  sem: Semantics
): ControllerName | null {
  const controller = sem.resources.controllers[s.target as ControllerName];
  if (!controller) return null;
  if (s.target === "repeat") return s.command === "for" ? "repeat" : null;
  return s.target as ControllerName;
}

export function isControllerAttr(
  s: { target: string; command: string | null },
  sem: Semantics
): boolean {
  return resolveControllerAttr(s, sem) !== null;
}
