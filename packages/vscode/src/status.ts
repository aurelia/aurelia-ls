import type { StatusBarItem } from "vscode";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";

export type AnalysisPhase = "idle" | "analyzing";

/** Transient progress only; healthy analysis does not occupy permanent chrome. */
export class StatusService {
  #status: StatusBarItem;
  #phase: AnalysisPhase = "idle";

  constructor(vscode: VscodeApi = getVscodeApi()) {
    this.#status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.#status.text = "$(loading~spin) Aurelia: analyzing...";
    this.#status.tooltip = "Analyzing Aurelia project changes";
    this.#status.hide();
  }

  dispose(): void {
    this.#status.dispose();
  }

  analyzing(): void {
    this.#phase = "analyzing";
    this.#status.show();
  }

  ready(): void {
    this.#phase = "idle";
    this.#status.hide();
  }

  get phase(): AnalysisPhase {
    return this.#phase;
  }
}
