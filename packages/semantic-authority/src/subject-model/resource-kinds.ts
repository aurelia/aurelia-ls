import type { ResourceKindDefinition } from "./types.js";

export const RESOURCE_KIND_DEFINITIONS = [
  {
    kind: "custom-element",
    description: "Globally registered custom element.",
    identityFamilyId: "claim.identity.custom-element",
    fieldFamilyId: "claim.resource.custom-element-field",
    declarationSurfaceIds: [
      "custom-element.decorator",
      "custom-element.define-call",
      "custom-element.static-au",
      "custom-element.annotation-metadata",
      "custom-element.static-class-fields",
      "custom-element.bindable-watch",
      "custom-element.local-template-synthesis",
      "convention",
    ],
  },
  {
    kind: "custom-attribute",
    description: "Globally registered custom attribute.",
    identityFamilyId: "claim.identity.custom-attribute",
    fieldFamilyId: "claim.resource.custom-attribute-field",
    declarationSurfaceIds: [
      "custom-attribute.decorator",
      "custom-attribute.template-controller-decorator",
      "custom-attribute.define-call",
      "custom-element.static-au",
      "custom-element.static-class-fields",
    ],
  },
  {
    kind: "value-converter",
    description: "Value converter participating in expression evaluation.",
    identityFamilyId: "claim.identity.value-converter",
    fieldFamilyId: "claim.resource.value-converter-field",
    declarationSurfaceIds: [
      "value-converter.decorator",
      "custom-element.static-au",
      "convention",
    ],
  },
  {
    kind: "binding-behavior",
    description: "Binding behavior affecting binding execution.",
    identityFamilyId: "claim.identity.binding-behavior",
    fieldFamilyId: "claim.resource.binding-behavior-field",
    declarationSurfaceIds: [
      "binding-behavior.decorator",
      "custom-element.static-au",
      "convention",
    ],
  },
  {
    kind: "binding-command",
    description: "Binding command admitted through template vocabulary.",
    identityFamilyId: "claim.identity.binding-command",
    fieldFamilyId: "claim.resource.binding-command-field",
    declarationSurfaceIds: [
      "binding-command.definition-object",
      "binding-command.standard-configuration",
    ],
  },
  {
    kind: "attribute-pattern",
    description: "Pattern-based attribute admission and interpretation.",
    identityFamilyId: "claim.identity.attribute-pattern",
    fieldFamilyId: "claim.resource.attribute-pattern-field",
    declarationSurfaceIds: [
      "attribute-pattern.define-call",
      "attribute-pattern.registered-pattern",
    ],
  },
  {
    kind: "local-custom-element",
    description: "Owner-bounded custom element admitted only within a local scope.",
    identityFamilyId: "claim.identity.local-custom-element",
    declarationSurfaceIds: ["local-custom-element.template"],
    localToOwner: true,
  },
] as const satisfies readonly ResourceKindDefinition[];
