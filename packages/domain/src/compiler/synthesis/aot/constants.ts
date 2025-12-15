/* =============================================================================
 * AOT CONSTANTS
 * -----------------------------------------------------------------------------
 * Runtime-specific constants for Aurelia instruction serialization.
 * These MUST match exactly with @aurelia/template-compiler's InstructionType.
 *
 * Transform package imports these to emit correct instruction type codes.
 * Reference: aurelia/packages/template-compiler/src/instructions.ts
 * ============================================================================= */

/**
 * Aurelia instruction type codes.
 *
 * These map to the InstructionType enum in @aurelia/template-compiler.
 * The runtime renderer dispatches to the correct handler based on these codes.
 */
export const INSTRUCTION_TYPE = {
  // Renderer instructions (r-prefixed) - handled by render()
  hydrateElement: "ra",
  hydrateAttribute: "rb",
  hydrateTemplateController: "rc",
  hydrateLetElement: "rd",
  setProperty: "re",
  interpolation: "rf",
  propertyBinding: "rg",
  letBinding: "ri",
  refBinding: "rj",
  iteratorBinding: "rk",
  multiAttr: "rl",

  // HTML-specific instructions (h-prefixed)
  textBinding: "ha",
  listenerBinding: "hb",
  attributeBinding: "hc",
  stylePropertyBinding: "hd",
  setAttribute: "he",
  setClassAttribute: "hf",
  setStyleAttribute: "hg",

  // Spread instructions
  spreadTransferedBinding: "hs",
  spreadElementProp: "hp",
  spreadValueBinding: "svb",
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
