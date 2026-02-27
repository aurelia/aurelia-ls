/**
 * Unit tests for typecheck configuration and coercion rules.
 *
 * These tests directly exercise the `checkTypeCompatibility` function
 * with various type combinations, binding contexts, and configurations.
 */
import { describe, test, expect } from "vitest";
import { lowerDocument } from "../../out/analysis/10-lower/lower.js";
import { linkTemplateSemantics } from "../../out/analysis/20-link/resolve.js";
import { buildSemanticsSnapshot } from "../../out/schema/snapshot.js";
import { bindScopes } from "../../out/analysis/30-bind/bind.js";
import { typecheck } from "../../out/analysis/40-typecheck/typecheck.js";
import {
  checkTypeCompatibility,
  resolveTypecheckConfig,
  DEFAULT_TYPECHECK_CONFIG,
  TYPECHECK_PRESETS,
  type BindingContext,
  type TypecheckConfig,
} from "../../out/analysis/40-typecheck/config.js";
import { getExpressionParser } from "../../out/parsing/expression-parser.js";
import { DEFAULT_SYNTAX } from "../../out/parsing/attribute-parser.js";
import { BUILTIN_SEMANTICS } from "../../out/schema/registry.js";
import { DiagnosticsRuntime } from "../../out/diagnostics/runtime.js";
import { noopModuleResolver } from "../_helpers/test-utils.js";

const RESOLVE_OPTS = { moduleResolver: noopModuleResolver, templateFilePath: "test.html" };

// Helper to create config with specific overrides
function config(overrides: Partial<TypecheckConfig> = {}): TypecheckConfig {
  return resolveTypecheckConfig(overrides);
}

describe("checkTypeCompatibility", () => {
  describe("exact type matches", () => {
    test("string === string", () => {
      const result = checkTypeCompatibility("string", "string", "dom.property", config());
      expect(result.compatible).toBe(true);
      expect(result.severity).toBe("off");
    });

    test("number === number", () => {
      const result = checkTypeCompatibility("number", "number", "dom.property", config());
      expect(result.compatible).toBe(true);
    });

    test("boolean === boolean", () => {
      const result = checkTypeCompatibility("boolean", "boolean", "dom.property", config());
      expect(result.compatible).toBe(true);
    });

    test("case-insensitive match (String vs string)", () => {
      const result = checkTypeCompatibility("String", "string", "dom.property", config());
      expect(result.compatible).toBe(true);
    });

    test("whitespace-normalized match", () => {
      const result = checkTypeCompatibility("  string  ", "string", "dom.property", config());
      expect(result.compatible).toBe(true);
    });
  });

  describe("any/unknown compatibility", () => {
    test("any actual is always compatible", () => {
      const result = checkTypeCompatibility("any", "string", "dom.property", config());
      expect(result.compatible).toBe(true);
      expect(result.severity).toBe("off");
    });

    test("any expected is always compatible", () => {
      const result = checkTypeCompatibility("number", "any", "dom.property", config());
      expect(result.compatible).toBe(true);
    });

    test("unknown actual is always compatible", () => {
      const result = checkTypeCompatibility("unknown", "boolean", "dom.property", config());
      expect(result.compatible).toBe(true);
    });

    test("unknown expected is always compatible", () => {
      const result = checkTypeCompatibility("string", "unknown", "dom.property", config());
      expect(result.compatible).toBe(true);
    });
  });

  describe("DOM coercion (number/boolean → string)", () => {
    test("number → string allowed for dom.property with domCoercion=true", () => {
      const result = checkTypeCompatibility("number", "string", "dom.property", config({ domCoercion: true }));
      expect(result.compatible).toBe(true);
      expect(result.coerced).toBe(true);
    });

    test("boolean → string allowed for dom.property with domCoercion=true", () => {
      const result = checkTypeCompatibility("boolean", "string", "dom.property", config({ domCoercion: true }));
      expect(result.compatible).toBe(true);
      expect(result.coerced).toBe(true);
    });

    test("number → string allowed for dom.attribute with domCoercion=true", () => {
      const result = checkTypeCompatibility("number", "string", "dom.attribute", config({ domCoercion: true }));
      expect(result.compatible).toBe(true);
      expect(result.coerced).toBe(true);
    });

    test("number → string NOT allowed for component.bindable (non-DOM context)", () => {
      const result = checkTypeCompatibility("number", "string", "component.bindable", config({ domCoercion: true, typeMismatch: "error" }));
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe("error");
    });

    test("number → string NOT allowed when domCoercion=false", () => {
      const result = checkTypeCompatibility("number", "string", "dom.property", config({ domCoercion: false, typeMismatch: "error" }));
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe("error");
    });

    test("string → number is NOT a DOM coercion (wrong direction)", () => {
      const result = checkTypeCompatibility("string", "number", "dom.property", config({ typeMismatch: "error" }));
      expect(result.compatible).toBe(false);
    });
  });

  describe("null/undefined → string handling", () => {
    test("null → string flagged with nullToString=warning", () => {
      const result = checkTypeCompatibility("null", "string", "dom.property", config({ nullToString: "warning" }));
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe("warning");
      expect(result.reason).toContain("null");
    });

    test("undefined → string flagged with nullToString=error", () => {
      const result = checkTypeCompatibility("undefined", "string", "dom.property", config({ nullToString: "error" }));
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe("error");
    });

    test("null → string allowed with nullToString=off", () => {
      const result = checkTypeCompatibility("null", "string", "dom.property", config({ nullToString: "off" }));
      expect(result.compatible).toBe(true);
      expect(result.coerced).toBe(true);
    });

    test("string | null → string flagged (nullable union)", () => {
      const result = checkTypeCompatibility("string | null", "string", "dom.property", config({ nullToString: "warning" }));
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe("warning");
    });

    test("string | undefined → string flagged (nullable union)", () => {
      const result = checkTypeCompatibility("string | undefined", "string", "dom.property", config({ nullToString: "warning" }));
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe("warning");
    });

    test("NonNullable<T> is treated as unevaluated type (safe fallback)", () => {
      // NonNullable<T> is a TS type expression that should have been resolved.
      // If it reaches the compatibility checker unresolved, treat as compatible
      // rather than risk a false alarm.
      const result = checkTypeCompatibility("NonNullable<Foo>", "string", "dom.property", config({ nullToString: "error", typeMismatch: "error" }));
      expect(result.compatible).toBe(true);
      expect(result.severity).toBe("off");
    });

    test("null → number is a type mismatch, not null-to-string", () => {
      const result = checkTypeCompatibility("null", "number", "dom.property", config({ typeMismatch: "error" }));
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe("error");
    });
  });

  describe("style property coercion", () => {
    test("number → string allowed for style.property", () => {
      const result = checkTypeCompatibility("number", "string", "style.property", config());
      expect(result.compatible).toBe(true);
      expect(result.coerced).toBe(true);
    });

    test("string → number allowed for style.property", () => {
      const result = checkTypeCompatibility("string", "number", "style.property", config());
      expect(result.compatible).toBe(true);
      expect(result.coerced).toBe(true);
    });

    test("boolean → string NOT allowed for style.property", () => {
      const result = checkTypeCompatibility("boolean", "string", "style.property", config({ typeMismatch: "error" }));
      expect(result.compatible).toBe(false);
    });
  });

  describe("function type handling", () => {
    test("arrow function satisfies Function", () => {
      const result = checkTypeCompatibility("() => void", "Function", "dom.property", config());
      expect(result.compatible).toBe(true);
    });

    test("function keyword satisfies Function", () => {
      const result = checkTypeCompatibility("function", "Function", "dom.property", config());
      expect(result.compatible).toBe(true);
    });

    test("ReturnType<...> satisfies Function", () => {
      const result = checkTypeCompatibility("ReturnType<typeof foo>", "Function", "dom.property", config());
      expect(result.compatible).toBe(true);
    });

    test("string does NOT satisfy Function", () => {
      const result = checkTypeCompatibility("string", "Function", "dom.property", config({ typeMismatch: "error" }));
      expect(result.compatible).toBe(false);
    });
  });

  describe("truthy coercion (if/show pattern)", () => {
    test("number → boolean accepted for component.bindable (if.bind='items.length')", () => {
      const result = checkTypeCompatibility("number", "boolean", "component.bindable", config());
      expect(result.compatible).toBe(true);
      expect(result.coerced).toBe(true);
    });

    test("string → boolean accepted for component.bindable (show.bind='name')", () => {
      const result = checkTypeCompatibility("string", "boolean", "component.bindable", config());
      expect(result.compatible).toBe(true);
      expect(result.coerced).toBe(true);
    });

    test("any[] → boolean accepted for component.bindable (if.bind='items')", () => {
      const result = checkTypeCompatibility("any[]", "boolean", "component.bindable", config());
      expect(result.compatible).toBe(true);
      expect(result.coerced).toBe(true);
    });

    test("number → boolean NOT accepted for dom.property", () => {
      const result = checkTypeCompatibility("number", "boolean", "dom.property", config({ typeMismatch: "error" }));
      expect(result.compatible).toBe(false);
    });

    test("null → boolean NOT accepted (null is not truthy-evaluable)", () => {
      const result = checkTypeCompatibility("null", "boolean", "component.bindable", config({ typeMismatch: "error" }));
      expect(result.compatible).toBe(false);
    });
  });

  describe("union type handling", () => {
    test("string | number compatible with string (all members coerce)", () => {
      const result = checkTypeCompatibility("string | number", "string", "dom.property", config({ domCoercion: true }));
      expect(result.compatible).toBe(true);
    });

    test("Map<string, number> | null triggers nullable check", () => {
      const result = checkTypeCompatibility("Map<string, number> | null", "string", "dom.property", config({ nullToString: "warning" }));
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe("warning");
    });
  });

  describe("type mismatches", () => {
    test("string → boolean is a mismatch", () => {
      const result = checkTypeCompatibility("string", "boolean", "dom.property", config({ typeMismatch: "error" }));
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe("error");
      expect(result.reason).toContain("not assignable");
    });

    test("number → boolean is a mismatch", () => {
      const result = checkTypeCompatibility("number", "boolean", "dom.property", config({ typeMismatch: "warning" }));
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe("warning");
    });

    test("object → string is a mismatch", () => {
      const result = checkTypeCompatibility("object", "string", "dom.property", config({ typeMismatch: "error" }));
      expect(result.compatible).toBe(false);
    });

    test("complex generic type is treated as unevaluated (safe fallback)", () => {
      // Generic types like Record<string, unknown> can't be compared via
      // string matching. The safety valve treats them as compatible to
      // avoid false alarms.
      const result = checkTypeCompatibility("Record<string, unknown>", "string", "dom.property", config({ typeMismatch: "error" }));
      expect(result.compatible).toBe(true);
    });
  });

  describe("binding context variations", () => {
    const contexts: BindingContext[] = ["dom.attribute", "dom.property", "component.bindable", "style.property", "template.local", "unknown"];

    test.each(contexts)("exact match works in %s context", (context) => {
      const result = checkTypeCompatibility("string", "string", context, config());
      expect(result.compatible).toBe(true);
    });

    test("DOM coercion only applies to dom.* contexts", () => {
      const domContexts: BindingContext[] = ["dom.attribute", "dom.property"];
      const nonDomContexts: BindingContext[] = ["component.bindable", "template.local", "unknown"];

      for (const ctx of domContexts) {
        const result = checkTypeCompatibility("number", "string", ctx, config({ domCoercion: true }));
        expect(result.compatible, `number→string should be allowed in ${ctx}`).toBe(true);
      }

      for (const ctx of nonDomContexts) {
        const result = checkTypeCompatibility("number", "string", ctx, config({ domCoercion: true, typeMismatch: "error" }));
        expect(result.compatible, `number→string should NOT be allowed in ${ctx}`).toBe(false);
      }
    });
  });
});

describe("resolveTypecheckConfig", () => {
  test("returns default config when no input", () => {
    const result = resolveTypecheckConfig();
    expect(result).toEqual(DEFAULT_TYPECHECK_CONFIG);
  });

  test("returns default config for empty object", () => {
    const result = resolveTypecheckConfig({});
    expect(result).toEqual(DEFAULT_TYPECHECK_CONFIG);
  });

  test("applies preset defaults", () => {
    const strict = resolveTypecheckConfig({ preset: "strict" });
    expect(strict.domCoercion).toBe(false);
    expect(strict.nullToString).toBe("error");
    expect(strict.typeMismatch).toBe("error");
  });

  test("explicit overrides take precedence over preset", () => {
    const result = resolveTypecheckConfig({ preset: "strict", domCoercion: true });
    expect(result.preset).toBe("strict");
    expect(result.domCoercion).toBe(true); // Override wins
  });

  test("off preset disables type checking", () => {
    const result = resolveTypecheckConfig({ preset: "off" });
    expect(result.enabled).toBe(false);
  });

  test("lenient preset is permissive", () => {
    const result = resolveTypecheckConfig({ preset: "lenient" });
    expect(result.domCoercion).toBe(true);
    expect(result.nullToString).toBe("off");
    expect(result.typeMismatch).toBe("warning");
  });

  test("standard preset is balanced", () => {
    const result = resolveTypecheckConfig({ preset: "standard" });
    expect(result.domCoercion).toBe(true);
    expect(result.nullToString).toBe("warning");
    expect(result.typeMismatch).toBe("error");
  });
});

describe("TYPECHECK_PRESETS", () => {
  test("all presets are defined", () => {
    expect(TYPECHECK_PRESETS.off).toBeDefined();
    expect(TYPECHECK_PRESETS.lenient).toBeDefined();
    expect(TYPECHECK_PRESETS.standard).toBeDefined();
    expect(TYPECHECK_PRESETS.strict).toBeDefined();
  });

  test("off preset disables checking", () => {
    expect(TYPECHECK_PRESETS.off.enabled).toBe(false);
  });

  test("strict preset is strictest", () => {
    expect(TYPECHECK_PRESETS.strict.domCoercion).toBe(false);
    expect(TYPECHECK_PRESETS.strict.nullToString).toBe("error");
    expect(TYPECHECK_PRESETS.strict.strictEventHandlers).toBe(true);
  });
});

/**
 * Cascade suppression tests.
 *
 * When earlier phases (resolve) fail, typecheck should NOT produce additional
 * type diagnostics that would just be noise on top of the root error.
 */
describe("cascade suppression", () => {
  const opts = {
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
    file: "test.html",
    name: "test",
    catalog: BUILTIN_SEMANTICS.catalog,
  };

  test("no binding contract when target.kind === 'unknown' (resolve failed)", () => {
    const diagnostics = new DiagnosticsRuntime();
    // Bind to a property that doesn't exist on the element
    const markup = '<div nonexistent.bind="42"></div>';

    const ir = lowerDocument(markup, { ...opts, diagnostics: diagnostics.forSource("lower") });
    const linked = linkTemplateSemantics(ir, buildSemanticsSnapshot(BUILTIN_SEMANTICS), { ...RESOLVE_OPTS, diagnostics: diagnostics.forSource("link") });
    const scope = bindScopes(linked, { diagnostics: diagnostics.forSource("bind") });
    const tc = typecheck({
      linked,
      scope,
      rootVmType: "RootVm",
      config: { preset: "standard" },
    });

    // The linked instruction should have target.kind === "unknown"
    const ins = linked.templates?.[0]?.rows?.[0]?.instructions?.[0];
    expect(ins?.kind).toBe("propertyBinding");
    expect((ins as { target?: { kind?: string } })?.target?.kind).toBe("unknown");

    // No binding contract produced (cascade suppression — unknown target skipped)
    expect(tc.expectedByExpr.size).toBe(0);
    expect(tc.contracts.size).toBe(0);
  });

  test("binding contract produced for valid targets", () => {
    const diagnostics = new DiagnosticsRuntime();
    // Bind a string to a boolean property
    const markup = '<input disabled.bind="\'yes\'">';

    const ir = lowerDocument(markup, { ...opts, diagnostics: diagnostics.forSource("lower") });
    const linked = linkTemplateSemantics(ir, buildSemanticsSnapshot(BUILTIN_SEMANTICS), { ...RESOLVE_OPTS, diagnostics: diagnostics.forSource("link") });
    const scope = bindScopes(linked, { diagnostics: diagnostics.forSource("bind") });
    const tc = typecheck({
      linked,
      scope,
      rootVmType: "RootVm",
      config: { preset: "standard" },
    });

    // Target should be resolved (not unknown)
    const ins = linked.templates?.[0]?.rows?.[0]?.instructions?.[0];
    expect((ins as { target?: { kind?: string } })?.target?.kind).not.toBe("unknown");

    // Should produce a binding contract with expected type
    expect(tc.contracts.size).toBeGreaterThan(0);
    const contracts = [...tc.contracts.values()];
    expect(contracts[0]?.type).toBe("boolean");
    expect(contracts[0]?.context).toBe("dom.property");
  });
});

/**
 * Style binding syntax documentation tests.
 *
 * Aurelia style bindings use the PART.PART pattern where the second PART is the command:
 * - width.style="100" → target="width", command="style" ✓ (produces stylePropertyBinding)
 * - style.width.bind="100" → target="style.width", command="bind" ✗ (produces propertyBinding)
 *
 * The correct syntax is: <property>.style="<value>"
 * NOT: style.<property>.bind="<value>"
 */
describe("style binding syntax", () => {
  const opts = {
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
    file: "test.html",
    name: "test",
    catalog: BUILTIN_SEMANTICS.catalog,
  };

  test("width.style produces stylePropertyBinding with target.kind=style", () => {
    const diagnostics = new DiagnosticsRuntime();
    const ir = lowerDocument('<div width.style="100"></div>', { ...opts, diagnostics: diagnostics.forSource("lower") });
    const linked = linkTemplateSemantics(ir, buildSemanticsSnapshot(BUILTIN_SEMANTICS), { ...RESOLVE_OPTS, diagnostics: diagnostics.forSource("link") });
    const ins = linked.templates?.[0]?.rows?.[0]?.instructions?.[0];

    expect(ins?.kind).toBe("stylePropertyBinding");
    expect((ins as { target?: { kind?: string } })?.target?.kind).toBe("style");
  });

  test("width.style expects type string (style.property context)", () => {
    const diagnostics = new DiagnosticsRuntime();
    const ir = lowerDocument('<div width.style="100"></div>', { ...opts, diagnostics: diagnostics.forSource("lower") });
    const linked = linkTemplateSemantics(ir, buildSemanticsSnapshot(BUILTIN_SEMANTICS), { ...RESOLVE_OPTS, diagnostics: diagnostics.forSource("link") });
    const scope = bindScopes(linked, { diagnostics: diagnostics.forSource("bind") });
    const tc = typecheck({
      linked,
      scope,
      rootVmType: "RootVm",
      config: { preset: "standard" },
    });

    const expectedTypes = [...(tc.expectedByExpr?.values() ?? [])];
    expect(expectedTypes).toContain("string");
  });

  test("style.width.bind is INVALID - produces propertyBinding not stylePropertyBinding", () => {
    // Documents that style.width.bind does NOT work as expected
    const diagnostics = new DiagnosticsRuntime();
    const ir = lowerDocument('<div style.width.bind="100"></div>', { ...opts, diagnostics: diagnostics.forSource("lower") });
    const ins = ir.templates?.[0]?.rows?.[0]?.instructions?.[0];

    // Parses as: target="style.width", command="bind" → propertyBinding
    expect(ins?.type).toBe("propertyBinding");
  });
});


