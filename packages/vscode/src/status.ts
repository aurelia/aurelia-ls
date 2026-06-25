import type { StatusBarItem } from "vscode";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";

export type AnalysisPhase =
  | "starting"
  | "discovering"
  | "analyzing"
  | "ready"
  | "idle";

export class StatusService {
  #status: StatusBarItem;
  #phase: AnalysisPhase = "starting";
  #resourceCount = 0;
  #templateCount = 0;

  constructor(vscode: VscodeApi = getVscodeApi()) {
    this.#status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.#status.text = "$(loading~spin) Aurelia: starting...";
    this.#status.command = "aurelia.findResource";
    this.#status.show();
  }

  dispose() {
    this.#status.dispose();
  }

  /** Phase: extension activated, language server starting. */
  starting() {
    this.#phase = "starting";
    this.#status.text = "$(loading~spin) Aurelia: starting...";
    this.#status.tooltip = "Language server is starting";
  }

  /** Phase: server initialized, discovering resources. */
  discovering() {
    this.#phase = "discovering";
    this.#status.text = "$(loading~spin) Aurelia: discovering resources...";
    this.#status.tooltip = "Scanning project for Aurelia resources";
  }

  /** Phase: resources found, analyzing templates. */
  analyzing(resourceCount?: number) {
    this.#phase = "analyzing";
    if (typeof resourceCount === "number") {
      this.#resourceCount = resourceCount;
      this.#status.text = `$(loading~spin) Aurelia: analyzing (${resourceCount} resources)...`;
      this.#status.tooltip = `Found ${resourceCount} resources, analyzing templates`;
      return;
    }
    this.#status.text = "$(loading~spin) Aurelia: analyzing...";
    this.#status.tooltip = "Analyzing Aurelia templates";
  }

  /** Phase: analysis complete. Show summary. */
  ready(resourceCount: number, templateCount: number) {
    this.#phase = "ready";
    this.#resourceCount = resourceCount;
    this.#templateCount = templateCount;

    const parts: string[] = [`${resourceCount} resources`];
    if (templateCount > 0) parts.push(`${templateCount} templates`);

    this.#status.text = `$(check) Aurelia: ${parts.join(", ")}`;

    this.#status.tooltip = buildReadyTooltip(resourceCount, templateCount);
  }

  /** Update counts from resource explorer data (called when resources change). */
  updateCounts(resourceCount: number, templateCount: number) {
    if (this.#phase === "starting" || this.#phase === "discovering") {
      if (resourceCount > 0) {
        this.ready(resourceCount, templateCount);
      }
    } else {
      this.ready(resourceCount, templateCount);
    }
  }

  get phase(): AnalysisPhase { return this.#phase; }
  get resourceCount(): number { return this.#resourceCount; }
  get templateCount(): number { return this.#templateCount; }
}

function buildReadyTooltip(resourceCount: number, templateCount: number): string {
  const lines = [
    `Resources: ${resourceCount}`,
    `Templates: ${templateCount}`,
    "Analysis: complete",
  ];
  return lines.join("\n");
}
