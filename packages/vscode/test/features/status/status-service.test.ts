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

  test("describes active analysis", () => {
    const { statusItem } = createService();
    expect(statusItem.text).toBe("$(loading~spin) Aurelia: analyzing...");
    expect(statusItem.tooltip).toBe("Analyzing Aurelia project changes");
  });

  test("does not turn progress into a command surface", () => {
    const { statusItem } = createService();
    expect(statusItem.command).toBeUndefined();
  });

  test("healthy idle state stays out of permanent chrome", () => {
    const { statusItem } = createService();
    expect(statusItem.visible).toBe(false);
  });

  test("analyzing() exposes transient progress", () => {
    const { service, statusItem } = createService();
    service.analyzing();
    expect(statusItem.visible).toBe(true);
    expect(service.phase).toBe("analyzing");
  });

  test("ready() returns to the hidden idle state", () => {
    const { service, statusItem } = createService();
    service.analyzing();
    service.ready();
    expect(statusItem.visible).toBe(false);
    expect(service.phase).toBe("idle");
  });

  test("dispose() disposes status bar item", () => {
    const { service, statusItem } = createService();
    service.dispose();
    expect(statusItem.disposed).toBe(true);
  });

  test("phase tracks lifecycle state", () => {
    const { service } = createService();
    expect(service.phase).toBe("idle");
    service.analyzing();
    expect(service.phase).toBe("analyzing");
    service.ready();
    expect(service.phase).toBe("idle");
  });
});
