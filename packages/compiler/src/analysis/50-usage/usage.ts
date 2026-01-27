import type { DOMNode } from "../../model/ir.js";
import type { FeatureUsageFlags, FeatureUsageSet, TemplateSyntaxRegistry } from "../../language/types.js";
import type { AttributeParser } from "../../parsing/attribute-parser.js";
import { createAttributeParserFromRegistry } from "../../parsing/attribute-parser.js";
import type {
  LinkedHydrateAttribute,
  LinkedHydrateElement,
  LinkedHydrateTemplateController,
  LinkModule,
} from "../20-link/types.js";
import { extractExprResources } from "../../shared/expr-utils.js";

const DYNAMIC_COMPOSE_PROPS = new Set(["component", "template", "model"]);

export interface FeatureUsageOptions {
  readonly syntax: TemplateSyntaxRegistry;
  readonly attrParser?: AttributeParser;
}

export function collectFeatureUsage(linked: LinkModule, options: FeatureUsageOptions): FeatureUsageSet {
  const attrParser = options.attrParser ?? createAttributeParserFromRegistry(options.syntax);
  const elements = new Set<string>();
  const attributes = new Set<string>();
  const controllers = new Set<string>();
  const commands = new Set<string>();
  const patterns = new Set<string>();
  const valueConverters = new Set<string>();
  const bindingBehaviors = new Set<string>();
  let usesCompose = false;
  let usesDynamicCompose = false;
  let usesTemplateControllers = false;

  const recordAttrUsage = (name: string, value: string | null) => {
    const parsed = attrParser.parse(name, value ?? "");
    if (parsed.command) commands.add(parsed.command);
    if (parsed.pattern) patterns.add(parsed.pattern);
  };

  const walkDom = (node: DOMNode): void => {
    if (node.kind === "element" || node.kind === "template") {
      for (const attr of node.attrs ?? []) {
        recordAttrUsage(attr.name, attr.value ?? null);
      }
      for (const child of node.children ?? []) {
        walkDom(child);
      }
    }
  };

  for (const template of linked.templates) {
    walkDom(template.dom);
  }

  for (const template of linked.templates) {
    for (const row of template.rows) {
      for (const instruction of row.instructions) {
        switch (instruction.kind) {
          case "hydrateElement":
            recordElementUsage(instruction);
            break;
          case "hydrateAttribute":
            recordAttributeUsage(instruction);
            break;
          case "hydrateTemplateController":
            recordControllerUsage(instruction);
            break;
          default:
            break;
        }
      }
    }
  }

  const exprRefs = extractExprResources(linked.exprTable ?? []);
  for (const ref of exprRefs) {
    if (ref.kind === "bindingBehavior") {
      bindingBehaviors.add(ref.name);
    } else {
      valueConverters.add(ref.name);
    }
  }

  const flags: FeatureUsageFlags | undefined = usesCompose || usesDynamicCompose || usesTemplateControllers
    ? {
        ...(usesCompose ? { usesCompose: true } : {}),
        ...(usesDynamicCompose ? { usesDynamicCompose: true } : {}),
        ...(usesTemplateControllers ? { usesTemplateControllers: true } : {}),
      }
    : undefined;

  return {
    elements: toSortedList(elements),
    attributes: toSortedList(attributes),
    controllers: toSortedList(controllers),
    commands: toSortedList(commands),
    patterns: toSortedList(patterns),
    valueConverters: toSortedList(valueConverters),
    bindingBehaviors: toSortedList(bindingBehaviors),
    ...(flags ? { flags } : {}),
  };

  function recordElementUsage(instruction: LinkedHydrateElement): void {
    const name = instruction.res?.def.name;
    if (!name) return;
    elements.add(name);
    if (name === "au-compose") {
      usesCompose = true;
      if (!usesDynamicCompose && hasDynamicComposeBindings(instruction)) {
        usesDynamicCompose = true;
      }
    }
  }

  function recordAttributeUsage(instruction: LinkedHydrateAttribute): void {
    const name = instruction.res?.def.name;
    if (!name) return;
    attributes.add(name);
  }

  function recordControllerUsage(instruction: LinkedHydrateTemplateController): void {
    if (!instruction.res) return;
    controllers.add(instruction.res);
    usesTemplateControllers = true;
  }

  function hasDynamicComposeBindings(instruction: LinkedHydrateElement): boolean {
    for (const prop of instruction.props ?? []) {
      if (prop.kind !== "propertyBinding" && prop.kind !== "attributeBinding") continue;
      if (DYNAMIC_COMPOSE_PROPS.has(prop.to)) return true;
    }
    return false;
  }
}

function toSortedList(set: Set<string>): string[] {
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
