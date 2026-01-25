import { debug } from "../../shared/debug.js";
import { NOOP_TRACE, type CompileTrace } from "../../shared/trace.js";
import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { ResourceCatalog } from "../../language/registry.js";
import type { LowerDiagnosticEmitter, ExprTable } from "./lower-shared.js";

export type LowerDebug = Pick<typeof debug, "lower">;

export interface LowerServices {
  readonly trace: CompileTrace;
  readonly diagnostics: LowerDiagnosticEmitter;
  readonly debug: LowerDebug;
}

export interface LowerContext {
  readonly services: LowerServices;
  readonly attrParser: AttributeParser;
  readonly catalog: ResourceCatalog;
  readonly table: ExprTable;
}

export function createLowerServices(opts: {
  diagnostics: LowerDiagnosticEmitter;
  trace?: CompileTrace;
}): { services: LowerServices; diagCount: () => number } {
  const trace = opts.trace ?? NOOP_TRACE;
  let count = 0;
  const diagnostics: LowerDiagnosticEmitter = {
    emit: (code, input) => {
      const diag = opts.diagnostics.emit(code, input);
      count += 1;
      return diag;
    },
  };
  return {
    services: {
      trace,
      diagnostics,
      debug,
    },
    diagCount: () => count,
  };
}
