import fs from "node:fs";
import path from "node:path";
import type {
  ModuleResolver,
  MaterializedSemantics,
  ProjectSemantics,
  ResourceCatalog,
  SemanticModelQuery,
} from "@aurelia-ls/compiler";
import {
  createSemanticModel,
  prepareProjectSemantics,
  buildTemplateSyntaxRegistry,
  buildResourceCatalog,
  BUILTIN_SEMANTICS,
} from "@aurelia-ls/compiler";

export const noopModuleResolver: ModuleResolver = () => null;

/**
 * Build a SemanticModelQuery from semantics for test use.
 *
 * Accepts either MaterializedSemantics or plain ProjectSemantics (which
 * will be materialized via prepareProjectSemantics). Creates a minimal
 * ProjectSemanticsDiscoveryResult and runs it through the real
 * createSemanticModel factory. This bridges old-style test fixtures
 * (semantics + optional catalog) to the new query-based API.
 */
export function createTestQuery(
  semantics?: MaterializedSemantics | ProjectSemantics,
  catalog?: ResourceCatalog,
): SemanticModelQuery {
  const raw = semantics ?? BUILTIN_SEMANTICS;
  // Materialize if needed (plain ProjectSemantics lack resources/bindingCommands/etc.)
  const sem: MaterializedSemantics = "catalog" in raw && "resources" in raw
    ? raw as MaterializedSemantics
    : prepareProjectSemantics(raw);
  const syntax = buildTemplateSyntaxRegistry(sem);
  const cat: ResourceCatalog = catalog ?? buildResourceCatalog(
    sem.resources,
    syntax.bindingCommands,
    syntax.attributePatterns,
  );

  // Build authority array from ProjectSemantics (Sourced<T> fields) so that
  // createSemanticModel can unwrap names and populate model.entries + dep graph.
  const authority: any[] = [];
  const semanticsCollections: [string, Record<string, any>][] = [
    ["custom-element", sem.elements ?? {}],
    ["custom-attribute", sem.attributes ?? {}],
    ["template-controller", sem.controllers ?? {}],
    ["value-converter", sem.valueConverters ?? {}],
    ["binding-behavior", sem.bindingBehaviors ?? {}],
  ];
  for (const [kind, collection] of semanticsCollections) {
    for (const [, def] of Object.entries(collection)) {
      authority.push({ ...def, kind });
    }
  }

  // Minimal discovery result that satisfies createSemanticModel
  const discovery = {
    semantics: sem,
    catalog: cat,
    syntax,
    resourceGraph: { root: null, scopes: {} } as any,
    semanticSnapshot: { version: "test" as const, symbols: [], catalog: { resources: {} }, graph: null, gaps: [], confidence: "complete" as const },
    apiSurfaceSnapshot: { version: "test" as const, symbols: [] },
    definition: { authority, evidence: [] as any[], convergence: [] as any[] },
    registration: { sites: [], orphans: [], unresolved: [] },
    templates: [] as any[],
    inlineTemplates: [] as any[],
    diagnostics: [] as any[],
    recognizedBindingCommands: [] as any[],
    recognizedAttributePatterns: [] as any[],
    facts: new Map() as any,
  };

  return createSemanticModel(discovery as any).query();
}

/**
 * Generic set diff by key.
 * Given two arrays + key fn, returns { missing, extra } of the key strings.
 */
export function diffByKey<T>(
  actualArr: T[] | undefined,
  expectedArr: T[] | undefined,
  keyFn: (item: T) => string
): { missing: string[]; extra: string[] } {
  const a = new Set((actualArr ?? []).map(keyFn));
  const e = new Set((expectedArr ?? []).map(keyFn));

  const missing = [...e].filter((k) => !a.has(k));
  const extra = [...a].filter((k) => !e.has(k));
  return { missing, extra };
}

/**
 * Multiset diff by key.
 * Preserves duplicate cardinality (same key may appear multiple times).
 */
export function diffByKeyCounts<T>(
  actualArr: T[] | undefined,
  expectedArr: T[] | undefined,
  keyFn: (item: T) => string
): { missing: string[]; extra: string[] } {
  const actual = toCountMap(actualArr, keyFn);
  const expected = toCountMap(expectedArr, keyFn);
  const keys = new Set([...actual.keys(), ...expected.keys()]);
  const missing: string[] = [];
  const extra: string[] = [];

  for (const key of keys) {
    const actualCount = actual.get(key) ?? 0;
    const expectedCount = expected.get(key) ?? 0;
    if (expectedCount > actualCount) {
      for (let i = 0; i < expectedCount - actualCount; i++) missing.push(key);
    } else if (actualCount > expectedCount) {
      for (let i = 0; i < actualCount - expectedCount; i++) extra.push(key);
    }
  }

  return { missing, extra };
}

function toCountMap<T>(
  values: T[] | undefined,
  keyFn: (item: T) => string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const value of values ?? []) {
    const key = keyFn(value);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/**
 * Pretty-print helper for assertion messages.
 */
export function fmtList(label: string, arr: string[] | undefined): string {
  return arr && arr.length ? `\n${label}:\n - ${arr.join("\n - ")}\n` : "";
}

/**
 * Create a simple per-suite failure recorder that writes a JSON file on exit.
 *
 * Usage in a test file:
 *   const { recordFailure, attachWriter } = createFailureRecorder(__dirname, "failures.json");
 *   attachWriter();
 *   ...
 *   if (mismatch) recordFailure({ ... });
 */
export function createFailureRecorder(dirname: string, outFileName: string) {
  const records: unknown[] = [];

  function recordFailure(entry: unknown) {
    records.push(entry);
  }

  function writeOut() {
    const outPath = path.join(dirname, outFileName);
    if (!records.length) {
      // Clean up stale failure file if present.
      try {
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      } catch {
        /* ignore cleanup errors */
      }
      return;
    }
    try {
      fs.writeFileSync(outPath, JSON.stringify(records, null, 2), "utf8");
      console.error(`Wrote test failure snapshot to ${outPath}`);
    } catch (e) {
      console.error(
        `ERROR: failed to write ${outFileName}: ${(e as Error).message}`
      );
    }
  }

  function attachWriter() {
    // One file per node process; good enough for these suites.
    process.on("exit", writeOut);
  }

  return { recordFailure, attachWriter };
}
