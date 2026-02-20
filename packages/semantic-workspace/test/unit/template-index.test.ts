import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";
import {
  canonicalDocumentUri,
  type DocumentUri,
  type ProjectSemanticsDiscoveryResult,
  type ResourceScopeId,
} from "@aurelia-ls/compiler";
import { buildTemplateIndex } from "../../src/engine.js";
import { inlineTemplatePath } from "../../src/templates.js";

function discoveryWithTemplates(
  templates: ProjectSemanticsDiscoveryResult["templates"],
  inlineTemplates: ProjectSemanticsDiscoveryResult["inlineTemplates"] = [],
): ProjectSemanticsDiscoveryResult {
  return {
    templates,
    inlineTemplates,
  } as unknown as ProjectSemanticsDiscoveryResult;
}

function fixturePath(...segments: string[]): string {
  return path.resolve(process.cwd(), ...segments);
}

describe("template index", () => {
  test("canonicalizes external template keys from file URIs", () => {
    const templatePath = fixturePath("packages", "semantic-workspace", "test", "fixtures", "workspace-contract", "src", "my-app.html");
    const componentPath = fixturePath("packages", "semantic-workspace", "test", "fixtures", "workspace-contract", "src", "my-app.ts");
    const templateUri = pathToFileURL(templatePath).href;
    const scopeId = "root" as ResourceScopeId;

    const index = buildTemplateIndex(discoveryWithTemplates([
      {
        templatePath: templateUri as unknown as ProjectSemanticsDiscoveryResult["templates"][number]["templatePath"],
        componentPath: canonicalDocumentUri(componentPath).path,
        scopeId,
        className: "MyApp",
        resourceName: "my-app",
      },
    ]));

    const canonicalTemplateUri = canonicalDocumentUri(templateUri).uri;
    expect(index.templateToComponent.get(canonicalTemplateUri)).toBe(canonicalDocumentUri(componentPath).path);
    expect(index.templateToScope.get(canonicalTemplateUri)).toBe(scopeId);
    expect(index.templateToComponent.has(templateUri as unknown as DocumentUri)).toBe(false);
  });

  test("canonicalizes inline template keys derived from file URIs", () => {
    const componentPath = fixturePath("packages", "semantic-workspace", "test", "fixtures", "workspace-contract", "src", "components", "inline-note.ts");
    const componentUri = pathToFileURL(componentPath).href;
    const scopeId = "root" as ResourceScopeId;
    const rawInlinePath = inlineTemplatePath(componentUri as unknown as ProjectSemanticsDiscoveryResult["inlineTemplates"][number]["componentPath"]);

    const index = buildTemplateIndex(discoveryWithTemplates(
      [],
      [
        {
          componentPath: componentUri as unknown as ProjectSemanticsDiscoveryResult["inlineTemplates"][number]["componentPath"],
          scopeId,
          className: "InlineNote",
          resourceName: "inline-note",
          content: "<template></template>",
        },
      ],
    ));

    const canonicalInlineUri = canonicalDocumentUri(rawInlinePath).uri;
    expect(index.templateToComponent.get(canonicalInlineUri)).toBe(componentUri);
    expect(index.templateToScope.get(canonicalInlineUri)).toBe(scopeId);
    expect(index.templateToComponent.has(rawInlinePath as unknown as DocumentUri)).toBe(false);
  });
});

