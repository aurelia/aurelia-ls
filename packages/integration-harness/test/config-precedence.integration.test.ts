import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unwrapSourced } from "@aurelia-ls/compiler";
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
const COMPILER_FIXTURE_MULTI_CLASS = path.resolve(
  __dirname,
  "..",
  "..",
  "compiler",
  "test",
  "project-semantics",
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

  it("keeps local winner for conflicting resources after external merge recompute", async () => {
    const files = {
      "/workspace/src/local-user-card.ts": `
        declare function customElement(name: string): ClassDecorator;
        @customElement("user-card")
        export class LocalUserCard {}
      `,
      "/workspace/src/placeholder.ts": `export const placeholder = true;`,
    };

    const makeScenario = (rootNames: readonly string[]): IntegrationScenario => ({
      id: `external-precedence-${rootNames.map((name) => path.basename(name)).join("-")}`,
      source: {
        kind: "memory",
        files,
        rootNames,
      },
      discovery: {
        fileSystem: "mock",
        packagePath: "/workspace",
      },
      externalPackages: [
        { id: "@test/multi-class", path: COMPILER_FIXTURE_MULTI_CLASS, preferSource: true },
      ],
      externalResourcePolicy: "root-scope",
    });

    const forward = await runIntegrationScenario(
      makeScenario([
        "/workspace/src/local-user-card.ts",
        "/workspace/src/placeholder.ts",
      ]),
    );
    const reverse = await runIntegrationScenario(
      makeScenario([
        "/workspace/src/placeholder.ts",
        "/workspace/src/local-user-card.ts",
      ]),
    );

    const forwardUserCard = forward.semantics.elements["user-card"];
    const reverseUserCard = reverse.semantics.elements["user-card"];

    expect(forwardUserCard).toBeDefined();
    expect(reverseUserCard).toBeDefined();
    expect(unwrapSourced(forwardUserCard!.className)).toBe("LocalUserCard");
    expect(unwrapSourced(reverseUserCard!.className)).toBe("LocalUserCard");
    expect(forwardUserCard!.file).toBe("/workspace/src/local-user-card.ts");
    expect(reverseUserCard!.file).toBe("/workspace/src/local-user-card.ts");
  });

  it("keeps class/runtime winner over template-meta after external merge replay", async () => {
    const files = {
      "/workspace/src/device-list.ts": `
        declare function customElement(name: string): ClassDecorator;
        @customElement("device-list")
        export class DeviceListCustomElement {
          static bindables = {
            displayData: { mode: "toView" },
          };
        }
      `,
      "/workspace/src/device-list.html": `
        <bindable name="display-data" mode="two-way"></bindable>
      `,
      "/workspace/src/placeholder.ts": `export const placeholder = true;`,
    };

    const makeScenario = (rootNames: readonly string[]): IntegrationScenario => ({
      id: `template-meta-replay-${rootNames.map((name) => path.basename(name)).join("-")}`,
      source: {
        kind: "memory",
        files,
        rootNames,
      },
      discovery: {
        fileSystem: "mock",
        packagePath: "/workspace",
      },
      externalPackages: [
        { id: "@test/multi-class", path: COMPILER_FIXTURE_MULTI_CLASS, preferSource: true },
      ],
      externalResourcePolicy: "root-scope",
    });

    const forward = await runIntegrationScenario(
      makeScenario([
        "/workspace/src/device-list.ts",
        "/workspace/src/placeholder.ts",
      ]),
    );
    const reverse = await runIntegrationScenario(
      makeScenario([
        "/workspace/src/placeholder.ts",
        "/workspace/src/device-list.ts",
      ]),
    );

    const forwardElement = forward.semantics.elements["device-list"];
    const reverseElement = reverse.semantics.elements["device-list"];
    const forwardDiscoveryElement = forward.discovery.semantics.elements["device-list"];
    const reverseDiscoveryElement = reverse.discovery.semantics.elements["device-list"];
    expect(forwardDiscoveryElement).toBeDefined();
    expect(reverseDiscoveryElement).toBeDefined();
    expect(unwrapSourced(forwardDiscoveryElement!.bindables["displayData"]?.mode)).toBe("toView");
    expect(unwrapSourced(reverseDiscoveryElement!.bindables["displayData"]?.mode)).toBe("toView");
    expect(forwardElement).toBeDefined();
    expect(reverseElement).toBeDefined();
    expect(unwrapSourced(forwardElement!.bindables["displayData"]?.mode)).toBe("toView");
    expect(unwrapSourced(reverseElement!.bindables["displayData"]?.mode)).toBe("toView");
  });

  it("keeps class/runtime winner over inline template-meta after external merge replay", async () => {
    const files = {
      "/workspace/src/inline-device.ts": `
        declare function customElement(definition: { name: string; template: string }): ClassDecorator;
        @customElement({
          name: "inline-device",
          template: \`<bindable name="display-data" mode="two-way"></bindable>\`,
        })
        export class InlineDeviceCustomElement {
          static bindables = {
            displayData: { mode: "toView" },
          };
        }
      `,
      "/workspace/src/placeholder.ts": `export const placeholder = true;`,
    };

    const makeScenario = (rootNames: readonly string[]): IntegrationScenario => ({
      id: `inline-template-meta-replay-${rootNames.map((name) => path.basename(name)).join("-")}`,
      source: {
        kind: "memory",
        files,
        rootNames,
      },
      discovery: {
        fileSystem: "mock",
        packagePath: "/workspace",
      },
      externalPackages: [
        { id: "@test/multi-class", path: COMPILER_FIXTURE_MULTI_CLASS, preferSource: true },
      ],
      externalResourcePolicy: "root-scope",
    });

    const forward = await runIntegrationScenario(
      makeScenario([
        "/workspace/src/inline-device.ts",
        "/workspace/src/placeholder.ts",
      ]),
    );
    const reverse = await runIntegrationScenario(
      makeScenario([
        "/workspace/src/placeholder.ts",
        "/workspace/src/inline-device.ts",
      ]),
    );

    const forwardElement = forward.semantics.elements["inline-device"];
    const reverseElement = reverse.semantics.elements["inline-device"];
    expect(forwardElement).toBeDefined();
    expect(reverseElement).toBeDefined();
    expect(unwrapSourced(forwardElement!.bindables["displayData"]?.mode)).toBe("toView");
    expect(unwrapSourced(reverseElement!.bindables["displayData"]?.mode)).toBe("toView");
  });

  it("keeps local-template bindables stable and local-template surface-only fields inert after external merge replay", async () => {
    const files = {
      "/workspace/src/my-page.ts": `
        declare function customElement(name: string): ClassDecorator;
        @customElement("my-page")
        export class MyPageCustomElement {}
      `,
      "/workspace/src/my-page.html": `
        <template as-custom-element="local-card">
          <bindable name="status" mode="two-way"></bindable>
          <alias name="local-alias"></alias>
          <containerless></containerless>
        </template>
      `,
      "/workspace/src/placeholder.ts": `export const placeholder = true;`,
    };

    const makeScenario = (rootNames: readonly string[]): IntegrationScenario => ({
      id: `local-template-replay-${rootNames.map((name) => path.basename(name)).join("-")}`,
      source: {
        kind: "memory",
        files,
        rootNames,
      },
      discovery: {
        fileSystem: "mock",
        packagePath: "/workspace",
      },
      externalPackages: [
        { id: "@test/multi-class", path: COMPILER_FIXTURE_MULTI_CLASS, preferSource: true },
      ],
      externalResourcePolicy: "root-scope",
    });

    const forward = await runIntegrationScenario(
      makeScenario([
        "/workspace/src/my-page.ts",
        "/workspace/src/placeholder.ts",
      ]),
    );
    const reverse = await runIntegrationScenario(
      makeScenario([
        "/workspace/src/placeholder.ts",
        "/workspace/src/my-page.ts",
      ]),
    );

    const assertLocalTemplateContract = (run: Awaited<ReturnType<typeof runIntegrationScenario>>) => {
      const localScope = run.resourceGraph.scopes["local:/workspace/src/my-page.ts"];
      const localCard = localScope?.resources?.elements?.["local-card"];
      expect(localCard).toBeDefined();
      expect(localCard?.bindables?.status?.mode).toBe("twoWay");
      expect(localCard?.containerless).toBeUndefined();
      expect(localCard?.aliases).toBeUndefined();
    };

    assertLocalTemplateContract(forward);
    assertLocalTemplateContract(reverse);
  });
});
