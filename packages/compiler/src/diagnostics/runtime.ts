import type { CompilerDiagnostic, DiagnosticSource } from "../model/diagnostics.js";
import type { DiagnosticsCatalog } from "./types.js";
import { createDiagnosticEmitter, type DiagnosticEmitter } from "./emitter.js";
import { diagnosticsCatalog } from "./catalog/index.js";

export class DiagnosticsRuntime<Catalog extends DiagnosticsCatalog = typeof diagnosticsCatalog> {
  readonly #catalog: Catalog;
  readonly #diagnostics: CompilerDiagnostic[] = [];
  readonly #emitters = new Map<DiagnosticSource, DiagnosticEmitter<Catalog>>();
  readonly #counts = new Map<DiagnosticSource, number>();

  constructor(catalog?: Catalog) {
    this.#catalog = catalog ?? (diagnosticsCatalog as unknown as Catalog);
  }

  get catalog(): Catalog {
    return this.#catalog;
  }

  get all(): readonly CompilerDiagnostic[] {
    return this.#diagnostics;
  }

  count(source?: DiagnosticSource): number {
    if (!source) return this.#diagnostics.length;
    return this.#counts.get(source) ?? 0;
  }

  forSource(source: DiagnosticSource): DiagnosticEmitter<Catalog> {
    const existing = this.#emitters.get(source);
    if (existing) return existing;
    const base = createDiagnosticEmitter(this.#catalog, { source });
    const runtimeEmitter: DiagnosticEmitter<Catalog> = {
      emit: (code, input) => {
        const diag = base.emit(code, input);
        this.record(diag);
        return diag;
      },
    };
    this.#emitters.set(source, runtimeEmitter);
    return runtimeEmitter;
  }

  record(diag: CompilerDiagnostic): void {
    this.#diagnostics.push(diag);
    const prev = this.#counts.get(diag.source) ?? 0;
    this.#counts.set(diag.source, prev + 1);
  }
}
