import {
  AuthoringSourceEditPlan,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';

export interface ServiceBackedFormSourcePlanModel {
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
  readonly servicePath: string;
  readonly serviceClassName: string;
  readonly formComponentPath: string;
  readonly formTemplatePath: string;
  readonly formComponentClassName: string;
  readonly formElementName: string;
}

export function serviceBackedFormSourcePlan(model: ServiceBackedFormSourcePlanModel): AuthoringSourceEditPlan {
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    [
      recipeSourceFile(
        model.entrypointPath,
        'entrypoint',
        'typescript',
        'create-entrypoint',
        fillSourceTemplate(ENTRYPOINT_SOURCE, {
          ROOT_COMPONENT_CLASS: model.rootComponentClassName,
          ROOT_COMPONENT_MODULE: moduleSpecifier(model.entrypointPath, model.rootComponentPath, false),
        }),
      ),
      recipeSourceFile(
        model.rootComponentPath,
        'root-component',
        'typescript',
        'create-root-component',
        fillSourceTemplate(ROOT_COMPONENT_SOURCE, {
          FORM_COMPONENT_CLASS: model.formComponentClassName,
          FORM_COMPONENT_MODULE: moduleSpecifier(model.rootComponentPath, model.formComponentPath, false),
          ROOT_COMPONENT_CLASS: model.rootComponentClassName,
          ROOT_ELEMENT_NAME: model.rootElementName,
          ROOT_STYLE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootStylePath, true),
          ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
          STATE_CLASS: model.stateClassName,
          STATE_MODULE: moduleSpecifier(model.rootComponentPath, model.statePath, false),
        }),
      ),
      recipeSourceFile(
        model.rootTemplatePath,
        'template',
        'html',
        'create-external-template',
        fillSourceTemplate(ROOT_TEMPLATE_SOURCE, {
          FORM_ELEMENT_NAME: model.formElementName,
        }),
      ),
      recipeSourceFile(
        model.rootStylePath,
        'component-style',
        'css',
        'create-style-asset',
        ROOT_STYLE_SOURCE,
      ),
      recipeSourceFile(
        model.statePath,
        'state-model',
        'typescript',
        'create-state-model',
        fillSourceTemplate(STATE_SOURCE, {
          STATE_CLASS: model.stateClassName,
        }),
      ),
      recipeSourceFile(
        model.servicePath,
        'service',
        'typescript',
        'create-service',
        fillSourceTemplate(SERVICE_SOURCE, {
          SERVICE_CLASS: model.serviceClassName,
          STATE_CLASS: model.stateClassName,
          STATE_MODULE: moduleSpecifier(model.servicePath, model.statePath, false),
        }),
      ),
      recipeSourceFile(
        model.formComponentPath,
        'component',
        'typescript',
        'create-form-component',
        fillSourceTemplate(FORM_COMPONENT_SOURCE, {
          FORM_COMPONENT_CLASS: model.formComponentClassName,
          FORM_ELEMENT_NAME: model.formElementName,
          FORM_TEMPLATE_MODULE: moduleSpecifier(model.formComponentPath, model.formTemplatePath, true),
          SERVICE_CLASS: model.serviceClassName,
          SERVICE_MODULE: moduleSpecifier(model.formComponentPath, model.servicePath, false),
          STATE_MODULE: moduleSpecifier(model.formComponentPath, model.statePath, false),
        }),
      ),
      recipeSourceFile(
        model.formTemplatePath,
        'template',
        'html',
        'create-external-template',
        FORM_TEMPLATE_SOURCE,
      ),
    ],
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: ['@aurelia/kernel'],
    }),
  );
}

const ENTRYPOINT_SOURCE = sourceText(`import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { __ROOT_COMPONENT_CLASS__ } from '__ROOT_COMPONENT_MODULE__';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: __ROOT_COMPONENT_CLASS__,
  })
  .start();
`);

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { __FORM_COMPONENT_CLASS__ } from '__FORM_COMPONENT_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';
import '__ROOT_STYLE_MODULE__';

@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__FORM_COMPONENT_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {
  private readonly state = resolve(__STATE_CLASS__);

  get requestIds(): readonly string[] {
    return this.state.requestIds;
  }

  get selectedRequestId(): string {
    return this.state.selectedRequestId;
  }

  set selectedRequestId(value: string) {
    this.state.selectedRequestId = value;
  }

  get submittedCount(): number {
    return this.state.submittedCount;
  }
}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main>
  <h1>Service request</h1>
  <label for="request-selector">Request</label>
  <select id="request-selector" value.bind="selectedRequestId">
    <option repeat.for="requestId of requestIds" model.bind="requestId">\${requestId}</option>
  </select>

  <__FORM_ELEMENT_NAME__ request-id.bind="selectedRequestId"></__FORM_ELEMENT_NAME__>

  <p>\${submittedCount} submitted request(s)</p>
</main>
`);

const ROOT_STYLE_SOURCE = sourceText(`main {
  display: grid;
  gap: 1rem;
  max-width: 46rem;
  margin: 0 auto;
  padding: 2rem;
}

.form-ready {
  border-color: #2f7d32;
}

.form-pending {
  border-color: #9e3a2d;
}
`);

const STATE_SOURCE = sourceText(`export type ContactPreference = 'email' | 'phone';
export type RequestTopic = 'hardware' | 'billing' | 'support';

export interface RequestTopicSummary {
  id: RequestTopic;
  label: string;
}

export interface ServiceRequest {
  id: string;
  customerName: string;
  email: string;
  urgent: boolean;
  contactPreference: ContactPreference;
  topics: RequestTopic[];
  notes: string;
  submitCount: number;
}

export class __STATE_CLASS__ {
  readonly requestIds = ['request-1', 'request-2'];
  selectedRequestId = 'request-1';

  readonly emailPreference: ContactPreference = 'email';
  readonly phonePreference: ContactPreference = 'phone';
  readonly hardwareTopic: RequestTopic = 'hardware';
  readonly billingTopic: RequestTopic = 'billing';
  readonly supportTopic: RequestTopic = 'support';
  readonly supportTopicSummary: RequestTopicSummary = { id: 'support', label: 'Support' };

  private readonly requests = new Map<string, ServiceRequest>([
    ['request-1', createRequest('request-1', 'Ada Lovelace')],
    ['request-2', createRequest('request-2', 'Grace Hopper')],
  ]);

  get submittedCount(): number {
    let count = 0;
    for (const request of this.requests.values()) {
      count += request.submitCount;
    }
    return count;
  }

  readRequest(requestId: string): ServiceRequest | null {
    return this.requests.get(requestId) ?? null;
  }

  markSubmitted(requestId: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.submitCount += 1;
    }
  }
}

function createRequest(id: string, customerName: string): ServiceRequest {
  return {
    id,
    customerName,
    email: \`\${customerName.toLowerCase().replace(' ', '.')}@example.test\`,
    urgent: false,
    contactPreference: 'email',
    topics: ['support'],
    notes: '',
    submitCount: 0,
  };
}
`);

const SERVICE_SOURCE = sourceText(`import { resolve } from '@aurelia/kernel';
import { __STATE_CLASS__, type ContactPreference, type RequestTopic, type RequestTopicSummary, type ServiceRequest } from '__STATE_MODULE__';

export class __SERVICE_CLASS__ {
  private readonly state = resolve(__STATE_CLASS__);

  get emailPreference(): ContactPreference {
    return this.state.emailPreference;
  }

  get phonePreference(): ContactPreference {
    return this.state.phonePreference;
  }

  get hardwareTopic(): RequestTopic {
    return this.state.hardwareTopic;
  }

  get billingTopic(): RequestTopic {
    return this.state.billingTopic;
  }

  get supportTopic(): RequestTopic {
    return this.state.supportTopic;
  }

  get supportTopicSummary(): RequestTopicSummary {
    return this.state.supportTopicSummary;
  }

  readRequest(requestId: string): ServiceRequest | null {
    return this.state.readRequest(requestId);
  }

  updateCustomerName(requestId: string, value: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.customerName = value;
    }
  }

  updateEmail(requestId: string, value: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.email = value;
    }
  }

  updateUrgency(requestId: string, value: boolean): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.urgent = value;
    }
  }

  updateContactPreference(requestId: string, value: ContactPreference): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.contactPreference = value;
    }
  }

  updateNotes(requestId: string, value: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.notes = value;
    }
  }

  submitRequest(requestId: string): void {
    this.state.markSubmitted(requestId);
  }
}
`);

const FORM_COMPONENT_SOURCE = sourceText(`import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { __SERVICE_CLASS__ } from '__SERVICE_MODULE__';
import { type ContactPreference, type RequestTopic, type RequestTopicSummary } from '__STATE_MODULE__';
import template from '__FORM_TEMPLATE_MODULE__';

@customElement({
  name: '__FORM_ELEMENT_NAME__',
  template,
})
export class __FORM_COMPONENT_CLASS__ {
  private readonly requests = resolve(__SERVICE_CLASS__);

  @bindable requestId = '';

  get customerName(): string {
    return this.request?.customerName ?? '';
  }

  set customerName(value: string) {
    this.requests.updateCustomerName(this.requestId, value);
  }

  get email(): string {
    return this.request?.email ?? '';
  }

  set email(value: string) {
    this.requests.updateEmail(this.requestId, value);
  }

  get urgent(): boolean {
    return this.request?.urgent ?? false;
  }

  set urgent(value: boolean) {
    this.requests.updateUrgency(this.requestId, value);
  }

  get contactPreference(): ContactPreference {
    return this.request?.contactPreference ?? this.emailPreference;
  }

  set contactPreference(value: ContactPreference) {
    this.requests.updateContactPreference(this.requestId, value);
  }

  get topics(): RequestTopic[] {
    return this.request?.topics ?? [];
  }

  get notes(): string {
    return this.request?.notes ?? '';
  }

  set notes(value: string) {
    this.requests.updateNotes(this.requestId, value);
  }

  get emailPreference(): ContactPreference {
    return this.requests.emailPreference;
  }

  get phonePreference(): ContactPreference {
    return this.requests.phonePreference;
  }

  get hardwareTopic(): RequestTopic {
    return this.requests.hardwareTopic;
  }

  get billingTopic(): RequestTopic {
    return this.requests.billingTopic;
  }

  get supportTopic(): RequestTopic {
    return this.requests.supportTopic;
  }

  get supportTopicSummary(): RequestTopicSummary {
    return this.requests.supportTopicSummary;
  }

  get canSubmit(): boolean {
    return this.customerName !== '' && this.email !== '';
  }

  submit(): void {
    this.requests.submitRequest(this.requestId);
  }

  private get request() {
    return this.requests.readRequest(this.requestId);
  }
}
`);

const FORM_TEMPLATE_SOURCE = sourceText(`<form class.bind="canSubmit ? 'form-ready' : 'form-pending'" submit.trigger="submit()">
  <label for="customer-name">Name</label>
  <input id="customer-name" value.bind="customerName">

  <label for="email">Email</label>
  <input id="email" type="email" value.bind="email">

  <label>
    <input type="checkbox" checked.bind="urgent">
    Urgent
  </label>

  <fieldset>
    <legend>Contact preference</legend>
    <label>
      <input type="radio" model.bind="emailPreference" checked.bind="contactPreference">
      Email
    </label>
    <label>
      <input type="radio" model.bind="phonePreference" checked.bind="contactPreference">
      Phone
    </label>
  </fieldset>

  <label for="topics">Topics</label>
  <p>Default topic: \${supportTopicSummary.label}</p>
  <select id="topics" multiple value.bind="topics">
    <option model.bind="hardwareTopic">Hardware</option>
    <option model.bind="billingTopic">Billing</option>
    <option model.bind="supportTopic">Support</option>
  </select>

  <label for="notes">Notes</label>
  <textarea id="notes" value.bind="notes"></textarea>

  <button type="submit" disabled.bind="!canSubmit">Submit request</button>
</form>
`);
