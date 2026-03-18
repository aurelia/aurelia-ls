import type { FieldSchemaDefinition } from "./types.js";

type FieldClosureMetadata = Pick<
  FieldSchemaDefinition,
  "identityCarried" | "completenessSensitive"
>;

const IDENTITY_CARRIED: FieldClosureMetadata = {
  identityCarried: true,
  completenessSensitive: false,
};

const COMPLETENESS_SENSITIVE: FieldClosureMetadata = {
  identityCarried: false,
  completenessSensitive: true,
};

const CLOSURE_NEUTRAL: FieldClosureMetadata = {
  identityCarried: false,
  completenessSensitive: false,
};

function field(
  resourceKind: FieldSchemaDefinition["resourceKind"],
  fieldPath: string,
  valueType: string,
  owningFamilyId: string,
  closure: FieldClosureMetadata,
  notes?: string,
): FieldSchemaDefinition {
  return {
    schemaId: `${resourceKind}:${fieldPath}`,
    resourceKind,
    fieldPath,
    valueType,
    owningFamilyId,
    ...closure,
    notes,
  };
}

export const FIELD_SCHEMA_DEFINITIONS = [
  field(
    "custom-element",
    "name",
    "string",
    "claim.resource.custom-element-field",
    IDENTITY_CARRIED,
  ),
  field(
    "custom-element",
    "className",
    "string",
    "claim.resource.custom-element-field",
    IDENTITY_CARRIED,
  ),
  field(
    "custom-element",
    "template",
    "string | null",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
  ),
  field(
    "custom-element",
    "containerless",
    "boolean",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
  ),
  field(
    "custom-element",
    "shadowOptions",
    "{ mode: 'open' | 'closed' } | null",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
  ),
  field(
    "custom-element",
    "capture",
    "boolean | { kind: 'filter' }",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
    "Three-way graph encoding: false, true, or filter-present without serializing the predicate body.",
  ),
  field(
    "custom-element",
    "processContent",
    "boolean",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
    "Deliberate graph-level presence collapse: hook presence is preserved, hook identity/effect stays opaque.",
  ),
  field(
    "custom-element",
    "injectable",
    "boolean",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
  ),
  field(
    "custom-element",
    "enhance",
    "boolean",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
  ),
  field(
    "custom-element",
    "watches",
    "WatchFieldValue[]",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
    "Source-neutral watch envelope preserving expression kind, callback kind, and flush mode.",
  ),
  field(
    "custom-element",
    "strict",
    "boolean | null",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
  ),
  field(
    "custom-element",
    "aliases",
    "string[]",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
    "Array entries are preserved individually for completeness analysis.",
  ),
  field(
    "custom-element",
    "dependencies",
    "string[]",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
    "Array entries are preserved individually for completeness analysis.",
  ),
  field(
    "custom-element",
    "hasSlots",
    "boolean",
    "claim.resource.custom-element-field",
    COMPLETENESS_SENSITIVE,
  ),

  field(
    "custom-attribute",
    "name",
    "string",
    "claim.resource.custom-attribute-field",
    IDENTITY_CARRIED,
  ),
  field(
    "custom-attribute",
    "className",
    "string",
    "claim.resource.custom-attribute-field",
    IDENTITY_CARRIED,
  ),
  field(
    "custom-attribute",
    "isTemplateController",
    "boolean",
    "claim.resource.custom-attribute-field",
    COMPLETENESS_SENSITIVE,
  ),
  field(
    "custom-attribute",
    "noMultiBindings",
    "boolean",
    "claim.resource.custom-attribute-field",
    COMPLETENESS_SENSITIVE,
  ),
  field(
    "custom-attribute",
    "containerStrategy",
    "string | null",
    "claim.resource.custom-attribute-field",
    COMPLETENESS_SENSITIVE,
  ),
  field(
    "custom-attribute",
    "defaultProperty",
    "string",
    "claim.resource.custom-attribute-field",
    COMPLETENESS_SENSITIVE,
  ),
  field(
    "custom-attribute",
    "watches",
    "WatchFieldValue[]",
    "claim.resource.custom-attribute-field",
    COMPLETENESS_SENSITIVE,
    "Source-neutral watch envelope preserving expression kind, callback kind, and flush mode.",
  ),
  field(
    "custom-attribute",
    "aliases",
    "string[]",
    "claim.resource.custom-attribute-field",
    COMPLETENESS_SENSITIVE,
    "Array entries are preserved individually for completeness analysis.",
  ),
  field(
    "custom-attribute",
    "dependencies",
    "string[]",
    "claim.resource.custom-attribute-field",
    COMPLETENESS_SENSITIVE,
    "Array entries are preserved individually for completeness analysis.",
  ),

  field(
    "value-converter",
    "name",
    "string",
    "claim.resource.value-converter-field",
    IDENTITY_CARRIED,
  ),
  field(
    "value-converter",
    "className",
    "string",
    "claim.resource.value-converter-field",
    IDENTITY_CARRIED,
  ),
  field(
    "value-converter",
    "aliases",
    "string[]",
    "claim.resource.value-converter-field",
    COMPLETENESS_SENSITIVE,
    "Array entries are preserved individually for completeness analysis.",
  ),

  field(
    "binding-behavior",
    "name",
    "string",
    "claim.resource.binding-behavior-field",
    IDENTITY_CARRIED,
  ),
  field(
    "binding-behavior",
    "className",
    "string",
    "claim.resource.binding-behavior-field",
    IDENTITY_CARRIED,
  ),
  field(
    "binding-behavior",
    "aliases",
    "string[]",
    "claim.resource.binding-behavior-field",
    COMPLETENESS_SENSITIVE,
    "Array entries are preserved individually for completeness analysis.",
  ),

  field(
    "binding-command",
    "name",
    "string",
    "claim.resource.binding-command-field",
    IDENTITY_CARRIED,
  ),
  field(
    "binding-command",
    "aliases",
    "string[]",
    "claim.resource.binding-command-field",
    COMPLETENESS_SENSITIVE,
    "Array entries are preserved individually for completeness analysis. commandKind lives on binding-command-semantics, not FieldFact.",
  ),

  field(
    "attribute-pattern",
    "pattern",
    "string",
    "claim.resource.attribute-pattern-field",
    IDENTITY_CARRIED,
  ),
  field(
    "attribute-pattern",
    "symbols",
    "string",
    "claim.resource.attribute-pattern-field",
    IDENTITY_CARRIED,
  ),

  field(
    "local-custom-element",
    "name",
    "string",
    "claim.identity.local-custom-element",
    IDENTITY_CARRIED,
  ),
  field(
    "local-custom-element",
    "className",
    "string | null",
    "claim.identity.local-custom-element",
    CLOSURE_NEUTRAL,
  ),
  field(
    "local-custom-element",
    "template",
    "string | null",
    "claim.identity.local-custom-element",
    CLOSURE_NEUTRAL,
  ),
  field(
    "local-custom-element",
    "aliases",
    "string[]",
    "claim.identity.local-custom-element",
    COMPLETENESS_SENSITIVE,
    "Broader local-custom-element field coverage remains an explicit residual beyond the committed local-template surface.",
  ),
] as const satisfies readonly FieldSchemaDefinition[];
