import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
} from './expected-effect.js';
import {
  checkedDataFlowEffect,
  checkedTargetAccessEffect,
  checkedValueChannelEffect,
  classTokenStyleTasteEffect,
  componentStylesheetCapabilityEffect,
  componentStylesheetEffect,
  componentStylesheetTasteEffect,
  capturedFieldShellInputTypeEffect,
  capturedFieldShellValueDataFlowEffect,
  directStateDomainTemplateBindingTasteEffect,
  formValueChannelTasteEffects,
  nativeValueChannelEffect,
  nativeValueDataFlowEffect,
  nativeValueTargetAccessEffect,
  primitiveValueChannelEffect,
  sourceBackedGetterObservationTasteEffect,
  validationErrorsDataFlowEffect,
  validationErrorsTargetAccessEffect,
  validationErrorsValueChannelEffect,
} from './form-expected-effects.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';

export interface ComponentStyleAssetExpectedEffectsOptions {
  readonly componentSummary?: string;
}

/** Step-level effects for a recipe-authored component stylesheet. */
export function componentStyleAssetExpectedEffects(
  options: ComponentStyleAssetExpectedEffectsOptions = {},
): readonly ExpectedSemanticEffect[] {
  const componentSummary = options.componentSummary ?? 'Root component';
  return [
    componentStylesheetEffect(`${componentSummary} stylesheet should be visible as a style resource.`),
    componentStylesheetCapabilityEffect('Authoring orientation should expose style asset authoring.'),
    componentStylesheetTasteEffect('Authoring orientation should recognize component stylesheet ownership.'),
  ];
}

export interface FormTemplateBindingExpectedEffectsOptions {
  readonly validation?: {
    readonly filters: readonly ExpectedSemanticEffectFilter[];
    readonly bindingBehaviorSummary: string;
    readonly tasteSummary: string;
  } | null;
}

/** Step-level effects shared by recommendable generated form templates. */
export function standardFormTemplateBindingExpectedEffects(
  options: FormTemplateBindingExpectedEffectsOptions = {},
): readonly ExpectedSemanticEffect[] {
  return [
    nativeValueTargetAccessEffect('Form should expose target access for native value bindings.'),
    nativeValueChannelEffect('Form should expose observer-backed value channels for native value bindings.'),
    nativeValueDataFlowEffect('Form should expose TypeChecker-backed data flow for native value bindings.'),
    checkedTargetAccessEffect('Form should expose target access for checked bindings.'),
    checkedValueChannelEffect('Form should expose checked observer value channels.'),
    checkedDataFlowEffect('Form should expose TypeChecker-backed data flow for checked bindings.'),
    primitiveValueChannelEffect('Form should expose primitive model value domains for nullable select options.', 'null'),
    capturedFieldShellInputTypeEffect('Form should materialize captured field-shell input type attributes.'),
    capturedFieldShellValueDataFlowEffect('Form should data-flow field-shell captured value bindings.'),
    ...formValueChannelTasteEffects(
      'Authoring orientation should recognize native form value binding.',
      'Authoring orientation should recognize checked/model binding.',
      'Authoring orientation should recognize select model binding.',
    ),
    classTokenStyleTasteEffect('Authoring orientation should recognize class-token style binding.'),
    ...(options.validation == null
      ? []
      : [
        ExpectedSemanticEffect.discriminatorFact(
          options.validation.bindingBehaviorSummary,
          'binding-behavior-application',
          'template',
          'binding-behavior',
          'present',
          null,
          options.validation.filters,
        ),
        ExpectedSemanticEffect.discriminatorTaste(
          options.validation.tasteSummary,
          'validation-ownership',
          'validation-controller-usage',
          'template-binding',
        ),
        validationErrorsTargetAccessEffect('Validation error presentation should expose target access for validation-errors errors.'),
        validationErrorsValueChannelEffect('Validation error presentation should expose a raw-property channel for validation-errors errors.'),
        validationErrorsDataFlowEffect('Validation error presentation should expose from-view data flow for validation-errors errors.'),
      ]),
  ];
}

export interface StandardFormAppExpectedEffectsOptions {
  readonly summaryPrefix: string;
  readonly componentCount: number;
  readonly componentCountSummary: string;
  readonly externalTemplateCount: number;
  readonly compiledTemplateCount: number;
}

/** Verification-level effects shared by recommendable generated form apps. */
export function standardFormAppExpectedEffects(
  options: StandardFormAppExpectedEffectsOptions,
): readonly ExpectedSemanticEffect[] {
  const prefix = options.summaryPrefix;
  return [
    ExpectedSemanticEffect.fact(`${prefix} reopens as an Aurelia project.`, 'project-shape'),
    ...projectToolingExpectedEffects(prefix),
    ExpectedSemanticEffect.fact(`${prefix} has an app root.`, 'app-root'),
    ExpectedSemanticEffect.atLeast(
      `${prefix} has ${options.componentCountSummary}.`,
      'component',
      'resource',
      options.componentCount,
      'component',
    ),
    ExpectedSemanticEffect.fact(`${prefix} has an app-root component role.`, 'component-role', 'resource', 'app-root', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'app-root'),
    ]),
    ExpectedSemanticEffect.fact(`${prefix} has a component-composition host role.`, 'component-role', 'resource', 'component', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'component-composition-host'),
    ]),
    ExpectedSemanticEffect.signatureFact(`${prefix} has a data-entry component role.`, 'component-role', 'template', 'template-binding', 'present', null, [
      new ExpectedSemanticEffectFilter('roleKind', 'data-entry-surface'),
    ]),
    ExpectedSemanticEffect.atLeast(`${prefix} has external templates.`, 'external-template', 'template', options.externalTemplateCount, 'template'),
    componentStylesheetEffect(`${prefix} has a component stylesheet.`),
    componentStylesheetCapabilityEffect(`${prefix} exposes verifiable style asset authoring.`),
    ExpectedSemanticEffect.atLeast(`${prefix} has compiled template facts.`, 'template-compilation', 'template', options.compiledTemplateCount, 'template'),
    ExpectedSemanticEffect.fact(`${prefix} has runtime controller facts.`, 'runtime-controller', 'template', 'component'),
    nativeValueTargetAccessEffect(`${prefix} has native value binding target access.`),
    nativeValueChannelEffect(`${prefix} has native value binding channels.`),
    nativeValueDataFlowEffect(`${prefix} has native value binding data flows.`),
    checkedTargetAccessEffect(`${prefix} has checked binding target access.`),
    checkedValueChannelEffect(`${prefix} has checked observer value channels.`),
    checkedDataFlowEffect(`${prefix} has checked binding data flows.`),
    primitiveValueChannelEffect(`${prefix} has nullable select primitive value domains.`, 'null'),
    capturedFieldShellInputTypeEffect(`${prefix} materializes captured field-shell input attributes.`),
    capturedFieldShellValueDataFlowEffect(`${prefix} data-flows captured field-shell value bindings.`),
    ExpectedSemanticEffect.absent(`${prefix} has no open semantic seams.`, 'open-seam-closure'),
    ExpectedSemanticEffect.capability(`${prefix} exposes verifiable template composition.`, 'template-composition', 'verifiable'),
    ExpectedSemanticEffect.signatureTaste(`${prefix} reports DI-owned state taste.`, 'state-ownership', 'di-owned-state-class', 'state-model'),
    directStateDomainTemplateBindingTasteEffect(`${prefix} reports direct state/domain template binding taste.`),
    sourceBackedGetterObservationTasteEffect(`${prefix} reports plain getter observation taste.`),
    componentStylesheetTasteEffect(`${prefix} reports component stylesheet taste.`),
    classTokenStyleTasteEffect(`${prefix} reports class-token style binding taste.`),
    ...formValueChannelTasteEffects(
      `${prefix} reports native form value binding taste.`,
      `${prefix} reports checked/model binding taste.`,
      `${prefix} reports select model binding taste.`,
    ),
  ];
}
