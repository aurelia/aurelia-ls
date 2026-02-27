import { describe, it, expect } from "vitest";
import type { NormalizedPath } from "@aurelia-ls/compiler/model/identity.js";
import type { SourceSpan } from "@aurelia-ls/compiler/model/span.js";
import type { RegistrationAnalysis } from "@aurelia-ls/compiler/project-semantics/register/types.js";
import { toSourceFileId } from "@aurelia-ls/compiler/model/identity.js";
import { buildResourceGraph } from "@aurelia-ls/compiler/project-semantics/scope/builder.js";
import { buildCustomElementDef } from "../../../out/project-semantics/assemble/resource-def.js";

function span(file: NormalizedPath): SourceSpan {
  return {
    file: toSourceFileId(file),
    start: 0,
    end: 1,
  };
}

describe("Scope: local-template imports", () => {
  it("parents local-template import scopes under the component local scope", () => {
    const componentPath = "/app/my-page.ts" as NormalizedPath;
    const templatePath = "/app/my-page.html" as NormalizedPath;

    const rootImported = buildCustomElementDef({
      name: "root-import",
      className: "RootImport",
      file: "/app/root-import.ts" as NormalizedPath,
    });
    const localImported = buildCustomElementDef({
      name: "local-import",
      className: "LocalImport",
      file: "/app/local-import.ts" as NormalizedPath,
    });

    const registration: RegistrationAnalysis = {
      sites: [
        {
          resourceRef: { kind: "resolved", resource: rootImported },
          scope: { kind: "local", owner: componentPath },
          evidence: {
            kind: "template-import",
            origin: "sibling",
            component: componentPath,
            className: "MyPage",
            templateFile: templatePath,
          },
          span: span(templatePath),
        },
        {
          resourceRef: { kind: "resolved", resource: localImported },
          scope: { kind: "local", owner: "/app/my-page.ts::local-template:local-widget" as NormalizedPath },
          evidence: {
            kind: "template-import",
            origin: "sibling",
            component: componentPath,
            className: "MyPage",
            templateFile: templatePath,
            localTemplateName: "local-widget",
          },
          span: span(templatePath),
        },
      ],
      orphans: [],
      unresolved: [],
      activatedPlugins: [],
    };

    const graph = buildResourceGraph(registration);

    const parentScopeId = "local:/app/my-page.ts";
    const childScopeId = "local:/app/my-page.ts::local-template:local-widget";
    const parentScope = graph.scopes[parentScopeId as keyof typeof graph.scopes];
    const childScope = graph.scopes[childScopeId as keyof typeof graph.scopes];

    expect(parentScope).toBeDefined();
    expect(childScope).toBeDefined();
    expect(childScope?.parent).toBe(parentScopeId);
    expect(parentScope?.resources?.elements?.["root-import"]).toBeDefined();
    expect(parentScope?.resources?.elements?.["local-import"]).toBeUndefined();
    expect(childScope?.resources?.elements?.["local-import"]).toBeDefined();
  });

  it("propagates unresolved registration evidence into scope completeness metadata", () => {
    const componentPath = "/app/my-page.ts" as NormalizedPath;
    const bootstrapPath = "/app/main.ts" as NormalizedPath;

    const registration: RegistrationAnalysis = {
      sites: [
        {
          resourceRef: {
            kind: "unresolved",
            name: "MissingDep",
            reason: "Could not resolve import for 'MissingDep'",
          },
          scope: { kind: "local", owner: componentPath },
          evidence: {
            kind: "static-dependencies",
            component: componentPath,
            className: "MyPage",
          },
          span: span(componentPath),
        },
      ],
      orphans: [],
      unresolved: [
        {
          pattern: {
            kind: "function-call",
            functionName: "loadPlugins",
          },
          file: bootstrapPath,
          span: span(bootstrapPath),
          reason: "Cannot statically analyze call to 'loadPlugins()'",
        },
      ],
      activatedPlugins: [],
    };

    const graph = buildResourceGraph(registration);
    const rootScope = graph.scopes[graph.root];
    const localScopeId = "local:/app/my-page.ts";
    const localScope = graph.scopes[localScopeId as keyof typeof graph.scopes];

    expect(localScope).toBeDefined();
    expect(localScope?.completeness?.complete).toBe(false);
    expect(localScope?.completeness?.unresolvedRegistrations).toHaveLength(1);
    expect(localScope?.completeness?.unresolvedRegistrations[0]?.source).toBe("site");
    expect(localScope?.completeness?.unresolvedRegistrations[0]?.resourceName).toBe("MissingDep");

    expect(rootScope?.completeness?.complete).toBe(false);
    expect(rootScope?.completeness?.unresolvedRegistrations.some((entry) => entry.source === "analysis")).toBe(true);
  });
});
