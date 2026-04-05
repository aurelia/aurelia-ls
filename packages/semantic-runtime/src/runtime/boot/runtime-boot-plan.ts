import {
  EMPTY_BOUNDARY_PORT_SET,
  type BoundaryPortSet
} from "../../boundaries/boundary-ports.js";
import {
  createDormantSemanticRuntimeIntrospection,
  type SemanticRuntimeIntrospection
} from "../introspection/runtime-introspection.js";
import { CurrentWorldContextPort } from "../../workspace/handoff/current-world-context.js";
import { SubstrateReader } from "../../substrate/substrate-reader.js";
import {
  EMPTY_SUBSTRATE_STORAGE,
  type SubstrateStorage
} from "../../substrate/storage/substrate-storage.js";
import { EvaluatorReadPort } from "../../evaluators/kernel/evaluator-read-port.js";
import { TypeScriptProjectPort } from "../../typescript/programs/typescript-project-port.js";
import { TypedEnrichmentPort } from "../../typescript/typed-enrichment/typed-enrichment-port.js";
import { TypeScriptWorldConstruction } from "../../workspace/registration/typescript-world-construction.js";

export interface RuntimeBootPort {
  readonly boundaryPorts?: BoundaryPortSet;
  readonly introspection?: SemanticRuntimeIntrospection;
  readonly currentWorldContextPort?: CurrentWorldContextPort;
  readonly substrateStorage?: SubstrateStorage;
  readonly evaluatorReadPort?: EvaluatorReadPort;
  readonly typescriptProjectPort?: TypeScriptProjectPort;
}

export interface RuntimeBootPlan {
  readonly boundaryPorts: BoundaryPortSet;
  readonly introspection: SemanticRuntimeIntrospection;
  readonly currentWorldContextPort: CurrentWorldContextPort;
  readonly substrateReader: SubstrateReader;
  readonly evaluatorReadPort: EvaluatorReadPort;
  readonly typedEnrichmentPort: TypedEnrichmentPort;
}

const EMPTY_RUNTIME_BOOT_PORT: RuntimeBootPort = {};

export function planRuntimeBoot(
  port: RuntimeBootPort = EMPTY_RUNTIME_BOOT_PORT
): RuntimeBootPlan {
  const worldConstruction = port.typescriptProjectPort === undefined
    ? undefined
    : new TypeScriptWorldConstruction(port.typescriptProjectPort);

  return {
    boundaryPorts: port.boundaryPorts ?? EMPTY_BOUNDARY_PORT_SET,
    introspection: port.introspection ?? createDormantSemanticRuntimeIntrospection(),
    currentWorldContextPort: port.currentWorldContextPort ?? new CurrentWorldContextPort(
      {},
      worldConstruction
    ),
    substrateReader: new SubstrateReader(
      port.substrateStorage ?? EMPTY_SUBSTRATE_STORAGE,
      undefined,
      worldConstruction
    ),
    evaluatorReadPort: port.evaluatorReadPort ?? new EvaluatorReadPort(),
    typedEnrichmentPort: new TypedEnrichmentPort(port.typescriptProjectPort)
  };
}
