import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { AureliaProtocolCommand } from "@aurelia-ls/language-server/protocol";
import { AureliaCommand, AureliaContext, AureliaView } from "../out/product-contract.js";

interface ExtensionManifest {
  readonly api?: string;
  readonly activationEvents?: readonly string[];
  readonly contributes?: {
    readonly commands?: readonly { readonly command: string; readonly title?: string; readonly icon?: string }[];
    readonly keybindings?: readonly unknown[];
    readonly snippets?: readonly unknown[];
    readonly semanticTokenTypes?: readonly {
      readonly id: string;
      readonly superType: string;
      readonly description: string;
    }[];
    readonly semanticTokenModifiers?: readonly unknown[];
    readonly languages?: readonly {
      readonly id: string;
      readonly filenames?: readonly string[];
    }[];
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
        readonly enumDescriptions?: readonly string[];
        readonly scope?: string;
      }>>;
    };
  };
}

interface AureliaProjectSchema {
  readonly allowComments?: boolean;
  readonly allowTrailingCommas?: boolean;
}

const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as ExtensionManifest;
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
    expect(manifest.contributes?.keybindings).toBeUndefined();
    expect(AureliaCommand.ExplainFrameworkCapability).toBe(
      AureliaProtocolCommand.ExplainFrameworkCapability,
    );
    expect(manifest.contributes?.commands).toContainEqual({
      command: AureliaCommand.ExplainFrameworkCapability,
      title: "Explain Diagnostic",
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

  test("does not contribute passive source generators outside semantic completion", () => {
    expect(manifest.contributes?.snippets).toBeUndefined();
  });

  test("splits exact JSONC parsing from session-owned project semantics", () => {
    expect(manifest.activationEvents).toContain("workspaceContains:**/aurelia.project.json");
    expect(manifest.contributes?.languages).toEqual([{
      id: "jsonc",
      filenames: ["aurelia.project.json"],
    }]);
    expect(manifest.contributes?.jsonValidation).toEqual([{
      fileMatch: "**/aurelia.project.json",
      url: "./dist/schemas/aurelia.project.jsonc.schema.json",
    }]);
    expect(Object.keys(projectDialectSchema).sort()).toEqual([
      "$id",
      "$schema",
      "allowComments",
      "allowTrailingCommas",
      "description",
      "title",
    ]);
    expect(projectDialectSchema).toEqual(expect.objectContaining({
      allowComments: true,
      allowTrailingCommas: true,
    }));
    expect(projectSchema).toEqual(expect.objectContaining({
      allowComments: true,
      allowTrailingCommas: true,
    }));
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

  test("offers template-scope resource navigation only from an owned HTML document", () => {
    for (const menuName of ["editor/context", "commandPalette"]) {
      const menu = manifest.contributes?.menus?.[menuName]
        ?.find((entry) => entry.command === AureliaCommand.GoToAvailableResource);
      expect(menu?.when).toBe("aurelia.active && aurelia.documentOwned && editorLangId == html");
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
        when: "view == aureliaResourceExplorer && aurelia.documentOwned && editorLangId == html",
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

  test("bounds tree context actions and hides contextual commands from the Command Palette", () => {
    const context = manifest.contributes?.menus?.["view/item/context"] ?? [];
    const navigable = "view == aureliaResourceExplorer && (viewItem == resource || viewItem == resourceWithImplementation || viewItem == resourceAlias || viewItem == resourceBindable)";
    expect(context).toEqual([
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
      AureliaCommand.ExplainFrameworkCapability,
      AureliaCommand.OpenResourceDeclaration,
      AureliaCommand.OpenResourceImplementation,
      AureliaCommand.OpenResourceToSide,
      AureliaCommand.RetryResourceProject,
      AureliaCommand.OpenAureliaOutput,
      AureliaCommand.ReviewAnalysisLimitations,
    ]) {
      expect(manifest.contributes?.menus?.commandPalette).toContainEqual({ command, when: "false" });
    }
    expect(manifest.contributes?.keybindings).toBeUndefined();
  });

  test("offers related-file navigation for every supported script language", () => {
    const menu = manifest.contributes?.menus?.["editor/context"]
      ?.find((entry) => entry.command === AureliaCommand.OpenRelatedFile);

    expect(menu?.when).toBeDefined();
    for (const languageId of [
      "html",
      "typescript",
      "typescriptreact",
      "javascript",
      "javascriptreact",
    ]) {
      expect(menu?.when).toContain(`editorLangId == ${languageId}`);
    }
  });

  test("keeps product settings resource-scoped with quiet defaults", () => {
    const properties = manifest.contributes?.configuration?.properties ?? {};

    expect(Object.keys(properties).sort()).toEqual([
      "aurelia.activationMode",
      "aurelia.inlayHints.bindingMode",
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
  });
});
