import type { QuickPickItem } from "vscode";
import type { ConfigService } from "./core/config.js";
import type { ObservabilityService } from "./core/observability.js";
import { combineDisposables, type DisposableLike } from "./core/disposables.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";

type MenuItem = QuickPickItem & { action: () => Promise<void> };

export function registerObservabilityCommands(
  config: ConfigService,
  observability: ObservabilityService,
  vscode: VscodeApi = getVscodeApi(),
): DisposableLike {
  const logger = observability.logger.child("observability");
  const disposables: DisposableLike[] = [];

  const run = (label: string, fn: () => Promise<void>) =>
    observability.errors.capture(`observability.${label}`, fn, { notify: false });

  const getConfig = () => vscode.workspace.getConfiguration("aurelia");
  const target = () =>
    vscode.workspace.workspaceFolders?.length
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;

  const updateConfig = async (key: string, value: unknown): Promise<void> => {
    await getConfig().update(key, value, target());
    logger.info("config.updated", { key, value });
  };

  const toggleDebug = async () => {
    const current = config.current.observability.debug.enabled;
    await updateConfig("observability.debug.enabled", !current);
  };

  const toggleTrace = async () => {
    const current = config.current.observability.trace.enabled;
    await updateConfig("observability.trace.enabled", !current);
  };

  const setDebugChannels = async () => {
    const current = config.current.observability.debug.channels.join(", ");
    const input = await vscode.window.showInputBox({
      prompt: "Comma-separated debug channels (empty = all)",
      value: current,
    });
    if (input === undefined) return;
    const channels = normalizeChannels(input);
    await updateConfig("observability.debug.channels", channels);
    if (channels.length > 0 && !config.current.observability.debug.enabled) {
      await updateConfig("observability.debug.enabled", true);
    }
  };

  const setLogLevel = async () => {
    const current = config.current.observability.logging.level;
    const levels = ["trace", "debug", "info", "warn", "error"];
    const picked = await vscode.window.showQuickPick(
      levels.map((label) => ({
        label,
        description: label === current ? "current" : undefined,
      })),
      { placeHolder: "Select client log level" },
    );
    if (!picked) return;
    await updateConfig("observability.logging.level", picked.label);
  };

  const setTraceMinDuration = async () => {
    const current = config.current.observability.trace.minDurationMs;
    const input = await vscode.window.showInputBox({
      prompt: "Trace minimum duration (ms)",
      value: String(current),
      validateInput: (value) => {
        if (!value.trim()) return null;
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) return "Enter a non-negative number.";
        return null;
      },
    });
    if (input === undefined) return;
    const trimmed = input.trim();
    const value = trimmed ? Number(trimmed) : 0;
    await updateConfig("observability.trace.minDurationMs", value);
  };

  const openOutput = async () => {
    observability.logger.show(true);
  };

  const showMenu = async () => {
    const debugEnabled = config.current.observability.debug.enabled;
    const traceEnabled = config.current.observability.trace.enabled;
    const channels = config.current.observability.debug.channels;

    const items: MenuItem[] = [
      {
        label: `${debugEnabled ? "Disable" : "Enable"} Debug`,
        description: channels.length ? channels.join(", ") : "all channels",
        action: toggleDebug,
      },
      {
        label: `${traceEnabled ? "Disable" : "Enable"} Trace`,
        description: `min ${config.current.observability.trace.minDurationMs}ms`,
        action: toggleTrace,
      },
      {
        label: "Set Debug Channels",
        description: channels.length ? channels.join(", ") : "all channels",
        action: setDebugChannels,
      },
      {
        label: "Set Log Level",
        description: config.current.observability.logging.level,
        action: setLogLevel,
      },
      {
        label: "Set Trace Min Duration",
        description: `${config.current.observability.trace.minDurationMs}ms`,
        action: setTraceMinDuration,
      },
      {
        label: "Show Output Channel",
        action: openOutput,
      },
    ];

    const pick = await vscode.window.showQuickPick(items, {
      placeHolder: "Aurelia observability controls",
    });
    if (!pick) return;
    await pick.action();
  };

  disposables.push(vscode.commands.registerCommand("aurelia.observability.menu", () => void run("menu", showMenu)));
  disposables.push(vscode.commands.registerCommand("aurelia.observability.toggleDebug", () => void run("toggleDebug", toggleDebug)));
  disposables.push(vscode.commands.registerCommand("aurelia.observability.toggleTrace", () => void run("toggleTrace", toggleTrace)));
  disposables.push(
    vscode.commands.registerCommand("aurelia.observability.setDebugChannels", () => void run("setDebugChannels", setDebugChannels)),
  );
  disposables.push(vscode.commands.registerCommand("aurelia.observability.setLogLevel", () => void run("setLogLevel", setLogLevel)));
  disposables.push(
    vscode.commands.registerCommand(
      "aurelia.observability.setTraceMinDuration",
      () => void run("setTraceMinDuration", setTraceMinDuration),
    ),
  );
  disposables.push(vscode.commands.registerCommand("aurelia.observability.openOutput", () => void run("openOutput", openOutput)));

  return combineDisposables(disposables);
}

function normalizeChannels(input: string): string[] {
  return input
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}
