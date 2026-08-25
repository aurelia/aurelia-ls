import { CustomElement } from "@aurelia/runtime-html";
import {
  TemplateCompilerHooks,
  type ProcessContentHook,
} from "@aurelia/template-compiler";
import type {
  CompilerCaseData,
  CompilerSetupFactory,
} from "./compiler-case.js";
import type {
  JitCompilerSetupMaterialization,
  JitCompilerSetupMaterializer,
} from "./jit-compiler-case-executor.js";

export const TEMPLATE_COMPILER_HOOK_SETUP_ID = "extension.template-compiler-hook";
export const PROCESS_CONTENT_ELEMENT_SETUP_ID = "extension.process-content-element";

interface HookSetupArgs {
  readonly role: "child" | "root";
  readonly attribute: string;
  readonly expression: string;
  readonly requiresAttribute: string | null;
  readonly requiresValue: string | null;
}

interface ProcessContentElementSetupArgs {
  readonly name: string;
  readonly bindable: string;
  readonly sourceAttribute: string;
  readonly bindingAttribute: string;
  readonly bindingExpression: string;
  readonly dataKey: string;
}

class TemplateCompilerHookSetupFactory implements CompilerSetupFactory {
  public readonly factoryId = TEMPLATE_COMPILER_HOOK_SETUP_ID;
  public readonly version = 1;
  public readonly exports = ["registration"] as const;

  public validate(args: CompilerCaseData | undefined): void {
    readHookArgs(args);
  }

  public describe(args: CompilerCaseData | undefined): CompilerCaseData {
    const value = readHookArgs(args);
    return {
      kind: this.factoryId,
      role: value.role,
      attribute: value.attribute,
      expression: value.expression,
      requiresAttribute: value.requiresAttribute,
      requiresValue: value.requiresValue,
    };
  }
}

class ProcessContentElementSetupFactory implements CompilerSetupFactory {
  public readonly factoryId = PROCESS_CONTENT_ELEMENT_SETUP_ID;
  public readonly version = 1;
  public readonly exports = ["resource"] as const;

  public validate(args: CompilerCaseData | undefined): void {
    readProcessContentArgs(args);
  }

  public describe(args: CompilerCaseData | undefined): CompilerCaseData {
    const value = readProcessContentArgs(args);
    return {
      kind: this.factoryId,
      name: value.name,
      bindable: value.bindable,
      sourceAttribute: value.sourceAttribute,
      bindingAttribute: value.bindingAttribute,
      bindingExpression: value.bindingExpression,
      dataKey: value.dataKey,
    };
  }
}

const hookFactory = new TemplateCompilerHookSetupFactory();
const processContentFactory = new ProcessContentElementSetupFactory();

const hookMaterializer: JitCompilerSetupMaterializer = {
  factoryId: TEMPLATE_COMPILER_HOOK_SETUP_ID,
  materialize(args): JitCompilerSetupMaterialization {
    const value = readHookArgs(args);
    const registration = TemplateCompilerHooks.define(class {
      public compiling(template: globalThis.HTMLElement): void {
        const content = (template as globalThis.HTMLTemplateElement).content;
        const input = content.querySelector("input");
        if (input == null) {
          throw new Error(`${value.role} compiler hook expected one input element.`);
        }
        if (
          value.requiresAttribute != null
          && input.getAttribute(value.requiresAttribute) !== value.requiresValue
        ) {
          throw new Error(
            `${value.role} compiler hook ran before required mutation ${value.requiresAttribute}.`,
          );
        }
        input.setAttribute(value.attribute, value.expression);
      }
    });
    return {
      exports: { registration },
      witness: hookFactory.describe(args),
      dispose: () => {},
    };
  },
};

const processContentMaterializer: JitCompilerSetupMaterializer = {
  factoryId: PROCESS_CONTENT_ELEMENT_SETUP_ID,
  materialize(args): JitCompilerSetupMaterialization {
    const value = readProcessContentArgs(args);
    const processContent: ProcessContentHook = function (node, _platform, data): false {
      const source = node.getAttribute(value.sourceAttribute);
      if (source == null) {
        throw new Error(`processContent expected ${value.sourceAttribute} on ${value.name}.`);
      }
      node.removeAttribute(value.sourceAttribute);
      node.setAttribute(value.bindingAttribute, value.bindingExpression);
      data[value.dataKey] = {
        kind: "process-content",
        source,
        childCompilation: "skipped",
      };
      return false;
    };
    const Resource = CustomElement.define({
      name: value.name,
      template: "<template></template>",
      bindables: [value.bindable],
      processContent,
    }, class {});
    return {
      exports: { resource: Resource },
      witness: processContentFactory.describe(args),
      dispose: () => {},
    };
  },
};

export const JIT_ORACLE_EXTENSION_SETUP_FACTORIES: readonly CompilerSetupFactory[] = [
  hookFactory,
  processContentFactory,
];

export const JIT_ORACLE_EXTENSION_SETUP_MATERIALIZERS: readonly JitCompilerSetupMaterializer[] = [
  hookMaterializer,
  processContentMaterializer,
];

function readHookArgs(args: CompilerCaseData | undefined): HookSetupArgs {
  const record = setupRecord(args, TEMPLATE_COMPILER_HOOK_SETUP_ID);
  assertKeys(
    record,
    ["role", "attribute", "expression", "requiresAttribute", "requiresValue"],
    TEMPLATE_COMPILER_HOOK_SETUP_ID,
  );
  const role = requiredString(record, "role", TEMPLATE_COMPILER_HOOK_SETUP_ID);
  if (role !== "child" && role !== "root") {
    throw new Error(`${TEMPLATE_COMPILER_HOOK_SETUP_ID}.role must be child or root.`);
  }
  const requiresAttribute = record.requiresAttribute;
  if (requiresAttribute !== null && typeof requiresAttribute !== "string") {
    throw new Error(`${TEMPLATE_COMPILER_HOOK_SETUP_ID}.requiresAttribute must be a string or null.`);
  }
  const requiresValue = record.requiresValue;
  if (requiresValue !== null && typeof requiresValue !== "string") {
    throw new Error(`${TEMPLATE_COMPILER_HOOK_SETUP_ID}.requiresValue must be a string or null.`);
  }
  if ((requiresAttribute == null) !== (requiresValue == null)) {
    throw new Error(`${TEMPLATE_COMPILER_HOOK_SETUP_ID} requiresAttribute and requiresValue must be paired.`);
  }
  return {
    role,
    attribute: requiredString(record, "attribute", TEMPLATE_COMPILER_HOOK_SETUP_ID),
    expression: requiredString(record, "expression", TEMPLATE_COMPILER_HOOK_SETUP_ID),
    requiresAttribute,
    requiresValue,
  };
}

function readProcessContentArgs(args: CompilerCaseData | undefined): ProcessContentElementSetupArgs {
  const record = setupRecord(args, PROCESS_CONTENT_ELEMENT_SETUP_ID);
  assertKeys(
    record,
    ["name", "bindable", "sourceAttribute", "bindingAttribute", "bindingExpression", "dataKey"],
    PROCESS_CONTENT_ELEMENT_SETUP_ID,
  );
  return {
    name: requiredString(record, "name", PROCESS_CONTENT_ELEMENT_SETUP_ID),
    bindable: requiredString(record, "bindable", PROCESS_CONTENT_ELEMENT_SETUP_ID),
    sourceAttribute: requiredString(record, "sourceAttribute", PROCESS_CONTENT_ELEMENT_SETUP_ID),
    bindingAttribute: requiredString(record, "bindingAttribute", PROCESS_CONTENT_ELEMENT_SETUP_ID),
    bindingExpression: requiredString(record, "bindingExpression", PROCESS_CONTENT_ELEMENT_SETUP_ID),
    dataKey: requiredString(record, "dataKey", PROCESS_CONTENT_ELEMENT_SETUP_ID),
  };
}

function setupRecord(
  value: CompilerCaseData | undefined,
  setupId: string,
): Readonly<Record<string, CompilerCaseData>> {
  if (value == null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${setupId} requires an object argument.`);
  }
  return value as Readonly<Record<string, CompilerCaseData>>;
}

function requiredString(
  record: Readonly<Record<string, CompilerCaseData>>,
  key: string,
  setupId: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${setupId}.${key} must be a nonempty string.`);
  }
  return value;
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
