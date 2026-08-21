import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { AureliaProtocolCommand } from "@aurelia-ls/language-server/protocol";
import { AureliaCommand, AureliaContext, AureliaView } from "../out/product-contract.js";
import {
  RESOURCE_EXPLORER_ROLE_ICONS,
  resourceKindPresentation,
} from "../out/features/resource-discovery/presentation.js";

interface ExtensionManifest {
  readonly api?: string;
  readonly activationEvents?: readonly string[];
  readonly contributes?: {
    readonly commands?: readonly { readonly command: string; readonly title?: string; readonly icon?: string }[];
    readonly keybindings?: readonly {
      readonly command: string;
      readonly key: string;
      readonly when?: string;
    }[];
    readonly snippets?: readonly { readonly language: string; readonly path: string }[];
    readonly semanticTokenTypes?: readonly {
      readonly id: string;
      readonly superType: string;
      readonly description: string;
    }[];
    readonly semanticTokenModifiers?: readonly unknown[];
    readonly languages?: readonly {
      readonly id: string;
      readonly aliases?: readonly string[];
      readonly extensions?: readonly string[];
      readonly filenames?: readonly string[];
      readonly mimetypes?: readonly string[];
      readonly configuration?: string;
    }[];
    readonly grammars?: readonly {
      readonly language: string;
      readonly scopeName: string;
      readonly path: string;
      readonly embeddedLanguages?: Readonly<Record<string, string>>;
    }[];
    readonly htmlLanguageParticipants?: readonly {
      readonly languageId: string;
      readonly autoInsert?: boolean;
    }[];
    readonly configurationDefaults?: Readonly<Record<string, unknown>>;
    readonly jsonValidation?: readonly {
      readonly fileMatch: string;
      readonly url: string;
    }[];
    readonly menus?: Readonly<Record<string, readonly {
      readonly command: string;
      readonly when?: string;
      readonly group?: string;
    }[]>>;
    readonly views?: Readonly<Record<string, readonly { readonly id: string }[]>>;
    readonly configuration?: {
      readonly properties?: Readonly<Record<string, {
        readonly default?: unknown;
        readonly description?: string;
        readonly enumDescriptions?: readonly string[];
        readonly scope?: string;
      }>>;
    };
  };
}

interface AureliaProjectSchema {
  readonly [key: string]: unknown;
  readonly allowComments?: boolean;
  readonly allowTrailingCommas?: boolean;
}

const PROJECT_EDITOR_SCHEMA_ALLOWED_KEYWORDS = new Set([
  "$schema",
  "$id",
  "$defs",
  "$ref",
  "title",
  "description",
  "default",
  "examples",
  "properties",
  "items",
  "additionalProperties",
  "allowComments",
  "allowTrailingCommas",
]);

function objectRecord(value: unknown, path: string): Readonly<Record<string, unknown>> {
  expect(value, `${path} must be an object schema`).not.toBeNull();
  expect(Array.isArray(value), `${path} must not be an array schema`).toBe(false);
  expect(typeof value, `${path} must be an object schema`).toBe("object");
  return value as Readonly<Record<string, unknown>>;
}

function assertProjectEditorSchemaVocabulary(schema: unknown, path = "$editor"): void {
  const node = objectRecord(schema, path);
  for (const keyword of Object.keys(node)) {
    expect(
      PROJECT_EDITOR_SCHEMA_ALLOWED_KEYWORDS.has(keyword),
      `${path} uses validating or unsupported schema keyword '${keyword}'`,
    ).toBe(true);
  }
  if (node.$ref != null) {
    expect(node.$ref, `${path} may only use assertion-free local definitions`)
      .toMatch(/^#\/\$defs\//);
  }
  for (const mapKeyword of ["$defs", "properties"] as const) {
    if (node[mapKeyword] == null) continue;
    const children = objectRecord(node[mapKeyword], `${path}.${mapKeyword}`);
    for (const [name, child] of Object.entries(children)) {
      assertProjectEditorSchemaVocabulary(child, `${path}.${mapKeyword}.${name}`);
    }
  }
  if (node.items != null) {
    assertProjectEditorSchemaVocabulary(node.items, `${path}.items`);
  }
  if (node.additionalProperties != null) {
    assertProjectEditorSchemaVocabulary(node.additionalProperties, `${path}.additionalProperties`);
  }
}

const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as ExtensionManifest;
const extensionReadme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const extensionChangelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const rootReadme = readFileSync(new URL("../../../README.md", import.meta.url), "utf8");
const projectSchema = JSON.parse(
  readFileSync(
    new URL("../../semantic-runtime/schema/aurelia.project.schema.json", import.meta.url),
    "utf8",
  ),
) as AureliaProjectSchema;
const projectDialectSchema = JSON.parse(
  readFileSync(
    new URL("../src/schemas/aurelia.project.jsonc.schema.json", import.meta.url),
    "utf8",
  ),
) as AureliaProjectSchema;
const aureliaHtmlGrammar = JSON.parse(
  readFileSync(new URL("../syntaxes/aurelia-html.tmLanguage.json", import.meta.url), "utf8"),
) as { readonly scopeName?: string; readonly patterns?: readonly { readonly include?: string }[] };
const aureliaHtmlLanguageConfiguration = JSON.parse(
  readFileSync(new URL("../language-configuration.json", import.meta.url), "utf8"),
) as {
  readonly colorizedBracketPairs?: readonly unknown[];
  readonly onEnterRules?: readonly {
    readonly beforeText?: { readonly flags?: string };
    readonly afterText?: { readonly flags?: string };
  }[];
};
const aureliaHtmlSnippets = JSON.parse(
  readFileSync(new URL("../snippets/html.code-snippets", import.meta.url), "utf8"),
) as Readonly<Record<string, unknown>>;

describe("VS Code product contract", () => {
  test("does not expose the activation object as a public extension API", () => {
    expect(manifest.api).toBe("none");
  });

  test("keeps contributed commands and menus on the client-owned command vocabulary", () => {
    const expectedCommands = Object.values(AureliaCommand)
      .filter((command) => command !== AureliaCommand.OpenResource)
      .sort();
    const contributedCommands = (manifest.contributes?.commands ?? [])
      .map((entry) => entry.command)
      .sort();
    const menuCommands = Object.values(manifest.contributes?.menus ?? {})
      .flatMap((entries) => entries.map((entry) => entry.command));

    expect(contributedCommands).toEqual(expectedCommands);
    expect(new Set(menuCommands)).toEqual(new Set(expectedCommands));
    expect(manifest.contributes?.keybindings?.map((entry) => entry.command)).toEqual([
      AureliaCommand.OpenRelatedFile,
    ]);
    expect(AureliaCommand.ExplainFrameworkCapability).toBe(
      AureliaProtocolCommand.ExplainFrameworkCapability,
    );
    expect(AureliaCommand.ExplainAttributeInterpretation).toBe(
      AureliaProtocolCommand.ExplainAttributeInterpretation,
    );
    expect(AureliaCommand.ExplainBindingUncertainty).toBe(
      AureliaProtocolCommand.ExplainBindingUncertainty,
    );
    expect(AureliaCommand.ExplainResourceAvailability).toBe(
      AureliaProtocolCommand.ExplainResourceAvailability,
    );
    expect(manifest.contributes?.commands).toContainEqual({
      command: AureliaCommand.ExplainFrameworkCapability,
      title: "Explain Diagnostic",
      category: "Aurelia",
    });
    expect(manifest.contributes?.commands).toContainEqual({
      command: AureliaCommand.ExplainAttributeInterpretation,
      title: "Explain Attribute",
      category: "Aurelia",
    });
    expect(manifest.contributes?.commands).toContainEqual({
      command: AureliaCommand.ExplainBindingUncertainty,
      title: "Explain Binding",
      category: "Aurelia",
    });
    expect(manifest.contributes?.commands).toContainEqual({
      command: AureliaCommand.ExplainResourceAvailability,
      title: "Explain Availability in Active Template",
      category: "Aurelia",
    });
  });

  test("contributes the resource explorer only to VS Code's built-in Explorer", () => {
    const views = manifest.contributes?.views ?? {};

    expect(Object.keys(views)).toEqual(["explorer"]);
    expect(views["explorer"]?.map((view) => view.id)).toEqual([
      AureliaView.ResourceExplorer,
    ]);
  });

  test("limits passive source generation to the stock HTML document parity snippet", () => {
    expect(manifest.contributes?.snippets).toEqual([{
      language: "aurelia-html",
      path: "./snippets/html.code-snippets",
    }]);
    expect(aureliaHtmlSnippets).toEqual({
      "html doc": {
        isFileTemplate: true,
        body: [
          "<!DOCTYPE html>",
          "<html>",
          "<head>",
          "\t<meta charset=\"UTF-8\" />",
          "\t<title>${1:title}</title>",
          "</head>",
          "<body>",
          "\t$0",
          "</body>",
          "</html>",
        ],
        description: "HTML Document",
      },
    });
  });

  test("associates non-validating offline assistance while preserving semantic ownership", () => {
    expect(manifest.activationEvents).toContain("workspaceContains:**/aurelia.project.json");
    expect(manifest.contributes?.languages).toContainEqual({
      id: "jsonc",
      filenames: ["aurelia.project.json"],
    });
    expect(manifest.contributes?.jsonValidation).toEqual([{
      fileMatch: "**/aurelia.project.json",
      url: "./dist/schemas/aurelia.project.jsonc.schema.json",
    }]);
    expect(projectDialectSchema).toEqual(expect.objectContaining({
      allowComments: true,
      allowTrailingCommas: true,
    }));
    assertProjectEditorSchemaVocabulary(projectDialectSchema);
    const strictRootProperties = objectRecord(projectSchema.properties, "$strict.properties");
    const editorRootProperties = objectRecord(projectDialectSchema.properties, "$editor.properties");
    expect(Object.keys(editorRootProperties).sort()).toEqual(
      Object.keys(strictRootProperties).filter((name) => name !== "$schema").sort(),
    );

    const strictVersion = objectRecord(strictRootProperties.version, "$strict.properties.version");
    const editorVersion = objectRecord(editorRootProperties.version, "$editor.properties.version");
    expect(editorVersion.default).toEqual(strictVersion.const);
    expect(editorVersion.examples).toEqual([strictVersion.const]);

    const strictAuthoredSources = objectRecord(
      strictRootProperties.authoredSources,
      "$strict.properties.authoredSources",
    );
    const editorAuthoredSources = objectRecord(
      editorRootProperties.authoredSources,
      "$editor.properties.authoredSources",
    );
    expect(Object.keys(objectRecord(editorAuthoredSources.properties, "$editor.properties.authoredSources.properties")).sort())
      .toEqual(Object.keys(objectRecord(
        strictAuthoredSources.properties,
        "$strict.properties.authoredSources.properties",
      )).sort());

    const strictFindings = objectRecord(strictRootProperties.findings, "$strict.properties.findings");
    const editorFindings = objectRecord(editorRootProperties.findings, "$editor.properties.findings");
    const strictFindingProperties = objectRecord(
      strictFindings.properties,
      "$strict.properties.findings.properties",
    );
    const editorFindingProperties = objectRecord(
      editorFindings.properties,
      "$editor.properties.findings.properties",
    );
    expect(Object.keys(editorFindingProperties).sort()).toEqual(Object.keys(strictFindingProperties).sort());
    const strictDefinitions = objectRecord(projectSchema.$defs, "$strict.$defs");
    const findingDisposition = objectRecord(
      strictDefinitions.findingDisposition,
      "$strict.$defs.findingDisposition",
    );
    expect(objectRecord(
      editorFindings.additionalProperties,
      "$editor.properties.findings.additionalProperties",
    ).examples).toEqual(findingDisposition.enum);
    for (const [ruleId, strictRuleValue] of Object.entries(strictFindingProperties)) {
      expect(objectRecord(
        editorFindingProperties[ruleId],
        `$editor.properties.findings.properties.${ruleId}`,
      ).default).toEqual(objectRecord(
        strictRuleValue,
        `$strict.properties.findings.properties.${ruleId}`,
      ).default);
    }
    expect(projectSchema).toEqual(expect.objectContaining({
      allowComments: true,
      allowTrailingCommas: true,
    }));
  });

  test("declares a filename-neutral Aurelia HTML participant with native editing assets", () => {
    const language = manifest.contributes?.languages?.find((candidate) => candidate.id === "aurelia-html");
    expect(language).toEqual({
      id: "aurelia-html",
      aliases: ["Aurelia HTML", "aurelia-html"],
      configuration: "./language-configuration.json",
    });
    expect(language?.extensions).toBeUndefined();
    expect(language?.filenames).toBeUndefined();
    expect(language?.mimetypes).toBeUndefined();
    expect(manifest.contributes?.htmlLanguageParticipants).toEqual([{
      languageId: "aurelia-html",
      autoInsert: true,
    }]);
    expect(manifest.contributes?.configurationDefaults).toEqual({
      "emmet.includeLanguages": { "aurelia-html": "html" },
      "[aurelia-html]": { "editor.suggest.insertMode": "replace" },
    });
    expect(JSON.stringify(manifest)).not.toContain("html.validate.styles");
    expect(JSON.stringify(manifest)).not.toContain("html.validate.scripts");
    expect(manifest.contributes?.grammars).toEqual([{
      language: "aurelia-html",
      scopeName: "text.html.aurelia",
      path: "./syntaxes/aurelia-html.tmLanguage.json",
      embeddedLanguages: {
        "text.html": "aurelia-html",
        "source.css": "css",
        "source.js": "javascript",
        "source.python": "python",
        "source.smarty": "smarty",
      },
      tokenTypes: { "meta.tag string.quoted": "other" },
    }]);
    expect(aureliaHtmlGrammar).toEqual(expect.objectContaining({
      scopeName: "text.html.aurelia",
      patterns: [{ include: "text.html.basic" }],
    }));
    expect(aureliaHtmlLanguageConfiguration.colorizedBracketPairs).toEqual([]);
    expect(aureliaHtmlLanguageConfiguration.onEnterRules).toHaveLength(2);
    expect(aureliaHtmlLanguageConfiguration.onEnterRules?.[0]?.beforeText?.flags).toBe("i");
    expect(aureliaHtmlLanguageConfiguration.onEnterRules?.[0]?.afterText?.flags).toBe("i");
    expect(aureliaHtmlLanguageConfiguration.onEnterRules?.[1]?.beforeText?.flags).toBe("i");
  });

  test("declares the exact custom semantic token vocabulary with native fallback types", () => {
    expect(manifest.contributes?.semanticTokenTypes).toEqual([
      { id: "aureliaElement", superType: "class", description: "An Aurelia custom or framework element." },
      { id: "aureliaAttribute", superType: "decorator", description: "An Aurelia custom attribute." },
      { id: "aureliaBindable", superType: "property", description: "An Aurelia bindable attribute." },
      { id: "aureliaController", superType: "macro", description: "An Aurelia template controller." },
      { id: "aureliaCommand", superType: "keyword", description: "An Aurelia binding command." },
      { id: "aureliaConverter", superType: "function", description: "An Aurelia value converter." },
      { id: "aureliaBehavior", superType: "decorator", description: "An Aurelia binding behavior." },
      { id: "aureliaMetaElement", superType: "keyword", description: "An Aurelia template metadata element." },
      { id: "aureliaEvent", superType: "event", description: "An event name in Aurelia listener syntax." },
      { id: "aureliaModifier", superType: "keyword", description: "An Aurelia listener modifier." },
      { id: "aureliaExpression", superType: "operator", description: "A delimiter in an Aurelia template expression." },
    ]);
    expect(manifest.contributes?.semanticTokenModifiers).toBeUndefined();
  });

  test("offers template-scope resource navigation only from exact template ownership", () => {
    for (const menuName of ["editor/context", "commandPalette"]) {
      const menu = manifest.contributes?.menus?.[menuName]
        ?.find((entry) => entry.command === AureliaCommand.GoToAvailableResource);
      expect(menu?.when).toBe("aurelia.active && aurelia.activeTemplateOwned");
    }
  });

  test("keeps exactly three primary view actions and issue-scoped Output in overflow", () => {
    const title = manifest.contributes?.menus?.["view/title"] ?? [];
    const primary = title.filter((entry) => entry.group?.startsWith("navigation"));

    expect(primary).toEqual([
      expect.objectContaining({ command: AureliaCommand.GoToResource, group: "navigation@1" }),
      expect.objectContaining({
        command: AureliaCommand.GoToAvailableResource,
        group: "navigation@2",
        when: "view == aureliaResourceExplorer && aurelia.activeTemplateOwned",
      }),
      expect.objectContaining({ command: AureliaCommand.RefreshResourceExplorer, group: "navigation@3" }),
    ]);
    expect(title).toContainEqual(expect.objectContaining({
      command: AureliaCommand.OpenAureliaOutput,
      group: "status@1",
      when: "view == aureliaResourceExplorer && aurelia.resourceExplorerHasIssues",
    }));
    expect(title).toContainEqual({
      command: AureliaCommand.ReviewAnalysisLimitations,
      group: "analysis@1",
      when: `view == aureliaResourceExplorer && ${AureliaContext.ResourceExplorerHasAnalysisReview}`,
    });
  });

  test("uses native navigation, tree-role, and resource-kind group icons", () => {
    const icons = new Map((manifest.contributes?.commands ?? [])
      .map((command) => [command.command, command.icon] as const));

    expect(icons.get(AureliaCommand.GoToResource)).toBe("$(search)");
    expect(icons.get(AureliaCommand.GoToAvailableResource)).toBe("$(target)");
    expect(icons.get(AureliaCommand.RefreshResourceExplorer)).toBe("$(refresh)");
    expect(icons.get(AureliaCommand.OpenResourceDeclaration)).toBe("$(go-to-file)");
    expect(icons.get(AureliaCommand.OpenResourceImplementation)).toBe("$(file-code)");
    expect(icons.get(AureliaCommand.OpenResourceToSide)).toBe("$(split-horizontal)");
    expect(icons.get(AureliaCommand.OpenAureliaOutput)).toBe("$(output)");
    expect(RESOURCE_EXPLORER_ROLE_ICONS).toEqual({
      project: "project",
      resource: "code",
      alias: "link",
      bindable: "plug",
    });
    expect([
      "custom-element",
      "template-controller",
      "custom-attribute",
      "value-converter",
      "binding-behavior",
    ].map((kind) => resourceKindPresentation(kind as never).groupIcon)).toEqual([
      "tag",
      "symbol-structure",
      "symbol-property",
      "arrow-swap",
      "tools",
    ]);
  });

  test("bounds tree context actions and hides contextual commands from the Command Palette", () => {
    const context = manifest.contributes?.menus?.["view/item/context"] ?? [];
    const navigable = "view == aureliaResourceExplorer && (viewItem == resource || viewItem == resourceWithImplementation || viewItem == resourceAlias || viewItem == resourceBindable)";
    expect(context).toEqual([
      {
        command: AureliaCommand.ExplainResourceAvailability,
        when: "view == aureliaResourceExplorer && aurelia.activeTemplateOwned && (viewItem == resource || viewItem == resourceWithImplementation || viewItem == resourceUnavailable)",
        group: "availability@1",
      },
      { command: AureliaCommand.OpenResourceDeclaration, when: navigable, group: "navigation@1" },
      {
        command: AureliaCommand.OpenResourceImplementation,
        when: "view == aureliaResourceExplorer && viewItem == resourceWithImplementation",
        group: "navigation@2",
      },
      { command: AureliaCommand.OpenResourceToSide, when: navigable, group: "navigation@3" },
      {
        command: AureliaCommand.RetryResourceProject,
        when: "view == aureliaResourceExplorer && viewItem == resourceProjectIssue",
        group: "resourceRecovery@1",
      },
      {
        command: AureliaCommand.OpenAureliaOutput,
        when: "view == aureliaResourceExplorer && (viewItem == resourceProjectIssue || viewItem == resourceProjectUnsupported)",
        group: "resourceRecovery@2",
      },
    ]);
    for (const command of [
      AureliaCommand.ExplainAttributeInterpretation,
      AureliaCommand.ExplainBindingUncertainty,
      AureliaCommand.ExplainFrameworkCapability,
      AureliaCommand.ExplainResourceAvailability,
      AureliaCommand.OpenResourceDeclaration,
      AureliaCommand.OpenResourceImplementation,
      AureliaCommand.OpenResourceToSide,
      AureliaCommand.RetryResourceProject,
      AureliaCommand.OpenAureliaOutput,
      AureliaCommand.ReviewAnalysisLimitations,
    ]) {
      expect(manifest.contributes?.menus?.commandPalette).toContainEqual({ command, when: "false" });
    }
    for (const [menuName, entries] of Object.entries(manifest.contributes?.menus ?? {})) {
      if (menuName === "commandPalette") continue;
      expect(entries).not.toContainEqual(expect.objectContaining({
        command: AureliaCommand.ExplainBindingUncertainty,
      }));
      expect(entries).not.toContainEqual(expect.objectContaining({
        command: AureliaCommand.ExplainAttributeInterpretation,
      }));
    }
    for (const menuName of ["view/title", "editor/context"]) {
      expect(manifest.contributes?.menus?.[menuName]).not.toContainEqual(expect.objectContaining({
        command: AureliaCommand.ExplainResourceAvailability,
      }));
    }
  });

  test("offers configurable Alt+R related-file navigation only from focused supported editors", () => {
    const menu = manifest.contributes?.menus?.["editor/context"]
      ?.find((entry) => entry.command === AureliaCommand.OpenRelatedFile);
    const palette = manifest.contributes?.menus?.commandPalette
      ?.find((entry) => entry.command === AureliaCommand.OpenRelatedFile);
    const keybinding = manifest.contributes?.keybindings
      ?.find((entry) => entry.command === AureliaCommand.OpenRelatedFile);
    const supportedLanguages = [
      "html",
      "aurelia-html",
      "typescript",
      "typescriptreact",
      "javascript",
      "javascriptreact",
    ];
    const supportedLanguageClause = `(${supportedLanguages
      .map((languageId) => `editorLangId == ${languageId}`)
      .join(" || ")})`;
    const commandContext = `aurelia.active && aurelia.documentOwned && ${supportedLanguageClause}`;

    expect(menu?.when).toBe(commandContext);
    expect(palette?.when).toBe(commandContext);
    expect(keybinding).toEqual({
      command: AureliaCommand.OpenRelatedFile,
      key: "alt+r",
      when: `aurelia.active && aurelia.documentOwned && editorTextFocus && ${supportedLanguageClause}`,
    });
  });

  test("keeps product settings resource-scoped with quiet defaults", () => {
    const properties = manifest.contributes?.configuration?.properties ?? {};

    expect(Object.keys(properties).sort()).toEqual([
      "aurelia.activationMode",
      "aurelia.inlayHints.bindingMode",
      "aurelia.templateDiagnostics.suppressNative",
    ]);
    expect(properties["aurelia.activationMode"]).toEqual(expect.objectContaining({
      default: "auto",
      scope: "resource",
    }));
    expect(properties["aurelia.activationMode"]?.enumDescriptions?.[1]).toBe(
      "Enable Aurelia tooling for this workspace folder without requiring automatic project-shape confirmation; an excluded parent subtree still wins.",
    );
    expect(properties["aurelia.inlayHints.bindingMode"]).toEqual(expect.objectContaining({
      default: false,
      scope: "resource",
    }));
    expect(properties["aurelia.templateDiagnostics.suppressNative"]).toEqual(expect.objectContaining({
      default: false,
      scope: "resource",
      description: [
        "Suppress VS Code's built-in HTML, CSS, and JavaScript diagnostics, including legitimate native findings, for templates proven to belong to Aurelia.",
        "When enabled, proven templates use Aurelia HTML language mode; HTML language-service participation remains available, but file icons, [html]-scoped settings, snippets, formatter selection, and other native HTML or editor behavior may change.",
      ].join(" "),
    }));
  });

  test("documents every shipped Stage 6D job without exposing hidden commands as palette workflows", () => {
    const shippedLabels = [
      "Review Analysis Limitations",
      "Explain this Aurelia diagnostic",
      "Explain this Aurelia binding",
      "Explain how Aurelia uses this attribute",
      "Explain Availability in Active Template",
    ];
    for (const label of shippedLabels) {
      expect(extensionReadme).toContain(label);
      expect(extensionChangelog).toContain(label);
    }

    expect(extensionReadme).toContain("intentionally absent from the Command");
    expect(extensionChangelog).toContain("remain absent from the Command Palette");
    expect(extensionReadme).toContain("`off` can suppress the projected finding and its review row");
    expect(extensionChangelog).toContain("`off` does not promise a visible review row");
    for (const command of [
      AureliaCommand.ExplainAttributeInterpretation,
      AureliaCommand.ExplainBindingUncertainty,
      AureliaCommand.ExplainFrameworkCapability,
      AureliaCommand.ExplainResourceAvailability,
    ]) {
      expect(extensionReadme).not.toContain(command);
      expect(extensionChangelog).not.toContain(command);
    }

    expect(rootReadme).toContain("Contextual explanations");
    expect(rootReadme).toContain("shared **Aurelia semantic runtime**");
    expect(extensionReadme).toContain("may start a provisional language-server session");
    expect(extensionReadme).toContain("retains only an admitted session");
    for (const staleClaim of [
      "confidence-based severity so you don't get false positives",
      "jump from template to source for any Aurelia construct",
      "locate all usages of a component or bindable",
      "built around a **semantic workspace**",
      "full feature list and screenshots",
    ]) {
      expect(rootReadme).not.toContain(staleClaim);
    }
  });
});
