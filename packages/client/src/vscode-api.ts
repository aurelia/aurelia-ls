import { createRequire } from "node:module";

export type VscodeApi = typeof import("vscode");

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
  const require = createRequire(import.meta.url);
  return require("vscode") as VscodeApi;
}
