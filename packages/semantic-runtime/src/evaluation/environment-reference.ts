/** Minimal environment shape captured by evaluator-local function and class values. */
export interface EvaluationEnvironmentRecordReference {
  /** Module or call-frame key that owns this environment. */
  readonly moduleKey: string;

  /** Clone the environment for branch/function interpretation while sharing evaluator-local values. */
  clone(moduleKey?: string): EvaluationEnvironmentRecordReference;
}
