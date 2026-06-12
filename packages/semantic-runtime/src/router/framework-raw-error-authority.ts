import { frameworkRawErrorAuthority } from '../kernel/framework-raw-error-authority.js';

/** Raw @aurelia/route-recognizer Error sites that route-recognizer semantic products can cite exactly. */
export const RouteRecognizerRawErrorAuthority = {
  /** `RouteRecognizer.$add`; a configured path is already present in endpointLookup. */
  DuplicatePath: frameworkRawErrorAuthority(
    'route-recognizer',
    'raw-error-factory-call',
    'throw',
    'aurelia/packages/route-recognizer/src/index.ts',
    548,
    "createError(`Cannot add duplicate path '${path}'.`)",
  ),
  /** `RouteRecognizer.$add`; dynamic parameter segment used the reserved `$$residue` name. */
  ReservedParameterNameDynamic: frameworkRawErrorAuthority(
    'route-recognizer',
    'raw-new-error',
    'throw',
    'aurelia/packages/route-recognizer/src/index.ts',
    570,
    "new Error(`Invalid parameter name; usage of the reserved parameter name '${RESIDUE}' is used.`)",
  ),
  /** `RouteRecognizer.$add`; star segment used the reserved `$$residue` name without generated residue mode. */
  ReservedParameterNameStar: frameworkRawErrorAuthority(
    'route-recognizer',
    'raw-new-error',
    'throw',
    'aurelia/packages/route-recognizer/src/index.ts',
    583,
    "new Error(`Invalid parameter name; usage of the reserved parameter name '${RESIDUE}' is used.`)",
  ),
  /** `State.setEndpoint`; a path pattern collides with an already assigned endpoint. */
  AmbiguousEndpoint: frameworkRawErrorAuthority(
    'route-recognizer',
    'raw-error-factory-call',
    'throw',
    'aurelia/packages/route-recognizer/src/index.ts',
    806,
    "createError(`Cannot add ambiguous route. The pattern '${endpoint.route.path}' clashes with '${this.endpoint.route.path}'`)",
  ),
} as const;

export type RouteRecognizerRawErrorAuthority =
  typeof RouteRecognizerRawErrorAuthority[keyof typeof RouteRecognizerRawErrorAuthority];
