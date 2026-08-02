import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { AureliaCommand, AureliaView } from "../out/product-contract.js";

interface ExtensionManifest {
  readonly api?: string;
  readonly contributes?: {
    readonly commands?: readonly { readonly command: string }[];
    readonly keybindings?: readonly unknown[];
    readonly snippets?: readonly unknown[];
    readonly menus?: Readonly<Record<string, readonly {
      readonly command: string;
      readonly when?: string;
    }[]>>;
    readonly views?: Readonly<Record<string, readonly { readonly id: string }[]>>;
    readonly configuration?: {
      readonly properties?: Readonly<Record<string, {
        readonly default?: unknown;
        readonly scope?: string;
      }>>;
    };
  };
}

const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as ExtensionManifest;

describe("VS Code product contract", () => {
  test("does not expose the activation object as a public extension API", () => {
    expect(manifest.api).toBe("none");
  });

  test("keeps contributed commands and menus on the client-owned command vocabulary", () => {
    const expectedCommands = Object.values(AureliaCommand).sort();
    const contributedCommands = (manifest.contributes?.commands ?? [])
      .map((entry) => entry.command)
      .sort();
    const menuCommands = Object.values(manifest.contributes?.menus ?? {})
      .flatMap((entries) => entries.map((entry) => entry.command));

    expect(contributedCommands).toEqual(expectedCommands);
    expect(new Set(menuCommands)).toEqual(new Set(expectedCommands));
    expect(manifest.contributes?.keybindings).toBeUndefined();
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
    expect(properties["aurelia.inlayHints.bindingMode"]).toEqual(expect.objectContaining({
      default: false,
      scope: "resource",
    }));
  });
});
