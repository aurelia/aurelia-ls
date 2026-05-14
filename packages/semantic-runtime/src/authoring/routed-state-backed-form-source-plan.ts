import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';

export interface RoutedStateBackedFormSourcePlanModel {
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
  readonly routeComponentPath: string;
  readonly routeTemplatePath: string;
  readonly routeComponentClassName: string;
  readonly routeElementName: string;
  readonly routePath: string;
  readonly routeTitle: string;
  readonly formComponentPath: string;
  readonly formTemplatePath: string;
  readonly formComponentClassName: string;
  readonly formElementName: string;
}

export function routedStateBackedFormSourcePlan(
  model: RoutedStateBackedFormSourcePlanModel,
): AuthoringSourceEditPlan {
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    routedStateBackedFormSourceFiles(model),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: ['@aurelia/kernel', '@aurelia/router'],
    }),
  );
}

function routedStateBackedFormSourceFiles(
  model: RoutedStateBackedFormSourcePlanModel,
): readonly AuthoringSourceFileEdit[] {
  return [
    routedFormEntrypointFile(model),
    routedFormRootComponentFile(model),
    routedFormRootTemplateFile(model),
    routedFormRootStyleFile(model),
    routedFormStateFile(model),
    routedFormRouteComponentFile(model),
    routedFormRouteTemplateFile(model),
    routedFormComponentFile(model),
    routedFormTemplateFile(model),
  ];
}

function routedFormEntrypointFile(model: RoutedStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
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

function routedFormRootComponentFile(model: RoutedStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootComponentPath,
    'root-component',
    'typescript',
    'create-root-component',
    fillSourceTemplate(ROOT_COMPONENT_SOURCE, {
      APP_NAME: model.appName,
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_ELEMENT_NAME: model.rootElementName,
      ROOT_STYLE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootStylePath, true),
      ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
      ROUTE_COMPONENT_CLASS: model.routeComponentClassName,
      ROUTE_COMPONENT_MODULE: moduleSpecifier(model.rootComponentPath, model.routeComponentPath, false),
      ROUTE_PATH: model.routePath,
      ROUTE_TITLE: model.routeTitle,
    }),
  );
}

function routedFormRootTemplateFile(model: RoutedStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(ROOT_TEMPLATE_SOURCE, {
      ROUTE_PATH: model.routePath,
      ROUTE_TITLE: model.routeTitle,
    }),
  );
}

function routedFormRootStyleFile(model: RoutedStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.rootStylePath,
    'component-style',
    'css',
    'create-style-asset',
    ROOT_STYLE_SOURCE,
  );
}

function routedFormStateFile(model: RoutedStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'create-state-model',
    fillSourceTemplate(STATE_SOURCE, {
      STATE_CLASS: model.stateClassName,
    }),
  );
}

function routedFormRouteComponentFile(model: RoutedStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.routeComponentPath,
    'component',
    'typescript',
    'create-component',
    fillSourceTemplate(ROUTE_COMPONENT_SOURCE, {
      FORM_COMPONENT_CLASS: model.formComponentClassName,
      FORM_COMPONENT_MODULE: moduleSpecifier(model.routeComponentPath, model.formComponentPath, false),
      ROUTE_COMPONENT_CLASS: model.routeComponentClassName,
      ROUTE_ELEMENT_NAME: model.routeElementName,
      ROUTE_TEMPLATE_MODULE: moduleSpecifier(model.routeComponentPath, model.routeTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.routeComponentPath, model.statePath, false),
    }),
  );
}

function routedFormRouteTemplateFile(model: RoutedStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.routeTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(ROUTE_TEMPLATE_SOURCE, {
      FORM_ELEMENT_NAME: model.formElementName,
    }),
  );
}

function routedFormComponentFile(model: RoutedStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.formComponentPath,
    'component',
    'typescript',
    'create-form-component',
    fillSourceTemplate(FORM_COMPONENT_SOURCE, {
      FORM_COMPONENT_CLASS: model.formComponentClassName,
      FORM_ELEMENT_NAME: model.formElementName,
      FORM_TEMPLATE_MODULE: moduleSpecifier(model.formComponentPath, model.formTemplatePath, true),
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.formComponentPath, model.statePath, false),
    }),
  );
}

function routedFormTemplateFile(model: RoutedStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.formTemplatePath,
    'template',
    'html',
    'create-external-template',
    FORM_TEMPLATE_SOURCE,
  );
}

const ENTRYPOINT_SOURCE = sourceText(`import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { RouterConfiguration } from '@aurelia/router';
import { __ROOT_COMPONENT_CLASS__ } from '__ROOT_COMPONENT_MODULE__';

new Aurelia()
  .register(
    StandardConfiguration,
    RouterConfiguration.customize({
      useHref: false,
      useUrlFragmentHash: true,
    }),
  )
  .app({
    host: document.body,
    component: __ROOT_COMPONENT_CLASS__,
  })
  .start();
`);

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement } from '@aurelia/runtime-html';
import { route } from '@aurelia/router';
import { __ROUTE_COMPONENT_CLASS__ } from '__ROUTE_COMPONENT_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';
import '__ROOT_STYLE_MODULE__';

@route({
  title: '__APP_NAME__',
  routes: [
    {
      id: '__ROUTE_PATH__',
      path: ['', '__ROUTE_PATH__'],
      component: __ROUTE_COMPONENT_CLASS__,
      title: '__ROUTE_TITLE__',
    },
  ],
})
@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__ROUTE_COMPONENT_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main>
  <nav>
    <a load="__ROUTE_PATH__">__ROUTE_TITLE__</a>
  </nav>
  <au-viewport></au-viewport>
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

  private readonly requests = new Map<string, ServiceRequest>([
    ['request-1', createRequest('request-1', 'Ada Lovelace')],
    ['request-2', createRequest('request-2', 'Grace Hopper')],
  ]);

  get selectedRequest(): ServiceRequest | null {
    return this.readRequest(this.selectedRequestId);
  }

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

  submitRequest(requestId: string): void {
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

const ROUTE_COMPONENT_SOURCE = sourceText(`import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { __FORM_COMPONENT_CLASS__ } from '__FORM_COMPONENT_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__ROUTE_TEMPLATE_MODULE__';

@customElement({
  name: '__ROUTE_ELEMENT_NAME__',
  template,
  dependencies: [__FORM_COMPONENT_CLASS__],
})
export class __ROUTE_COMPONENT_CLASS__ {
  private readonly state = resolve(__STATE_CLASS__);

  get selectedRequestId(): string {
    return this.state.selectedRequestId;
  }

  set selectedRequestId(value: string) {
    this.state.selectedRequestId = value;
  }

  get requestIds(): readonly string[] {
    return this.state.requestIds;
  }

  get submittedCount(): number {
    return this.state.submittedCount;
  }
}
`);

const ROUTE_TEMPLATE_SOURCE = sourceText(`<section>
  <h1>Service request</h1>
  <label for="request-selector">Request</label>
  <select id="request-selector" value.bind="selectedRequestId">
    <option repeat.for="requestId of requestIds" model.bind="requestId">\${requestId}</option>
  </select>

  <__FORM_ELEMENT_NAME__ request-id.bind="selectedRequestId"></__FORM_ELEMENT_NAME__>

  <p>\${submittedCount} submitted request(s)</p>
</section>
`);

const FORM_COMPONENT_SOURCE = sourceText(`import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { __STATE_CLASS__, type ContactPreference, type RequestTopic } from '__STATE_MODULE__';
import template from '__FORM_TEMPLATE_MODULE__';

@customElement({
  name: '__FORM_ELEMENT_NAME__',
  template,
})
export class __FORM_COMPONENT_CLASS__ {
  private readonly state = resolve(__STATE_CLASS__);

  @bindable requestId = '';

  get customerName(): string {
    return this.request?.customerName ?? '';
  }

  set customerName(value: string) {
    const request = this.request;
    if (request != null) {
      request.customerName = value;
    }
  }

  get email(): string {
    return this.request?.email ?? '';
  }

  set email(value: string) {
    const request = this.request;
    if (request != null) {
      request.email = value;
    }
  }

  get urgent(): boolean {
    return this.request?.urgent ?? false;
  }

  set urgent(value: boolean) {
    const request = this.request;
    if (request != null) {
      request.urgent = value;
    }
  }

  get contactPreference(): ContactPreference {
    return this.request?.contactPreference ?? this.emailPreference;
  }

  set contactPreference(value: ContactPreference) {
    const request = this.request;
    if (request != null) {
      request.contactPreference = value;
    }
  }

  get topics(): RequestTopic[] {
    return this.request?.topics ?? [];
  }

  get notes(): string {
    return this.request?.notes ?? '';
  }

  set notes(value: string) {
    const request = this.request;
    if (request != null) {
      request.notes = value;
    }
  }

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

  get canSubmit(): boolean {
    return this.customerName !== '' && this.email !== '';
  }

  submit(): void {
    this.state.submitRequest(this.requestId);
  }

  private get request() {
    return this.state.readRequest(this.requestId);
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
