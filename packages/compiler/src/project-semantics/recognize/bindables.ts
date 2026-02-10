import type { TextSpan } from '../compiler.js';
import type { AnalyzableValue, BindableMember, ClassValue } from "../evaluate/value/types.js";
import {
  extractBindingModeProp,
  extractBooleanProp,
  getPropertyKeySpan,
  extractStringPropWithSpan,
  extractStringWithSpan,
} from "../evaluate/value/types.js";
import type { BindableInput } from "../assemble/resource-def.js";

export function parseBindablesValue(value: AnalyzableValue): BindableInput[] {
  const result: BindableInput[] = [];

  if (value.kind === "array") {
    for (const element of value.elements) {
      const stringName = extractStringWithSpan(element);
      if (stringName) {
        result.push({ name: stringName.value, span: stringName.span });
        continue;
      }

      if (element.kind === "object") {
        const nameProp = extractStringPropWithSpan(element, "name");
        if (nameProp) {
          const attrProp = extractStringPropWithSpan(element, "attribute");
          result.push({
            name: nameProp.value,
            span: nameProp.span,
            mode: extractBindingModeProp(element, "mode"),
            primary: extractBooleanProp(element, "primary"),
            attribute: attrProp?.value,
            attributeSpan: attrProp?.span,
          });
        }
      }
    }
  }

  if (value.kind === "object") {
    for (const [name, propValue] of value.properties) {
      const keySpan = getPropertyKeySpan(value, name);
      if (propValue.kind === "object") {
        const attrProp = extractStringPropWithSpan(propValue, "attribute");
        result.push({
          name,
          span: keySpan,
          mode: extractBindingModeProp(propValue, "mode"),
          primary: extractBooleanProp(propValue, "primary"),
          attribute: attrProp?.value,
          attributeSpan: attrProp?.span,
        });
      } else {
        result.push({ name, span: keySpan });
      }
    }
  }

  return result;
}

export function getStaticBindableInputs(cls: ClassValue): BindableInput[] {
  const bindablesValue = cls.staticMembers.get("bindables");
  if (!bindablesValue) return [];
  return parseBindablesValue(bindablesValue);
}

export function mergeBindableInputs(
  configInputs: readonly BindableInput[],
  members: readonly BindableMember[],
): BindableInput[] {
  const merged = new Map<string, BindableInput>();

  for (const config of configInputs) {
    merged.set(config.name, { ...config });
  }

  for (const member of members) {
    const memberInput = buildMemberBindableInput(member);
    const existing = merged.get(member.name);

    if (!existing) {
      merged.set(member.name, memberInput);
      continue;
    }

    merged.set(member.name, {
      name: existing.name,
      mode: existing.mode ?? memberInput.mode,
      primary: existing.primary ?? memberInput.primary,
      attribute: existing.attribute ?? memberInput.attribute,
      attributeSpan: existing.attributeSpan ?? memberInput.attributeSpan,
      type: memberInput.type ?? existing.type,
      span: existing.span ?? memberInput.span,
    });
  }

  return [...merged.values()];
}

export function applyImplicitPrimary(bindables: readonly BindableInput[]): BindableInput[] {
  if (bindables.length !== 1) return [...bindables];
  const only = bindables[0];
  if (!only || only.primary) return [...bindables];
  return [{ ...only, primary: true }];
}

export function findPrimaryBindable(bindables: readonly BindableInput[]): string | undefined {
  for (const bindable of bindables) {
    if (bindable.primary) return bindable.name;
  }
  if (bindables.length === 1) {
    return bindables[0]?.name;
  }
  return undefined;
}

function buildMemberBindableInput(member: BindableMember): BindableInput {
  let mode: BindableInput["mode"];
  let primary: boolean | undefined;
  let attribute: string | undefined;
  let attributeSpan: TextSpan | undefined;

  if (member.args.length > 0) {
    const arg = member.args[0];
    if (arg?.kind === "object") {
      mode = extractBindingModeProp(arg, "mode");
      primary = extractBooleanProp(arg, "primary");
      const attrProp = extractStringPropWithSpan(arg, "attribute");
      attribute = attrProp?.value;
      attributeSpan = attrProp?.span;
    }
  }

  return {
    name: member.name,
    mode,
    primary,
    attribute,
    attributeSpan,
    type: member.type,
    span: member.span,
  };
}
