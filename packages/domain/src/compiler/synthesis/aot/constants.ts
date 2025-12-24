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
 * These map to the itXxx constants in @aurelia/template-compiler.
 * The runtime renderer dispatches to the correct handler based on these codes.
 *
 * Numeric ranges:
 *   0-9:    Hydration instructions
 *   10-29:  Property/binding instructions
 *   30-49:  DOM binding instructions
 *   50-59:  Spread instructions
 */
export const INSTRUCTION_TYPE = {
  // Hydration instructions (0-9)
  hydrateElement: 0,
  hydrateAttribute: 1,
  hydrateTemplateController: 2,
  hydrateLetElement: 3,

  // Property/binding instructions (10-29)
  setProperty: 10,
  interpolation: 11,
  propertyBinding: 12,
  letBinding: 13,
  refBinding: 14,
  iteratorBinding: 15,
  multiAttr: 16,

  // DOM binding instructions (30-49)
  textBinding: 30,
  listenerBinding: 31,
  attributeBinding: 32,
  stylePropertyBinding: 33,
  setAttribute: 34,
  setClassAttribute: 35,
  setStyleAttribute: 36,

  // Spread instructions (50-59)
  spreadTransferedBinding: 50,
  spreadElementProp: 51,
  spreadValueBinding: 52,
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
