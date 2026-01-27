import { createSemanticsLookup, type SemanticsLookup, type SemanticsLookupOptions } from "../../language/registry.js";
import type { Semantics } from "../../language/registry.js";
import type { ResourceGraph } from "../../language/resource-graph.js";
import type { ModuleResolver } from "../../shared/module-resolver.js";
import { NOOP_TRACE, type CompileTrace } from "../../shared/trace.js";
import { debug } from "../../shared/debug.js";
import type { DiagnosticEmitter } from "../../diagnostics/emitter.js";
import { diagnosticsCatalog } from "../../diagnostics/catalog/index.js";
import type { SemDiagCode } from "./types.js";

export type ResolveDiagnosticEmitter = DiagnosticEmitter<typeof diagnosticsCatalog, SemDiagCode>;
export type ResolveDebug = Pick<typeof debug, "link">;

export interface ResolveServices {
  readonly trace: CompileTrace;
  readonly diagnostics: ResolveDiagnosticEmitter;
  readonly debug: ResolveDebug;
}

export interface ResolveContext {
  readonly lookup: SemanticsLookup;
  readonly graph?: ResourceGraph | null;
  readonly services: ResolveServices;
  readonly moduleResolver: ModuleResolver;
  readonly templateFilePath: string;
}

export function createResolveServices(opts: {
  diagnostics: ResolveDiagnosticEmitter;
  trace?: CompileTrace;
}): { services: ResolveServices; diagCount: () => number; diagErrorCount: () => number } {
  const trace = opts.trace ?? NOOP_TRACE;
  let count = 0;
  let errorCount = 0;
  const diagnostics: ResolveDiagnosticEmitter = {
    emit: (code, input) => {
      const diag = opts.diagnostics.emit(code, input);
      count += 1;
      if (diag.severity === "error") errorCount += 1;
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
    diagErrorCount: () => errorCount,
  };
}

export function createResolveContext(
  sem: Semantics,
  services: ResolveServices,
  lookupOpts: SemanticsLookupOptions | undefined,
  graph: ResourceGraph | null | undefined,
  moduleResolver: ModuleResolver,
  templateFilePath: string,
): ResolveContext {
  return {
    lookup: createSemanticsLookup(sem, lookupOpts),
    graph,
    services,
    moduleResolver,
    templateFilePath,
  };
}
