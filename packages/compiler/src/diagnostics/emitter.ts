import type { SourceSpan } from "../model/ir.js";
import type { Origin } from "../model/origin.js";
import type { CompilerDiagnostic, DiagnosticStage, DiagnosticSeverity, DiagnosticRelated } from "../model/diagnostics.js";
import type {
  DiagnosticDataBase,
  DiagnosticStatus,
  DiagnosticsCatalog,
  DiagnosticDataByCode,
} from "./types.js";
import { buildDiagnostic } from "../shared/diagnostics.js";

export type EmitDiagnosticInput<TData extends DiagnosticDataBase = DiagnosticDataBase> = {
  message: string;
  span?: SourceSpan | null;
  origin?: Origin | null;
  related?: readonly DiagnosticRelated[];
  severity?: DiagnosticSeverity;
  data?: Readonly<TData>;
  /**
   * Optional description for provenance when a span is provided.
   * Useful for differentiating multiple diagnostics emitted at the same site.
   */
  description?: string;
};

export type DiagnosticEmitter<
  Catalog extends DiagnosticsCatalog,
  AllowedCodes extends keyof Catalog & string = keyof Catalog & string,
> = {
  emit<Code extends AllowedCodes>(
    code: Code,
    input: EmitDiagnosticInput<DiagnosticDataByCode<Catalog>[Code]>,
  ): CompilerDiagnostic<Code, DiagnosticDataByCode<Catalog>[Code]>;
};

export function createDiagnosticEmitter<
  Catalog extends DiagnosticsCatalog,
  AllowedCodes extends keyof Catalog & string = keyof Catalog & string,
>(
  catalog: Catalog,
  options: { stage: DiagnosticStage },
): DiagnosticEmitter<Catalog, AllowedCodes> {
  const stage = options.stage;

  return {
    emit(code, input) {
      const spec = catalog[code];
      if (spec && !ALLOWED_STATUSES.has(spec.status)) {
        throw new Error(
          `Diagnostic code '${code}' is ${spec.status} and cannot be emitted by the canonical emitter.`,
        );
      }
      const severity = input.severity;
      const data = input.data;
      return buildDiagnostic({
        code,
        message: input.message,
        stage,
        severity,
        span: input.span,
        origin: input.origin,
        related: input.related,
        data,
        description: input.description,
      });
    },
  };
}

const ALLOWED_STATUSES = new Set<DiagnosticStatus>(["canonical", "proposed"]);
