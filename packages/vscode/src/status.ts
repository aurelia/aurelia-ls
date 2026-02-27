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
  #gapCount = 0;

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
  analyzing(resourceCount: number) {
    this.#phase = "analyzing";
    this.#resourceCount = resourceCount;
    this.#status.text = `$(loading~spin) Aurelia: analyzing (${resourceCount} resources)...`;
    this.#status.tooltip = `Found ${resourceCount} resources, compiling templates`;
  }

  /** Phase: analysis complete. Show summary. */
  ready(resourceCount: number, templateCount: number, gapCount: number) {
    this.#phase = "ready";
    this.#resourceCount = resourceCount;
    this.#templateCount = templateCount;
    this.#gapCount = gapCount;

    const parts: string[] = [`${resourceCount} resources`];
    if (templateCount > 0) parts.push(`${templateCount} templates`);

    if (gapCount > 0) {
      this.#status.text = `$(warning) Aurelia: ${parts.join(", ")} (${gapCount} gaps)`;
    } else {
      this.#status.text = `$(check) Aurelia: ${parts.join(", ")}`;
    }

    this.#status.tooltip = buildReadyTooltip(resourceCount, templateCount, gapCount);
  }

  /** Legacy overlay-ready handler — used when richer data isn't available. */
  overlayReady(payload: OverlayReadyPayload) {
    // If we have resource counts from the overlay notification, update to ready state
    if (typeof payload.diags === "number" || typeof payload.calls === "number") {
      if (this.#phase === "starting" || this.#phase === "discovering") {
        // First overlay notification — transition to ready with what we know
        this.#phase = "ready";
      }
    }

    // If still in starting/discovering phase, show analyzing
    if (this.#phase === "starting" || this.#phase === "discovering") {
      this.#status.text = "$(loading~spin) Aurelia: analyzing...";
      this.#status.tooltip = payload.uri ?? undefined;
      return;
    }

    // In ready phase, don't override the summary with per-file overlay data
    // The summary is more useful as an ambient signal
  }

  /**
   * Update from TemplateCoverage when available.
   */
  templateCoverage(coverage: TemplateCoverage, uri?: string) {
    const { totalPositions, fullyAnalyzed, suppressedCount } = coverage;

    if (totalPositions === 0) {
      this.#status.text = "$(check) Aurelia: no positions";
      this.#status.tooltip = uri;
      return;
    }

    if (fullyAnalyzed === totalPositions) {
      const suppressed = suppressedCount > 0 ? ` (${suppressedCount} suppressed)` : "";
      this.#status.text = `$(check) Aurelia: analysis complete${suppressed}`;
      this.#status.tooltip = uri;
      return;
    }

    const suppressed = suppressedCount > 0 ? `, ${suppressedCount} suppressed` : "";
    this.#status.text = `$(eye) Aurelia: ${fullyAnalyzed}/${totalPositions} positions analyzed${suppressed}`;
    this.#status.tooltip = uri;
  }

  /** Update counts from resource explorer data (called when resources change). */
  updateCounts(resourceCount: number, templateCount: number, gapCount: number) {
    if (this.#phase === "starting" || this.#phase === "discovering") {
      if (resourceCount > 0) {
        this.ready(resourceCount, templateCount, gapCount);
      }
    } else {
      this.ready(resourceCount, templateCount, gapCount);
    }
  }

  get phase(): AnalysisPhase { return this.#phase; }
  get resourceCount(): number { return this.#resourceCount; }
  get templateCount(): number { return this.#templateCount; }
  get gapCount(): number { return this.#gapCount; }
}

function buildReadyTooltip(resourceCount: number, templateCount: number, gapCount: number): string {
  const lines = [
    `Resources: ${resourceCount}`,
    `Templates: ${templateCount}`,
  ];
  if (gapCount > 0) {
    lines.push(`Gaps: ${gapCount} (some resources have incomplete analysis)`);
  } else {
    lines.push("Analysis: complete");
  }
  return lines.join("\n");
}
