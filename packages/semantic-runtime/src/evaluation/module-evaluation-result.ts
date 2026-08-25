import type { EvaluationCompletion } from './completion.js';
import type { ModuleEnvironmentRecord } from './environment.js';
import type { StaticEvaluationRuntimeHost } from './evaluator.js';
import type { StaticEvaluationExecutionTopology } from './execution-topology.js';
import {
  isStaticInvocationOccurrence,
  type StaticInvocationEvaluation,
  type StaticInvocationOccurrence,
} from './invocation.js';
import { DefaultStaticEvaluationPolicy, type StaticEvaluationPolicy } from './policy.js';
import { DefaultStaticEvaluationRuntimeHost } from './runtime-host.js';
import type { EvaluationOpenSeam } from './seams.js';

/** Retained result of evaluating one source module. */
export class StaticModuleEvaluationResult {
  /** Reached invocation leaves in the definite root execution lane. */
  readonly invocationEvaluations: readonly StaticInvocationEvaluation[];
  /** Calls and constructions that reached the modeled invocation operation. */
  readonly invocations: readonly StaticInvocationOccurrence[];

  constructor(
    /** Module key whose source file was evaluated. */
    readonly moduleKey: string,
    /** Environment record after the evaluator's module-body pass. */
    readonly environment: ModuleEnvironmentRecord,
    /** Final module-body completion. */
    readonly completion: EvaluationCompletion,
    /** Explicit open seams produced while evaluating this module. */
    readonly openSeams: readonly EvaluationOpenSeam[],
    /** Definite and mutually exclusive execution evidence retained for this module. */
    readonly executionTopology: StaticEvaluationExecutionTopology,
    /** Policy used by follow-up expression reads against this module environment. */
    readonly policy: StaticEvaluationPolicy = DefaultStaticEvaluationPolicy,
    /** Runtime host used by follow-up expression reads against this module environment. */
    readonly runtimeHost: StaticEvaluationRuntimeHost = DefaultStaticEvaluationRuntimeHost,
  ) {
    this.invocationEvaluations = executionTopology.invocationEvaluations;
    this.invocations = this.invocationEvaluations.filter(isStaticInvocationOccurrence);
  }
}
