import type { DeclarationSurfaceDefinition } from "./types.js";

export const DECLARATION_SURFACE_DEFINITIONS = [
  {
    surfaceId: "custom-element.decorator",
    description: "@customElement(...) declaration surface.",
    resourceKinds: ["custom-element"],
  },
  {
    surfaceId: "custom-element.define-call",
    description: "CustomElement.define(...) declaration surface.",
    resourceKinds: ["custom-element"],
  },
  {
    surfaceId: "custom-element.static-au",
    description: "static $au declaration surface.",
    resourceKinds: ["custom-element", "custom-attribute", "value-converter", "binding-behavior"],
  },
  {
    surfaceId: "custom-element.annotation-metadata",
    description: "Annotation metadata declaration surface.",
    resourceKinds: ["custom-element"],
  },
  {
    surfaceId: "custom-element.static-class-fields",
    description: "Static class field declaration surface.",
    resourceKinds: ["custom-element", "custom-attribute"],
  },
  {
    surfaceId: "custom-element.bindable-watch",
    description: "@bindable and @watch declaration surface contributing interface facts.",
    resourceKinds: ["custom-element"],
  },
  {
    surfaceId: "custom-element.local-template-synthesis",
    description: "Local-template synthesis declaration surface.",
    resourceKinds: ["custom-element"],
  },
  {
    surfaceId: "custom-attribute.decorator",
    description: "@customAttribute(...) declaration surface.",
    resourceKinds: ["custom-attribute"],
  },
  {
    surfaceId: "custom-attribute.template-controller-decorator",
    description: "@templateController(...) declaration surface.",
    resourceKinds: ["custom-attribute"],
  },
  {
    surfaceId: "custom-attribute.define-call",
    description: "CustomAttribute.define(...) declaration surface.",
    resourceKinds: ["custom-attribute"],
  },
  {
    surfaceId: "value-converter.decorator",
    description: "@valueConverter(...) declaration surface.",
    resourceKinds: ["value-converter"],
  },
  {
    surfaceId: "binding-behavior.decorator",
    description: "@bindingBehavior(...) declaration surface.",
    resourceKinds: ["binding-behavior"],
  },
  {
    surfaceId: "convention",
    description: "Convention-based declaration surface.",
    resourceKinds: ["custom-element", "value-converter", "binding-behavior"],
  },
  {
    surfaceId: "binding-command.definition-object",
    description: "Binding command definition-object declaration surface.",
    resourceKinds: ["binding-command"],
  },
  {
    surfaceId: "binding-command.standard-configuration",
    description: "StandardConfiguration bundle declaration surface.",
    resourceKinds: ["binding-command"],
  },
  {
    surfaceId: "attribute-pattern.define-call",
    description: "AttributePattern.define(...) declaration surface.",
    resourceKinds: ["attribute-pattern"],
  },
  {
    surfaceId: "attribute-pattern.registered-pattern",
    description: "Registered attribute-pattern declaration surface.",
    resourceKinds: ["attribute-pattern"],
  },
  {
    surfaceId: "local-custom-element.template",
    description: "<template as-custom-element=\"...\"> declaration surface in the owning template.",
    resourceKinds: ["local-custom-element"],
  },
] as const satisfies readonly DeclarationSurfaceDefinition[];
