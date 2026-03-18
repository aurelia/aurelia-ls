export type ExtensionIdentifier = string;

export const KNOWN_GOVERNED_FAMILY_IDS = [
  "controller-semantics",
  "binding-command-semantics",
  "attribute-pattern-semantics",
] as const;

export type KnownGovernedFamilyId = (typeof KNOWN_GOVERNED_FAMILY_IDS)[number];

export type GovernedClosureState = "closed" | "unassigned" | "open";

export const GOVERNED_SLOT_COMPLETENESS_VALUES = ["satisfied", "unsatisfied", "open"] as const;

export type GovernedSlotCompleteness = (typeof GOVERNED_SLOT_COMPLETENESS_VALUES)[number];

export interface GovernedSlotValue {
  readonly value: unknown;
  readonly completeness: GovernedSlotCompleteness;
}

export interface GovernedFamilySection {
  readonly familyId: ExtensionIdentifier;
  readonly closureState: GovernedClosureState;
  readonly slots: Record<string, GovernedSlotValue>;
}

export interface ControllerSemanticsSlots {
  readonly scopeEffect: GovernedSlotValue;
  readonly linkageKind: GovernedSlotValue;
  readonly cardinality: GovernedSlotValue;
  readonly contextualData: GovernedSlotValue;
  readonly viewManagement: GovernedSlotValue;
}

export interface BindingCommandSemanticsSlots {
  readonly commandKind: GovernedSlotValue;
  readonly expressionRequired: GovernedSlotValue;
  readonly targetProperty: GovernedSlotValue;
}

export interface AttributePatternSemanticsSlots {
  readonly interpret: GovernedSlotValue;
  readonly symbols: GovernedSlotValue;
}
