import {
  AuthoringSourceEditPlan,
  type AuthoringSourceFileEdit,
  referenceInstantiationSourceFiles,
  recipeSourceEditPolicy,
  recipeSourceFile,
  sourcePatternAdaptationGroup,
  sourcePatternParameter,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import { configuredAureliaEntrypointFile } from './aurelia-entrypoint-source-plan.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';
import {
  formFieldShellComponentFile,
  formFieldShellTemplateFile,
} from './form-field-shell-source-plan.js';
import {
  stateBackedFormI18nTokens,
  stateBackedFormValidationTokens,
  type StateBackedFormI18nTokens,
  type StateBackedFormValidationTokens,
  type StateBackedFormValidationTriggerName,
} from './state-backed-form-source-plan.js';
import {
  STANDARD_REQUEST_FORM_TEMPLATE_SOURCE,
  STANDARD_REQUEST_FORM_COMPONENT_SOURCE,
  STANDARD_REQUEST_SERVICE_SOURCE,
  STANDARD_REQUEST_STATE_SOURCE,
  starterRequestFormSourcePatternPolicy,
  standardRequestFormSourcePattern,
  standardRequestFormFieldTemplate,
  standardRequestFormDomainTemplateTokensFor,
  type StandardRequestFormDomainNames,
} from './standard-request-form-source-templates.js';
import {
  standardRequestFormCustomServiceBackedStateSource,
  standardRequestFormCustomServiceSource,
  standardRequestFormCustomStateSource,
  standardRequestFormCustomTemplateSource,
  standardRequestFormFieldSchemaHasOptionDomains,
  standardRequestFormFieldSchemaModules,
  standardRequestFormFieldSchemaOptionParameterValue,
  standardRequestFormFieldSchemaOptionSummary,
  type StandardRequestFormFieldSchema,
} from './standard-request-form-field-schema.js';
import { SourcePatternModules } from './source-pattern-modules.js';

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
  readonly servicePath?: string;
  readonly serviceClassName?: string;
  /** Include an injected service/repository boundary owned by the DI state class. */
  readonly serviceEnabled?: boolean;
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
  readonly requestDomain: StandardRequestFormDomainNames;
  readonly requestFieldSchema: StandardRequestFormFieldSchema | null;
  /** Include validation-html configuration, validation services, and validate binding behavior usage. */
  readonly validationEnabled?: boolean;
  /** Optional static validation trigger argument for generated `& validate` applications. */
  readonly validationTrigger?: StateBackedFormValidationTriggerName | null;
  /** Include i18n configuration, static translation resources, and translated template text. */
  readonly i18nEnabled?: boolean;
}

export function routedStateBackedFormSourcePlan(
  model: RoutedStateBackedFormSourcePlanModel,
): AuthoringSourceEditPlan {
  const validation = stateBackedFormValidationTokens(
    model.validationEnabled === true,
    model.validationTrigger ?? null,
    model.requestDomain,
    model.requestFieldSchema,
  );
  const i18n = stateBackedFormI18nTokens(model.i18nEnabled === true, model.requestDomain);
  return new AuthoringSourceEditPlan(
    model.rootDir,
    recipeSourceEditPolicy('recipe-baseline'),
    routedStateBackedFormSourceFilesWithAuthority(model, validation, i18n),
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
      dependencySpecifiers: routedStateBackedFormDependencySpecifiers(model),
    }),
    routedStateBackedFormSourcePattern(model),
  );
}

function routedStateBackedFormSourcePattern(
  model: RoutedStateBackedFormSourcePlanModel,
) {
  const capabilityPrefix = routedStateBackedFormPatternPrefix(model);
  const policy = routedStateBackedFormUsesReferenceSourceAuthority(model)
    ? undefined
    : starterRequestFormSourcePatternPolicy();
  return standardRequestFormSourcePattern(
    `${capabilityPrefix}.${policy == null ? 'reference-instantiation' : 'starter'}`,
    `${routedStateBackedFormPatternTitle(model)} routed request form pattern`,
    policy == null
      ? `A complete reference instantiation of route-owned request identity, routeable form composition, DI-owned state${routedStateBackedFormPatternCapabilitySummary(model)}.`
      : `A caller-shaped starting scaffold for route-owned request identity, routeable form composition, DI-owned state${routedStateBackedFormPatternCapabilitySummary(model)}.`,
    [
      'Treat route IDs, route parameter names, query labels, and summary/detail labels as defaults to adapt to the caller navigation model.',
      'Keep the route-owned identity and template-local request lookup shape when navigation owns selection.',
    ],
    [
      sourcePatternParameter(
        'request-route-parameter',
        'route-identity',
        'Request route parameter',
        model.routeParameterName,
        'Rename the route parameter and matching typed route-context access together when adapting navigation-owned request selection.',
        'source-text-input',
        'route-parameter-name',
      ),
      sourcePatternParameter(
        'request-route-title',
        'feature-copy',
        'Request route title',
        model.routeTitle,
        'Rename the primary route title and navigation label without changing the routed form architecture.',
        'source-text-input',
        'route-title',
      ),
      sourcePatternParameter(
        'request-routes',
        'feature-copy',
        'Request route labels',
        `${model.summaryRoutePath}, ${model.routePath}`,
        'Adapt route IDs, paths, titles, and summary/detail copy to the caller information architecture.',
        'advisory-only',
        'copy-text',
      ),
    ],
    routedStateBackedFormSourcePatternModules(model),
    [
      sourcePatternAdaptationGroup(
        'request-route-identity',
        'Request route identity',
        'Route parameter, primary route title, route labels, template-local request lookup, and navigation links move together when a routed form adapts its selected request identity.',
        ['request-route-parameter', 'request-route-title', 'request-routes', 'request-selection-id'],
      ),
    ],
    model.requestDomain,
    model.requestFieldSchema?.sourceParameterValue,
    standardRequestFormFieldSchemaOptionParameterValue(model.requestFieldSchema)
      ?? standardRequestFormFieldSchemaOptionSummary(model.requestFieldSchema),
    standardRequestFormFieldSchemaHasOptionDomains(model.requestFieldSchema)
      ? 'source-text-input'
      : 'advisory-only',
    standardRequestFormFieldSchemaModules(model.requestFieldSchema),
    undefined,
    true,
    policy,
  );
}

function routedStateBackedFormSourcePatternModules(
  model: RoutedStateBackedFormSourcePlanModel,
) {
  return [
    SourcePatternModules.RouterShell,
    SourcePatternModules.RouteContextSelection,
    SourcePatternModules.RouteParameterSelection,
    SourcePatternModules.RouteLinkNavigation,
    ...(model.serviceEnabled === true
      ? [
        SourcePatternModules.StateOwnedServiceBoundary,
        SourcePatternModules.ServiceBackedLoading,
        SourcePatternModules.ServiceBackedSubmission,
      ]
      : []),
    ...(model.i18nEnabled === true ? [SourcePatternModules.I18nPlugin] : []),
    ...(model.validationEnabled === true ? [SourcePatternModules.ValidationPlugin] : []),
  ];
}

function routedStateBackedFormPatternPrefix(
  model: RoutedStateBackedFormSourcePlanModel,
): string {
  if (model.i18nEnabled === true && model.validationEnabled === true) {
    return 'routed-localized-validated-state-backed-form';
  }
  if (model.serviceEnabled === true && model.validationEnabled === true) {
    return 'routed-service-validated-state-backed-form';
  }
  if (model.validationEnabled === true) {
    return 'routed-validated-state-backed-form';
  }
  if (model.serviceEnabled === true) {
    return 'routed-service-backed-form';
  }
  return 'routed-state-backed-form';
}

function routedStateBackedFormPatternTitle(
  model: RoutedStateBackedFormSourcePlanModel,
): string {
  if (model.i18nEnabled === true && model.validationEnabled === true) {
    return 'Localized validated';
  }
  if (model.serviceEnabled === true && model.validationEnabled === true) {
    return 'Service-backed validated';
  }
  if (model.validationEnabled === true) {
    return 'Validated';
  }
  if (model.serviceEnabled === true) {
    return 'Service-backed';
  }
  return 'State-backed';
}

function routedStateBackedFormPatternCapabilitySummary(
  model: RoutedStateBackedFormSourcePlanModel,
): string {
  const parts: string[] = [];
  if (model.serviceEnabled === true) {
    parts.push('service loading/submission');
  }
  if (model.validationEnabled === true) {
    parts.push('validation-html bindings');
  }
  if (model.i18nEnabled === true) {
    parts.push('static i18n resources');
  }
  return parts.length === 0 ? '' : `, ${parts.join(', ')}`;
}

function routedStateBackedFormSourceFiles(
  model: RoutedStateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
  i18n: StateBackedFormI18nTokens,
): readonly AuthoringSourceFileEdit[] {
  return [
    routedFormEntrypointFile(model, validation, i18n),
    routedFormRootComponentFile(model),
    routedFormRootTemplateFile(model),
    routedFormRootStyleFile(model),
    routedFormStateFile(model),
    ...routedFormServiceFiles(model),
    routedFormRouteComponentFile(model),
    routedFormRouteTemplateFile(model, i18n),
    routedFormSummaryRouteComponentFile(model),
    routedFormSummaryRouteTemplateFile(model),
    formFieldShellComponentFile(model),
    formFieldShellTemplateFile(model),
    routedFormComponentFile(model, validation),
    routedFormTemplateFile(model, validation, i18n),
  ];
}

function routedStateBackedFormSourceFilesWithAuthority(
  model: RoutedStateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
  i18n: StateBackedFormI18nTokens,
): readonly AuthoringSourceFileEdit[] {
  const files = routedStateBackedFormSourceFiles(model, validation, i18n);
  return routedStateBackedFormUsesReferenceSourceAuthority(model)
    ? referenceInstantiationSourceFiles(files)
    : files;
}

function routedStateBackedFormUsesReferenceSourceAuthority(
  model: RoutedStateBackedFormSourcePlanModel,
): boolean {
  return model.requestFieldSchema == null;
}

function routedFormEntrypointFile(
  model: RoutedStateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
  i18n: StateBackedFormI18nTokens,
): AuthoringSourceFileEdit {
  return configuredAureliaEntrypointFile({
    entrypointPath: model.entrypointPath,
    rootComponentPath: model.rootComponentPath,
    rootComponentClassName: model.rootComponentClassName,
    configurationImports: `import { RouterConfiguration } from '@aurelia/router';\n${validation.entrypointImport}${i18n.entrypointImport}`,
    registrationExpressions: [
      `RouterConfiguration.customize({
  useHref: false,
  useUrlFragmentHash: true,
})`,
      ...validation.registrationExpressions,
      ...i18n.registrationExpressions,
    ],
  });
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
      ROUTE_TITLE_ATTRIBUTE: model.i18nEnabled === true ? ' t="app.title"' : '',
      ROUTE_TITLE_TEXT: model.i18nEnabled === true ? '' : model.routeTitle,
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
  if (model.serviceEnabled === true) {
    return recipeSourceFile(
      model.statePath,
      'state-model',
      'typescript',
      'create-state-model',
      model.requestFieldSchema == null
        ? fillSourceTemplate(SERVICE_BACKED_STATE_SOURCE, {
          SERVICE_CLASS: requiredRoutedFormServiceClassName(model),
          SERVICE_MODULE: routedFormServiceModuleSpecifier(model.statePath, model),
          STATE_CLASS: model.stateClassName,
          ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
            'REQUEST_COLLECTION_PROPERTY',
            'REQUEST_ENTITY_CLASS',
            'REQUEST_IDS_PROPERTY',
            'REQUEST_LOAD_METHOD',
            'REQUEST_LOADING_PROPERTY',
            'REQUEST_READ_METHOD',
            'REQUEST_REPLACE_METHOD',
            'REQUEST_SELECTION_ID',
            'REQUEST_SERVICE_PROPERTY',
            'REQUEST_SUBMIT_METHOD',
            'REQUEST_VARIABLE',
          ]),
        })
        : standardRequestFormCustomServiceBackedStateSource(
          model.stateClassName,
          requiredRoutedFormServiceClassName(model),
          routedFormServiceModuleSpecifier(model.statePath, model),
          model.requestDomain,
          model.requestFieldSchema,
        ),
    );
  }
  return recipeSourceFile(
    model.statePath,
    'state-model',
    'typescript',
    'create-state-model',
    model.requestFieldSchema == null
      ? fillSourceTemplate(STANDARD_REQUEST_STATE_SOURCE, {
        STATE_CLASS: model.stateClassName,
        ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
          'REQUEST_COLLECTION_PROPERTY',
          'REQUEST_CREATE_FUNCTION',
          'REQUEST_ENTITY_CLASS',
          'REQUEST_IDS_PROPERTY',
          'REQUEST_READ_METHOD',
          'REQUEST_SAMPLE_ID_PREFIX',
          'REQUEST_SELECTED_ID_PROPERTY',
          'REQUEST_SELECTION_ID',
          'REQUEST_SUBMIT_METHOD',
          'REQUEST_VARIABLE',
        ]),
      })
      : standardRequestFormCustomStateSource(
        model.stateClassName,
        model.requestDomain,
        model.requestFieldSchema,
      ),
  );
}

function routedFormServiceFiles(model: RoutedStateBackedFormSourcePlanModel): readonly AuthoringSourceFileEdit[] {
  if (model.serviceEnabled !== true) {
    return [];
  }
  return [
    recipeSourceFile(
      requiredRoutedFormServicePath(model),
      'service',
      'typescript',
      'create-service',
      model.requestFieldSchema == null
        ? fillSourceTemplate(STANDARD_REQUEST_SERVICE_SOURCE, {
          SERVICE_CLASS: requiredRoutedFormServiceClassName(model),
          STATE_MODULE: moduleSpecifier(requiredRoutedFormServicePath(model), model.statePath, false),
          ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
            'REQUEST_CREATE_FUNCTION',
            'REQUEST_ENTITY_CLASS',
            'REQUEST_LOAD_METHOD',
            'REQUEST_SAMPLE_ID_PREFIX',
            'REQUEST_SUBMIT_METHOD',
            'REQUEST_VARIABLE_PARAMETER',
          ]),
        })
        : standardRequestFormCustomServiceSource(
          requiredRoutedFormServiceClassName(model),
          moduleSpecifier(requiredRoutedFormServicePath(model), model.statePath, false),
          model.requestDomain,
          model.requestFieldSchema,
        ),
    ),
  ];
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
      ROUTE_BINDING_METHOD: model.serviceEnabled === true
        ? `
  binding(): void {
    void this.state.${model.requestDomain.loadEntitiesMethodName}();
  }
`
        : '',
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.routeComponentPath, model.statePath, false),
    }),
  );
}

function routedFormRouteTemplateFile(
  model: RoutedStateBackedFormSourcePlanModel,
  i18n: StateBackedFormI18nTokens,
): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.routeTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(ROUTE_TEMPLATE_SOURCE, {
      FORM_ELEMENT_NAME: model.formElementName,
      ROUTE_HEADING: model.i18nEnabled === true ? '<h1 t="app.title"></h1>' : `<h1>${model.requestDomain.entityTitle} \${routeParams.${model.routeParameterName}}</h1>`,
      ROUTE_PARAMETER_NAME: model.routeParameterName,
      ROUTE_QUERY_MODE_NAME: model.routeQueryModeName,
      ROUTE_SUBMITTED_COUNT: i18n.submittedCount,
      ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
        'REQUEST_ID_ATTRIBUTE',
      ]),
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

function routedFormComponentFile(
  model: RoutedStateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.formComponentPath,
    'component',
    'typescript',
    'create-form-component',
    fillSourceTemplate(STANDARD_REQUEST_FORM_COMPONENT_SOURCE, {
      FORM_COMPONENT_CLASS: model.formComponentClassName,
      FORM_ELEMENT_NAME: model.formElementName,
      FIELD_SHELL_CLASS: model.fieldShellClassName,
      FIELD_SHELL_MODULE: moduleSpecifier(model.formComponentPath, model.fieldShellComponentPath, false),
      FORM_TEMPLATE_MODULE: moduleSpecifier(model.formComponentPath, model.formTemplatePath, true),
      ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
        'REQUEST_SELECTION_ID',
      ]),
      STATE_IMPORTS: `${model.stateClassName}${validation.stateImport}`,
      STATE_CLASS: model.stateClassName,
      STATE_MODULE: moduleSpecifier(model.formComponentPath, model.statePath, false),
      SUBMIT_METHOD: validation.submitMethod,
      VALIDATION_CONSTRUCTOR: validation.constructorBody,
      VALIDATION_FIELDS: validation.formFields,
      VALIDATION_FORM_IMPORT: validation.formImport,
    }),
  );
}

function routedFormTemplateFile(
  model: RoutedStateBackedFormSourcePlanModel,
  validation: StateBackedFormValidationTokens,
  i18n: StateBackedFormI18nTokens,
): AuthoringSourceFileEdit {
  if (model.requestFieldSchema != null) {
    return recipeSourceFile(
      model.formTemplatePath,
      'template',
      'html',
      'create-external-template',
      standardRequestFormCustomTemplateSource({
        domain: model.requestDomain,
        fieldSchema: model.requestFieldSchema,
        fieldShellElementName: model.fieldShellElementName,
        formSummary: i18n.formSummary,
        submitTrigger: validation.submitTrigger,
        submitLabel: i18n.submitLabel,
        validationEnabled: model.validationEnabled === true,
        validationTrigger: model.validationTrigger ?? null,
      }),
    );
  }
  return recipeSourceFile(
    model.formTemplatePath,
    'template',
    'html',
    'create-external-template',
    fillSourceTemplate(STANDARD_REQUEST_FORM_TEMPLATE_SOURCE, {
      CONTACT_PREFERENCE_LEGEND: i18n.contactPreferenceLegend,
      CUSTOMER_NAME_FIELD: standardRequestFormFieldTemplate({
        fieldShellElementName: model.fieldShellElementName,
        inputId: 'customer-name',
        label: 'Name',
        type: 'text',
        valueBinding: validation.customerNameBinding,
        errorCollectionName: validation.customerNameErrorCollectionName,
      }),
      EMAIL_FIELD: standardRequestFormFieldTemplate({
        fieldShellElementName: model.fieldShellElementName,
        inputId: 'email',
        label: 'Email',
        type: 'email',
        valueBinding: validation.emailBinding,
        errorCollectionName: validation.emailErrorCollectionName,
      }),
      FORM_SUMMARY: i18n.formSummary,
      PRIMARY_TOPIC_LEAD: '',
      SUBMIT_TRIGGER: validation.submitTrigger,
      SUBMIT_LABEL: i18n.submitLabel,
      ...standardRequestFormDomainTemplateTokensFor(model.requestDomain, [
        'REQUEST_ENTITY_LABEL_LOWER',
        'REQUEST_READ_METHOD',
        'REQUEST_SELECTION_ID',
        'REQUEST_VARIABLE',
      ]),
    }),
  );
}

function routedStateBackedFormDependencySpecifiers(
  model: RoutedStateBackedFormSourcePlanModel,
): readonly string[] {
  const specifiers = new Set<string>(['@aurelia/router']);
  if (model.validationEnabled === true) {
    specifiers.add('@aurelia/validation');
    specifiers.add('@aurelia/validation-html');
  }
  if (model.i18nEnabled === true) {
    specifiers.add('@aurelia/i18n');
  }
  return [...specifiers];
}

function requiredRoutedFormServicePath(model: RoutedStateBackedFormSourcePlanModel): string {
  if (model.servicePath == null) {
    throw new Error('Routed service-backed form source plan requires servicePath.');
  }
  return model.servicePath;
}

function requiredRoutedFormServiceClassName(model: RoutedStateBackedFormSourcePlanModel): string {
  if (model.serviceClassName == null) {
    throw new Error('Routed service-backed form source plan requires serviceClassName.');
  }
  return model.serviceClassName;
}

function routedFormServiceModuleSpecifier(
  fromPath: string,
  model: RoutedStateBackedFormSourcePlanModel,
): string {
  return model.serviceEnabled === true
    ? moduleSpecifier(fromPath, requiredRoutedFormServicePath(model), false)
    : '';
}

const ROOT_COMPONENT_SOURCE = sourceText(`import { customElement } from 'aurelia';
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
    <a load="__ROUTE_NAVIGATION_PATH__"__ROUTE_TITLE_ATTRIBUTE__>__ROUTE_TITLE_TEXT__</a>
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

.field-stack {
  display: grid;
  gap: 0.25rem;
}

.field-invalid {
  border-left: 0.25rem solid #9e3a2d;
  padding-left: 0.75rem;
}

.error {
  color: #9e3a2d;
  margin: 0;
}
`);

const SERVICE_BACKED_STATE_SOURCE = sourceText(`import { resolve } from 'aurelia';
import { __SERVICE_CLASS__ } from '__SERVICE_MODULE__';

export type ContactPreference = 'email' | 'phone';
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
  private readonly __REQUEST_SERVICE_PROPERTY__ = resolve(__SERVICE_CLASS__);
  private readonly __REQUEST_COLLECTION_PROPERTY__ = new Map<string, __REQUEST_ENTITY_CLASS__>();

  readonly emailPreference: ContactPreference = 'email';
  readonly phonePreference: ContactPreference = 'phone';
  readonly hardwareTopic: RequestTopic = 'hardware';
  readonly billingTopic: RequestTopic = 'billing';
  readonly supportTopic: RequestTopic = 'support';
  readonly supportAgents: readonly SupportAgent[] = [
    { id: 'agent-ada', name: 'Ada' },
    { id: 'agent-grace', name: 'Grace' },
  ];

  __REQUEST_LOADING_PROPERTY__ = false;

  get __REQUEST_IDS_PROPERTY__(): readonly string[] {
    return [...this.__REQUEST_COLLECTION_PROPERTY__.keys()];
  }

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

  async __REQUEST_LOAD_METHOD__(): Promise<void> {
    if (this.__REQUEST_COLLECTION_PROPERTY__.size > 0 || this.__REQUEST_LOADING_PROPERTY__) {
      return;
    }

    this.__REQUEST_LOADING_PROPERTY__ = true;
    try {
      this.__REQUEST_REPLACE_METHOD__(await this.__REQUEST_SERVICE_PROPERTY__.__REQUEST_LOAD_METHOD__());
    } finally {
      this.__REQUEST_LOADING_PROPERTY__ = false;
    }
  }

  async __REQUEST_SUBMIT_METHOD__(__REQUEST_SELECTION_ID__: string): Promise<void> {
    const __REQUEST_VARIABLE__ = this.__REQUEST_READ_METHOD__(__REQUEST_SELECTION_ID__);
    if (__REQUEST_VARIABLE__ != null) {
      __REQUEST_VARIABLE__.submitCount += 1;
      await this.__REQUEST_SERVICE_PROPERTY__.__REQUEST_SUBMIT_METHOD__(__REQUEST_VARIABLE__);
    }
  }

  sameSupportAgent(left: SupportAgent | null, right: SupportAgent | null): boolean {
    return left?.id === right?.id;
  }

  private __REQUEST_REPLACE_METHOD__(__REQUEST_COLLECTION_PROPERTY__: readonly __REQUEST_ENTITY_CLASS__[]): void {
    this.__REQUEST_COLLECTION_PROPERTY__.clear();
    for (const __REQUEST_VARIABLE__ of __REQUEST_COLLECTION_PROPERTY__) {
      this.__REQUEST_COLLECTION_PROPERTY__.set(__REQUEST_VARIABLE__.id, __REQUEST_VARIABLE__);
    }
  }
}
`);

const ROUTE_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
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
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    __ROUTE_PARAMETER_NAME__: string;
    __ROUTE_QUERY_MODE_NAME__?: string;
    __ROUTE_QUERY_TAG_NAME__?: string | readonly string[];
  }, 'child-first'>({ includeQueryParams: true, mergeStrategy: 'child-first' });

  get routeTagCount(): number {
    const tags = this.routeParams.__ROUTE_QUERY_TAG_NAME__;
    if (Array.isArray(tags)) {
      return tags.length;
    }
    return tags == null ? 0 : 1;
  }
__ROUTE_BINDING_METHOD__\
}
`);

const ROUTE_TEMPLATE_SOURCE = sourceText(`<section>
  __ROUTE_HEADING__
  <p>Mode: \${routeParams.__ROUTE_QUERY_MODE_NAME__ ?? 'edit'}; tags: \${routeTagCount}</p>

  <__FORM_ELEMENT_NAME__ __REQUEST_ID_ATTRIBUTE__.bind="routeParams.__ROUTE_PARAMETER_NAME__"></__FORM_ELEMENT_NAME__>

  __ROUTE_SUBMITTED_COUNT__
</section>
`);

const SUMMARY_ROUTE_COMPONENT_SOURCE = sourceText(`import { customElement, resolve } from 'aurelia';
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
  <p>Submissions: \${state.submittedCount}</p>
</aside>
`);
