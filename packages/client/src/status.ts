import type { OverlayReadyPayload } from "./types.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";

export class StatusService {
  #status: import("vscode").StatusBarItem;

  constructor(vscode: VscodeApi = getVscodeApi()) {
    this.#status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.#status.text = "Aurelia: idle";
    this.#status.command = "aurelia.showOverlay";
    this.#status.show();
  }

  dispose() {
    this.#status.dispose();
  }

  idle() {
    this.#status.text = "Aurelia: idle";
    this.#status.tooltip = undefined;
  }

  overlayReady(payload: OverlayReadyPayload) {
    const diags = typeof payload.diags === "number" ? payload.diags : "?";
    const calls = typeof payload.calls === "number" ? payload.calls : "?";
    this.#status.text = `Aurelia: overlay (calls ${calls}, diags ${diags})`;
    this.#status.tooltip = payload.uri ?? undefined;
  }
}
