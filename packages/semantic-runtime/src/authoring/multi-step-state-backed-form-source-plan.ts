import { moduleSpecifier } from '../application/module-specifier.js';
import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  type AuthoringSourcePatternModule,
  referenceInstantiationSourceFiles,
  referenceInstantiationSourcePattern,
  recipeSourceEditPolicy,
  recipeSourceFile,
  sourcePatternAdaptationGroup,
  sourcePatternParameter,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import {
  fillSourceTemplate,
  indentSourceLines,
  sourceText,
} from './source-template.js';
import { SourcePatternModules } from './source-pattern-modules.js';
import {
  kebabSourceName,
  lowerCamelSourceName,
  lowerTitleSourceName,
  pascalSourceName,
  sourceNameWords,
  titleSourceName,
} from './source-name.js';
import {
  standardRequestFormCanSubmitExpression,
  standardRequestFormFieldConstructorParameters,
  standardRequestFormFieldControlTemplate,
  standardRequestFormFieldSampleValueArguments,
  standardRequestFormFieldSchemaFromParameter,
  standardRequestFormFieldSchemaHasOptionDomains,
  standardRequestFormFieldSchemaModules,
  standardRequestFormFieldSchemaOptionParameterValue,
  standardRequestFormFieldSchemaOptionSummary,
  standardRequestFormFieldTypeDeclarations,
  standardRequestFormStateOptionProperties,
  type StandardRequestFormField,
  type StandardRequestFormFieldSchema,
} from './standard-request-form-field-schema.js';
import { sourceStringLiteral } from './source-option-schema.js';

export interface MultiStepWizardDomainNames {
  readonly entityClassName: string;
  readonly entityVariableName: string;
  readonly entityTitle: string;
  readonly entityLabelLower: string;
  readonly entityKebabName: string;
  readonly completedCountPropertyName: string;
}

export type MultiStepWizardSectionKind =
  | 'identity'
  | 'preferences'
  | 'review'
  | 'generic';

export interface MultiStepWizardStepDefinition {
  readonly id: string;
  readonly title: string;
  readonly sectionKind: MultiStepWizardSectionKind;
  readonly fieldSchema: StandardRequestFormFieldSchema | null;
}

export interface MultiStepStateBackedFormSourcePlanModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootStylePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly statePath: string;
  readonly stateClassName: string;
  readonly wizardComponentPath: string;
  readonly wizardTemplatePath: string;
  readonly wizardComponentClassName: string;
  readonly wizardElementName: string;
  readonly wizardDomain: MultiStepWizardDomainNames;
  readonly wizardSteps: readonly MultiStepWizardStepDefinition[];
  readonly wizardSectionFieldsParameterValue: string | null;
}

export function defaultMultiStepWizardDomainNames(): MultiStepWizardDomainNames {
  return {
    entityClassName: 'OnboardingProfile',
    entityVariableName: 'profile',
    entityTitle: 'Onboarding Profile',
    entityLabelLower: 'profile',
    entityKebabName: 'profile',
    completedCountPropertyName: 'completedProfileCount',
  };
}

export function multiStepWizardDomainNamesFromParameter(
  entityName?: string | null,
): MultiStepWizardDomainNames {
  if (entityName == null) {
    return defaultMultiStepWizardDomainNames();
  }
  const words = sourceNameWords(entityName);
  const entityClassName = pascalSourceName(words);
  return {
    entityClassName,
    entityVariableName: lowerCamelSourceName(words),
    entityTitle: titleSourceName(words),
    entityLabelLower: lowerTitleSourceName(words),
    entityKebabName: kebabSourceName(words),
    completedCountPropertyName: `completed${entityClassName}Count`,
  };
}

export function defaultMultiStepWizardSteps(): readonly MultiStepWizardStepDefinition[] {
  return [
    { id: 'profile', title: 'Profile', sectionKind: 'identity', fieldSchema: null },
    { id: 'preferences', title: 'Preferences', sectionKind: 'preferences', fieldSchema: null },
    { id: 'review', title: 'Review', sectionKind: 'review', fieldSchema: null },
  ];
}

export function multiStepWizardStepsFromParameters(
  wizardSteps?: string | null,
  wizardSectionFields?: string | null,
  wizardOptions?: string | null,
): readonly MultiStepWizardStepDefinition[] {
  const sectionFieldGroups = wizardSectionFieldGroupsFromParameter(wizardSectionFields, wizardOptions);
  if (wizardSteps == null && sectionFieldGroups.length === 0) {
    return defaultMultiStepWizardSteps();
  }
  const labels = wizardSteps == null
    ? sectionFieldGroups.map((group) => group.title)
    : uniqueWizardStepLabels(wizardSteps);
  if (labels.length === 0) {
    return withWizardStepFieldSchemas(defaultMultiStepWizardSteps(), sectionFieldGroups);
  }
  const candidates = labels.map((label) => wizardStepCandidate(label));
  return withWizardStepFieldSchemas(assignWizardStepSectionKinds(candidates), sectionFieldGroups);
}

export function multiStepStateBackedFormSourcePlan(
  model: MultiStepStateBackedFormSourcePlanModel,
): AuthoringSourceEditPlan {
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    referenceInstantiationSourceFiles(multiStepStateBackedFormSourceFiles(model)),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: [
        '@aurelia/validation',
        '@aurelia/validation-html',
      ],
    }),
    multiStepStateBackedFormSourcePattern(model),
  );
}

function multiStepStateBackedFormSourcePattern(
  model: MultiStepStateBackedFormSourcePlanModel,
) {
  return referenceInstantiationSourcePattern(
    'multi-step-state-backed-form.reference-instantiation',
    'Wizard form state pattern',
    `A complete reference instantiation of composed wizard/${model.wizardDomain.entityLabelLower} state, validation-html configuration, repeated step metadata, conditional step sections, and direct state.${model.wizardDomain.entityVariableName} bindings.`,
    [
      `Treat ${model.wizardDomain.entityClassName}, plan tiers, feature options, and step labels as replaceable defaults for the caller-specific workflow.`,
      'Keep durable wizard/progress/readiness behavior on state/domain classes when adapting instead of introducing view-model forwarding getters.',
      'Treat progress styling as reference presentation and replace it with host design-system styling when available.',
    ],
    'reference-presentation',
    [
      sourcePatternParameter(
        'wizard-entity',
        'domain-entity',
        'Wizard domain entity',
        model.wizardDomain.entityTitle,
        'Replace the composed wizard aggregate, direct state/domain bindings, and readiness getter class with the caller workflow domain.',
        'source-text-input',
        'domain-title',
      ),
      sourcePatternParameter(
        'wizard-steps',
        'domain-collection',
        'Wizard steps',
        wizardStepListDefaultValue(model.wizardSteps),
        'Generate step ids, progress labels, and conditional sections together. Per-step fields/options remain reference workflow content until a section field schema is modeled.',
        'source-text-input',
        'workflow-step-list',
      ),
      sourcePatternParameter(
        'wizard-section-fields',
        'field-schema',
        'Wizard section fields',
        wizardSectionFieldsDefaultValue(model),
        'Replace caller workflow fields inside named wizard sections while preserving step progress, direct state/domain bindings, validation, and native value/select/checked channel semantics.',
        'source-text-input',
        'workflow-section-field-schema-list',
      ),
      sourcePatternParameter(
        'wizard-options',
        'domain-collection',
        'Wizard option domains',
        wizardOptionDefaultValue(model),
        'Replace option values and labels used by select or checked-collection wizard fields while preserving value-channel semantics.',
        multiStepWizardHasOptionDomains(model) ? 'source-text-input' : 'advisory-only',
        multiStepWizardHasOptionDomains(model) ? 'option-schema-list' : 'domain-collection-summary',
      ),
      sourcePatternParameter(
        'wizard-sample-data',
        'sample-data',
        'Reference wizard options',
        wizardSampleDataDefaultValue(model),
        'Replace sample plan tiers, options, and labels before emitting caller-specific code.',
      ),
      sourcePatternParameter(
        'wizard-presentation',
        'presentation',
        'Reference wizard presentation',
        'progress styling',
        'Treat generated progress and layout CSS as fixture presentation unless the caller wants the reference look.',
      ),
    ],
    [
      SourcePatternModules.AppShell,
      SourcePatternModules.DiStateBoundary,
      SourcePatternModules.StateComposition,
      SourcePatternModules.DomainClassModel,
      ...multiStepWizardFormModules(model),
      SourcePatternModules.TemplateControllerFlow,
      SourcePatternModules.ClassStyleChannels,
      SourcePatternModules.ValidationPlugin,
    ],
    [
      sourcePatternAdaptationGroup(
        'wizard-domain-flow',
        'Wizard domain flow',
        'Wizard entity, step model, section fields, option data, sample records, and presentation move together because the generated source ties progress, validation, and section visibility to the workflow.',
        ['wizard-entity', 'wizard-steps', 'wizard-section-fields', 'wizard-options', 'wizard-sample-data', 'wizard-presentation'],
      ),
    ],
  );
}

function multiStepStateBackedFormSourceFiles(
  model: MultiStepStateBackedFormSourcePlanModel,
): readonly AuthoringSourceFileEdit[] {
  return [
    multiStepFormEntrypointFile(model),
    multiStepFormRootComponentFile(model),
    multiStepFormRootTemplateFile(model),
    multiStepFormRootStyleFile(model),
    multiStepFormStateFile(model),
    multiStepFormWizardComponentFile(model),
    multiStepFormWizardTemplateFile(model),
  ];
}

function multiStepFormEntrypointFile(
  model: MultiStepStateBackedFormSourcePlanModel,
): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.entrypointPath,
    'entrypoint',
    'typescript',
    'create-entrypoint',
    fillSourceTemplate(ENTRYPOINT_SOURCE, {
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_COMPONENT_MODULE: moduleSpecifier(model.entrypointPath, model.rootComponentPath, false),
    }),
  );
}

function multiStepFormRootComponentFile(
  model: MultiStepStateBackedFormSourcePlanModel,
): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSourceTemplate(ROOT_COMPONENT_SOURCE, {
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_STYLE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootStylePath, true),
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.rootComponentPath, model.statePath, false),
      WIZARD_COMPONENT_CLASS: model.wizardComponentClassName,
      WIZARD_COMPONENT_MODULE: moduleSpecifier(model.rootComponentPath, model.wizardComponentPath, false),
    }),
  );
}

function multiStepFormRootTemplateFile(
  model: MultiStepStateBackedFormSourcePlanModel,
): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(ROOT_TEMPLATE_SOURCE, {
      WIZARD_COMPLETED_COUNT_PROPERTY: model.wizardDomain.completedCountPropertyName,
      WIZARD_ELEMENT_NAME: model.wizardElementName,
      WIZARD_ENTITY_TITLE: model.wizardDomain.entityTitle,
    }),
  );
}

function multiStepFormRootStyleFile(model: MultiStepStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootStylePath,
    'component-style',
    'css',
    'create-style-asset',
    ROOT_STYLE_SOURCE,
  );
}

function multiStepFormStateFile(model: MultiStepStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  const text = multiStepWizardMergedFieldSchema(model) == null
    ? fillSourceTemplate(STATE_SOURCE, {
      STATE_CLASS: model.stateClassName,
      WIZARD_COMPLETED_COUNT_PROPERTY: model.wizardDomain.completedCountPropertyName,
      WIZARD_ENTITY_CLASS: model.wizardDomain.entityClassName,
      WIZARD_ENTITY_VARIABLE: model.wizardDomain.entityVariableName,
      WIZARD_CAN_GO_NEXT: wizardCanGoNextSource(model),
      WIZARD_STEP_ARRAY: wizardStepArraySource(model.wizardSteps),
      WIZARD_STEP_ID_UNION: wizardStepIdUnionSource(model.wizardSteps),
    })
    : fieldDrivenWizardStateSource(model);
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'create-state-model',
    text,
  );
}

function multiStepFormWizardComponentFile(
  model: MultiStepStateBackedFormSourcePlanModel,
): AuthoringSourceFileEdit {
  const validation = wizardValidationTokens(model);
  return recipeSourceFile(
    model.wizardComponentPath,
    'component',
    'typescript',
    'create-form-component',
    fillSourceTemplate(WIZARD_COMPONENT_SOURCE, {
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.wizardComponentPath, model.statePath, false),
      WIZARD_COMPONENT_CLASS: model.wizardComponentClassName,
      WIZARD_ELEMENT_NAME: model.wizardElementName,
      WIZARD_ENTITY_CLASS: model.wizardDomain.entityClassName,
      WIZARD_TEMPLATE_MODULE: moduleSpecifier(model.wizardComponentPath, model.wizardTemplatePath, true),
      WIZARD_VALIDATION_CONSTRUCTOR: validation.constructorSource,
      WIZARD_VALIDATION_FIELDS: validation.fieldSource,
    }),
  );
}

function multiStepFormWizardTemplateFile(
  model: MultiStepStateBackedFormSourcePlanModel,
): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.wizardTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(WIZARD_TEMPLATE_SOURCE, {
      WIZARD_ENTITY_TITLE: model.wizardDomain.entityTitle,
      WIZARD_ENTITY_VARIABLE: model.wizardDomain.entityVariableName,
      WIZARD_STEP_SECTIONS: wizardStepSectionsSource(model),
    }),
  );
}

interface WizardStepCandidate {
  readonly id: string;
  readonly title: string;
  readonly rawLabel: string;
}

interface WizardSectionFieldGroup {
  readonly id: string;
  readonly title: string;
  readonly fieldSchema: StandardRequestFormFieldSchema;
}

interface WizardValidationTokens {
  readonly fieldSource: string;
  readonly constructorSource: string;
}

function uniqueWizardStepLabels(wizardSteps: string): readonly string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const item of wizardSteps.split(/[,;]|\band\b/iu)) {
    const label = titleSourceName(sourceNameWords(item));
    const key = label.toLowerCase();
    if (label.length > 0 && !seen.has(key)) {
      seen.add(key);
      labels.push(label);
    }
  }
  return labels;
}

function wizardStepCandidate(label: string): WizardStepCandidate {
  return {
    id: kebabSourceName(sourceNameWords(label)),
    title: label,
    rawLabel: label.toLowerCase(),
  };
}

function wizardSectionFieldGroupsFromParameter(
  wizardSectionFields?: string | null,
  wizardOptions?: string | null,
): readonly WizardSectionFieldGroup[] {
  const trimmed = wizardSectionFields?.trim() ?? '';
  if (trimmed.length === 0) {
    return [];
  }
  const groups: WizardSectionFieldGroup[] = [];
  const seen = new Set<string>();
  for (const rawGroup of trimmed.split(/[;\n]+/u)) {
    const group = wizardSectionFieldGroupFromSource(rawGroup, wizardOptions);
    if (group == null || seen.has(group.id)) {
      continue;
    }
    seen.add(group.id);
    groups.push(group);
  }
  return groups;
}

function wizardSectionFieldGroupFromSource(
  rawGroup: string,
  wizardOptions?: string | null,
): WizardSectionFieldGroup | null {
  const trimmed = rawGroup.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const separatorIndex = trimmed.indexOf(':');
  const rawTitle = separatorIndex >= 0
    ? trimmed.slice(0, separatorIndex).trim()
    : 'Details';
  const rawFields = separatorIndex >= 0
    ? trimmed.slice(separatorIndex + 1).trim()
    : trimmed;
  const fieldSchema = standardRequestFormFieldSchemaFromParameter(rawFields, wizardOptions);
  if (fieldSchema == null) {
    return null;
  }
  const title = titleSourceName(sourceNameWords(rawTitle));
  return {
    id: kebabSourceName(sourceNameWords(title)),
    title,
    fieldSchema,
  };
}

function withWizardStepFieldSchemas(
  steps: readonly MultiStepWizardStepDefinition[],
  sectionFieldGroups: readonly WizardSectionFieldGroup[],
): readonly MultiStepWizardStepDefinition[] {
  if (sectionFieldGroups.length === 0) {
    return steps;
  }
  return steps.map((step) => ({
    ...step,
    fieldSchema: wizardStepFieldSchema(step, sectionFieldGroups),
  }));
}

function wizardStepFieldSchema(
  step: MultiStepWizardStepDefinition,
  sectionFieldGroups: readonly WizardSectionFieldGroup[],
): StandardRequestFormFieldSchema | null {
  const stepKeys = new Set([
    step.id,
    kebabSourceName(sourceNameWords(step.title)),
    lowerCamelSourceName(sourceNameWords(step.title)),
  ]);
  return sectionFieldGroups.find((group) =>
    stepKeys.has(group.id)
    || stepKeys.has(lowerCamelSourceName(sourceNameWords(group.title)))
  )?.fieldSchema ?? null;
}

function assignWizardStepSectionKinds(
  candidates: readonly WizardStepCandidate[],
): readonly MultiStepWizardStepDefinition[] {
  const identityIndex = firstStepIndex(candidates, isIdentityWizardStep) ?? 0;
  const reviewIndex = firstStepIndex(candidates, isReviewWizardStep) ??
    lastIndexExcept(candidates, [identityIndex]);
  const preferencesIndex = firstStepIndex(candidates, isPrimaryPreferencesWizardStep, [identityIndex, reviewIndex]) ??
    firstStepIndex(candidates, isPreferencesWizardStep, [identityIndex, reviewIndex]) ??
    firstMiddleIndex(candidates, [identityIndex, reviewIndex]);
  const assigned: MultiStepWizardStepDefinition[] = candidates.map((candidate, index) => ({
    id: candidate.id,
    title: candidate.title,
    sectionKind: index === identityIndex
      ? 'identity'
      : index === preferencesIndex
        ? 'preferences'
        : index === reviewIndex
          ? 'review'
          : 'generic',
    fieldSchema: null,
  }));
  return ensureWizardStepSectionKinds(assigned);
}

function ensureWizardStepSectionKinds(
  steps: readonly MultiStepWizardStepDefinition[],
): readonly MultiStepWizardStepDefinition[] {
  const result = [...steps];
  if (!result.some((step) => step.sectionKind === 'identity')) {
    result.unshift({ id: 'details', title: 'Details', sectionKind: 'identity', fieldSchema: null });
  }
  if (!result.some((step) => step.sectionKind === 'preferences')) {
    const insertAt = Math.max(1, result.length - 1);
    result.splice(insertAt, 0, { id: 'preferences', title: 'Preferences', sectionKind: 'preferences', fieldSchema: null });
  }
  if (!result.some((step) => step.sectionKind === 'review')) {
    result.push({ id: 'review', title: 'Review', sectionKind: 'review', fieldSchema: null });
  }
  return result;
}

function firstStepIndex(
  candidates: readonly WizardStepCandidate[],
  predicate: (candidate: WizardStepCandidate) => boolean,
  excluded: readonly number[] = [],
): number | undefined {
  const index = candidates.findIndex((candidate, index) =>
    !excluded.includes(index) && predicate(candidate),
  );
  return index === -1 ? undefined : index;
}

function firstMiddleIndex(
  candidates: readonly WizardStepCandidate[],
  excluded: readonly number[],
): number | undefined {
  const index = candidates.findIndex((_, candidateIndex) =>
    candidateIndex > 0 &&
    candidateIndex < candidates.length - 1 &&
    !excluded.includes(candidateIndex),
  );
  return index === -1 ? undefined : index;
}

function lastIndexExcept(
  candidates: readonly WizardStepCandidate[],
  excluded: readonly number[],
): number {
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    if (!excluded.includes(index)) {
      return index;
    }
  }
  return candidates.length - 1;
}

function isIdentityWizardStep(candidate: WizardStepCandidate): boolean {
  return /\b(profile|profiles|detail|details|identity|contact|account|customer|user|info|information)\b/iu
    .test(candidate.rawLabel);
}

function isPreferencesWizardStep(candidate: WizardStepCandidate): boolean {
  return /\b(preference|preferences|option|options|plan|plans|billing|payment|shipping|feature|features|settings)\b/iu
    .test(candidate.rawLabel);
}

function isPrimaryPreferencesWizardStep(candidate: WizardStepCandidate): boolean {
  return /\b(preference|preferences|option|options|plan|plans|feature|features|settings)\b/iu
    .test(candidate.rawLabel);
}

function isReviewWizardStep(candidate: WizardStepCandidate): boolean {
  return /\b(review|confirm|confirmation|summary|submit|finish|complete|completion)\b/iu
    .test(candidate.rawLabel);
}

function wizardStepListDefaultValue(
  steps: readonly MultiStepWizardStepDefinition[],
): string {
  return steps.map((step) => lowerTitleSourceName(sourceNameWords(step.title))).join(', ');
}

function wizardSectionFieldsDefaultValue(
  model: MultiStepStateBackedFormSourcePlanModel,
): string {
  if (model.wizardSectionFieldsParameterValue != null) {
    return model.wizardSectionFieldsParameterValue;
  }
  return 'profile: name, email; preferences: contact preference, plan tier select, features checkboxes, accepted terms checkbox';
}

function wizardOptionDefaultValue(
  model: MultiStepStateBackedFormSourcePlanModel,
): string {
  const fieldSchema = multiStepWizardMergedFieldSchema(model);
  return standardRequestFormFieldSchemaOptionParameterValue(fieldSchema)
    ?? standardRequestFormFieldSchemaOptionSummary(fieldSchema)
    ?? 'contact methods, plan tiers, and feature options';
}

function wizardSampleDataDefaultValue(
  model: MultiStepStateBackedFormSourcePlanModel,
): string {
  return multiStepWizardMergedFieldSchema(model) == null
    ? 'plan tiers and feature options'
    : `${model.wizardDomain.entityTitle} sample field values and option domains`;
}

function multiStepWizardFormModules(
  model: MultiStepStateBackedFormSourcePlanModel,
): readonly AuthoringSourcePatternModule[] {
  const fieldSchemaModules = standardRequestFormFieldSchemaModules(multiStepWizardMergedFieldSchema(model))
    ?.filter((module) => module.key !== SourcePatternModules.CaptureAttributeFieldShell.key);
  return fieldSchemaModules ?? [
    SourcePatternModules.NativeFormValueChannels,
    SourcePatternModules.NativeTextValueChannel,
    SourcePatternModules.CheckedCollectionChannel,
    SourcePatternModules.SelectOptionModelChannel,
  ];
}

function multiStepWizardHasOptionDomains(
  model: MultiStepStateBackedFormSourcePlanModel,
): boolean {
  return standardRequestFormFieldSchemaHasOptionDomains(multiStepWizardMergedFieldSchema(model));
}

export function multiStepWizardMergedFieldSchema(
  model: MultiStepStateBackedFormSourcePlanModel,
): StandardRequestFormFieldSchema | null {
  const fieldSchemas = model.wizardSteps
    .map((step) => step.fieldSchema)
    .filter((fieldSchema): fieldSchema is StandardRequestFormFieldSchema => fieldSchema != null);
  if (fieldSchemas.length === 0) {
    return null;
  }
  const fields: StandardRequestFormField[] = [];
  const seen = new Set<string>();
  for (const fieldSchema of fieldSchemas) {
    for (const field of fieldSchema.fields) {
      if (seen.has(field.propertyName)) {
        continue;
      }
      seen.add(field.propertyName);
      fields.push(field);
    }
  }
  return {
    sourceParameterValue: model.wizardSectionFieldsParameterValue ?? fieldSchemas.map((fieldSchema) => fieldSchema.sourceParameterValue).join(', '),
    sourceOptionsParameterValue: fieldSchemas.find((fieldSchema) => fieldSchema.sourceOptionsParameterValue != null)?.sourceOptionsParameterValue ?? null,
    fields,
  };
}

function wizardStepIdUnionSource(
  steps: readonly MultiStepWizardStepDefinition[],
): string {
  return steps.map((step) => `'${step.id}'`).join(' | ');
}

function wizardStepArraySource(
  steps: readonly MultiStepWizardStepDefinition[],
): string {
  return steps
    .map((step) => `    new WizardStep('${step.id}', '${step.title}'),`)
    .join('\n');
}

function wizardCanGoNextSource(
  model: MultiStepStateBackedFormSourcePlanModel,
): string {
  const fieldSteps = model.wizardSteps.filter((step) => step.fieldSchema != null);
  if (fieldSteps.length > 0) {
    return fieldSteps
      .map((step) => `    if (this.currentStep.id === '${step.id}') {
      return ${standardRequestFormCanSubmitExpression(step.fieldSchema!, `this.${model.wizardDomain.entityVariableName}`)};
    }`)
      .join('\n') + `
    return this.${model.wizardDomain.entityVariableName}.canSubmit;`;
  }
  const identityStep = model.wizardSteps.find((step) => step.sectionKind === 'identity')!;
  const preferencesStep = model.wizardSteps.find((step) => step.sectionKind === 'preferences')!;
  return `    if (this.currentStep.id === '${identityStep.id}') {
      return this.${model.wizardDomain.entityVariableName}.name !== '' && this.${model.wizardDomain.entityVariableName}.email !== '';
    }
    if (this.currentStep.id === '${preferencesStep.id}') {
      return this.${model.wizardDomain.entityVariableName}.planTier != null && this.${model.wizardDomain.entityVariableName}.acceptedTerms;
    }
    return this.${model.wizardDomain.entityVariableName}.canSubmit;`;
}

function wizardStepSectionsSource(
  model: MultiStepStateBackedFormSourcePlanModel,
): string {
  return model.wizardSteps
    .map((step) => wizardStepSectionSource(model, step))
    .join('\n\n');
}

function wizardStepSectionSource(
  model: MultiStepStateBackedFormSourcePlanModel,
  step: MultiStepWizardStepDefinition,
): string {
  const fieldSchema = step.fieldSchema;
  if (fieldSchema != null) {
    return wizardFieldSchemaStepSectionSource(model, step, fieldSchema);
  }
  if (multiStepWizardMergedFieldSchema(model) != null) {
    return step.sectionKind === 'review'
      ? wizardFieldDrivenReviewStepSectionSource(model, step)
      : wizardGenericStepSectionSource(step);
  }
  switch (step.sectionKind) {
    case 'identity':
      return wizardIdentityStepSectionSource(model, step);
    case 'preferences':
      return wizardPreferencesStepSectionSource(model, step);
    case 'review':
      return wizardReviewStepSectionSource(model, step);
    case 'generic':
      return wizardGenericStepSectionSource(step);
  }
}

function wizardFieldSchemaStepSectionSource(
  model: MultiStepStateBackedFormSourcePlanModel,
  step: MultiStepWizardStepDefinition,
  fieldSchema: StandardRequestFormFieldSchema,
): string {
  const fields = fieldSchema.fields
    .map((field) => standardRequestFormFieldControlTemplate(field, {
      fieldShellElementName: null,
      sourceName: `state.${model.wizardDomain.entityVariableName}.${field.propertyName}`,
      stateExpression: 'state',
      validationEnabled: true,
      validationTrigger: 'blur',
      validationErrorCollectionName: `${field.propertyName}Errors`,
    }))
    .join('\n\n');
  return `    <section if.bind="state.currentStep.id === '${step.id}'">
      <h2>${step.title}</h2>
${indentSourceLines(fields, '  ')}
    </section>`;
}

function wizardIdentityStepSectionSource(
  model: MultiStepStateBackedFormSourcePlanModel,
  step: MultiStepWizardStepDefinition,
): string {
  return `    <section if.bind="state.currentStep.id === '${step.id}'">
      <div class.bind="nameErrors.length > 0 ? 'field-stack field-invalid' : 'field-stack'" validation-errors.from-view="nameErrors">
        <label for="${model.wizardDomain.entityKebabName}-name">Name</label>
        <input id="${model.wizardDomain.entityKebabName}-name" value.two-way="state.${model.wizardDomain.entityVariableName}.name & validate:'blur'">
        <p class="error" repeat.for="error of nameErrors">\${error.result.message}</p>
      </div>

      <div class.bind="emailErrors.length > 0 ? 'field-stack field-invalid' : 'field-stack'" validation-errors.from-view="emailErrors">
        <label for="${model.wizardDomain.entityKebabName}-email">Email</label>
        <input id="${model.wizardDomain.entityKebabName}-email" type="email" value.two-way="state.${model.wizardDomain.entityVariableName}.email & validate:'blur'">
        <p class="error" repeat.for="error of emailErrors">\${error.result.message}</p>
      </div>
    </section>`;
}

function wizardPreferencesStepSectionSource(
  model: MultiStepStateBackedFormSourcePlanModel,
  step: MultiStepWizardStepDefinition,
): string {
  return `    <section if.bind="state.currentStep.id === '${step.id}'">
      <fieldset>
        <legend>Contact preference</legend>
        <label>
          <input type="radio" model.bind="state.emailContact" checked.bind="state.${model.wizardDomain.entityVariableName}.contactMethod">
          Email
        </label>
        <label>
          <input type="radio" model.bind="state.phoneContact" checked.bind="state.${model.wizardDomain.entityVariableName}.contactMethod">
          Phone
        </label>
      </fieldset>

      <label for="plan-tier">Plan tier</label>
      <select id="plan-tier" value.bind="state.${model.wizardDomain.entityVariableName}.planTier">
        <option model.bind="null">Choose...</option>
        <option model.bind="state.starterTier">Starter</option>
        <option model.bind="state.teamTier">Team</option>
        <option model.bind="state.enterpriseTier">Enterprise</option>
      </select>

      <fieldset>
        <legend>Features</legend>
        <label repeat.for="feature of state.availableFeatures">
          <input type="checkbox" model.bind="feature.id" checked.bind="state.${model.wizardDomain.entityVariableName}.featureIds">
          \${feature.name}
        </label>
      </fieldset>

      <label>
        <input type="checkbox" checked.bind="state.${model.wizardDomain.entityVariableName}.acceptedTerms">
        I accept the service terms
      </label>
    </section>`;
}

function wizardReviewStepSectionSource(
  model: MultiStepStateBackedFormSourcePlanModel,
  step: MultiStepWizardStepDefinition,
): string {
  return `    <section if.bind="state.currentStep.id === '${step.id}'">
      <h2>${step.title}</h2>
      <p class="\${state.${model.wizardDomain.entityVariableName}.canSubmit ? 'ready' : 'pending'}">Ready to submit: \${state.${model.wizardDomain.entityVariableName}.canSubmit}</p>
      <p>Contact: \${state.${model.wizardDomain.entityVariableName}.contactSummary}</p>
      <p>Selected features: \${state.${model.wizardDomain.entityVariableName}.featureIds.length}</p>
    </section>`;
}

function wizardFieldDrivenReviewStepSectionSource(
  model: MultiStepStateBackedFormSourcePlanModel,
  step: MultiStepWizardStepDefinition,
): string {
  return `    <section if.bind="state.currentStep.id === '${step.id}'">
      <h2>${step.title}</h2>
      <p class="\${state.${model.wizardDomain.entityVariableName}.canSubmit ? 'ready' : 'pending'}">Ready to submit: \${state.${model.wizardDomain.entityVariableName}.canSubmit}</p>
      <p>Completed ${model.wizardDomain.entityLabelLower}(s): \${state.${model.wizardDomain.completedCountPropertyName}}</p>
    </section>`;
}

function wizardGenericStepSectionSource(
  step: MultiStepWizardStepDefinition,
): string {
  return `    <section if.bind="state.currentStep.id === '${step.id}'">
      <h2>${step.title}</h2>
      <p>${step.title} fields belong to the caller workflow and should be filled from a workflow-section field schema.</p>
    </section>`;
}

function fieldDrivenWizardStateSource(
  model: MultiStepStateBackedFormSourcePlanModel,
): string {
  const fieldSchema = multiStepWizardMergedFieldSchema(model)!;
  const optionProperties = standardRequestFormStateOptionProperties(fieldSchema);
  return sourceText(`${standardRequestFormFieldTypeDeclarations(fieldSchema)}export type WizardStepId = ${wizardStepIdUnionSource(model.wizardSteps)};

export class WizardStep {
  constructor(
    readonly id: WizardStepId,
    readonly title: string,
  ) {}
}

export class ${model.wizardDomain.entityClassName} {
  constructor(
${indentSourceLines(standardRequestFormFieldConstructorParameters(fieldSchema), '    ')}
    public submitCount: number,
  ) {}

  get canSubmit(): boolean {
    return ${standardRequestFormCanSubmitExpression(fieldSchema)};
  }
}

export class ${model.stateClassName} {
  readonly ${model.wizardDomain.entityVariableName} = create${model.wizardDomain.entityClassName}('${model.wizardDomain.entityKebabName}-1', ${sourceStringLiteral(model.wizardDomain.entityTitle)});
  readonly steps: readonly WizardStep[] = [
${wizardStepArraySource(model.wizardSteps)}
  ];
${optionProperties.length === 0 ? '' : `${indentSourceLines(optionProperties, '  ')}\n`}
  currentStepIndex = 0;
  ${model.wizardDomain.completedCountPropertyName} = 0;

  get currentStep(): WizardStep {
    return this.steps[Math.min(this.currentStepIndex, this.steps.length - 1)]!;
  }

  get progressPercent(): number {
    return ((this.currentStepIndex + 1) / this.steps.length) * 100;
  }

  get canGoBack(): boolean {
    return this.currentStepIndex > 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.steps.length - 1;
  }

  get canGoNext(): boolean {
${wizardCanGoNextSource(model)}
  }

  isCurrentStep(step: WizardStep): boolean {
    return step.id === this.currentStep.id;
  }

  isCompletedStep(step: WizardStep): boolean {
    return this.steps.indexOf(step) < this.currentStepIndex;
  }

  nextStep(): void {
    if (!this.isLastStep) {
      this.currentStepIndex += 1;
    }
  }

  previousStep(): void {
    if (this.canGoBack) {
      this.currentStepIndex -= 1;
    }
  }

  submit(): void {
    if (this.${model.wizardDomain.entityVariableName}.canSubmit) {
      this.${model.wizardDomain.entityVariableName}.submitCount += 1;
      this.${model.wizardDomain.completedCountPropertyName} += 1;
    }
  }
}

function create${model.wizardDomain.entityClassName}(id: string, label: string): ${model.wizardDomain.entityClassName} {
  return new ${model.wizardDomain.entityClassName}(
${standardRequestFormFieldSampleValueArguments(fieldSchema)}
    0,
  );
}
`);
}

function wizardValidationTokens(
  model: MultiStepStateBackedFormSourcePlanModel,
): WizardValidationTokens {
  const fieldSchema = multiStepWizardMergedFieldSchema(model);
  if (fieldSchema == null) {
    return {
      fieldSource: `  private readonly validationRules = resolve(IValidationRules);
  private readonly validationController = resolve(IValidationController);

  nameErrors: ValidationResultTarget[] = [];
  emailErrors: ValidationResultTarget[] = [];`,
      constructorSource: `  constructor() {
    this.validationRules
      .on(${model.wizardDomain.entityClassName})
      .ensure((${model.wizardDomain.entityVariableName}) => ${model.wizardDomain.entityVariableName}.name)
      .required()
      .ensure((${model.wizardDomain.entityVariableName}) => ${model.wizardDomain.entityVariableName}.email)
      .required()
      .email();
  }`,
    };
  }
  const requiredFields = fieldSchema.fields.filter((field) => field.requiredForSubmit);
  const errorFields = requiredFields
    .map((field) => `  ${field.propertyName}Errors: ValidationResultTarget[] = [];`)
    .join('\n');
  const ruleLines = requiredFields.flatMap((field) => [
    `      .ensure((${model.wizardDomain.entityVariableName}) => ${model.wizardDomain.entityVariableName}.${field.propertyName})`,
    '      .required()',
    ...(field.controlKind === 'email-input' ? ['      .email()'] : []),
  ]);
  return {
    fieldSource: `  private readonly validationRules = resolve(IValidationRules);
  private readonly validationController = resolve(IValidationController);${errorFields.length === 0 ? '' : `\n\n${errorFields}`}`,
    constructorSource: ruleLines.length === 0
      ? ''
      : `  constructor() {
    this.validationRules
      .on(${model.wizardDomain.entityClassName})
${ruleLines.join('\n')};
  }`,
  };
}

const ENTRYPOINT_SOURCE = sourceText(`import Aurelia from 'aurelia';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { __ROOT_COMPONENT_CLASS__ } from '__ROOT_COMPONENT_MODULE__';

Aurelia
  .register(ValidationHtmlConfiguration)
  .app(__ROOT_COMPONENT_CLASS__)
  .start();
`);

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import { __WIZARD_COMPONENT_CLASS__ } from '__WIZARD_COMPONENT_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';
import '__ROOT_STYLE_MODULE__';

@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__WIZARD_COMPONENT_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main>
  <h1>__WIZARD_ENTITY_TITLE__</h1>
  <__WIZARD_ELEMENT_NAME__></__WIZARD_ELEMENT_NAME__>
  <p>Completed: \${state.__WIZARD_COMPLETED_COUNT_PROPERTY__}</p>
</main>
`);

const ROOT_STYLE_SOURCE = sourceText(`main {
  display: grid;
  gap: 1rem;
  max-width: 54rem;
  margin: 0 auto;
  padding: 2rem;
}

.wizard {
  display: grid;
  gap: 1rem;
}

.wizard-progress {
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.wizard-progress-bar {
  background: #2563eb;
  height: 0.625rem;
}

.wizard-steps {
  display: flex;
  gap: 0.75rem;
  list-style: none;
  padding: 0;
}

.wizard-step {
  color: #4b5563;
}

.wizard-step.active {
  color: #111827;
  font-weight: 700;
}

.wizard-step.complete {
  color: #166534;
}

.wizard-ready {
  border-color: #166534;
}

.wizard-pending {
  border-color: #991b1b;
}

.field-stack {
  display: grid;
  gap: 0.25rem;
}

.field-invalid {
  border-left: 0.25rem solid #991b1b;
  padding-left: 0.75rem;
}

.error {
  color: #991b1b;
  margin: 0;
}

form {
  border: 1px solid #d1d5db;
  display: grid;
  gap: 1rem;
  padding: 1rem;
}
`);

const STATE_SOURCE = sourceText(`export type WizardStepId = __WIZARD_STEP_ID_UNION__;
export type ContactMethod = 'email' | 'phone';
export type PlanTier = 'starter' | 'team' | 'enterprise';

export class WizardStep {
  constructor(
    readonly id: WizardStepId,
    readonly title: string,
  ) {}
}

export class FeatureOption {
  constructor(
    readonly id: string,
    readonly name: string,
  ) {}
}

export class __WIZARD_ENTITY_CLASS__ {
  name = '';
  email = '';
  acceptedTerms = false;
  contactMethod: ContactMethod = 'email';
  planTier: PlanTier | null = null;
  featureIds: string[] = ['reports'];

  get canSubmit(): boolean {
    return this.name !== '' && this.email !== '' && this.acceptedTerms && this.planTier != null;
  }

  get contactSummary(): string {
    return this.contactMethod === 'email' ? this.email : 'Phone call requested';
  }
}

export class __STATE_CLASS__ {
  readonly __WIZARD_ENTITY_VARIABLE__ = new __WIZARD_ENTITY_CLASS__();
  readonly steps: readonly WizardStep[] = [
__WIZARD_STEP_ARRAY__
  ];
  readonly availableFeatures: readonly FeatureOption[] = [
    new FeatureOption('reports', 'Reports'),
    new FeatureOption('alerts', 'Alerts'),
    new FeatureOption('integrations', 'Integrations'),
  ];
  readonly starterTier: PlanTier = 'starter';
  readonly teamTier: PlanTier = 'team';
  readonly enterpriseTier: PlanTier = 'enterprise';
  readonly emailContact: ContactMethod = 'email';
  readonly phoneContact: ContactMethod = 'phone';

  currentStepIndex = 0;
  __WIZARD_COMPLETED_COUNT_PROPERTY__ = 0;

  get currentStep(): WizardStep {
    return this.steps[Math.min(this.currentStepIndex, this.steps.length - 1)]!;
  }

  get progressPercent(): number {
    return ((this.currentStepIndex + 1) / this.steps.length) * 100;
  }

  get canGoBack(): boolean {
    return this.currentStepIndex > 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.steps.length - 1;
  }

  get canGoNext(): boolean {
__WIZARD_CAN_GO_NEXT__
  }

  isCurrentStep(step: WizardStep): boolean {
    return step.id === this.currentStep.id;
  }

  isCompletedStep(step: WizardStep): boolean {
    return this.steps.indexOf(step) < this.currentStepIndex;
  }

  nextStep(): void {
    if (!this.isLastStep) {
      this.currentStepIndex += 1;
    }
  }

  previousStep(): void {
    if (this.canGoBack) {
      this.currentStepIndex -= 1;
    }
  }

  submit(): void {
    if (this.__WIZARD_ENTITY_VARIABLE__.canSubmit) {
      this.__WIZARD_COMPLETED_COUNT_PROPERTY__ += 1;
    }
  }
}
`);

const WIZARD_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
import { IValidationRules } from '@aurelia/validation';
import { IValidationController, type ValidationResultTarget } from '@aurelia/validation-html';
import { __STATE_CLASS__, __WIZARD_ENTITY_CLASS__ } from '__STATE_MODULE__';
import template from '__WIZARD_TEMPLATE_MODULE__';

@customElement({
  name: '__WIZARD_ELEMENT_NAME__',
  template,
})
export class __WIZARD_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
__WIZARD_VALIDATION_FIELDS__

__WIZARD_VALIDATION_CONSTRUCTOR__

  async next(): Promise<void> {
    const result = await this.validationController.validate();
    if (result.valid && this.state.canGoNext) {
      this.state.nextStep();
    }
  }

  async submit(): Promise<void> {
    const result = await this.validationController.validate();
    if (result.valid) {
      this.state.submit();
    }
  }
}
`);

const WIZARD_TEMPLATE_SOURCE = sourceText(`<form
  class.bind="state.__WIZARD_ENTITY_VARIABLE__.canSubmit ? 'wizard-ready' : 'wizard-pending'"
  submit.trigger="submit()">
  <div class="wizard">
    <div class="wizard-progress" aria-label="__WIZARD_ENTITY_TITLE__ progress">
      <div class="wizard-progress-bar" style="width: \${state.progressPercent}%"></div>
    </div>

    <ol class="wizard-steps">
      <li
        repeat.for="step of state.steps"
        class="wizard-step"
        active.class="state.isCurrentStep(step)"
        complete.class="state.isCompletedStep(step)">
        \${step.title}
      </li>
    </ol>

__WIZARD_STEP_SECTIONS__

    <nav>
      <button type="button" click.trigger="state.previousStep()" disabled.bind="!state.canGoBack">Back</button>
      <button type="button" if.bind="!state.isLastStep" click.trigger="next()" disabled.bind="!state.canGoNext">Next</button>
      <button type="submit" if.bind="state.isLastStep" disabled.bind="!state.__WIZARD_ENTITY_VARIABLE__.canSubmit">Submit</button>
    </nav>
  </div>
</form>
`);
