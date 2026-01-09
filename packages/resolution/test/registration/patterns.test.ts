/**
 * Registration Pattern Unit Tests
 *
 * Tests each registration pattern in isolation using in-memory TypeScript programs.
 * This complements the integration tests (explicit-app) with focused pattern coverage.
 *
 * Patterns tested:
 * - Global: Aurelia.register(), container.register()
 * - Local: static dependencies, decorator dependencies, static $au dependencies
 * - Import: named, aliased, default, re-exports
 */

import { describe, it, expect } from "vitest";
import {
  extractAllFileFacts,
  buildExportBindingMap,
  createRegistrationAnalyzer,
  matchFileFacts,
} from "@aurelia-ls/resolution";
import type { RegistrationAnalysis, RegistrationSite, ResourceDef } from "@aurelia-ls/resolution";
import { createProgramFromMemory } from "../_helpers/index.js";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Run the full registration analysis pipeline on in-memory files.
 */
function analyzeRegistration(files: Record<string, string>): RegistrationAnalysis {
  const { program, host } = createProgramFromMemory(files);

  // 1. Extract facts from all files
  const facts = extractAllFileFacts(program, { moduleResolutionHost: host });

  // 2. Run pattern matching on all files to get resources
  const allResources: ResourceDef[] = [];
  for (const [, fileFacts] of facts) {
    const matchResult = matchFileFacts(fileFacts);
    allResources.push(...matchResult.resources);
  }

  // 3. Build export bindings
  const exportBindings = buildExportBindingMap(facts);

  // 4. Analyze registrations
  const analyzer = createRegistrationAnalyzer();
  return analyzer.analyze(allResources, facts, exportBindings);
}

function resourceName(resource: ResourceDef): string {
  return resource.name.value ?? "";
}

/**
 * Find a registration site by resource name.
 */
function findSiteByName(
  sites: readonly RegistrationSite[],
  name: string
): RegistrationSite | undefined {
  return sites.find(
    (s) => s.resourceRef.kind === "resolved" && resourceName(s.resourceRef.resource) === name
  );
}

/**
 * Get all site names (resolved only).
 */
function getSiteNames(sites: readonly RegistrationSite[]): string[] {
  return sites
    .filter((s) => s.resourceRef.kind === "resolved")
    .map((s) => resourceName((s.resourceRef as { kind: "resolved"; resource: ResourceDef }).resource))
    .sort();
}

/**
 * Get all orphan names.
 */
function getOrphanNames(analysis: RegistrationAnalysis): string[] {
  return analysis.orphans.map((o) => resourceName(o.resource)).sort();
}

// =============================================================================
// Global Registration Patterns
// =============================================================================

describe("Registration Patterns: Global", () => {
  it("Aurelia.register(SingleElement) - direct identifier", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { MyElement } from "./my-element.js";
        Aurelia.register(MyElement);
      `,
      "/src/my-element.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("my-element")
        export class MyElement {}
      `,
    });

    // Should find one global registration site
    const site = findSiteByName(analysis.sites, "my-element");
    expect(site, "Should find my-element site").toBeTruthy();
    expect(site!.scope.kind).toBe("global");
    expect(site!.evidence.kind).toBe("aurelia-register");

    // No orphans for this element
    expect(getOrphanNames(analysis)).not.toContain("my-element");
  });

  it("Aurelia.register(A, B, C) - multiple direct identifiers", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { ElementA } from "./element-a.js";
        import { ElementB } from "./element-b.js";
        import { ElementC } from "./element-c.js";
        Aurelia.register(ElementA, ElementB, ElementC);
      `,
      "/src/element-a.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("element-a")
        export class ElementA {}
      `,
      "/src/element-b.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("element-b")
        export class ElementB {}
      `,
      "/src/element-c.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("element-c")
        export class ElementC {}
      `,
    });

    // All three should be registered globally
    expect(getSiteNames(analysis.sites)).toEqual(["element-a", "element-b", "element-c"]);

    for (const name of ["element-a", "element-b", "element-c"]) {
      const site = findSiteByName(analysis.sites, name);
      expect(site!.scope.kind, `${name} should be global`).toBe("global");
    }
  });

  it("Aurelia.register(...namespace) - spread namespace import", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import * as components from "./components/index.js";
        Aurelia.register(...components);
      `,
      "/src/components/index.ts": `
        export { NavBar } from "./nav-bar.js";
        export { Footer } from "./footer.js";
      `,
      "/src/components/nav-bar.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("nav-bar")
        export class NavBar {}
      `,
      "/src/components/footer.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("footer")
        export class Footer {}
      `,
    });

    // Both components should be registered globally via barrel
    expect(getSiteNames(analysis.sites)).toEqual(["footer", "nav-bar"]);

    const navBar = findSiteByName(analysis.sites, "nav-bar");
    expect(navBar!.scope.kind).toBe("global");
    expect(navBar!.evidence.kind).toBe("aurelia-register");
  });

  it("new Aurelia().register(X) - chained registration", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { Widget } from "./widget.js";
        new Aurelia().register(Widget).app({ host: document.body, component: {} }).start();
      `,
      "/src/widget.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("widget")
        export class Widget {}
      `,
    });

    // Should find registration from chained call
    const site = findSiteByName(analysis.sites, "widget");
    expect(site, "Should find widget site from chained call").toBeTruthy();
    expect(site!.scope.kind).toBe("global");
  });

  it("container.register(X) - container-based registration", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import { DI } from "@aurelia/kernel";
        import { MyService } from "./my-service.js";
        import { MyElement } from "./my-element.js";
        const container = DI.createContainer();
        container.register(MyElement);
      `,
      "/src/my-element.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("my-element")
        export class MyElement {}
      `,
      "/src/my-service.ts": `
        export class MyService {}
      `,
    });

    // Should find container registration
    const site = findSiteByName(analysis.sites, "my-element");
    expect(site, "Should find my-element from container.register").toBeTruthy();
    expect(site!.scope.kind).toBe("global");
    expect(site!.evidence.kind).toBe("container-register");
  });

  it("multiple registration sites for same resource", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { SharedWidget } from "./shared-widget.js";
        Aurelia.register(SharedWidget);
      `,
      "/src/page-a.ts": `
        import { customElement } from "@aurelia/runtime-html";
        import { SharedWidget } from "./shared-widget.js";
        @customElement("page-a")
        export class PageA {
          static dependencies = [SharedWidget];
        }
      `,
      "/src/shared-widget.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("shared-widget")
        export class SharedWidget {}
      `,
    });

    // SharedWidget should have TWO registration sites:
    // 1. Global via Aurelia.register
    // 2. Local via PageA's static dependencies
    const sharedWidgetSites = analysis.sites.filter(
      (s) => s.resourceRef.kind === "resolved" && resourceName(s.resourceRef.resource) === "shared-widget"
    );

    expect(sharedWidgetSites.length, "Should have 2 registration sites").toBe(2);

    const globalSite = sharedWidgetSites.find((s) => s.scope.kind === "global");
    const localSite = sharedWidgetSites.find((s) => s.scope.kind === "local");

    expect(globalSite, "Should have global site").toBeTruthy();
    expect(localSite, "Should have local site").toBeTruthy();
  });
});

// =============================================================================
// Local Registration Patterns
// =============================================================================

describe("Registration Patterns: Local", () => {
  it("static dependencies = [X] - class property", () => {
    const analysis = analyzeRegistration({
      "/src/parent.ts": `
        import { customElement } from "@aurelia/runtime-html";
        import { Child } from "./child.js";
        @customElement("parent")
        export class Parent {
          static dependencies = [Child];
        }
      `,
      "/src/child.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("child")
        export class Child {}
      `,
    });

    // Child should be locally scoped to Parent
    const childSite = findSiteByName(analysis.sites, "child");
    expect(childSite, "Should find child site").toBeTruthy();
    expect(childSite!.scope.kind).toBe("local");
    if (childSite!.scope.kind === "local") {
      expect(childSite!.scope.owner).toContain("parent");
    }
    expect(childSite!.evidence.kind).toBe("static-dependencies");

    // Parent is an orphan (not registered anywhere)
    expect(getOrphanNames(analysis)).toContain("parent");
  });

  it("static dependencies with multiple children", () => {
    const analysis = analyzeRegistration({
      "/src/container.ts": `
        import { customElement } from "@aurelia/runtime-html";
        import { WidgetA } from "./widget-a.js";
        import { WidgetB } from "./widget-b.js";
        import { WidgetC } from "./widget-c.js";
        @customElement("container")
        export class Container {
          static dependencies = [WidgetA, WidgetB, WidgetC];
        }
      `,
      "/src/widget-a.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("widget-a")
        export class WidgetA {}
      `,
      "/src/widget-b.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("widget-b")
        export class WidgetB {}
      `,
      "/src/widget-c.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("widget-c")
        export class WidgetC {}
      `,
    });

    // All three widgets should be locally scoped
    for (const name of ["widget-a", "widget-b", "widget-c"]) {
      const site = findSiteByName(analysis.sites, name);
      expect(site, `Should find ${name} site`).toBeTruthy();
      expect(site!.scope.kind, `${name} should be local`).toBe("local");
      expect(site!.evidence.kind).toBe("static-dependencies");
    }
  });

  it("@customElement({ dependencies: [X] }) - decorator dependencies", () => {
    const analysis = analyzeRegistration({
      "/src/parent.ts": `
        import { customElement } from "@aurelia/runtime-html";
        import { LocalChild } from "./local-child.js";
        @customElement({
          name: "parent",
          dependencies: [LocalChild]
        })
        export class Parent {}
      `,
      "/src/local-child.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("local-child")
        export class LocalChild {}
      `,
    });

    // LocalChild should be locally scoped via decorator dependencies
    const childSite = findSiteByName(analysis.sites, "local-child");
    expect(childSite, "Should find local-child site").toBeTruthy();
    expect(childSite!.scope.kind).toBe("local");
    expect(childSite!.evidence.kind).toBe("decorator-dependencies");
  });

  it("static $au = { dependencies: [X] } - static $au dependencies", () => {
    const analysis = analyzeRegistration({
      "/src/parent.ts": `
        import { LocalWidget } from "./local-widget.js";
        export class Parent {
          static $au = {
            type: "custom-element",
            name: "parent",
            dependencies: [LocalWidget]
          };
        }
      `,
      "/src/local-widget.ts": `
        export class LocalWidget {
          static $au = {
            type: "custom-element",
            name: "local-widget"
          };
        }
      `,
    });

    // LocalWidget should be locally scoped via static $au dependencies
    const widgetSite = findSiteByName(analysis.sites, "local-widget");
    expect(widgetSite, "Should find local-widget site").toBeTruthy();
    expect(widgetSite!.scope.kind).toBe("local");
    expect(widgetSite!.evidence.kind).toBe("static-au-dependencies");
  });

  it("nested local dependencies (A depends on B depends on C)", () => {
    const analysis = analyzeRegistration({
      "/src/level-1.ts": `
        import { customElement } from "@aurelia/runtime-html";
        import { Level2 } from "./level-2.js";
        @customElement("level-1")
        export class Level1 {
          static dependencies = [Level2];
        }
      `,
      "/src/level-2.ts": `
        import { customElement } from "@aurelia/runtime-html";
        import { Level3 } from "./level-3.js";
        @customElement("level-2")
        export class Level2 {
          static dependencies = [Level3];
        }
      `,
      "/src/level-3.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("level-3")
        export class Level3 {}
      `,
    });

    // Level-2 is local to Level-1
    const level2Site = findSiteByName(analysis.sites, "level-2");
    expect(level2Site, "Should find level-2 site").toBeTruthy();
    expect(level2Site!.scope.kind).toBe("local");

    // Level-3 is local to Level-2
    const level3Site = findSiteByName(analysis.sites, "level-3");
    expect(level3Site, "Should find level-3 site").toBeTruthy();
    expect(level3Site!.scope.kind).toBe("local");

    // Verify different owners
    if (level2Site!.scope.kind === "local" && level3Site!.scope.kind === "local") {
      expect(level2Site!.scope.owner).toContain("level-1");
      expect(level3Site!.scope.owner).toContain("level-2");
    }
  });
});

// =============================================================================
// Import Resolution Patterns
// =============================================================================

describe("Registration Patterns: Import Resolution", () => {
  it("resolves named imports", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { MyComponent } from "./my-component.js";
        Aurelia.register(MyComponent);
      `,
      "/src/my-component.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("my-component")
        export class MyComponent {}
      `,
    });

    const site = findSiteByName(analysis.sites, "my-component");
    expect(site, "Should resolve named import").toBeTruthy();
    expect(site!.resourceRef.kind).toBe("resolved");
  });

  it("resolves aliased imports { Original as Alias }", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { OriginalName as AliasedName } from "./component.js";
        Aurelia.register(AliasedName);
      `,
      "/src/component.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("my-widget")
        export class OriginalName {}
      `,
    });

    // Should resolve despite the alias
    const site = findSiteByName(analysis.sites, "my-widget");
    expect(site, "Should resolve aliased import").toBeTruthy();
    expect(site!.resourceRef.kind).toBe("resolved");
  });

  it("resolves re-export aliases { Internal as Public }", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { PublicWidget } from "./exports.js";
        Aurelia.register(PublicWidget);
      `,
      "/src/exports.ts": `
        export { InternalWidget as PublicWidget } from "./internal.js";
      `,
      "/src/internal.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("internal-widget")
        export class InternalWidget {}
      `,
    });

    // Should follow the re-export alias chain
    const site = findSiteByName(analysis.sites, "internal-widget");
    expect(site, "Should resolve re-export alias").toBeTruthy();
    expect(site!.resourceRef.kind).toBe("resolved");
  });

  it("resolves default imports", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import DefaultComponent from "./default-component.js";
        Aurelia.register(DefaultComponent);
      `,
      "/src/default-component.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("default-component")
        export default class DefaultComponent {}
      `,
    });

    const site = findSiteByName(analysis.sites, "default-component");
    expect(site, "Should resolve default import").toBeTruthy();
    expect(site!.resourceRef.kind).toBe("resolved");
  });

  it("resolves namespace member access", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import * as widgets from "./widgets/index.js";
        Aurelia.register(widgets.SpecialWidget);
      `,
      "/src/widgets/index.ts": `
        export { SpecialWidget } from "./special-widget.js";
      `,
      "/src/widgets/special-widget.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("special-widget")
        export class SpecialWidget {}
      `,
    });

    // Should resolve namespace.member access
    const site = findSiteByName(analysis.sites, "special-widget");
    expect(site, "Should resolve namespace member access").toBeTruthy();
    expect(site!.resourceRef.kind).toBe("resolved");
  });

  it("resolves through multiple barrel re-exports", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import * as all from "./index.js";
        Aurelia.register(...all);
      `,
      "/src/index.ts": `
        export * from "./features/index.js";
      `,
      "/src/features/index.ts": `
        export * from "./components/index.js";
      `,
      "/src/features/components/index.ts": `
        export { DeepComponent } from "./deep-component.js";
      `,
      "/src/features/components/deep-component.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("deep-component")
        export class DeepComponent {}
      `,
    });

    // Should follow the full re-export chain
    const site = findSiteByName(analysis.sites, "deep-component");
    expect(site, "Should resolve through multiple barrel re-exports").toBeTruthy();
  });
});

// =============================================================================
// Mixed Patterns
// =============================================================================

describe("Registration Patterns: Mixed", () => {
  it("combines global and local registrations correctly", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { GlobalNav } from "./global-nav.js";
        import { App } from "./app.js";
        Aurelia.register(GlobalNav).app(App).start();
      `,
      "/src/global-nav.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("global-nav")
        export class GlobalNav {}
      `,
      "/src/app.ts": `
        import { customElement } from "@aurelia/runtime-html";
        import { LocalWidget } from "./local-widget.js";
        @customElement("app")
        export class App {
          static dependencies = [LocalWidget];
        }
      `,
      "/src/local-widget.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("local-widget")
        export class LocalWidget {}
      `,
    });

    // GlobalNav should be global
    const globalNav = findSiteByName(analysis.sites, "global-nav");
    expect(globalNav!.scope.kind).toBe("global");

    // LocalWidget should be local to App
    const localWidget = findSiteByName(analysis.sites, "local-widget");
    expect(localWidget!.scope.kind).toBe("local");

    // App is an orphan (used as root component, not registered)
    expect(getOrphanNames(analysis)).toContain("app");
  });

  it("handles all resource kinds (element, attribute, value-converter, binding-behavior)", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { MyElement } from "./my-element.js";
        import { MyAttribute } from "./my-attribute.js";
        import { MyValueConverter } from "./my-value-converter.js";
        import { MyBindingBehavior } from "./my-binding-behavior.js";
        Aurelia.register(MyElement, MyAttribute, MyValueConverter, MyBindingBehavior);
      `,
      "/src/my-element.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement("my-element")
        export class MyElement {}
      `,
      "/src/my-attribute.ts": `
        import { customAttribute } from "@aurelia/runtime-html";
        @customAttribute("my-attribute")
        export class MyAttribute {}
      `,
      "/src/my-value-converter.ts": `
        import { valueConverter } from "@aurelia/runtime-html";
        @valueConverter("myConverter")
        export class MyValueConverter {
          toView(value: any) { return value; }
        }
      `,
      "/src/my-binding-behavior.ts": `
        import { bindingBehavior } from "@aurelia/runtime-html";
        @bindingBehavior("myBehavior")
        export class MyBindingBehavior {}
      `,
    });

    // All four resource kinds should be registered
    // Note: canonicalSimpleName lowercases all names
    expect(findSiteByName(analysis.sites, "my-element")).toBeTruthy();
    expect(findSiteByName(analysis.sites, "my-attribute")).toBeTruthy();
    expect(findSiteByName(analysis.sites, "myconverter")).toBeTruthy();
    expect(findSiteByName(analysis.sites, "mybehavior")).toBeTruthy();

    // All should be global
    for (const site of analysis.sites) {
      if (site.resourceRef.kind === "resolved") {
        expect(site.scope.kind).toBe("global");
      }
    }
  });
});

describe("Plugin Registration Patterns", () => {
  it("detects RouterConfiguration as activated plugin", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { RouterConfiguration } from "@aurelia/router";
        Aurelia.register(RouterConfiguration);
      `,
    });

    // RouterConfiguration should be in activatedPlugins
    expect(analysis.activatedPlugins.length).toBe(1);
    expect(analysis.activatedPlugins[0]!.exportName).toBe("RouterConfiguration");
    expect(analysis.activatedPlugins[0]!.package).toBe("@aurelia/router");

    // No RegistrationSites created for plugin resources (they come from DEFAULT_SEMANTICS)
    const pluginSites = analysis.sites.filter(s => s.evidence.kind === "plugin");
    expect(pluginSites.length).toBe(0);
  });

  it("detects RouterConfiguration.customize() the same as RouterConfiguration", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { RouterConfiguration } from "@aurelia/router";
        Aurelia.register(RouterConfiguration.customize({ basePath: '/app' }));
      `,
    });

    // Same as plain RouterConfiguration
    expect(analysis.activatedPlugins.length).toBe(1);
    expect(analysis.activatedPlugins[0]!.exportName).toBe("RouterConfiguration");
    expect(analysis.activatedPlugins[0]!.package).toBe("@aurelia/router");
  });

  it("detects StandardConfiguration as activated plugin", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { StandardConfiguration } from "@aurelia/runtime-html";
        Aurelia.register(StandardConfiguration);
      `,
    });

    // StandardConfiguration should be in activatedPlugins
    expect(analysis.activatedPlugins.length).toBe(1);
    expect(analysis.activatedPlugins[0]!.exportName).toBe("StandardConfiguration");
    expect(analysis.activatedPlugins[0]!.package).toBe("@aurelia/runtime-html");
  });

  it("detects multiple plugins in one registration", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { StandardConfiguration } from "@aurelia/runtime-html";
        import { RouterConfiguration } from "@aurelia/router";
        Aurelia.register(StandardConfiguration, RouterConfiguration);
      `,
    });

    // Both plugins should be activated
    expect(analysis.activatedPlugins.length).toBe(2);

    const packages = analysis.activatedPlugins.map(p => p.package);
    expect(packages).toContain("@aurelia/runtime-html");
    expect(packages).toContain("@aurelia/router");
  });

  it("handles aliased plugin imports", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { RouterConfiguration as RC } from "@aurelia/router";
        Aurelia.register(RC);
      `,
    });

    // Should still detect RouterConfiguration despite alias
    expect(analysis.activatedPlugins.length).toBe(1);
    expect(analysis.activatedPlugins[0]!.exportName).toBe("RouterConfiguration");
    expect(analysis.activatedPlugins[0]!.package).toBe("@aurelia/router");
  });

  it("handles namespace import for plugins", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import * as Router from "@aurelia/router";
        Aurelia.register(Router.RouterConfiguration);
      `,
    });

    // Should detect RouterConfiguration via namespace access
    expect(analysis.activatedPlugins.length).toBe(1);
    expect(analysis.activatedPlugins[0]!.exportName).toBe("RouterConfiguration");
    expect(analysis.activatedPlugins[0]!.package).toBe("@aurelia/router");
  });

  it("treats unknown plugin-like names as unresolved", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { UnknownConfiguration } from "@aurelia/unknown";
        Aurelia.register(UnknownConfiguration);
      `,
    });

    // No plugins activated (unknown package)
    expect(analysis.activatedPlugins.length).toBe(0);

    // Should be an unresolved site (not a known plugin, not a user resource)
    expect(analysis.sites.length).toBe(1);
    expect(analysis.sites[0]!.resourceRef.kind).toBe("unresolved");
    expect(analysis.sites[0]!.evidence.kind).toBe("aurelia-register");
  });

  it("treats unknown .customize() calls as unresolved", () => {
    const analysis = analyzeRegistration({
      "/src/main.ts": `
        import Aurelia from "aurelia";
        import { MyPlugin } from "./my-plugin.js";
        Aurelia.register(MyPlugin.customize({ option: true }));
      `,
      "/src/my-plugin.ts": `
        export const MyPlugin = {
          customize(opts: any) { return this; }
        };
      `,
    });

    // No plugins activated (local file, not a known plugin)
    expect(analysis.activatedPlugins.length).toBe(0);

    // Should be in unresolved list (function call we can't analyze)
    expect(analysis.unresolved.length).toBe(1);
    expect(analysis.unresolved[0]!.pattern.kind).toBe("function-call");
  });
});
