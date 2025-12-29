import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { AttrRes, Semantics } from "../../language/registry.js";
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
  attrValueLoc,
  camelCase,
  findAttr,
  toBindingSource,
  toExprRef,
  toInterpIR,
  toMode,
  toSpan,
} from "./lower-shared.js";
import { resolveAttrDef, resolveElementDef } from "./resource-utils.js";

// Character codes for multi-binding parsing
const Char_Backslash = 0x5C;  // \
const Char_Colon = 0x3A;      // :
const Char_Semicolon = 0x3B;  // ;
const Char_Dollar = 0x24;     // $
const Char_OpenBrace = 0x7B;  // {
const Char_Space = 0x20;      // space

/**
 * Detects if a value contains multi-binding syntax (prop: value; prop2.bind: expr).
 * Returns true if a colon is found before any interpolation marker (${).
 * Respects backslash escaping.
 */
function hasInlineBindings(value: string): boolean {
  const len = value.length;
  for (let i = 0; i < len; i++) {
    const ch = value.charCodeAt(i);
    if (ch === Char_Backslash) {
      i++; // Skip escaped character
    } else if (ch === Char_Colon) {
      return true; // Found colon before any interpolation
    } else if (ch === Char_Dollar && value.charCodeAt(i + 1) === Char_OpenBrace) {
      return false; // Found ${ before colon, it's interpolation
    }
  }
  return false;
}

/**
 * Parses multi-binding syntax: "prop1: value1; prop2.bind: expr; prop3: ${interp}"
 * Returns an array of ElementBindableIR instructions.
 */
function parseMultiBindings(
  raw: string,
  attrDef: AttrRes,
  attrParser: AttributeParser,
  loc: P5Loc,
  valueLoc: P5Loc,
  table: ExprTable
): ElementBindableIR[] {
  const props: ElementBindableIR[] = [];
  const len = raw.length;
  let start = 0;

  for (let i = 0; i < len; i++) {
    const ch = raw.charCodeAt(i);

    if (ch === Char_Backslash) {
      i++; // Skip escaped character
    } else if (ch === Char_Colon) {
      // Extract property name (possibly with command, e.g., "prop.bind")
      const propPart = raw.slice(start, i).trim();

      // Skip whitespace after colon
      while (++i < len && raw.charCodeAt(i) <= Char_Space);
      const valueStart = i;

      // Scan for semicolon or end of string
      for (; i < len; i++) {
        const ch2 = raw.charCodeAt(i);
        if (ch2 === Char_Backslash) {
          i++; // Skip escaped character
        } else if (ch2 === Char_Semicolon) {
          break;
        }
      }

      const valuePart = raw.slice(valueStart, i).trim();

      // Parse the property name to extract any binding command
      const parsed = attrParser.parse(propPart, valuePart);
      const bindableName = camelCase(parsed.target);
      const bindable = attrDef.bindables[bindableName];

      if (bindable) {
        const to = bindable.name;
        if (parsed.command) {
          // Has binding command (e.g., prop.bind, prop.two-way)
          props.push({
            type: "propertyBinding",
            to,
            from: toBindingSource(valuePart, valueLoc, table, "IsProperty"),
            mode: toMode(parsed.command, propPart),
            loc: toSpan(loc, table.source),
          });
        } else if (valuePart.includes("${")) {
          // Has interpolation
          props.push({
            type: "attributeBinding",
            attr: propPart,
            to,
            from: toInterpIR(valuePart, valueLoc, table),
            loc: toSpan(loc, table.source),
          });
        } else if (valuePart.length > 0) {
          // Literal value (skip empty values)
          props.push({
            type: "setProperty",
            to,
            value: valuePart,
            loc: toSpan(loc, table.source),
          } as SetPropertyIR);
        }
      }
      // Note: Unknown bindables are silently ignored here; diagnostics are handled in resolve phase

      // Skip whitespace after semicolon
      while (i < len && raw.charCodeAt(i + 1) <= Char_Space) i++;
      start = i + 1;
    }
  }

  return props;
}

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
    valueLoc: P5Loc,
    command: string | null
  ) => {
    const to = camelCase(target);
    if (command) {
      sink.push({
        type: "propertyBinding",
        to,
        from: toBindingSource(raw, valueLoc, table, "IsProperty"),
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
        from: toInterpIR(raw, valueLoc, table),
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
    const valueLoc = attrValueLoc(el, a.name, table.sourceText);
    const s = attrParser.parse(a.name, a.value ?? "");
    const raw = a.value ?? "";

    if (a.name === "as-element" || a.name === "containerless") continue;
    if (isControllerAttr(s, sem)) continue;

    if (s.command === "trigger" || s.command === "capture") {
      tail.push({
        type: "listenerBinding",
        to: s.target,
        from: toExprRef(raw, valueLoc, table, "IsFunction"),
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
        from: toExprRef(raw, valueLoc, table, "IsProperty"),
        loc: toSpan(loc, table.source),
      });
      continue;
    }

    if (s.command === "style") {
      tail.push({
        type: "stylePropertyBinding",
        to: s.target,
        from: toBindingSource(raw, valueLoc, table, "IsProperty"),
        loc: toSpan(loc, table.source),
      });
      continue;
    }
    if (s.command === "class") {
      tail.push({
        type: "attributeBinding",
        attr: "class",
        to: "class",
        from: toBindingSource(raw, valueLoc, table, "IsProperty"),
        loc: toSpan(loc, table.source),
      });
      continue;
    }
    if (s.command === "attr") {
      tail.push({
        type: "attributeBinding",
        attr: s.target,
        to: s.target,
        from: toBindingSource(raw, valueLoc, table, "IsProperty"),
        loc: toSpan(loc, table.source),
      });
      continue;
    }

    const bindable = elementDef?.bindables[camelCase(s.target)];
    if (bindable) {
      lowerBindable(hydrateElementProps, bindable.name, a.name, raw, loc, valueLoc, s.command);
      continue;
    }

    const attrDef = resolveAttrDef(s.target, sem);
    if (attrDef && !attrDef.isTemplateController) {
      // Check for multi-binding syntax: attr="prop1: val; prop2.bind: expr"
      // Multi-binding requires: no noMultiBindings flag, no command on the attr, and colon before interpolation
      const isMultiBinding =
        attrDef.noMultiBindings !== true &&
        s.command === null &&
        hasInlineBindings(raw);

      let props: ElementBindableIR[];
      if (isMultiBinding) {
        props = parseMultiBindings(raw, attrDef, attrParser, loc, valueLoc, table);
      } else {
        props = [];
        const targetBindableName =
          attrDef.bindables[camelCase(s.target)]
            ? camelCase(s.target)
            : attrDef.primary ?? Object.keys(attrDef.bindables)[0] ?? null;
        if (targetBindableName) {
          lowerBindable(props, targetBindableName, a.name, raw, loc, valueLoc, s.command);
        }
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
        from: toBindingSource(raw, valueLoc, table, "IsProperty"),
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
        from: toInterpIR(raw, valueLoc, table),
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
