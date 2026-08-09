const EXTENSION_HOST_OBSERVATION_ENV = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";

export const EXTENSION_HOST_OBSERVATION_EVENT = "aurelia-ls:extension-host-observation";

export type ExtensionHostObservationValue = string | number | boolean | null | undefined;

export type ExtensionHostObservation = Readonly<{
  source: string;
  observationId: string;
  phase: string;
  [key: string]: ExtensionHostObservationValue;
}>;

let nextObservationOrdinal = 0;

/** Allocate a correlation id only for explicitly enabled Extension Host test observation. */
export function nextExtensionHostObservationId(prefix: string): string | undefined {
  if (!extensionHostObservationEnabled()) return undefined;
  nextObservationOrdinal += 1;
  return `${prefix}:${nextObservationOrdinal}`;
}

/** Publish detached test evidence without adding a public extension API surface. */
export function emitExtensionHostObservation(event: ExtensionHostObservation): void {
  if (!extensionHostObservationEnabled()) return;
  const detached: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(event)) {
    if (value !== undefined) detached[key] = value;
  }
  const host = process as unknown as {
    emit(eventName: string, observation: Readonly<Record<string, string | number | boolean | null>>): boolean;
  };
  try {
    host.emit(EXTENSION_HOST_OBSERVATION_EVENT, Object.freeze(detached));
  } catch {
    // Test observation must never change extension behavior.
  }
}

function extensionHostObservationEnabled(): boolean {
  return process.env[EXTENSION_HOST_OBSERVATION_ENV] === "1";
}
