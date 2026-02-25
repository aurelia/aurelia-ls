import type { StatusBarItem } from "vscode";
import type { OverlayReadyPayload } from "./types.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";

export interface TemplateCoverage {
  totalPositions: number;
  fullyAnalyzed: number;
  partiallyAnalyzed: number;
  emittedCount: number;
  suppressedCount: number;
}

export class StatusService {
  #status: StatusBarItem;

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

  /**
   * Update the status bar with TemplateCoverage from the workspace.
   * Shows "Aurelia: N/M positions analyzed" or "Aurelia: analysis complete".
   *
   * The workspace will produce TemplateCoverage per-template once the L2
   * diagnostics pipeline (D5) is wired. This method is ready for it.
   */
  templateCoverage(coverage: TemplateCoverage, uri?: string) {
    const { totalPositions, fullyAnalyzed, suppressedCount } = coverage;

    if (totalPositions === 0) {
      this.#status.text = "Aurelia: no positions";
      this.#status.tooltip = uri;
      return;
    }

    if (fullyAnalyzed === totalPositions) {
      const suppressed = suppressedCount > 0 ? ` (${suppressedCount} suppressed)` : "";
      this.#status.text = `Aurelia: analysis complete${suppressed}`;
      this.#status.tooltip = uri;
      return;
    }

    const suppressed = suppressedCount > 0 ? `, ${suppressedCount} suppressed` : "";
    this.#status.text = `Aurelia: ${fullyAnalyzed}/${totalPositions} positions analyzed${suppressed}`;
    this.#status.tooltip = uri;
  }
}
