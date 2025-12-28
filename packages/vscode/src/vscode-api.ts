import type * as vscode from "vscode";

export type VscodeApi = typeof vscode;

let override: VscodeApi | null = null;

/**
 * Provide a custom VS Code API implementation. Intended for tests where the real
 * `vscode` runtime module is not available.
 */
export function useVscodeApi(api: VscodeApi): void {
  override = api;
}

export function getVscodeApi(): VscodeApi {
  if (override) return override;
  // VS Code provides the `vscode` module at runtime.
  // Use eval to avoid bundler trying to resolve it.
  // eslint-disable-next-line no-eval
  return eval('require("vscode")') as VscodeApi;
}
