/* =============================================================================
 * AOT CONSTANTS
 * -----------------------------------------------------------------------------
 * Runtime-specific constants for Aurelia instruction serialization.
 * These match the instruction type codes used by @aurelia/runtime-html.
 *
 * Transform package imports these to emit correct instruction type codes.
 * ============================================================================= */

/**
 * Aurelia runtime instruction type codes.
 *
 * These are the short string codes that Aurelia's runtime expects for
 * hydration instructions. Each maps to a renderer in the runtime.
 *
 * Reference: @aurelia/runtime-html InstructionType enum
 */
export const INSTRUCTION_TYPE = {
  // Text and property bindings
  textBinding: "ha",
  propertyBinding: "rg",
  interpolation: "rh",
  iteratorBinding: "rk",

  // Listener bindings
  listenerBinding: "rb",

  // Ref bindings
  refBinding: "rj",

  // Static setters
  setProperty: "hp",
  setAttribute: "hs",

  // Hydration instructions
  hydrateElement: "re",
  hydrateAttribute: "ra",
  hydrateTemplateController: "rc",
  hydrateLetElement: "ri",
} as const;

/**
 * Type for instruction type code values.
 */
export type InstructionTypeCode = (typeof INSTRUCTION_TYPE)[keyof typeof INSTRUCTION_TYPE];

/**
 * Aurelia binding mode numeric values.
 *
 * These are the numeric values that Aurelia's runtime expects for
 * binding modes. Maps to the BindingMode enum in @aurelia/runtime.
 *
 * Reference: @aurelia/runtime BindingMode enum
 */
export const BINDING_MODE = {
  default: 0,
  oneTime: 1,
  toView: 2,
  fromView: 4,
  twoWay: 6,
} as const;

/**
 * Type for binding mode numeric values.
 */
export type BindingModeValue = (typeof BINDING_MODE)[keyof typeof BINDING_MODE];
