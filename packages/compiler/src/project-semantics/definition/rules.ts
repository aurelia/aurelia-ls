export type DefinitionComparatorStage =
  | "source-priority"
  | "evidence-rank"
  | "known-completeness"
  | "canonical-atom-id";

export type DefinitionFieldOperator =
  | "select"
  | "stable-union"
  | "patch-object"
  | "locked-identity"
  | "known-over-unknown";

export type DefinitionConflictReason = "field-conflict" | "kind-mismatch";

export type StaticDefinitionFieldPath =
  | "resource.className"
  | "resource.aliases"
  | "resource.containerless"
  | "resource.shadowOptions"
  | "resource.capture"
  | "resource.processContent"
  | "resource.boundary"
  | "resource.inlineTemplate"
  | "resource.dependencies"
  | "resource.noMultiBindings"
  | "resource.primary"
  | "resource.vc.fromType"
  | "resource.vc.toType";

export type BindableLeafField =
  | "property"
  | "attribute"
  | "mode"
  | "primary"
  | "type"
  | "doc";

export type BindableDefinitionFieldPath = `bindables.${string}.${BindableLeafField}`;

export type DefinitionFieldPath = StaticDefinitionFieldPath | BindableDefinitionFieldPath;

export interface DefinitionFieldRule {
  readonly key: string;
  readonly operator: DefinitionFieldOperator;
  readonly order: readonly DefinitionComparatorStage[];
  readonly conflictReason?: DefinitionConflictReason;
}

export const DEFAULT_DEFINITION_COMPARATOR_ORDER: readonly DefinitionComparatorStage[] = [
  "source-priority",
  "evidence-rank",
  "known-completeness",
  "canonical-atom-id",
] as const;

type DefinitionRuleMap = Record<
  StaticDefinitionFieldPath,
  Omit<DefinitionFieldRule, "key">
>;

const STATIC_FIELD_RULES: DefinitionRuleMap = {
  "resource.className": {
    operator: "locked-identity",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
    conflictReason: "field-conflict",
  },
  "resource.aliases": {
    operator: "stable-union",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  "resource.containerless": {
    operator: "select",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  "resource.shadowOptions": {
    operator: "patch-object",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  "resource.capture": {
    operator: "select",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  "resource.processContent": {
    operator: "select",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  "resource.boundary": {
    operator: "select",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  "resource.inlineTemplate": {
    operator: "known-over-unknown",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  "resource.dependencies": {
    operator: "stable-union",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  "resource.noMultiBindings": {
    operator: "select",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  "resource.primary": {
    operator: "select",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  "resource.vc.fromType": {
    operator: "known-over-unknown",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  "resource.vc.toType": {
    operator: "known-over-unknown",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
};

type BindableRuleMap = Record<
  BindableLeafField,
  Omit<DefinitionFieldRule, "key">
>;

const BINDABLE_FIELD_RULES: BindableRuleMap = {
  property: {
    operator: "locked-identity",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
    conflictReason: "field-conflict",
  },
  attribute: {
    operator: "select",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  mode: {
    operator: "known-over-unknown",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  primary: {
    operator: "select",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  type: {
    operator: "known-over-unknown",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
  doc: {
    operator: "known-over-unknown",
    order: DEFAULT_DEFINITION_COMPARATOR_ORDER,
  },
};

export function isBindableFieldPath(field: DefinitionFieldPath): field is BindableDefinitionFieldPath {
  return field.startsWith("bindables.");
}

export function normalizeDefinitionRuleKey(field: DefinitionFieldPath): string {
  if (!isBindableFieldPath(field)) {
    return field;
  }
  const segments = field.split(".");
  const leaf = segments[segments.length - 1] as BindableLeafField | undefined;
  if (!leaf || !(leaf in BINDABLE_FIELD_RULES)) {
    return "bindables.*.property";
  }
  return `bindables.*.${leaf}`;
}

export function getDefinitionFieldRule(field: DefinitionFieldPath): DefinitionFieldRule {
  if (!isBindableFieldPath(field)) {
    return {
      key: field,
      ...STATIC_FIELD_RULES[field],
    };
  }
  const segments = field.split(".");
  const leaf = segments[segments.length - 1] as BindableLeafField | undefined;
  if (!leaf || !(leaf in BINDABLE_FIELD_RULES)) {
    return {
      key: "bindables.*.property",
      ...BINDABLE_FIELD_RULES.property,
    };
  }
  return {
    key: `bindables.*.${leaf}`,
    ...BINDABLE_FIELD_RULES[leaf],
  };
}
