// VM Reflection - cross-cutting compiler input
//
// This interface decouples the compiler from concrete TypeScript/VM state.
// Passed through facade/pipeline options and consumed by synthesis stages.

import type { CompileTrace } from "./trace.js";

/**
 * Injected by the caller; keeps synthesis stages decoupled from TS/compiler state.
 * Both overlay and runtime synthesis use this interface to understand the VM.
 */
export interface VmReflection {
  /** Union (or single) type expression for the root VM instance, e.g. "InstanceType<typeof App>". */
  getRootVmTypeExpr(): string;
  /** Synthetic name prefix for types/constants we create (e.g., "__AU_TTC_"). */
  getSyntheticPrefix(): string;
  /** Optional friendly name for diagnostics (e.g., "MyApp"). */
  getDisplayName?(): string;
  /** Optional qualified type expression for the root VM. */
  getQualifiedRootVmTypeExpr?(): string;
}

/**
 * Options for synthesis stages that need VM information.
 * Used by overlay:plan and future aot:plan stages.
 */
export interface SynthesisOptions {
  isJs: boolean;
  vm: VmReflection;
  /** Optional override for synthetic prefix (falls back to vm.getSyntheticPrefix()). */
  syntheticPrefix?: string;
  /** Optional trace for instrumentation */
  trace?: CompileTrace;
}
