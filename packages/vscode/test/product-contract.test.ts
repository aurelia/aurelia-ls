import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { AureliaCommand, AureliaView } from "../out/product-contract.js";

interface ExtensionManifest {
  readonly contributes?: {
    readonly commands?: readonly { readonly command: string }[];
    readonly keybindings?: readonly unknown[];
    readonly menus?: Readonly<Record<string, readonly { readonly command: string }[]>>;
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

  test("keeps product settings resource-scoped with quiet defaults", () => {
    const properties = manifest.contributes?.configuration?.properties ?? {};

    expect(Object.keys(properties).sort()).toEqual([
      "aurelia.activationMode",
      "aurelia.diagnostics.includeTaxonomyDetails",
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
    expect(properties["aurelia.diagnostics.includeTaxonomyDetails"]).toEqual(expect.objectContaining({
      default: false,
      scope: "resource",
    }));
  });
});
