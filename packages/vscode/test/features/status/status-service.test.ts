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

  test("initial text shows starting phase", () => {
    const { statusItem } = createService();
    expect(statusItem.text).toContain("Aurelia");
    expect(statusItem.text).toContain("starting");
  });

  test("command is set to aurelia.showOverlay", () => {
    const { statusItem } = createService();
    expect(statusItem.command).toBe("aurelia.showOverlay");
  });

  test("status bar item is shown on creation", () => {
    const { statusItem } = createService();
    expect(statusItem.visible).toBe(true);
  });

  test("discovering() shows discovering phase", () => {
    const { service, statusItem } = createService();
    service.discovering();
    expect(statusItem.text).toContain("discovering");
  });

  test("analyzing() shows resource count", () => {
    const { service, statusItem } = createService();
    service.analyzing(12);
    expect(statusItem.text).toContain("12 resources");
  });

  test("ready() shows summary with check icon when no gaps", () => {
    const { service, statusItem } = createService();
    service.ready(12, 3, 0);
    expect(statusItem.text).toContain("12 resources");
    expect(statusItem.text).toContain("3 templates");
    expect(statusItem.text).toContain("$(check)");
  });

  test("ready() shows warning icon when gaps exist", () => {
    const { service, statusItem } = createService();
    service.ready(12, 3, 2);
    expect(statusItem.text).toContain("$(warning)");
    expect(statusItem.text).toContain("2 gaps");
  });

  test("dispose() disposes status bar item", () => {
    const { service, statusItem } = createService();
    service.dispose();
    expect(statusItem.disposed).toBe(true);
  });

  test("phase tracks lifecycle state", () => {
    const { service } = createService();
    expect(service.phase).toBe("starting");
    service.discovering();
    expect(service.phase).toBe("discovering");
    service.analyzing(5);
    expect(service.phase).toBe("analyzing");
    service.ready(5, 2, 0);
    expect(service.phase).toBe("ready");
  });
});
