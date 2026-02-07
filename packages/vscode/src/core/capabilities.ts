import type { DisposableLike } from "./disposables.js";
import { SimpleEmitter, type Listener } from "./events.js";
import type { CapabilitiesResponse } from "../types.js";

export const ContractKeys = {
  query: "query",
  refactor: "refactor",
  diagnostics: "diagnostics",
  semanticTokens: "semanticTokens",
  presentation: "presentation",
  mapping: "mapping",
} as const;

export const CustomCapabilityKeys = {
  overlay: "overlay",
  mapping: "mapping",
  queryAtPosition: "queryAtPosition",
  ssr: "ssr",
  diagnostics: "diagnostics",
  dumpState: "dumpState",
} as const;

export const NotificationKeys = {
  overlayReady: "overlayReady",
} as const;

export const OptionalLspKeys = {
  documentSymbol: "documentSymbol",
  workspaceSymbol: "workspaceSymbol",
  documentHighlight: "documentHighlight",
  selectionRange: "selectionRange",
  linkedEditingRange: "linkedEditingRange",
  foldingRange: "foldingRange",
  inlayHint: "inlayHint",
  codeLens: "codeLens",
  documentLink: "documentLink",
  callHierarchy: "callHierarchy",
  documentColor: "documentColor",
  semanticTokensDelta: "semanticTokensDelta",
} as const;

export type ContractKey = (typeof ContractKeys)[keyof typeof ContractKeys];
export type CustomCapabilityKey = (typeof CustomCapabilityKeys)[keyof typeof CustomCapabilityKeys];
export type NotificationKey = (typeof NotificationKeys)[keyof typeof NotificationKeys];
export type OptionalLspKey = (typeof OptionalLspKeys)[keyof typeof OptionalLspKeys];

export type AureliaCapabilities = CapabilitiesResponse;

export function hasContract(
  caps: AureliaCapabilities | null | undefined,
  key: ContractKey,
  fallback = true,
): boolean {
  if (!caps?.contracts) return fallback;
  if (!(key in caps.contracts)) return fallback;
  return Boolean(caps.contracts[key]);
}

export function hasCustomCapability(
  caps: AureliaCapabilities | null | undefined,
  key: CustomCapabilityKey,
  fallback = true,
): boolean {
  if (!caps?.custom) return fallback;
  if (!(key in caps.custom)) return fallback;
  return Boolean(caps.custom[key]);
}

export function hasAnyCustomCapability(
  caps: AureliaCapabilities | null | undefined,
  keys: readonly CustomCapabilityKey[],
  fallback = true,
): boolean {
  if (!caps?.custom) return fallback;
  let hasKnown = false;
  for (const key of keys) {
    if (key in caps.custom) {
      hasKnown = true;
      if (caps.custom[key]) return true;
    }
  }
  return hasKnown ? false : fallback;
}

export function hasNotification(
  caps: AureliaCapabilities | null | undefined,
  key: NotificationKey,
  fallback = true,
): boolean {
  if (!caps?.notifications) return fallback;
  if (!(key in caps.notifications)) return fallback;
  return Boolean(caps.notifications[key]);
}

export function hasLspOptional(
  caps: AureliaCapabilities | null | undefined,
  key: OptionalLspKey,
  fallback = false,
): boolean {
  if (!caps?.lsp?.optional) return fallback;
  if (!(key in caps.lsp.optional)) return fallback;
  return Boolean(caps.lsp.optional[key]);
}

export class CapabilityStore {
  #current: AureliaCapabilities = {};
  #emitter = new SimpleEmitter<AureliaCapabilities>();

  get current(): AureliaCapabilities {
    return this.#current;
  }

  set(next: AureliaCapabilities): void {
    this.#current = next;
    this.#emitter.emit(this.#current);
  }

  onDidChange(listener: Listener<AureliaCapabilities>): DisposableLike {
    return this.#emitter.on(listener);
  }
}
