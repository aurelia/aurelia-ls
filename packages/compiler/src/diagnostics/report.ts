import type { EmitDiagnosticInput, DiagnosticEmitter } from "./emitter.js";
import type { DiagnosticDataBase, DiagnosticDataByCode, DiagnosticsCatalog } from "./types.js";

export type ReportDiagnosticOptions<TData extends DiagnosticDataBase> =
  Omit<EmitDiagnosticInput<TData>, "message">;

export function reportDiagnostic<
  Catalog extends DiagnosticsCatalog,
  Code extends keyof Catalog & string,
>(
  emitter: DiagnosticEmitter<Catalog, Code>,
  code: Code,
  message: string,
  options?: ReportDiagnosticOptions<DiagnosticDataByCode<Catalog>[Code]>,
): void {
  const origin = options?.origin ?? null;
  emitter.emit(code, {
    message,
    ...options,
    origin,
  });
}
