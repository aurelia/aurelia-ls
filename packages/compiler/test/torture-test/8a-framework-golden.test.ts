/**
 * Tier 8A: Framework Golden — Full Semantic Model Validation
 *
 * Runs the interpreter against the real Aurelia 2 framework source
 * (aurelia-60 monorepo) and validates the ResourceCatalogGreen.
 *
 * NOT a comparison against the old pipeline. A comparison against
 * what the values SHOULD be, verified against framework source.
 *
 * Three layers (built incrementally):
 *   GREEN — structural content (FieldValue<T> fields)
 *   RED   — provenance (origin, form, per-field attribution)
 *   GRAPH — observation/conclusion structure
 *
 * This file starts with layer 1: resource presence + field deep-dive.
 */

import * as ts from "typescript";
import { resolve } from "path";
import { describe, it, expect, beforeAll } from "vitest";
import { createProjectDepGraph } from "../../out/core/graph/graph.js";
import { createConvergence } from "../../out/core/convergence/convergence.js";
import { interpretProject } from "../../out/core/interpret/interpreter.js";
import { graphToResourceCatalog } from "../../out/core/resource/from-graph.js";
import {
  resolveWorkspaceLayout,
  filterAnalysisFiles,
} from "../../out/core/project/workspace.js";
import type { NormalizedPath } from "../../out/model/identity.js";
import type {
  ResourceCatalogGreen,
  FieldValue,
  BindableGreen,
  TemplateControllerGreen,
} from "../../out/core/resource/types.js";
import type { ProjectDepGraph } from "../../out/core/graph/types.js";

// =============================================================================
// Configuration
// =============================================================================

// The aurelia submodule lives at the product repo root.
// This test file is at packages/compiler/test/torture-test/.
const AURELIA_ROOT = resolve(__dirname, "../../../../aurelia");

// =============================================================================
// Pipeline Result (shared across all tests)
// =============================================================================

let catalog: ResourceCatalogGreen;
let graph: ProjectDepGraph;

beforeAll(() => {
  // 1. Create ts.Program
  const configPath = ts.findConfigFile(
    AURELIA_ROOT,
    ts.sys.fileExists,
    "tsconfig.json",
  );
  if (!configPath) throw new Error("No tsconfig.json found in aurelia-60");
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, AURELIA_ROOT);
  const program = ts.createProgram(parsed.fileNames, parsed.options);

  // 2. Resolve workspace layout + filter
  // Exclude router-direct (experimental alternative router, not standard framework)
  const fullLayout = resolveWorkspaceLayout(AURELIA_ROOT);
  const layout = {
    ...fullLayout,
    packages: fullLayout.packages.filter(
      (p) => !p.root.includes("router-direct"),
    ),
  };
  const allTsFiles = parsed.fileNames
    .filter((f: string) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
    .map((f: string) => f.replace(/\\/g, "/"));
  const sourceFiles = filterAnalysisFiles(layout, allTsFiles);

  // 3. Interpret
  const convergence = createConvergence();
  graph = createProjectDepGraph(() => {}, convergence);
  interpretProject(sourceFiles as NormalizedPath[], {
    program,
    graph,
    packagePath: AURELIA_ROOT.replace(/\\/g, "/"),
    enableConventions: true,
  });

  // 4. Project to catalog
  catalog = graphToResourceCatalog(graph);
}, 60_000); // 60s timeout for real project

// =============================================================================
// FieldValue Helpers
// =============================================================================

const known = <T>(value: T): FieldValue<T> => ({ state: "known", value });
const absent = <T>(): FieldValue<T> => ({ state: "absent" });

// =============================================================================
// Expected Resource Names — ground truth from framework source
// =============================================================================

// These are the resources the framework DECLARES, verified against the
// actual source code. Declaration form and $au.name are the authority.
//
// Names come from:
//   - static $au = { type: '...', name: '...' }  (Form 2)
//   - @customElement('name') / @customAttribute('name')  (Form 1)
//   - Convention suffix stripping + casing  (Form 4, fallback)

// --- Custom Elements ---
// runtime-html: au-compose, au-slot
// router: au-viewport (via CustomElement.define, Form 3)
// validation-html: validation-container (suffix match)
// (router-direct excluded from analysis scope)
const EXPECTED_ELEMENTS = new Set([
  "au-compose",
  "au-slot",
  "au-viewport",
  "validation-container",
]);

// --- Template Controllers ---
// runtime-html: 12 core TCs (all via static $au)
// ui-virtualization: virtual-repeat
const EXPECTED_CONTROLLERS = new Set([
  "if",
  "else",
  "repeat",
  "with",
  "switch",
  "case",
  "default-case",
  "portal",
  "promise",
  "pending",
  "then",
  "catch",
  "virtual-repeat",
]);

// --- Custom Attributes ---
// runtime-html: focus, show
// router: load, href
// validation-html: validation-errors
// (router-direct excluded from analysis scope)
const EXPECTED_ATTRIBUTES = new Set([
  "focus",
  "show",
  "load",
  "href",
  "validation-errors",
]);

// --- Value Converters ---
// runtime-html: sanitize (static $au, name: 'sanitize')
// i18n: $au.name uses imported const enum constants, resolved via tier B enum support
//   df, nf, rt, t — correct names from ValueConverters const enum in i18n/utils.ts
// testing: mock
const EXPECTED_VALUE_CONVERTERS = new Set([
  "sanitize",
  "df",
  "nf",
  "rt",
  "t",
  "mock",
]);

// --- Binding Behaviors ---
// runtime-html: 10 core (static $au, camelCase names)
//   oneTime/toView/fromView/twoWay use $au = createConfig('name') — resolved via
//   bounded tier E (single-return function evaluation in resolveCall)
// i18n: $au.name uses imported const enum constants, resolved via tier B
//   t, df, nf, rt — correct names from ValueConverters const enum
// state: state
// validation-html: validate
// testing: mock
const EXPECTED_BINDING_BEHAVIORS = new Set([
  "debounce",
  "throttle",
  "signal",
  "oneTime",
  "toView",
  "fromView",
  "twoWay",
  "attr",
  "self",
  "updateTrigger",
  "t",
  "df",
  "nf",
  "rt",
  "state",
  "validate",
  "mock",
]);

// =============================================================================
// Tests — Green Layer: Resource Presence
// =============================================================================

describe("Tier 8A: Framework Golden", () => {
  // ── Resource presence ─────────────────────────────────────────────

  describe("green: resource presence", () => {
    it("custom elements — contains all expected", () => {
      const found = new Set(Object.keys(catalog.elements));
      for (const name of EXPECTED_ELEMENTS) {
        expect(found.has(name), `missing CE: ${name}`).toBe(true);
      }
    });

    it("custom elements — no false positives from non-resource classes", () => {
      // The catalog will contain builtins too, so we allow those.
      // But services (DialogController, HttpClient, Router, etc.) are
      // NOT custom elements — convention over-recognition is a bug.
      const found = new Set(Object.keys(catalog.elements));
      const allowed = new Set([...EXPECTED_ELEMENTS]);

      const unexpected = [...found].filter((n) => !allowed.has(n));
      expect(
        unexpected,
        `unexpected CEs (convention over-recognition): ${unexpected.join(", ")}`,
      ).toEqual([]);
    });

    it("template controllers — exact set", () => {
      const found = new Set(Object.keys(catalog.controllers));
      for (const name of EXPECTED_CONTROLLERS) {
        expect(found.has(name), `missing TC: ${name}`).toBe(true);
      }
      const unexpected = [...found].filter(
        (n) => !EXPECTED_CONTROLLERS.has(n),
      );
      expect(unexpected, `unexpected TCs: ${unexpected.join(", ")}`).toEqual(
        [],
      );
    });

    it("custom attributes — exact set", () => {
      const found = new Set(Object.keys(catalog.attributes));
      for (const name of EXPECTED_ATTRIBUTES) {
        expect(found.has(name), `missing CA: ${name}`).toBe(true);
      }
      const unexpected = [...found].filter(
        (n) => !EXPECTED_ATTRIBUTES.has(n),
      );
      expect(unexpected, `unexpected CAs: ${unexpected.join(", ")}`).toEqual(
        [],
      );
    });

    it("value converters — exact set", () => {
      const found = new Set(Object.keys(catalog.valueConverters));
      for (const name of EXPECTED_VALUE_CONVERTERS) {
        expect(found.has(name), `missing VC: ${name}`).toBe(true);
      }
      const unexpected = [...found].filter(
        (n) => !EXPECTED_VALUE_CONVERTERS.has(n),
      );
      expect(unexpected, `unexpected VCs: ${unexpected.join(", ")}`).toEqual(
        [],
      );
    });

    it("binding behaviors — exact set", () => {
      const found = new Set(Object.keys(catalog.bindingBehaviors));
      for (const name of EXPECTED_BINDING_BEHAVIORS) {
        expect(found.has(name), `missing BB: ${name}`).toBe(true);
      }
      const unexpected = [...found].filter(
        (n) => !EXPECTED_BINDING_BEHAVIORS.has(n),
      );
      expect(unexpected, `unexpected BBs: ${unexpected.join(", ")}`).toEqual(
        [],
      );
    });
  });

  // ── Deep dive: repeat ─────────────────────────────────────────────

  describe("green: repeat (TC deep dive)", () => {
    let repeat: TemplateControllerGreen;

    beforeAll(() => {
      repeat = catalog.controllers["repeat"]!;
      expect(repeat, "repeat must exist in catalog").toBeDefined();
    });

    it("identity", () => {
      expect(repeat.kind).toBe("template-controller");
      expect(repeat.name).toBe("repeat");
      expect(repeat.className).toBe("Repeat");
    });

    it("structural fields", () => {
      expect(repeat.noMultiBindings).toEqual(known(false));
      expect(repeat.defaultProperty).toEqual(known("items"));
      expect(repeat.containerStrategy).toEqual(known("reuse"));
      expect(repeat.aliases).toEqual(known([]));
    });

    it("bindable: items", () => {
      const items = repeat.bindables["items"];
      expect(items, "items bindable must exist").toBeDefined();
      expect(items!.property).toBe("items");
      expect(items!.primary).toEqual(known(true));
    });

    it("semantics (from builtin catalog)", () => {
      expect(repeat.semantics).not.toBeNull();
      if (!repeat.semantics) return;

      expect(repeat.semantics.origin).toBe("repeat");
      expect(repeat.semantics.trigger).toEqual({
        kind: "iterator",
        prop: "items",
        command: "for",
      });
      expect(repeat.semantics.scope).toBe("overlay");
      expect(repeat.semantics.cardinality).toBe("zero-many");
      expect(repeat.semantics.injects?.contextuals).toEqual(
        expect.arrayContaining([
          "$index",
          "$first",
          "$last",
          "$even",
          "$odd",
          "$length",
        ]),
      );
      expect(repeat.semantics.tailProps).toHaveProperty("key");
    });
  });
});
