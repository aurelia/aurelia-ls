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
import {
  formFieldShellComponentFile,
  formFieldShellTemplateFile,
} from './form-field-shell-source-plan.js';

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
  readonly routeId: string;
  readonly routePath: string;
  readonly routeNavigationPath: string;
  readonly routeParameterName: string;
  readonly routeQueryModeName: string;
  readonly routeQueryTagName: string;
  readonly routeViewportName: string;
  readonly routeTitle: string;
  readonly routeRedirectPath: string;
  readonly summaryRouteId: string;
  readonly summaryRoutePath: string;
  readonly summaryRouteComponentPath: string;
  readonly summaryRouteTemplatePath: string;
  readonly summaryRouteComponentClassName: string;
  readonly summaryRouteElementName: string;
  readonly summaryRouteViewportName: string;
  readonly summaryRouteTitle: string;
  readonly formComponentPath: string;
  readonly formTemplatePath: string;
  readonly formComponentClassName: string;
  readonly formElementName: string;
  readonly fieldShellComponentPath: string;
  readonly fieldShellTemplatePath: string;
  readonly fieldShellClassName: string;
  readonly fieldShellElementName: string;
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
    routedFormSummaryRouteComponentFile(model),
    routedFormSummaryRouteTemplateFile(model),
    formFieldShellComponentFile(model),
    formFieldShellTemplateFile(model),
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
      ROUTE_ID: model.routeId,
      ROUTE_PATH: model.routePath,
      ROUTE_REDIRECT_PATH: model.routeRedirectPath,
      ROUTE_TITLE: model.routeTitle,
      ROUTE_VIEWPORT_NAME: model.routeViewportName,
      SUMMARY_ROUTE_COMPONENT_CLASS: model.summaryRouteComponentClassName,
      SUMMARY_ROUTE_COMPONENT_MODULE: moduleSpecifier(model.rootComponentPath, model.summaryRouteComponentPath, false),
      SUMMARY_ROUTE_ID: model.summaryRouteId,
      SUMMARY_ROUTE_PATH: model.summaryRoutePath,
      SUMMARY_ROUTE_TITLE: model.summaryRouteTitle,
      SUMMARY_ROUTE_VIEWPORT_NAME: model.summaryRouteViewportName,
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
      ROUTE_NAVIGATION_PATH: model.routeNavigationPath,
      ROUTE_TITLE: model.routeTitle,
      ROUTE_VIEWPORT_NAME: model.routeViewportName,
      SUMMARY_ROUTE_VIEWPORT_NAME: model.summaryRouteViewportName,
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
      ROUTE_PARAMETER_NAME: model.routeParameterName,
      ROUTE_QUERY_MODE_NAME: model.routeQueryModeName,
      ROUTE_QUERY_TAG_NAME: model.routeQueryTagName,
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

function routedFormSummaryRouteComponentFile(model: RoutedStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.summaryRouteComponentPath,
    'component',
    'typescript',
    'create-component',
    fillSourceTemplate(SUMMARY_ROUTE_COMPONENT_SOURCE, {
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.summaryRouteComponentPath, model.statePath, false),
      SUMMARY_ROUTE_COMPONENT_CLASS: model.summaryRouteComponentClassName,
      SUMMARY_ROUTE_ELEMENT_NAME: model.summaryRouteElementName,
      SUMMARY_ROUTE_TEMPLATE_MODULE: moduleSpecifier(model.summaryRouteComponentPath, model.summaryRouteTemplatePath, true),
    }),
  );
}

function routedFormSummaryRouteTemplateFile(model: RoutedStateBackedFormSourcePlanModel): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.summaryRouteTemplatePath,
    'template',
    'html',
    'create-external-template',
    SUMMARY_ROUTE_TEMPLATE_SOURCE,
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
      FIELD_SHELL_CLASS: model.fieldShellClassName,
      FIELD_SHELL_MODULE: moduleSpecifier(model.formComponentPath, model.fieldShellComponentPath, false),
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
    fillSourceTemplate(FORM_TEMPLATE_SOURCE, {
      FIELD_SHELL_ELEMENT_NAME: model.fieldShellElementName,
    }),
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
import { __SUMMARY_ROUTE_COMPONENT_CLASS__ } from '__SUMMARY_ROUTE_COMPONENT_MODULE__';
import template from '__ROOT_TEMPLATE_MODULE__';
import '__ROOT_STYLE_MODULE__';

@route({
  title: '__APP_NAME__',
  routes: [
    {
      path: '',
      redirectTo: '__ROUTE_REDIRECT_PATH__',
    },
    {
      id: '__ROUTE_ID__',
      path: '__ROUTE_PATH__',
      component: __ROUTE_COMPONENT_CLASS__,
      title: '__ROUTE_TITLE__',
      viewport: '__ROUTE_VIEWPORT_NAME__',
    },
    {
      id: '__SUMMARY_ROUTE_ID__',
      path: '__SUMMARY_ROUTE_PATH__',
      component: __SUMMARY_ROUTE_COMPONENT_CLASS__,
      title: '__SUMMARY_ROUTE_TITLE__',
      viewport: '__SUMMARY_ROUTE_VIEWPORT_NAME__',
    },
  ],
})
@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
  dependencies: [__ROUTE_COMPONENT_CLASS__, __SUMMARY_ROUTE_COMPONENT_CLASS__],
})
export class __ROOT_COMPONENT_CLASS__ {}
`);

const ROOT_TEMPLATE_SOURCE = sourceText(`<main>
  <nav>
    <a load="__ROUTE_NAVIGATION_PATH__">__ROUTE_TITLE__</a>
  </nav>
  <section class="routed-layout">
    <au-viewport name="__ROUTE_VIEWPORT_NAME__"></au-viewport>
    <au-viewport name="__SUMMARY_ROUTE_VIEWPORT_NAME__" fallback=""></au-viewport>
  </section>
</main>
`);

const ROOT_STYLE_SOURCE = sourceText(`main {
  display: grid;
  gap: 1rem;
  max-width: 62rem;
  margin: 0 auto;
  padding: 2rem;
}

.routed-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16rem;
  gap: 1rem;
  align-items: start;
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
  primaryTopic: RequestTopic | null;
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
    primaryTopic: null,
    topics: ['support'],
    notes: '',
    submitCount: 0,
  };
}
`);

const ROUTE_COMPONENT_SOURCE = sourceText(`import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { IRouteContext } from '@aurelia/router';
import { __FORM_COMPONENT_CLASS__ } from '__FORM_COMPONENT_MODULE__';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__ROUTE_TEMPLATE_MODULE__';

@customElement({
  name: '__ROUTE_ELEMENT_NAME__',
  template,
  dependencies: [__FORM_COMPONENT_CLASS__],
})
export class __ROUTE_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
  private readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    __ROUTE_PARAMETER_NAME__: string;
    __ROUTE_QUERY_MODE_NAME__?: string;
    __ROUTE_QUERY_TAG_NAME__?: string | readonly string[];
  }>({ includeQueryParams: true });

  get requestId(): string {
    return this.routeParams.__ROUTE_PARAMETER_NAME__;
  }

  get routeMode(): string {
    return this.routeParams.__ROUTE_QUERY_MODE_NAME__ ?? 'edit';
  }

  get routeTagCount(): number {
    const tags = this.routeParams.__ROUTE_QUERY_TAG_NAME__;
    if (Array.isArray(tags)) {
      return tags.length;
    }
    return tags == null ? 0 : 1;
  }

}
`);

const ROUTE_TEMPLATE_SOURCE = sourceText(`<section>
  <h1>Service request \${requestId}</h1>
  <p>Mode: \${routeMode} (\${routeTagCount} tag(s))</p>

  <__FORM_ELEMENT_NAME__ request-id.bind="requestId"></__FORM_ELEMENT_NAME__>

  <p>\${state.submittedCount} submitted request(s)</p>
</section>
`);

const SUMMARY_ROUTE_COMPONENT_SOURCE = sourceText(`import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { __STATE_CLASS__ } from '__STATE_MODULE__';
import template from '__SUMMARY_ROUTE_TEMPLATE_MODULE__';

@customElement({
  name: '__SUMMARY_ROUTE_ELEMENT_NAME__',
  template,
})
export class __SUMMARY_ROUTE_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);
}
`);

const SUMMARY_ROUTE_TEMPLATE_SOURCE = sourceText(`<aside>
  <h2>Activity</h2>
  <p>\${state.submittedCount} submitted request(s)</p>
</aside>
`);

const FORM_COMPONENT_SOURCE = sourceText(`import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { __STATE_CLASS__, type ContactPreference, type RequestTopic } from '__STATE_MODULE__';
import { __FIELD_SHELL_CLASS__ } from '__FIELD_SHELL_MODULE__';
import template from '__FORM_TEMPLATE_MODULE__';

@customElement({
  name: '__FORM_ELEMENT_NAME__',
  template,
  dependencies: [__FIELD_SHELL_CLASS__],
})
export class __FORM_COMPONENT_CLASS__ {
  readonly state = resolve(__STATE_CLASS__);

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
    return this.request?.contactPreference ?? this.state.emailPreference;
  }

  set contactPreference(value: ContactPreference) {
    const request = this.request;
    if (request != null) {
      request.contactPreference = value;
    }
  }

  get primaryTopic(): RequestTopic | null {
    return this.request?.primaryTopic ?? null;
  }

  set primaryTopic(value: RequestTopic | null) {
    const request = this.request;
    if (request != null) {
      request.primaryTopic = value;
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
  <__FIELD_SHELL_ELEMENT_NAME__
    input-id="customer-name"
    label="Name"
    type="text"
    value.bind="customerName">
  </__FIELD_SHELL_ELEMENT_NAME__>

  <__FIELD_SHELL_ELEMENT_NAME__
    input-id="email"
    label="Email"
    type="email"
    value.bind="email">
  </__FIELD_SHELL_ELEMENT_NAME__>

  <label>
    <input type="checkbox" checked.bind="urgent">
    Urgent
  </label>

  <fieldset>
    <legend>Contact preference</legend>
    <label>
      <input type="radio" model.bind="state.emailPreference" checked.bind="contactPreference">
      Email
    </label>
    <label>
      <input type="radio" model.bind="state.phonePreference" checked.bind="contactPreference">
      Phone
    </label>
  </fieldset>

  <label for="primary-topic">Primary topic</label>
  <select id="primary-topic" value.bind="primaryTopic">
    <option model.bind="null">Choose...</option>
    <option model.bind="state.hardwareTopic">Hardware</option>
    <option model.bind="state.billingTopic">Billing</option>
    <option model.bind="state.supportTopic">Support</option>
  </select>

  <label for="topics">Additional topics</label>
  <select id="topics" multiple value.bind="topics">
    <option model.bind="state.hardwareTopic">Hardware</option>
    <option model.bind="state.billingTopic">Billing</option>
    <option model.bind="state.supportTopic">Support</option>
  </select>

  <label for="notes">Notes</label>
  <textarea id="notes" value.bind="notes"></textarea>

  <button type="submit" disabled.bind="!canSubmit">Submit request</button>
</form>
`);
