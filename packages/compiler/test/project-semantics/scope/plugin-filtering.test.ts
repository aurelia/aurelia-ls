import { describe, it, expect } from "vitest";
import { buildResourceGraph, ROUTER_MANIFEST } from "@aurelia-ls/compiler";
import { materializeResourcesForScope, BUILTIN_SEMANTICS } from "@aurelia-ls/compiler";
import type { RegistrationAnalysis } from "@aurelia-ls/compiler";

/**
 * Tests for plugin-based resource filtering in the scope builder.
 *
 * The scope builder filters resources from BUILTIN_SEMANTICS based on activated plugins:
 * - Resources without `package` field are always included (core resources)
 * - Resources with `package` field are only included if the corresponding plugin is activated
 *
 * This enables Elm-style errors: au-viewport without RouterConfiguration gives a helpful
 * error suggesting to register the plugin, rather than "unknown element".
 */
describe("Scope: Plugin Filtering", () => {
  describe("when RouterConfiguration is NOT activated", () => {
    const analysisWithoutRouter: RegistrationAnalysis = {
      sites: [],
      orphans: [],
      unresolved: [],
      activatedPlugins: [], // No plugins activated
    };

    it("excludes au-viewport element from ResourceGraph", () => {
      const graph = buildResourceGraph(analysisWithoutRouter);
      const { resources } = materializeResourcesForScope(BUILTIN_SEMANTICS, graph, graph.root);

      expect(
        resources.elements["au-viewport"],
        "au-viewport should NOT be available when RouterConfiguration is not activated"
      ).toBeUndefined();
    });

    it("excludes load attribute from ResourceGraph", () => {
      const graph = buildResourceGraph(analysisWithoutRouter);
      const { resources } = materializeResourcesForScope(BUILTIN_SEMANTICS, graph, graph.root);

      expect(
        resources.attributes["load"],
        "load attribute should NOT be available when RouterConfiguration is not activated"
      ).toBeUndefined();
    });

    it("excludes href attribute from ResourceGraph", () => {
      const graph = buildResourceGraph(analysisWithoutRouter);
      const { resources } = materializeResourcesForScope(BUILTIN_SEMANTICS, graph, graph.root);

      expect(
        resources.attributes["href"],
        "href attribute should NOT be available when RouterConfiguration is not activated"
      ).toBeUndefined();
    });

    it("still includes core resources without package field", () => {
      const graph = buildResourceGraph(analysisWithoutRouter);
      const { resources } = materializeResourcesForScope(BUILTIN_SEMANTICS, graph, graph.root);

      // Core template controllers should always be available
      expect(resources.controllers["if"], "if controller should be available").toBeTruthy();
      expect(resources.controllers["repeat"], "repeat controller should be available").toBeTruthy();
      expect(resources.controllers["with"], "with controller should be available").toBeTruthy();

      // Core attributes should always be available
      expect(resources.attributes["focus"], "focus attribute should be available").toBeTruthy();
      expect(resources.attributes["show"], "show attribute should be available").toBeTruthy();

      // Core value converters should always be available
      expect(resources.valueConverters["sanitize"], "sanitize value converter should be available").toBeTruthy();

      // Core binding behaviors should always be available
      expect(resources.bindingBehaviors["debounce"], "debounce binding behavior should be available").toBeTruthy();
    });
  });

  describe("when RouterConfiguration IS activated", () => {
    const analysisWithRouter: RegistrationAnalysis = {
      sites: [],
      orphans: [],
      unresolved: [],
      activatedPlugins: [ROUTER_MANIFEST], // Router plugin activated
    };

    it("includes au-viewport element in ResourceGraph", () => {
      const graph = buildResourceGraph(analysisWithRouter);
      const { resources } = materializeResourcesForScope(BUILTIN_SEMANTICS, graph, graph.root);

      expect(
        resources.elements["au-viewport"],
        "au-viewport should be available when RouterConfiguration is activated"
      ).toBeTruthy();
      expect(
        resources.elements["au-viewport"].package,
        "au-viewport should retain its package field"
      ).toBe("@aurelia/router");
    });

    it("includes load attribute in ResourceGraph", () => {
      const graph = buildResourceGraph(analysisWithRouter);
      const { resources } = materializeResourcesForScope(BUILTIN_SEMANTICS, graph, graph.root);

      expect(
        resources.attributes["load"],
        "load attribute should be available when RouterConfiguration is activated"
      ).toBeTruthy();
      expect(
        resources.attributes["load"].package,
        "load attribute should retain its package field"
      ).toBe("@aurelia/router");
    });

    it("includes href attribute in ResourceGraph", () => {
      const graph = buildResourceGraph(analysisWithRouter);
      const { resources } = materializeResourcesForScope(BUILTIN_SEMANTICS, graph, graph.root);

      expect(
        resources.attributes["href"],
        "href attribute should be available when RouterConfiguration is activated"
      ).toBeTruthy();
      expect(
        resources.attributes["href"].package,
        "href attribute should retain its package field"
      ).toBe("@aurelia/router");
    });

    it("still includes all core resources", () => {
      const graph = buildResourceGraph(analysisWithRouter);
      const { resources } = materializeResourcesForScope(BUILTIN_SEMANTICS, graph, graph.root);

      // Core resources should still be available
      expect(resources.controllers["if"], "if controller should be available").toBeTruthy();
      expect(resources.attributes["focus"], "focus attribute should be available").toBeTruthy();
      expect(resources.valueConverters["sanitize"], "sanitize should be available").toBeTruthy();
      expect(resources.bindingBehaviors["debounce"], "debounce should be available").toBeTruthy();
    });
  });

  describe("package field preservation", () => {
    it("preserves package field for filtering and Elm-style error diagnostics", () => {
      // This test documents WHY we keep the package field in the ResourceGraph:
      // 1. Enables filtering based on activated plugins
      // 2. Enables Elm-style errors: "au-viewport requires @aurelia/router"

      const analysisWithRouter: RegistrationAnalysis = {
        sites: [],
        orphans: [],
        unresolved: [],
        activatedPlugins: [ROUTER_MANIFEST],
      };

      const graph = buildResourceGraph(analysisWithRouter);
      const { resources } = materializeResourcesForScope(BUILTIN_SEMANTICS, graph, graph.root);

      // Package field should be preserved so the compiler/LSP can generate helpful errors
      const viewport = resources.elements["au-viewport"];
      expect(viewport.package).toBe("@aurelia/router");

      // When the element IS available, the compiler knows it's from @aurelia/router
      // When the element is NOT available (plugin not activated), BUILTIN_SEMANTICS
      // still has it as shadow knowledge for error recovery
    });
  });

  describe("package gating for all package-capable kinds", () => {
    const packageScopedBaseSemantics = {
      ...BUILTIN_SEMANTICS,
      resources: {
        ...BUILTIN_SEMANTICS.resources,
        valueConverters: {
          ...BUILTIN_SEMANTICS.resources.valueConverters,
          "router-only-vc": {
            name: "router-only-vc",
            in: { kind: "unknown" },
            out: { kind: "unknown" },
            package: "@aurelia/router",
          },
        },
        bindingBehaviors: {
          ...BUILTIN_SEMANTICS.resources.bindingBehaviors,
          "router-only-bb": {
            name: "router-only-bb",
            package: "@aurelia/router",
          },
        },
      },
    };

    it("excludes package-scoped value converters and binding behaviors when plugin is not activated", () => {
      const analysisWithoutRouter: RegistrationAnalysis = {
        sites: [],
        orphans: [],
        unresolved: [],
        activatedPlugins: [],
      };
      const graph = buildResourceGraph(analysisWithoutRouter, packageScopedBaseSemantics);
      const { resources } = materializeResourcesForScope(packageScopedBaseSemantics, graph, graph.root);

      expect(resources.valueConverters["router-only-vc"]).toBeUndefined();
      expect(resources.bindingBehaviors["router-only-bb"]).toBeUndefined();
    });

    it("includes package-scoped value converters and binding behaviors when plugin is activated", () => {
      const analysisWithRouter: RegistrationAnalysis = {
        sites: [],
        orphans: [],
        unresolved: [],
        activatedPlugins: [ROUTER_MANIFEST],
      };
      const graph = buildResourceGraph(analysisWithRouter, packageScopedBaseSemantics);
      const { resources } = materializeResourcesForScope(packageScopedBaseSemantics, graph, graph.root);

      expect(resources.valueConverters["router-only-vc"]).toBeTruthy();
      expect(resources.valueConverters["router-only-vc"]!.package).toBe("@aurelia/router");
      expect(resources.bindingBehaviors["router-only-bb"]).toBeTruthy();
      expect(resources.bindingBehaviors["router-only-bb"]!.package).toBe("@aurelia/router");
    });
  });
});
