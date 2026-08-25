const EXTENSION_HOST_OBSERVATION_ENV = "AURELIA_LS_EXTENSION_HOST_OBSERVATION";

export const WORKER_RESTART_HOST_ACCEPTANCE_ENV = "AURELIA_LS_WORKER_RESTART_HOST_ACCEPTANCE";

/** Exact, two-part gate shared by restart control and its detached receipts. */
export function workerRestartHostAcceptanceEnabled(): boolean {
  return process.env[EXTENSION_HOST_OBSERVATION_ENV] === "1"
    && process.env[WORKER_RESTART_HOST_ACCEPTANCE_ENV] === "1";
}
