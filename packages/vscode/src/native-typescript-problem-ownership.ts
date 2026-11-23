import type { Diagnostic, Uri } from "vscode";
import type { Middleware } from "vscode-languageclient/node";
import { typeScriptDiagnosticEvidenceKey } from "@aurelia-ls/language-server/protocol";

type DiagnosticReport = Awaited<ReturnType<Parameters<NonNullable<Middleware["provideDiagnostics"]>>[3]>>;

interface DecoratorEvidence {
  readonly candidates: readonly (readonly string[])[];
  readonly published: string;
  lastObserved: string;
}

/** Native validation can start, stop or select another TS project without changing Aurelia's semantic result ID. */
export class NativeTypeScriptProblemOwnership {
  readonly #documents = new Map<string, DecoratorEvidence>();

  constructor(private readonly getDiagnostics: (uri: Uri) => readonly Diagnostic[]) {}

  previousResultId(uri: Uri, previous: string | undefined): string | undefined {
    const entry = this.#documents.get(uri.toString());
    return entry != null && this.#matches(uri, entry.candidates) !== entry.published ? undefined : previous;
  }

  project(uri: Uri, report: DiagnosticReport): DiagnosticReport {
    if (report == null || !("items" in report)) return report;
    const candidates: string[][] = [];
    const indices: number[] = [];
    for (const [i, diagnostic] of report.items.entries()) {
      if (diagnostic.source !== "aurelia" || !("data" in diagnostic)) continue;
      const data = diagnostic.data;
      if (data == null || typeof data !== "object" || !("nativeTypeScriptEvidence" in data)
        || !Array.isArray(data.nativeTypeScriptEvidence)) continue;
      const keys = data.nativeTypeScriptEvidence.filter((key): key is string => typeof key === "string");
      if (keys.length) {
        candidates.push(keys);
        indices.push(i);
      }
    }
    if (!candidates.length) {
      this.forget(uri);
      return report;
    }
    const matches = this.#matches(uri, candidates);
    this.#documents.set(uri.toString(), { candidates, published: matches, lastObserved: matches });
    const hidden = new Set(indices.filter((_, i) => matches[i] === "1"));
    return hidden.size ? { ...report, items: report.items.filter((_, i) => !hidden.has(i)) } : report;
  }

  changed(uri: Uri): boolean {
    const entry = this.#documents.get(uri.toString());
    if (entry == null) return false;
    const matches = this.#matches(uri, entry.candidates);
    if (matches === entry.lastObserved) return false;
    entry.lastObserved = matches;
    return matches !== entry.published;
  }

  forget(uri: Uri): void { this.#documents.delete(uri.toString()); }

  #matches(uri: Uri, candidates: readonly (readonly string[])[]): string {
    const native = new Set<string>();
    for (const item of this.getDiagnostics(uri)) {
      if (item.source !== "ts") continue;
      const code = typeof item.code === "object" ? item.code.value : item.code;
      if (typeof code === "number") native.add(typeScriptDiagnosticEvidenceKey(code, item.range));
    }
    return candidates.map(keys => keys.some(key => native.has(key)) ? "1" : "0").join("");
  }
}
