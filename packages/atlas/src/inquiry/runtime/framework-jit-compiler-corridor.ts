import type { Inquiry } from "../inquiry.js";
import { FrameworkAdmissionFlowCorridor } from "./framework-admission-flow.js";

/** Admission root that currently forms the framework compiler world. */
export const FRAMEWORK_JIT_COMPILER_ROOT_EXPORT = "StandardConfiguration";

/** Framework actor that owns template compilation instruction production. */
export const FRAMEWORK_JIT_COMPILER_ACTOR = "TemplateCompiler";

/** Framework package that declares TemplateCompiler. */
export const FRAMEWORK_JIT_COMPILER_PACKAGE_ID = "template-compiler";

/** DI key that materializes TemplateCompiler in StandardConfiguration. */
export const FRAMEWORK_JIT_COMPILER_KEY = "ITemplateCompiler";

/** Build the StandardConfiguration JIT compiler corridor filters. */
export function frameworkJitCompilerFlowFilters(
  extra: Inquiry["filters"] = {},
): Inquiry["filters"] {
  return {
    exportName: FRAMEWORK_JIT_COMPILER_ROOT_EXPORT,
    corridor: FrameworkAdmissionFlowCorridor.JitCompiler,
    ...extra,
  };
}

/** Build the compiler lens filters that focus TemplateCompiler instruction products. */
export function frameworkTemplateCompilerFilters(
  extra: Inquiry["filters"] = {},
): Inquiry["filters"] {
  return {
    packageId: FRAMEWORK_JIT_COMPILER_PACKAGE_ID,
    query: FRAMEWORK_JIT_COMPILER_ACTOR,
    ...extra,
  };
}

/** Whether a compiler producer/member name belongs to TemplateCompiler. */
export function isFrameworkJitCompilerActorName(value: string): boolean {
  return (
    value === FRAMEWORK_JIT_COMPILER_ACTOR ||
    value.startsWith(`${FRAMEWORK_JIT_COMPILER_ACTOR}.`)
  );
}
