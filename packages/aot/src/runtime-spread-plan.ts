import type {
  TemplateCompilerCompiledHandoffInstructionValue,
} from '@aurelia-ls/semantic-runtime/browser-template';

export const AOT_RUNTIME_SPREAD_PLAN_PROTOCOL = 'aurelia-aot/runtime-spread-plan/v2';
export const AOT_RUNTIME_SPREAD_PLAN = Symbol.for(AOT_RUNTIME_SPREAD_PLAN_PROTOCOL);
export const AOT_RUNTIME_SPREAD_CAPTURE_PROTOCOL = 'aurelia-aot/runtime-spread-capture/v1';
export const AOT_RUNTIME_SPREAD_CAPTURE = Symbol.for(AOT_RUNTIME_SPREAD_CAPTURE_PROTOCOL);
export const AOT_COMPILED_DEFINITION_IDENTITY_PROTOCOL = 'aurelia-aot/compiled-definition-identity/v1';
export const AOT_COMPILED_DEFINITION_IDENTITY = Symbol.for(AOT_COMPILED_DEFINITION_IDENTITY_PROTOCOL);

export type AotRuntimeSpreadTargetDefinitionMatch = 'structural' | 'explicit-definition';

/** One runtime-distinguishable result of compiling an emitted captured-attribute array. */
export interface AotRuntimeSpreadPlanCase {
  readonly captureOrdinals: readonly number[];
  readonly requestorName: string | null;
  readonly requestorKey: string | null;
  readonly requestorDefinitionIdentity: string | null;
  readonly targetNamespaceUri: string | null;
  readonly targetLocalName: string;
  readonly targetDefinitionMatch: AotRuntimeSpreadTargetDefinitionMatch;
  readonly targetDefinitionName: string | null;
  readonly targetDefinitionKey: string | null;
  readonly targetDefinitionIdentity: string | null;
  readonly instructions: readonly TemplateCompilerCompiledHandoffInstructionValue[];
}

/** Precompiled cases for one emitted capture origin, including its exactly planned partitions. */
export type AotRuntimeSpreadPlan = readonly AotRuntimeSpreadPlanCase[];

/** Carried by the original AttrSyntax object when AuCompose partitions its captures into new arrays. */
export interface AotRuntimeSpreadCapture {
  readonly plan: AotRuntimeSpreadPlan;
  readonly ordinal: number;
}
