import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IntegrationScenario } from "@aurelia-ls/integration-harness";
import { runIntegrationScenario } from "@aurelia-ls/integration-harness";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_IMPORTS_PKG_TSCONFIG = path.resolve(
  __dirname,
  "fixtures",
  "template-imports-pkg",
  "tsconfig.json",
);
const FIXTURE_MULTI_CLASS = path.resolve(
  __dirname,
  "..",
  "..",
  "resolution",
  "test",
  "npm",
  "fixtures",
  "multi-class",
);

const ROOT_OVERRIDE_RESOURCES = {
  elements: {
    "user-card": {
      kind: "element",
      name: "user-card",
      bindables: {
        rootOnly: { name: "rootOnly" },
      },
    },
  },
} as const;

describe("config precedence (template-local vs root scope)", () => {
  it("keeps template-local resource definitions distinct from root overrides", async () => {
    const scenario: IntegrationScenario = {
      id: "template-imports-precedence",
      source: {
        kind: "tsconfig",
        tsconfigPath: TEMPLATE_IMPORTS_PKG_TSCONFIG,
      },
      discovery: {
        fileSystem: "node",
        packageRoots: {
          "@test/multi-class": FIXTURE_MULTI_CLASS,
        },
        explicitResources: ROOT_OVERRIDE_RESOURCES,
      },
      compile: [
        {
          id: "template-imports-precedence-my-app",
          templatePath: "src/my-app.html",
          scope: { localOf: "my-app" },
          aot: true,
        },
      ],
    };

    const run = await runIntegrationScenario(scenario);
    const rootScope = run.resourceGraph.scopes[run.resourceGraph.root];
    const template = run.discovery.templates.find((entry) => entry.resourceName === "my-app");
    expect(template).toBeDefined();

    const localScopeId = `local:${template!.componentPath}`;
    const localScope = run.resourceGraph.scopes[localScopeId as keyof typeof run.resourceGraph.scopes];
    expect(localScope).toBeDefined();

    const rootUserCard = rootScope?.resources?.elements?.["user-card"];
    const localUserCard = localScope?.resources?.elements?.["user-card"];

    expect(rootUserCard).toBeDefined();
    expect(localUserCard).toBeDefined();

    const rootBindables = Object.keys(rootUserCard?.bindables ?? {});
    const localBindables = Object.keys(localUserCard?.bindables ?? {});

    expect(rootBindables).toContain("rootOnly");
    expect(localBindables).toContain("name");
    expect(localBindables).toContain("avatar");
    expect(localBindables).not.toContain("rootOnly");
  });
});
