import type { InlineCompleteness } from "./outcomes.js";

export type ExtensionIdentifier = string;

export const KNOWN_GOVERNED_FAMILY_IDS = [
  "controller-semantics",
  "binding-command-semantics",
  "attribute-pattern-semantics",
] as const;

export type KnownGovernedFamilyId = (typeof KNOWN_GOVERNED_FAMILY_IDS)[number];

export type GovernedClosureState = "closed" | "unassigned" | "open";

export interface GovernedSlotValue {
  readonly value: unknown;
  readonly completeness: InlineCompleteness;
}

export interface GovernedFamilySection {
  readonly familyId: ExtensionIdentifier;
  readonly closureState: GovernedClosureState;
  readonly slots: Record<string, GovernedSlotValue>;
}

export interface ControllerSemanticsSlots {
  readonly trigger: GovernedSlotValue;
  readonly scope: GovernedSlotValue;
  readonly cardinality: GovernedSlotValue;
  readonly placement: GovernedSlotValue;
  readonly branches: GovernedSlotValue;
  readonly linksTo: GovernedSlotValue;
  readonly injects: GovernedSlotValue;
  readonly tailProps: GovernedSlotValue;
}

export interface BindingCommandSemanticsSlots {
  readonly commandKind: GovernedSlotValue;
  readonly mode: GovernedSlotValue;
  readonly capture: GovernedSlotValue;
  readonly forceAttribute: GovernedSlotValue;
}

export interface AttributePatternSemanticsSlots {
  readonly interpret: GovernedSlotValue;
}
