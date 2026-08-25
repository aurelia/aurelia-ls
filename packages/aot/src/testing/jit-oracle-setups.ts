import { CustomAttribute, CustomElement } from "@aurelia/runtime-html";
import type {
  CompilerCaseBindableDefinition,
  CompilerCaseData,
  CompilerSetupFactory,
} from "./compiler-case.js";
import type {
  JitCompilerSetupMaterialization,
  JitCompilerSetupMaterializer,
} from "./jit-compiler-case-executor.js";
import {
  JIT_ORACLE_EXTENSION_SETUP_FACTORIES,
  JIT_ORACLE_EXTENSION_SETUP_MATERIALIZERS,
} from "./jit-oracle-extension-setups.js";

export const CUSTOM_ELEMENT_SETUP_ID = "resource.custom-element";
export const CUSTOM_ATTRIBUTE_SETUP_ID = "resource.custom-attribute";

interface CustomElementSetupArgs {
  readonly name: string;
  readonly template: string;
  readonly bindables: readonly CompilerCaseBindableDefinition[];
  readonly capture: boolean;
  readonly containerless: boolean;
  readonly shadowMode: "open" | "closed" | null;
}

interface CustomAttributeSetupArgs {
  readonly name: string;
  readonly bindables: readonly CompilerCaseBindableDefinition[];
  readonly isTemplateController: boolean;
  readonly noMultiBindings: boolean;
  readonly defaultProperty: string | null;
  readonly aliases: readonly string[];
}

class CustomElementSetupFactory implements CompilerSetupFactory {
  public readonly factoryId = CUSTOM_ELEMENT_SETUP_ID;
  public readonly version = 1;
  public readonly exports = ["resource"] as const;

  public validate(args: CompilerCaseData | undefined): void {
    readCustomElementArgs(args);
  }

  public describe(args: CompilerCaseData | undefined): CompilerCaseData {
    const value = readCustomElementArgs(args);
    return {
      kind: this.factoryId,
      name: value.name,
      template: value.template,
      bindables: value.bindables.map(bindableDescription),
      capture: value.capture,
      containerless: value.containerless,
      shadowMode: value.shadowMode,
    };
  }
}

class CustomAttributeSetupFactory implements CompilerSetupFactory {
  public readonly factoryId = CUSTOM_ATTRIBUTE_SETUP_ID;
  public readonly version = 1;
  public readonly exports = ["resource"] as const;

  public validate(args: CompilerCaseData | undefined): void {
    readCustomAttributeArgs(args);
  }

  public describe(args: CompilerCaseData | undefined): CompilerCaseData {
    const value = readCustomAttributeArgs(args);
    return {
      kind: this.factoryId,
      name: value.name,
      bindables: value.bindables.map(bindableDescription),
      isTemplateController: value.isTemplateController,
      noMultiBindings: value.noMultiBindings,
      defaultProperty: value.defaultProperty,
      aliases: value.aliases,
    };
  }
}

const customElementFactory = new CustomElementSetupFactory();
const customAttributeFactory = new CustomAttributeSetupFactory();

const customElementMaterializer: JitCompilerSetupMaterializer = {
  factoryId: CUSTOM_ELEMENT_SETUP_ID,
  materialize(args): JitCompilerSetupMaterialization {
    const value = readCustomElementArgs(args);
    const Resource = CustomElement.define({
      name: value.name,
      template: value.template,
      bindables: jitBindableRecord(value.bindables),
      capture: value.capture,
      containerless: value.containerless,
      shadowOptions: value.shadowMode == null ? null : { mode: value.shadowMode },
    }, class {});
    return {
      exports: { resource: Resource },
      witness: customElementFactory.describe(args),
    };
  },
};

const customAttributeMaterializer: JitCompilerSetupMaterializer = {
  factoryId: CUSTOM_ATTRIBUTE_SETUP_ID,
  materialize(args): JitCompilerSetupMaterialization {
    const value = readCustomAttributeArgs(args);
    const Resource = CustomAttribute.define({
      name: value.name,
      bindables: jitBindableRecord(value.bindables),
      isTemplateController: value.isTemplateController,
      noMultiBindings: value.noMultiBindings,
      defaultProperty: value.defaultProperty ?? undefined,
      aliases: value.aliases,
    }, class {});
    return {
      exports: { resource: Resource },
      witness: customAttributeFactory.describe(args),
    };
  },
};

/** Neutral setup factories admitted by the current declarative corpus. */
export const JIT_ORACLE_SETUP_FACTORIES: readonly CompilerSetupFactory[] = [
  customElementFactory,
  customAttributeFactory,
  ...JIT_ORACLE_EXTENSION_SETUP_FACTORIES,
];

/** JIT setup materializers admitted by the current declarative corpus. */
export const JIT_ORACLE_SETUP_MATERIALIZERS: readonly JitCompilerSetupMaterializer[] = [
  customElementMaterializer,
  customAttributeMaterializer,
  ...JIT_ORACLE_EXTENSION_SETUP_MATERIALIZERS,
];

function readCustomElementArgs(args: CompilerCaseData | undefined): CustomElementSetupArgs {
  const record = setupRecord(args, CUSTOM_ELEMENT_SETUP_ID);
  assertKeys(record, ["name", "template", "bindables", "capture", "containerless", "shadowMode"], CUSTOM_ELEMENT_SETUP_ID);
  return {
    name: requiredString(record, "name", CUSTOM_ELEMENT_SETUP_ID),
    template: requiredString(record, "template", CUSTOM_ELEMENT_SETUP_ID),
    bindables: readBindables(record.bindables, CUSTOM_ELEMENT_SETUP_ID),
    capture: optionalBoolean(record, "capture", CUSTOM_ELEMENT_SETUP_ID, false),
    containerless: optionalBoolean(record, "containerless", CUSTOM_ELEMENT_SETUP_ID, false),
    shadowMode: optionalShadowMode(record.shadowMode, CUSTOM_ELEMENT_SETUP_ID),
  };
}

function readCustomAttributeArgs(args: CompilerCaseData | undefined): CustomAttributeSetupArgs {
  const record = setupRecord(args, CUSTOM_ATTRIBUTE_SETUP_ID);
  assertKeys(record, ["name", "bindables", "isTemplateController", "noMultiBindings", "defaultProperty", "aliases"], CUSTOM_ATTRIBUTE_SETUP_ID);
  return {
    name: requiredString(record, "name", CUSTOM_ATTRIBUTE_SETUP_ID),
    bindables: readBindables(record.bindables, CUSTOM_ATTRIBUTE_SETUP_ID),
    isTemplateController: optionalBoolean(record, "isTemplateController", CUSTOM_ATTRIBUTE_SETUP_ID, false),
    noMultiBindings: optionalBoolean(record, "noMultiBindings", CUSTOM_ATTRIBUTE_SETUP_ID, false),
    defaultProperty: optionalString(record.defaultProperty, CUSTOM_ATTRIBUTE_SETUP_ID, "defaultProperty"),
    aliases: optionalStringArray(record.aliases, CUSTOM_ATTRIBUTE_SETUP_ID, "aliases"),
  };
}

function readBindables(value: CompilerCaseData | undefined, setupId: string): readonly CompilerCaseBindableDefinition[] {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${setupId}.bindables must be an array.`);
  }
  const entries = value as unknown as readonly CompilerCaseData[];
  return entries.map((candidate, index) => {
    const record = setupRecord(candidate, `${setupId}.bindables[${index}]`);
    assertKeys(record, ["name", "attribute", "mode"], `${setupId}.bindables[${index}]`);
    const mode = record.mode;
    if (mode != null && typeof mode !== "string" && typeof mode !== "number") {
      throw new Error(`${setupId}.bindables[${index}].mode must be a string or number.`);
    }
    return {
      name: requiredString(record, "name", setupId),
      attribute: optionalString(record.attribute, setupId, "attribute") ?? undefined,
      mode: mode as CompilerCaseBindableDefinition["mode"],
    };
  });
}

function bindableDescription(bindable: CompilerCaseBindableDefinition): CompilerCaseData {
  return {
    name: bindable.name,
    attribute: bindable.attribute ?? null,
    mode: bindable.mode ?? null,
  };
}

function setupRecord(value: CompilerCaseData | undefined, setupId: string): Readonly<Record<string, CompilerCaseData>> {
  if (value == null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${setupId} requires an object argument.`);
  }
  return value as Readonly<Record<string, CompilerCaseData>>;
}

function jitBindableRecord(
  bindables: readonly CompilerCaseBindableDefinition[],
): Record<string, true | { attribute?: string; mode?: CompilerCaseBindableDefinition["mode"] }> {
  const result: Record<string, true | { attribute?: string; mode?: CompilerCaseBindableDefinition["mode"] }> = {};
  for (const bindable of bindables) {
    if (bindable.attribute == null && bindable.mode == null) {
      result[bindable.name] = true;
      continue;
    }
    result[bindable.name] = {
      attribute: bindable.attribute,
      mode: bindable.mode,
    };
  }
  return result;
}

function requiredString(record: Readonly<Record<string, CompilerCaseData>>, key: string, setupId: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${setupId}.${key} must be a nonempty string.`);
  }
  return value;
}

function optionalString(value: CompilerCaseData | undefined, setupId: string, key: string): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${setupId}.${key} must be a string or null.`);
  }
  return value;
}

function optionalBoolean(
  record: Readonly<Record<string, CompilerCaseData>>,
  key: string,
  setupId: string,
  fallback: boolean,
): boolean {
  const value = record[key];
  if (value == null) {
    return fallback;
  }
  if (typeof value !== "boolean") {
    throw new Error(`${setupId}.${key} must be a boolean.`);
  }
  return value;
}

function optionalShadowMode(value: CompilerCaseData | undefined, setupId: string): "open" | "closed" | null {
  if (value == null) {
    return null;
  }
  if (value !== "open" && value !== "closed") {
    throw new Error(`${setupId}.shadowMode must be open, closed, or null.`);
  }
  return value;
}

function optionalStringArray(value: CompilerCaseData | undefined, setupId: string, key: string): readonly string[] {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${setupId}.${key} must be a string array.`);
  }
  return value as readonly string[];
}

function assertKeys(
  record: Readonly<Record<string, CompilerCaseData>>,
  allowed: readonly string[],
  setupId: string,
): void {
  const allowedKeys = new Set(allowed);
  const unexpected = Object.keys(record).filter((key) => !allowedKeys.has(key));
  if (unexpected.length > 0) {
    throw new Error(`${setupId} has unsupported argument(s): ${unexpected.join(", ")}.`);
  }
}
