import type { ObservabilityStatusService } from "./observability-status.js";
import type { StatusService } from "./status.js";
import { createServiceToken } from "./core/service-registry.js";

export const StatusServiceToken = createServiceToken<StatusService>("status.service");
export const ObservabilityStatusServiceToken = createServiceToken<ObservabilityStatusService>(
  "observability.status.service",
);
