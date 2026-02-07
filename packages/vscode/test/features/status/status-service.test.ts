import { describe, test, expect } from "vitest";
import { StatusService } from "../../../out/status.js";
import type { VscodeApi } from "../../../out/vscode-api.js";
import { createVscodeApi, type StubVscodeApi } from "../../helpers/vscode-stub.js";

describe("StatusService", () => {
  function createService() {
    const { vscode: stubVscode, recorded } = createVscodeApi();
    const vscode = stubVscode as unknown as VscodeApi;
    const service = new StatusService(vscode);
    const statusItem = recorded.statusItems[0]!;
    return { service, statusItem, stubVscode: stubVscode as StubVscodeApi };
  }

  test("creates status bar item on left side", () => {
    const { statusItem, stubVscode } = createService();
    expect(statusItem.alignment).toBe(stubVscode.StatusBarAlignment.Left);
  });

  test("initial text is 'Aurelia: idle'", () => {
    const { statusItem } = createService();
    expect(statusItem.text).toBe("Aurelia: idle");
  });

  test("command is set to aurelia.showOverlay", () => {
    const { statusItem } = createService();
    expect(statusItem.command).toBe("aurelia.showOverlay");
  });

  test("status bar item is shown on creation", () => {
    const { statusItem } = createService();
    expect(statusItem.visible).toBe(true);
  });

  test("idle() resets text and clears tooltip", () => {
    const { service, statusItem } = createService();
    service.overlayReady({ uri: "file:///test.html", calls: 5, diags: 2 });
    service.idle();
    expect(statusItem.text).toBe("Aurelia: idle");
    expect(statusItem.tooltip).toBeUndefined();
  });

  test("overlayReady() updates text with calls and diags count", () => {
    const { service, statusItem } = createService();
    service.overlayReady({ uri: "file:///component.html", calls: 10, diags: 3 });
    expect(statusItem.text).toBe("Aurelia: overlay (calls 10, diags 3)");
  });

  test("overlayReady() sets tooltip to uri", () => {
    const { service, statusItem } = createService();
    service.overlayReady({ uri: "file:///my-component.html", calls: 1, diags: 0 });
    expect(statusItem.tooltip).toBe("file:///my-component.html");
  });

  test("overlayReady() handles missing counts with '?'", () => {
    const { service, statusItem } = createService();
    service.overlayReady({ uri: "file:///test.html" } as { uri: string; calls: number; diags: number });
    expect(statusItem.text).toBe("Aurelia: overlay (calls ?, diags ?)");
  });

  test("overlayReady() handles null uri", () => {
    const { service, statusItem } = createService();
    service.overlayReady({ uri: null as unknown as string, calls: 5, diags: 1 });
    expect(statusItem.tooltip).toBeUndefined();
  });

  test("dispose() disposes status bar item", () => {
    const { service, statusItem } = createService();
    service.dispose();
    expect(statusItem.disposed).toBe(true);
  });
});
