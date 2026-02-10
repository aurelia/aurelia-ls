import type { StatusBarItem } from "vscode";
import type { PresentationConfig } from "./core/config.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";

export class ObservabilityStatusService {
  #item: StatusBarItem;

  constructor(
    config: PresentationConfig,
    vscode: VscodeApi = getVscodeApi(),
  ) {
    this.#item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    this.#item.command = "aurelia.observability.menu";
    this.update(config);
  }

  update(config: PresentationConfig): void {
    const statusConfig = config.observability.statusBar;
    const debugEnabled = config.observability.debug.enabled;
    const traceEnabled = config.observability.trace.enabled;

    if (!statusConfig.enabled) {
      this.#item.hide();
      return;
    }

    const visible = statusConfig.alwaysVisible || debugEnabled || traceEnabled;
    if (!visible) {
      this.#item.hide();
      return;
    }

    const logLevel = config.observability.logging.level.toUpperCase();
    const debugText = debugEnabled ? "on" : "off";
    const traceText = traceEnabled ? "on" : "off";
    this.#item.text = `Aurelia: Obs L:${logLevel} D:${debugText} T:${traceText}`;
    this.#item.tooltip = this.#buildTooltip(config);
    this.#item.show();
  }

  dispose(): void {
    this.#item.dispose();
  }

  #buildTooltip(config: PresentationConfig): string {
    const logging = config.observability.logging;
    const debug = config.observability.debug;
    const trace = config.observability.trace;

    const debugChannels = debug.channels.length ? debug.channels.join(", ") : "all";
    const traceMin = Number.isFinite(trace.minDurationMs) ? trace.minDurationMs : 0;

    return [
      "Aurelia Observability",
      "",
      `Logging: ${logging.level} (${logging.format}${logging.timestamps ? ", timestamps" : ""})`,
      `Debug: ${debug.enabled ? "enabled" : "disabled"} (${debugChannels})`,
      `Trace: ${trace.enabled ? "enabled" : "disabled"} (min ${traceMin}ms, events ${trace.logEvents ? "on" : "off"}, attrs ${trace.logAttributes ? "on" : "off"})`,
      "",
      "Click to open observability menu.",
    ].join("\n");
  }
}
