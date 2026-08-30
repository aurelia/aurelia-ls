import type {
  TemplateCompilerCompiledHandoffInstructionValue,
} from '@aurelia-ls/semantic-runtime/browser-template';

export const AOT_RUNTIME_SPREAD_PLAN_PROTOCOL = 'aurelia-aot/runtime-spread-plan/v1';
export const AOT_RUNTIME_SPREAD_PLAN = Symbol.for(AOT_RUNTIME_SPREAD_PLAN_PROTOCOL);

export type AotRuntimeSpreadTargetDefinitionMatch = 'structural' | 'explicit-definition';

/** One runtime-distinguishable result of compiling an emitted captured-attribute array. */
export interface AotRuntimeSpreadPlanCase {
  readonly requestorName: string | null;
  readonly requestorKey: string | null;
  readonly targetNamespaceUri: string | null;
  readonly targetLocalName: string;
  readonly targetDefinitionMatch: AotRuntimeSpreadTargetDefinitionMatch;
  readonly targetDefinitionName: string | null;
  readonly targetDefinitionKey: string | null;
  readonly instructions: readonly TemplateCompilerCompiledHandoffInstructionValue[];
}

/** Non-enumerable value attached to the exact captures array passed by RC2 to `compileSpread`. */
export type AotRuntimeSpreadPlan = readonly AotRuntimeSpreadPlanCase[];
