import {
  indentSourceLines,
  sourceText,
} from './source-template.js';
import {
  recipeSourcePattern,
  sourcePatternAdaptationGroup,
  sourcePatternParameter,
  type AuthoringSourcePattern,
  type AuthoringSourcePatternAdaptationGroup,
  type AuthoringSourceCodeEconomyPolicy,
  type AuthoringSourceDataPolicy,
  type AuthoringSourceDomainModelPolicy,
  type AuthoringSourcePatternModule,
  type AuthoringSourcePatternParameter,
  type AuthoringSourcePatternParameterApplicationPolicy,
  type AuthoringSourcePatternRole,
  type AuthoringSourceStylePolicy,
} from './source-plan.js';
import { SourcePatternModules } from './source-pattern-modules.js';
import {
  kebabSourceName,
  lowerCamelSourceName,
  lowerTitleSourceName,
  pascalSourceName,
  pluralizeLastSourceNameWord,
  sourceNameWords,
  titleSourceName,
} from './source-name.js';

export interface StandardRequestFormDomainNames {
  readonly entityClassName: string;
  readonly entityVariableName: string;
  readonly entityTitle: string;
  readonly entityLabelLower: string;
  readonly selectionIdName: string;
  readonly selectionIdAttributeName: string;
  readonly selectionIdsPropertyName: string;
  readonly selectedSelectionIdPropertyName: string;
  readonly collectionPropertyName: string;
  readonly readEntityMethodName: string;
  readonly submitEntityMethodName: string;
  readonly loadEntitiesMethodName: string;
  readonly replaceEntitiesMethodName: string;
  readonly createEntityFunctionName: string;
  readonly serviceClassName: string;
  readonly servicePropertyName: string;
  readonly loadingPropertyName: string;
  readonly sampleIdPrefix: string;
}

export type StandardRequestFormBindingMode =
  | 'selected-existing-object'
  | 'single-draft-object';

export interface StandardRequestFormSourcePatternPolicy {
  readonly role: AuthoringSourcePatternRole;
  readonly domainModelPolicy: AuthoringSourceDomainModelPolicy;
  readonly stylePolicy: AuthoringSourceStylePolicy;
  readonly dataPolicy: AuthoringSourceDataPolicy;
  readonly codeEconomyPolicy: AuthoringSourceCodeEconomyPolicy;
}

export function defaultStandardRequestFormDomainNames(): StandardRequestFormDomainNames {
  return {
    entityClassName: 'ServiceRequest',
    entityVariableName: 'request',
    entityTitle: 'Service Request',
    entityLabelLower: 'request',
    selectionIdName: 'requestId',
    selectionIdAttributeName: 'request-id',
    selectionIdsPropertyName: 'requestIds',
    selectedSelectionIdPropertyName: 'selectedRequestId',
    collectionPropertyName: 'requests',
    readEntityMethodName: 'readRequest',
    submitEntityMethodName: 'submitRequest',
    loadEntitiesMethodName: 'loadRequests',
    replaceEntitiesMethodName: 'replaceRequests',
    createEntityFunctionName: 'createRequest',
    serviceClassName: 'RequestService',
    servicePropertyName: 'requestService',
    loadingPropertyName: 'isLoadingRequests',
    sampleIdPrefix: 'request',
  };
}

export function standardRequestFormDomainNamesFromParameters(
  entityName?: string | null,
  selectionIdName?: string | null,
): StandardRequestFormDomainNames {
  if (entityName == null && selectionIdName == null) {
    return defaultStandardRequestFormDomainNames();
  }
  const entityWords = sourceNameWords(entityName ?? 'Service Request');
  const entityClassName = pascalSourceName(entityWords);
  const entityVariableName = lowerCamelSourceName(entityWords);
  const selectionIdWords = sourceNameWords(selectionIdName ?? `${entityVariableName}Id`);
  const selectionId = lowerCamelSourceName(selectionIdWords);
  const entityPluralWords = pluralizeLastSourceNameWord(entityWords);
  return {
    entityClassName,
    entityVariableName,
    entityTitle: titleSourceName(entityWords),
    entityLabelLower: lowerTitleSourceName(entityWords),
    selectionIdName: selectionId,
    selectionIdAttributeName: kebabSourceName(selectionIdWords),
    selectionIdsPropertyName: `${entityVariableName}Ids`,
    selectedSelectionIdPropertyName: `selected${pascalSourceName(selectionIdWords)}`,
    collectionPropertyName: lowerCamelSourceName(entityPluralWords),
    readEntityMethodName: `read${entityClassName}`,
    submitEntityMethodName: `submit${entityClassName}`,
    loadEntitiesMethodName: `load${pascalSourceName(entityPluralWords)}`,
    replaceEntitiesMethodName: `replace${pascalSourceName(entityPluralWords)}`,
    createEntityFunctionName: `create${entityClassName}`,
    serviceClassName: `${entityClassName}Service`,
    servicePropertyName: `${entityVariableName}Service`,
    loadingPropertyName: `isLoading${pascalSourceName(entityPluralWords)}`,
    sampleIdPrefix: kebabSourceName(entityWords),
  };
}

export function standardRequestFormDomainTemplateTokens(
  domain: StandardRequestFormDomainNames,
): Record<string, string> {
  return {
    REQUEST_COLLECTION_PROPERTY: domain.collectionPropertyName,
    REQUEST_CREATE_FUNCTION: domain.createEntityFunctionName,
    REQUEST_ENTITY_CLASS: domain.entityClassName,
    REQUEST_ENTITY_LABEL_LOWER: domain.entityLabelLower,
    REQUEST_ENTITY_TITLE: domain.entityTitle,
    REQUEST_IDS_PROPERTY: domain.selectionIdsPropertyName,
    REQUEST_ID_ATTRIBUTE: domain.selectionIdAttributeName,
    REQUEST_READ_METHOD: domain.readEntityMethodName,
    REQUEST_REPLACE_METHOD: domain.replaceEntitiesMethodName,
    REQUEST_SAMPLE_ID_PREFIX: domain.sampleIdPrefix,
    REQUEST_SELECTED_ID_PROPERTY: domain.selectedSelectionIdPropertyName,
    REQUEST_SELECTION_ID: domain.selectionIdName,
    REQUEST_SUBMIT_METHOD: domain.submitEntityMethodName,
    REQUEST_VARIABLE: domain.entityVariableName,
    REQUEST_VARIABLE_PARAMETER: `_${domain.entityVariableName}`,
    REQUEST_LOAD_METHOD: domain.loadEntitiesMethodName,
    REQUEST_SERVICE_CLASS: domain.serviceClassName,
    REQUEST_SERVICE_PROPERTY: domain.servicePropertyName,
    REQUEST_LOADING_PROPERTY: domain.loadingPropertyName,
  };
}

export function standardRequestFormDomainTemplateTokensFor(
  domain: StandardRequestFormDomainNames,
  keys: readonly string[],
): Record<string, string> {
  const tokens = standardRequestFormDomainTemplateTokens(domain);
  const selected: Record<string, string> = {};
  for (const key of keys) {
    selected[key] = tokens[key] ?? '';
  }
  return selected;
}

export function standardRequestFormSourcePattern(
  key: string,
  title: string,
  summary: string,
  adaptationNotes: readonly string[] = [],
  parameters: readonly AuthoringSourcePatternParameter[] = [],
  modules: readonly AuthoringSourcePatternModule[] = [],
  adaptationGroups: readonly AuthoringSourcePatternAdaptationGroup[] = [],
  domain: StandardRequestFormDomainNames = defaultStandardRequestFormDomainNames(),
  requestFieldsDefaultValue = 'customerName, email, urgent, contactPreference, primaryTopic, assignee, topics, notes',
  requestOptionsDefaultValue: string | undefined = 'support topics and support agents',
  requestOptionsApplicationPolicy: AuthoringSourcePatternParameterApplicationPolicy = 'advisory-only',
  formValueChannelModules: readonly AuthoringSourcePatternModule[] = defaultStandardRequestFormValueChannelModules(),
  requestSampleDataDefaultValue: string | undefined = undefined,
  includeSelectionIdentity = true,
  policy: StandardRequestFormSourcePatternPolicy = referenceRequestFormSourcePatternPolicy(),
): AuthoringSourcePattern {
  const includePresentationParameter = policy.stylePolicy === 'reference-presentation';
  const effectiveRequestSampleDataDefaultValue = requestSampleDataDefaultValue
    ?? standardRequestFormSampleDataSummary(domain, includeSelectionIdentity);
  const includeRequestOptionsParameter = requestOptionsDefaultValue != null
    && requestOptionsDefaultValue !== 'no generated option domains';
  const replaceableDefaultNames = [
    domain.entityClassName,
    ...(includeSelectionIdentity ? [domain.selectionIdName] : []),
    ...(includeRequestOptionsParameter ? ['option domains'] : []),
    'sample records',
    'field labels',
  ];
  const requestDomainGroupParts = [
    'Editable entity',
    ...(includeSelectionIdentity ? ['scalar selection identity'] : []),
    'field schema',
    ...(includeRequestOptionsParameter ? ['option domains'] : []),
    'sample records',
    ...(includePresentationParameter ? ['form presentation'] : []),
  ];
  return recipeSourcePattern(
    key,
    title,
    summary,
    policy.domainModelPolicy,
    policy.stylePolicy,
    [
      `Treat ${humanReadableList(replaceableDefaultNames)} as replaceable defaults for the caller-specific form domain.`,
      includeSelectionIdentity
        ? `Keep the DI-owned state, template-local ${domain.entityVariableName} lookup, native value/select/checked channels, and direct ${domain.entityVariableName}.* bindings when adapting.`
        : `Keep the DI-owned draft object, native value/select/checked channels, and direct ${domain.entityVariableName}.* bindings when adapting.`,
      ...adaptationNotes,
    ],
    [
      sourcePatternParameter(
        'request-entity',
        'domain-entity',
        'Editable request entity',
        domain.entityTitle,
        'Rename the editable aggregate identity while preserving ordinary class instances, direct property bindings, and source-backed derived getters; field schema still moves with the request-domain-model group.',
        'source-text-input',
        'domain-title',
      ),
      ...(includeSelectionIdentity ? [sourcePatternParameter(
        'request-selection-id',
        'selection-identity',
        'Request identity',
        domain.selectionIdName,
        'Adapt the scalar identity that selects the current domain object; route-backed variants should align this slot with route parameters.',
        'source-text-input',
        'source-member-name',
      )] : []),
      sourcePatternParameter(
        'request-fields',
        'field-schema',
        'Request field schema',
        requestFieldsDefaultValue,
        'Replace editable fields, validation targets, labels, and derived submit readiness with the caller form schema while preserving native value/select/checked channel semantics.',
        'source-text-input',
        'field-schema-list',
      ),
      ...(includeRequestOptionsParameter ? [sourcePatternParameter(
        'request-options',
        'domain-collection',
        'Option domains',
        requestOptionsDefaultValue,
        'Replace option values and labels used by select/radio/checked examples with caller option sets while preserving value-channel semantics.',
        requestOptionsApplicationPolicy,
        requestOptionsApplicationPolicy === 'source-text-input' ? 'option-schema-list' : 'domain-collection-summary',
      )] : []),
      sourcePatternParameter(
        'request-sample-data',
        'sample-data',
        policy.dataPolicy === 'starter-sample-data' ? 'Starter request data' : 'Reference request records',
        effectiveRequestSampleDataDefaultValue,
        'Replace sample records and labels before emitting caller-specific app code.',
        'advisory-only',
        'sample-data-summary',
      ),
      ...(includePresentationParameter ? [sourcePatternParameter(
        'form-presentation',
        'presentation',
        'Reference form presentation',
        'field-stack/form-ready CSS',
        'Treat generated CSS and copy as fixture presentation unless the caller intentionally wants the default reference look.',
        'advisory-only',
        'presentation-summary',
      )] : []),
      ...parameters,
    ],
    [
      SourcePatternModules.AppShell,
      SourcePatternModules.DiStateBoundary,
      SourcePatternModules.DomainClassModel,
      ...(includeSelectionIdentity ? [SourcePatternModules.TemplateLocalDomainLookup] : []),
      ...formValueChannelModules,
      ...modules,
    ],
    [
      sourcePatternAdaptationGroup(
        'request-domain-model',
        'Request domain model',
        `${humanReadableList(requestDomainGroupParts)} move together; adapting only the class name would leave value-channel and validation examples tied to the reference request domain.`,
        [
          'request-entity',
          ...(includeSelectionIdentity ? ['request-selection-id'] : []),
          'request-fields',
          ...(includeRequestOptionsParameter ? ['request-options'] : []),
          'request-sample-data',
          ...(includePresentationParameter ? ['form-presentation'] : []),
        ],
      ),
      ...adaptationGroups,
    ],
    policy.role,
    policy.dataPolicy,
    policy.codeEconomyPolicy,
  );
}

function humanReadableList(items: readonly string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function referenceRequestFormSourcePatternPolicy(): StandardRequestFormSourcePatternPolicy {
  return {
    role: 'scenario-reference',
    domainModelPolicy: 'reference-instantiation',
    stylePolicy: 'reference-presentation',
    dataPolicy: 'synthetic-reference-data',
    codeEconomyPolicy: 'reference-complete',
  };
}

export function starterRequestFormSourcePatternPolicy(): StandardRequestFormSourcePatternPolicy {
  return {
    role: 'recommendable-recipe',
    domainModelPolicy: 'caller-applied',
    stylePolicy: 'structural-baseline',
    dataPolicy: 'starter-sample-data',
    codeEconomyPolicy: 'production-terse',
  };
}

function defaultStandardRequestFormValueChannelModules(): readonly AuthoringSourcePatternModule[] {
  return [
    SourcePatternModules.NativeFormValueChannels,
    SourcePatternModules.NativeTextValueChannel,
    SourcePatternModules.CheckedBooleanChannel,
    SourcePatternModules.CheckedCollectionChannel,
    SourcePatternModules.SelectOptionModelChannel,
    SourcePatternModules.SelectObjectMatcherChannel,
    SourcePatternModules.CaptureAttributeFieldShell,
    SourcePatternModules.TemplateControllerFlow,
    SourcePatternModules.ClassStyleChannels,
  ];
}

function standardRequestFormSampleDataSummary(
  domain: StandardRequestFormDomainNames,
  includeSelectionIdentity: boolean,
): string {
  return includeSelectionIdentity
    ? `two starter ${domain.entityLabelLower} records`
    : `one starter ${domain.entityLabelLower} draft`;
}

export interface StandardRequestFormFieldTemplateInput {
  readonly fieldShellElementName: string;
  readonly inputId: string;
  readonly label: string;
  readonly type: string;
  readonly valueBinding: string;
  readonly errorCollectionName: string | null;
}

export function standardRequestFormFieldTemplate(input: StandardRequestFormFieldTemplateInput): string {
  const fieldShell = `    <${input.fieldShellElementName}
      input-id="${input.inputId}"
      label="${input.label}"
      type="${input.type}"
      ${input.valueBinding}>
    </${input.fieldShellElementName}>`;
  if (input.errorCollectionName == null) {
    return fieldShell;
  }
  return `    <div class.bind="${input.errorCollectionName}.length > 0 ? 'field-stack field-invalid' : 'field-stack'" validation-errors.from-view="${input.errorCollectionName}">
${indentSourceLines(fieldShell, '  ')}
      <p class="error" repeat.for="error of ${input.errorCollectionName}">\${error.result.message}</p>
    </div>`;
}

export const STANDARD_REQUEST_STATE_SOURCE = sourceText(`export type ContactPreference = 'email' | 'phone';
export type RequestTopic = 'hardware' | 'billing' | 'support';

export interface SupportAgent {
  readonly id: string;
  readonly name: string;
}

export class __REQUEST_ENTITY_CLASS__ {
  constructor(
    readonly id: string,
    public customerName: string,
    public email: string,
    public urgent: boolean,
    public contactPreference: ContactPreference,
    public primaryTopic: RequestTopic | null,
    public assignee: SupportAgent | null,
    public topics: RequestTopic[],
    public notes: string,
    public submitCount: number,
  ) {}

  get canSubmit(): boolean {
    return this.customerName !== '' && this.email !== '';
  }
}

export class __STATE_CLASS__ {
  readonly __REQUEST_IDS_PROPERTY__ = ['__REQUEST_SAMPLE_ID_PREFIX__-1', '__REQUEST_SAMPLE_ID_PREFIX__-2'];
  __REQUEST_SELECTED_ID_PROPERTY__ = '__REQUEST_SAMPLE_ID_PREFIX__-1';

  readonly emailPreference: ContactPreference = 'email';
  readonly phonePreference: ContactPreference = 'phone';
  readonly hardwareTopic: RequestTopic = 'hardware';
  readonly billingTopic: RequestTopic = 'billing';
  readonly supportTopic: RequestTopic = 'support';
  readonly supportAgents: readonly SupportAgent[] = [
    { id: 'agent-ada', name: 'Ada' },
    { id: 'agent-grace', name: 'Grace' },
  ];

  private readonly __REQUEST_COLLECTION_PROPERTY__ = new Map<string, __REQUEST_ENTITY_CLASS__>([
    ['__REQUEST_SAMPLE_ID_PREFIX__-1', __REQUEST_CREATE_FUNCTION__('__REQUEST_SAMPLE_ID_PREFIX__-1', 'Ada Lovelace')],
    ['__REQUEST_SAMPLE_ID_PREFIX__-2', __REQUEST_CREATE_FUNCTION__('__REQUEST_SAMPLE_ID_PREFIX__-2', 'Grace Hopper')],
  ]);

  get submittedCount(): number {
    let count = 0;
    for (const __REQUEST_VARIABLE__ of this.__REQUEST_COLLECTION_PROPERTY__.values()) {
      count += __REQUEST_VARIABLE__.submitCount;
    }
    return count;
  }

  __REQUEST_READ_METHOD__(__REQUEST_SELECTION_ID__: string): __REQUEST_ENTITY_CLASS__ | null {
    return this.__REQUEST_COLLECTION_PROPERTY__.get(__REQUEST_SELECTION_ID__) ?? null;
  }

  __REQUEST_SUBMIT_METHOD__(__REQUEST_SELECTION_ID__: string): void {
    const __REQUEST_VARIABLE__ = this.__REQUEST_READ_METHOD__(__REQUEST_SELECTION_ID__);
    if (__REQUEST_VARIABLE__ != null) {
      __REQUEST_VARIABLE__.submitCount += 1;
    }
  }

  sameSupportAgent(left: SupportAgent | null, right: SupportAgent | null): boolean {
    return left?.id === right?.id;
  }
}

function __REQUEST_CREATE_FUNCTION__(id: string, customerName: string): __REQUEST_ENTITY_CLASS__ {
  return new __REQUEST_ENTITY_CLASS__(
    id,
    customerName,
    \`\${customerName.toLowerCase().replace(' ', '.')}@example.test\`,
    false,
    'email',
    null,
    null,
    ['support'],
    '',
    0,
  );
}
`);

export const STANDARD_REQUEST_SERVICE_SOURCE = sourceText(`import { __REQUEST_ENTITY_CLASS__ } from '__STATE_MODULE__';

export class __SERVICE_CLASS__ {
  async __REQUEST_LOAD_METHOD__(): Promise<readonly __REQUEST_ENTITY_CLASS__[]> {
    return [
      __REQUEST_CREATE_FUNCTION__('__REQUEST_SAMPLE_ID_PREFIX__-1', 'Ada Lovelace'),
      __REQUEST_CREATE_FUNCTION__('__REQUEST_SAMPLE_ID_PREFIX__-2', 'Grace Hopper'),
    ];
  }

  async __REQUEST_SUBMIT_METHOD__(__REQUEST_VARIABLE_PARAMETER__: __REQUEST_ENTITY_CLASS__): Promise<void> {
    return;
  }
}

function __REQUEST_CREATE_FUNCTION__(id: string, customerName: string): __REQUEST_ENTITY_CLASS__ {
  return new __REQUEST_ENTITY_CLASS__(
    id,
    customerName,
    \`\${customerName.toLowerCase().replace(' ', '.')}@example.test\`,
    false,
    'email',
    null,
    null,
    ['support'],
    '',
    0,
  );
}
`);

export const STANDARD_REQUEST_FORM_COMPONENT_SOURCE = sourceText(`import { bindable, customElement, resolve } from 'aurelia';
__VALIDATION_FORM_IMPORT__\
import { __STATE_IMPORTS__ } from '__STATE_MODULE__';
import { __FIELD_SHELL_CLASS__ } from '__FIELD_SHELL_MODULE__';
import template from '__FORM_TEMPLATE_MODULE__';

@customElement({
  name: '__FORM_ELEMENT_NAME__',
  template,
  dependencies: [__FIELD_SHELL_CLASS__],
})
export class __FORM_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
__VALIDATION_FIELDS__
  @bindable __REQUEST_SELECTION_ID__ = '';__VALIDATION_CONSTRUCTOR____SUBMIT_METHOD__
}
`);

export const STANDARD_REQUEST_DRAFT_FORM_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
__VALIDATION_FORM_IMPORT__\
import { __STATE_IMPORTS__ } from '__STATE_MODULE__';
import { __FIELD_SHELL_CLASS__ } from '__FIELD_SHELL_MODULE__';
import template from '__FORM_TEMPLATE_MODULE__';

@customElement({
  name: '__FORM_ELEMENT_NAME__',
  template,
  dependencies: [__FIELD_SHELL_CLASS__],
})
export class __FORM_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
__VALIDATION_FIELDS____VALIDATION_CONSTRUCTOR____SUBMIT_METHOD__
}
`);

export const STANDARD_REQUEST_INLINE_DRAFT_FORM_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
__VALIDATION_FORM_IMPORT__\
import { __STATE_IMPORTS__ } from '__STATE_MODULE__';
import template from '__FORM_TEMPLATE_MODULE__';

@customElement({
  name: '__FORM_ELEMENT_NAME__',
  template,
})
export class __FORM_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
__VALIDATION_FIELDS____VALIDATION_CONSTRUCTOR____SUBMIT_METHOD__
}
`);

export const STANDARD_REQUEST_FORM_TEMPLATE_SOURCE = sourceText(`<let __REQUEST_VARIABLE__.bind="state.__REQUEST_READ_METHOD__(__REQUEST_SELECTION_ID__)"></let>
<template if.bind="__REQUEST_VARIABLE__ != null">
  <form class.bind="__REQUEST_VARIABLE__.canSubmit ? 'form-ready' : 'form-pending'" submit.trigger="__SUBMIT_TRIGGER__">__FORM_SUMMARY__
__CUSTOMER_NAME_FIELD__

__EMAIL_FIELD__

    <label>
      <input type="checkbox" checked.bind="__REQUEST_VARIABLE__.urgent">
      Urgent
    </label>

    <fieldset>
      __CONTACT_PREFERENCE_LEGEND__
      <label>
        <input type="radio" model.bind="state.emailPreference" checked.bind="__REQUEST_VARIABLE__.contactPreference">
        Email
      </label>
      <label>
        <input type="radio" model.bind="state.phonePreference" checked.bind="__REQUEST_VARIABLE__.contactPreference">
        Phone
      </label>
    </fieldset>

    <label for="primary-topic">Primary topic</label>
__PRIMARY_TOPIC_LEAD__    <select id="primary-topic" value.bind="__REQUEST_VARIABLE__.primaryTopic">
      <option model.bind="null">Choose...</option>
      <option model.bind="state.hardwareTopic">Hardware</option>
      <option model.bind="state.billingTopic">Billing</option>
      <option model.bind="state.supportTopic">Support</option>
    </select>

    <label for="assignee">Assignee</label>
    <select id="assignee" value.bind="__REQUEST_VARIABLE__.assignee" matcher.bind="state.sameSupportAgent">
      <option model.bind="null">Unassigned</option>
      <option repeat.for="agent of state.supportAgents" model.bind="agent">\${agent.name}</option>
    </select>

    <label for="topics">Additional topics</label>
    <select id="topics" multiple value.bind="__REQUEST_VARIABLE__.topics">
      <option model.bind="state.hardwareTopic">Hardware</option>
      <option model.bind="state.billingTopic">Billing</option>
      <option model.bind="state.supportTopic">Support</option>
    </select>

    <label for="notes">Notes</label>
    <textarea id="notes" value.bind="__REQUEST_VARIABLE__.notes"></textarea>

    __SUBMIT_LABEL__
  </form>
</template>
<p else>Loading __REQUEST_ENTITY_LABEL_LOWER__...</p>
`);
