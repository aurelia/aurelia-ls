import type { TraitSchemaDefinition } from "./types.js";

export const TRAIT_SCHEMA_DEFINITIONS = [
  {
    traitKind: "attribute",
    valueType: "string",
    description: "Resolved HTML attribute name; never null at the graph level.",
  },
  {
    traitKind: "mode",
    valueType: "'toView' | 'fromView' | 'twoWay' | 'oneTime' | 'default'",
    description: "Bindable binding mode, including the explicit 'default' sentinel.",
  },
  {
    traitKind: "callback",
    valueType: "string | null",
    description: "Change callback method name, or null when no callback is defined.",
  },
  {
    traitKind: "set",
    valueType: "boolean",
    description: "Whether a coercion/setter function is defined.",
  },
] as const satisfies readonly TraitSchemaDefinition[];
