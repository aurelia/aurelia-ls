import type { GovernedFamilyDefinition } from "./types.js";

export const GOVERNED_FAMILY_DEFINITIONS = [
  {
    familyId: "controller-semantics",
    claimFamilyId: "claim.governed.controller-semantics",
    description: "Product-authored controller semantics for controller-bearing custom attributes.",
    keyConstructor: "GovernedSemanticKey(ResourceKey(custom-attribute, canonicalName), controller-semantics)",
    dependencies: ["controller-semantics-governed-closure", "realized-world-consultation"],
    closureStates: ["closed", "unassigned", "open"],
    slotNames: ["scopeEffect", "linkageKind", "cardinality", "contextualData", "viewManagement"],
    slots: [
      {
        slotName: "scopeEffect",
        valueType: "'inherit' | 'create-child' | 'create-override'",
        meaning: "How the controller creates scope.",
      },
      {
        slotName: "linkageKind",
        valueType: "'none' | 'parent-controller' | 'sibling-controller'",
        meaning: "Controller linkage model.",
      },
      {
        slotName: "cardinality",
        valueType: "'zero-or-one' | 'zero-or-many' | 'exactly-one'",
        meaning: "Allowed instance count.",
      },
      {
        slotName: "contextualData",
        valueType: "string[]",
        meaning: "Contextual data properties exposed by the controller.",
      },
      {
        slotName: "viewManagement",
        valueType: "'none' | 'create-one' | 'create-many' | 'cache-branches'",
        meaning: "View creation and caching model.",
      },
    ],
  },
  {
    familyId: "binding-command-semantics",
    claimFamilyId: "claim.governed.binding-command-semantics",
    description: "Product-authored binding-command semantics.",
    keyConstructor: "GovernedSemanticKey(ResourceKey(binding-command, canonicalName), binding-command-semantics)",
    dependencies: ["binding-command-semantics-governed-closure", "classification", "realized-world-consultation"],
    closureStates: ["closed", "unassigned", "open"],
    slotNames: ["commandKind", "expressionRequired", "targetProperty"],
    slots: [
      {
        slotName: "commandKind",
        valueType:
          "'one-time' | 'to-view' | 'two-way' | 'from-view' | 'trigger' | 'capture' | 'delegate' | 'attr' | 'class' | 'style' | 'spread'",
        meaning: "Behavioral kind for the command.",
      },
      {
        slotName: "expressionRequired",
        valueType: "boolean",
        meaning: "Whether the command requires an expression value.",
      },
      {
        slotName: "targetProperty",
        valueType: "string | null",
        meaning: "Target property override, if any.",
      },
    ],
  },
  {
    familyId: "attribute-pattern-semantics",
    claimFamilyId: "claim.governed.attribute-pattern-semantics",
    description: "Product-authored attribute-pattern interpretation semantics.",
    keyConstructor: "GovernedSemanticKey(ResourceKey(attribute-pattern, pattern|symbols), attribute-pattern-semantics)",
    dependencies: ["attribute-pattern-semantics-governed-closure", "classification", "realized-world-consultation"],
    closureStates: ["closed", "unassigned", "open"],
    slotNames: ["interpret", "symbols"],
    slots: [
      {
        slotName: "interpret",
        valueType: "string",
        meaning: "Interpretation function reference.",
      },
      {
        slotName: "symbols",
        valueType: "string[]",
        meaning: "Pattern symbol set.",
      },
    ],
  },
] as const satisfies readonly GovernedFamilyDefinition[];
