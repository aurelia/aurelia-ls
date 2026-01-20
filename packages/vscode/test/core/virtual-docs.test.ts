import { describe, test, expect } from "vitest";
import { VirtualDocProvider } from "../../out/virtual-docs.js";
import type { VscodeApi } from "../../out/vscode-api.js";
import { createVscodeApi } from "../helpers/vscode-stub.js";

describe("VirtualDocProvider", () => {
  function createProvider() {
    const { vscode: stubVscode } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    const provider = new VirtualDocProvider(vscode);
    return { provider, vscode, stubVscode };
  }

  test("scheme is aurelia-overlay", () => {
    expect(VirtualDocProvider.scheme).toBe("aurelia-overlay");
  });

  test("provideTextDocumentContent returns empty string for unknown URI", () => {
    const { provider, stubVscode } = createProvider();
    const uri = stubVscode.Uri.parse("aurelia-overlay:unknown.ts");
    const content = provider.provideTextDocumentContent(uri as unknown as import("vscode").Uri);
    expect(content).toBe("");
  });

  test("provideTextDocumentContent returns cached content after update", () => {
    const { provider, stubVscode } = createProvider();
    const uri = stubVscode.Uri.parse("aurelia-overlay:component.overlay.ts");
    const expectedContent = "export class Component {}";

    provider.update(uri as unknown as import("vscode").Uri, expectedContent);
    const content = provider.provideTextDocumentContent(uri as unknown as import("vscode").Uri);

    expect(content).toBe(expectedContent);
  });

  test("update fires onDidChange event", () => {
    const { provider, stubVscode } = createProvider();
    const uri = stubVscode.Uri.parse("aurelia-overlay:component.overlay.ts");
    const firedUris: unknown[] = [];

    provider.onDidChange((firedUri) => {
      firedUris.push(firedUri);
    });
    provider.update(uri as unknown as import("vscode").Uri, "content");

    expect(firedUris).toHaveLength(1);
    expect(firedUris[0]).toBe(uri);
  });

  test("makeUri creates URI with correct scheme", () => {
    const { provider, vscode } = createProvider();
    const uri = provider.makeUri("my-overlay.ts", vscode);
    expect(uri.toString()).toBe("aurelia-overlay:my-overlay.ts");
  });

  test("multiple updates overwrite previous content", () => {
    const { provider, stubVscode } = createProvider();
    const uri = stubVscode.Uri.parse("aurelia-overlay:component.overlay.ts");

    provider.update(uri as unknown as import("vscode").Uri, "first");
    provider.update(uri as unknown as import("vscode").Uri, "second");
    const content = provider.provideTextDocumentContent(uri as unknown as import("vscode").Uri);

    expect(content).toBe("second");
  });

  test("different URIs have independent content", () => {
    const { provider, stubVscode } = createProvider();
    const uri1 = stubVscode.Uri.parse("aurelia-overlay:one.ts");
    const uri2 = stubVscode.Uri.parse("aurelia-overlay:two.ts");

    provider.update(uri1 as unknown as import("vscode").Uri, "content-one");
    provider.update(uri2 as unknown as import("vscode").Uri, "content-two");

    expect(provider.provideTextDocumentContent(uri1 as unknown as import("vscode").Uri)).toBe("content-one");
    expect(provider.provideTextDocumentContent(uri2 as unknown as import("vscode").Uri)).toBe("content-two");
  });
});
