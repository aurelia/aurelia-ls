import {
  EMPTY_BOUNDARY_PORT_SET,
  type BoundaryPortSet
} from "../../boundaries/boundary-ports.js";
import {
  createDormantSemanticRuntimeIntrospection,
  type SemanticRuntimeIntrospection
} from "../introspection/runtime-introspection.js";

export interface RuntimeBootPort {
  readonly boundaryPorts?: BoundaryPortSet;
  readonly introspection?: SemanticRuntimeIntrospection;
}

export interface RuntimeBootPlan {
  readonly boundaryPorts: BoundaryPortSet;
  readonly introspection: SemanticRuntimeIntrospection;
}

const EMPTY_RUNTIME_BOOT_PORT: RuntimeBootPort = Object.freeze({});

export function planRuntimeBoot(
  port: RuntimeBootPort = EMPTY_RUNTIME_BOOT_PORT
): RuntimeBootPlan {
  return Object.freeze({
    boundaryPorts: port.boundaryPorts ?? EMPTY_BOUNDARY_PORT_SET,
    introspection: port.introspection ?? createDormantSemanticRuntimeIntrospection()
  });
}
