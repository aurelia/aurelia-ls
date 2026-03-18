import type { ResourceKindDefinition } from "./types.js";

export const RESOURCE_KIND_DEFINITIONS = [
  { kind: "custom-element", description: "Globally registered custom element." },
  { kind: "custom-attribute", description: "Globally registered custom attribute." },
  { kind: "value-converter", description: "Value converter participating in expression evaluation." },
  { kind: "binding-behavior", description: "Binding behavior affecting binding execution." },
  { kind: "binding-command", description: "Binding command admitted through template vocabulary." },
  { kind: "attribute-pattern", description: "Pattern-based attribute admission and interpretation." },
  { kind: "local-custom-element", description: "Owner-bounded custom element admitted only within a local scope.", localToOwner: true },
] as const satisfies readonly ResourceKindDefinition[];
