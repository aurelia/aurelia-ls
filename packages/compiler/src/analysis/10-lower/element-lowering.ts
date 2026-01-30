import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type {
  AttrRes,
  BindingCommandConfig,
  ControllerConfig,
  ControllerName,
  ResourceCatalog,
} from "../../schema/registry.js";
import { formatSuggestion } from "../../shared/suggestions.js";
import {
  BUILTIN_CONTROLLER_CONFIGS,
  createCustomControllerConfig,
} from "../../schema/registry.js";
import type {
  AttributeBindableIR,
  BindingMode,
  ElementBindableIR,
  HydrateAttributeIR,
  HydrateElementIR,
  InstructionIR,
  SetPropertyIR,
} from "../../model/ir.js";
import type { ExprTable, P5Element, P5Loc, ProjectionMap } from "./lower-shared.js";
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
import type { LowerContext } from "./lower-context.js";

function isPromiseBranchAttr(
  parsed: ReturnType<AttributeParser["parse"]>,
  catalog: ResourceCatalog,
): boolean {
  const controller = catalog.resources.controllers[parsed.target];
  return controller?.linksTo === "promise" && controller.trigger.kind === "branch";
}

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
 * Computes a sub-span within a multi-binding attribute value for a single binding expression.
 * Trims leading/trailing whitespace from the slice to produce a tight span.
 */
function subValueLoc(valueLoc: P5Loc, raw: string, rawStart: number, rawEnd: number): P5Loc {
  if (!valueLoc || valueLoc.startOffset == null) return valueLoc;
  const slice = raw.slice(rawStart, rawEnd);
  const trimLeft = slice.length - slice.trimStart().length;
  const trimRight = slice.length - slice.trimEnd().length;
  const base = valueLoc.startOffset;
  return {
    ...valueLoc,
    startOffset: base + rawStart + trimLeft,
    endOffset: base + rawEnd - trimRight,
  } as typeof valueLoc;
}

/**
 * Parses multi-binding syntax: "prop1: value1; prop2.bind: expr; prop3: ${interp}"
 * Returns an array of AttributeBindableIR instructions (narrower type for custom attrs).
 */
function parseMultiBindings(
  raw: string,
  attrDef: AttrRes,
  attrParser: AttributeParser,
  loc: P5Loc,
  valueLoc: P5Loc,
  table: ExprTable,
  bindingCommands: Record<string, BindingCommandConfig>
): AttributeBindableIR[] {
  const props: AttributeBindableIR[] = [];
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
            from: toBindingSource(valuePart, subValueLoc(valueLoc, raw, valueStart, i), table, "IsProperty"),
            mode: toMode(parsed.command, parsed.mode, bindingCommands),
            loc: toSpan(loc, table.source),
          });
        } else if (valuePart.includes("${")) {
          // Has interpolation
          props.push({
            type: "attributeBinding",
            attr: propPart,
            to,
            from: toInterpIR(valuePart, subValueLoc(valueLoc, raw, valueStart, i), table),
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
  lowerCtx: LowerContext,
  projectionMap?: ProjectionMap,
): ElementLoweringResult {
  const { attrParser, table, catalog, services } = lowerCtx;
  const dbg = services.debug;
  const attrs = el.attrs ?? [];
  const authoredTag = el.nodeName.toLowerCase();
  const asElement = findAttr(el, "as-element");
  const effectiveTag = (asElement?.value ?? authoredTag).toLowerCase();
  const elementDef = resolveElementDef(effectiveTag, catalog);
  const containerless = !!elementDef?.containerless || !!findAttr(el, "containerless");

  dbg.lower("element.start", {
    tag: authoredTag,
    effectiveTag: effectiveTag !== authoredTag ? effectiveTag : undefined,
    isCustomElement: !!elementDef,
    attrCount: attrs.length,
  });

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
    command: string | null,
    patternMode: BindingMode | null
  ): void => {
    const to = camelCase(target);
    if (command) {
      sink.push({
        type: "propertyBinding",
        to,
        from: toBindingSource(raw, valueLoc, table, "IsProperty"),
        mode: toMode(command, patternMode, catalog.bindingCommands),
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
    if (isControllerAttr(s, catalog)) continue;
    if (isPromiseBranchAttr(s, catalog)) continue;

    // Config-driven command handling
    if (s.command) {
      const cmdConfig = catalog.bindingCommands[s.command];
      if (!cmdConfig) {
        // Unknown binding command - emit diagnostic with suggestion
        const knownCommands = Object.keys(catalog.bindingCommands);
        const suggestion = formatSuggestion(s.command, knownCommands);
        table.reportDiagnostic(
          "aurelia/unknown-command",
          `Unknown binding command '${s.command}'.${suggestion}`,
          loc,
          { command: s.command },
        );
        // Fall through to treat as property binding for graceful degradation
      }
      if (cmdConfig) {
        switch (cmdConfig.kind) {
          case "listener":
            dbg.lower("attr.listener", { attr: a.name, event: s.target, command: s.command });
            tail.push({
              type: "listenerBinding",
              to: s.target,
              from: toExprRef(raw, valueLoc, table, "IsFunction"),
              capture: cmdConfig.capture ?? false,
              modifier: s.parts?.[2] ?? s.parts?.[1] ?? null,
              loc: toSpan(loc, table.source),
            });
            continue;

          case "ref":
            tail.push({
              type: "refBinding",
              to: s.target,
              from: toExprRef(raw, valueLoc, table, "IsProperty"),
              loc: toSpan(loc, table.source),
            });
            continue;

          case "style":
            tail.push({
              type: "stylePropertyBinding",
              to: s.target,
              from: toBindingSource(raw, valueLoc, table, "IsProperty"),
              loc: toSpan(loc, table.source),
            });
            continue;

          case "attribute": {
            // Use forceAttribute if specified (e.g., "class" command always uses "class")
            const attrName = cmdConfig.forceAttribute ?? s.target;
            tail.push({
              type: "attributeBinding",
              attr: attrName,
              to: attrName,
              from: toBindingSource(raw, valueLoc, table, "IsProperty"),
              loc: toSpan(loc, table.source),
            });
            continue;
          }

          case "translation": {
            // i18n translation binding (t="key", t="key.${expr}", or t.bind="expr")
            const isBoundCommand = s.command === "t.bind";
            // Check for interpolation in literal keys: t="priority.${level}"
            const hasInterpolation = !isBoundCommand && raw.includes("${");

            if (isBoundCommand) {
              // t.bind="expr" - parse as property expression
              tail.push({
                type: "translationBinding",
                to: s.target,
                from: toBindingSource(raw, valueLoc, table, "IsProperty"),
                isExpression: true,
                loc: toSpan(loc, table.source),
              });
            } else if (hasInterpolation) {
              // t="key.${expr}" - parse interpolation at AOT time
              tail.push({
                type: "translationBinding",
                to: s.target,
                from: toInterpIR(raw, valueLoc, table),
                isExpression: true, // Treat as expression since it contains dynamic parts
                loc: toSpan(loc, table.source),
              });
            } else {
              // t="static.key" - literal translation key
              tail.push({
                type: "translationBinding",
                to: s.target,
                keyValue: raw,
                isExpression: false,
                loc: toSpan(loc, table.source),
              });
            }
            continue;
          }

          // "property" and "iterator" kinds fall through to later handling
          // (property is handled after bindable/custom-attr checks, iterator is for repeat.for)
        }
      }
    }

    const bindable = elementDef?.bindables[camelCase(s.target)];
    if (bindable) {
      dbg.lower("attr.bindable", { attr: a.name, bindable: bindable.name, element: elementDef.name });
      lowerBindable(hydrateElementProps, bindable.name, a.name, raw, loc, valueLoc, s.command, s.mode);
      continue;
    }

    const attrDef = resolveAttrDef(s.target, catalog);
    if (attrDef && !attrDef.isTemplateController) {
      dbg.lower("attr.customAttribute", { attr: a.name, customAttr: attrDef.name });
      // Check for multi-binding syntax: attr="prop1: val; prop2.bind: expr"
      // Multi-binding requires: no noMultiBindings flag, no command on the attr, and colon before interpolation
      const isMultiBinding =
        attrDef.noMultiBindings !== true &&
        s.command === null &&
        hasInlineBindings(raw);

      let props: AttributeBindableIR[];
      if (isMultiBinding) {
        props = parseMultiBindings(raw, attrDef, attrParser, loc, valueLoc, table, catalog.bindingCommands);
      } else {
        props = [];
        const targetBindableName =
          attrDef.bindables[camelCase(s.target)]
            ? camelCase(s.target)
            : attrDef.primary ?? Object.keys(attrDef.bindables)[0] ?? null;
        if (targetBindableName) {
          lowerBindable(props, targetBindableName, a.name, raw, loc, valueLoc, s.command, s.mode);
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
      dbg.lower("attr.binding", { attr: a.name, target: s.target, command: s.command });
      tail.push({
        type: "propertyBinding",
        to: camelCase(s.target),
        from: toBindingSource(raw, valueLoc, table, "IsProperty"),
        mode: toMode(s.command, s.mode, catalog.bindingCommands),
        loc: toSpan(loc, table.source),
      });
      continue;
    }

    if (raw.includes("${")) {
      dbg.lower("attr.interpolation", { attr: a.name, value: raw });
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
    const projections = projectionMap?.get(el);
    instructions.push({
      type: "hydrateElement",
      res: elementDef.name,
      props: hydrateElementProps,
      ...(projections ? { projections } : {}),
      containerless,
      loc: toSpan(el.sourceCodeLocation, table.source),
    } satisfies HydrateElementIR);
  }
  instructions.push(...hydrateAttributes);
  instructions.push(...tail);

  return { instructions, containerless };
}

/**
 * Resolve an attribute to its controller configuration.
 *
 * Resolution order:
 * 1. Built-in controller configs (if, repeat, with, etc.)
 * 2. Custom template controllers in attributes (via @templateController decorator)
 * 3. Legacy controllers in catalog.resources.controllers (for backward compat)
 *
 * Note: Branch controllers (else, case, then, catch, pending, default-case) are NOT
 * resolved here. They are only valid as children/siblings of their parent controller
 * and are detected by specialized code (detectPromiseBranch, etc.).
 *
 * @returns ControllerConfig if the attribute is a template controller, null otherwise
 */
export function resolveControllerAttr(
  s: { target: string; command: string | null },
  catalog: ResourceCatalog
): ControllerConfig | null {
  const target = s.target;

  // 1. Check built-in controller configs first
  const builtin = BUILTIN_CONTROLLER_CONFIGS[target];
  if (builtin) {
    // Promise branch controllers (then, catch, pending) are NOT resolved here.
    // They are detected by detectPromiseBranch() which handles the special
    // branch injection logic. Other branch controllers (else, case, default-case)
    // ARE resolved here and handled normally by collectControllers().
    if (builtin.linksTo === "promise") {
      return null;
    }

    // Special case: repeat requires "for" command
    if (target === "repeat") {
      return s.command === "for" ? builtin : null;
    }
    return builtin;
  }

  // 2. Check custom TCs in attributes (discovered via @templateController decorator)
  const customAttr = resolveAttrDef(target, catalog);
  if (customAttr?.isTemplateController) {
    // Create a config for this custom TC
    return createCustomControllerConfig(
      customAttr.name,
      customAttr.primary,
      customAttr.bindables
    );
  }

  // 3. Legacy fallback: check catalog.resources.controllers
  // This maintains backward compatibility with existing code that adds to controllers directly
  const legacyController = catalog.resources.controllers[target];
  if (legacyController) {
    // For legacy controllers, create a minimal config
    // The toControllerConfig() function handles full conversion if needed
    if (target === "repeat") {
      return s.command === "for" ? BUILTIN_CONTROLLER_CONFIGS["repeat"]! : null;
    }
    return BUILTIN_CONTROLLER_CONFIGS[target] ?? null;
  }

  return null;
}

/**
 * Check if an attribute is a template controller.
 */
export function isControllerAttr(
  s: { target: string; command: string | null },
  catalog: ResourceCatalog
): boolean {
  return resolveControllerAttr(s, catalog) !== null;
}

/**
 * Get the controller name from a resolved config.
 * Helper for code that still uses string-based controller names.
 */
export function getControllerName(config: ControllerConfig): ControllerName {
  return config.name;
}
