import type * as vscode from "vscode";
import { createRequire } from "node:module";

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
  // VS Code bundles the `vscode` module; use require to avoid ESM resolution issues when running in the extension host.
  const require = createRequire(import.meta.url);
  // eslint-disable-next-line no-restricted-syntax
  return require("vscode") as VscodeApi;
}
