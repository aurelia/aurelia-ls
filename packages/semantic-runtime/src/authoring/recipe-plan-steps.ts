import type { ApplicationTopology } from '../application/index.js';
import {
  AddRouteOperation,
  AddTemplateBindingOperation,
  ConfigurePluginOperation,
  CreateComponentOperation,
  CreateDomainModelOperation,
  CreateEntrypointOperation,
  CreateExternalTemplateOperation,
  CreateFormComponentOperation,
  CreateProjectFilesOperation,
  CreateRootComponentOperation,
  CreateServiceOperation,
  CreateStateModelOperation,
  CreateStyleAssetOperation,
  VerifyAppOperation,
} from './operation.js';
import { AuthoringPlanStep } from './plan.js';
import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
} from './expected-effect.js';
import type { ExpectedSemanticEffect as ExpectedSemanticEffectContract } from './expected-effect.js';
import { componentStyleAssetExpectedEffects } from './form-recipe-expected-effects.js';

export function projectFilesPlanStep(files: readonly string[]): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateProjectFilesOperation(files),
    [
      ExpectedSemanticEffect.fact('Project should reopen as an Aurelia app.', 'project-shape'),
    ],
  );
}

export function entrypointPlanStep(
  entrypointPath: string,
  rootComponentClassName: string,
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateEntrypointOperation(entrypointPath, rootComponentClassName),
    [
      ExpectedSemanticEffect.fact('App root should be visible after reopen.', 'app-root', 'app', 'entrypoint'),
    ],
  );
}

export function rootComponentPlanStep(
  rootComponentPath: string,
  rootComponentClassName: string,
  rootElementName: string,
  additionalEffects: readonly ExpectedSemanticEffectContract[] = [],
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateRootComponentOperation(rootComponentPath, rootComponentClassName, rootElementName),
    [
      ExpectedSemanticEffect.fact('Root component should be a custom element.', 'component', 'resource', 'app-root'),
      ...additionalEffects,
    ],
  );
}

export function componentStyleAssetPlanStep(stylePath: string): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateStyleAssetOperation(stylePath, 'component'),
    componentStyleAssetExpectedEffects(),
  );
}

export function configurePluginPlanStep(
  configurationName: string,
  packageName: string,
  expectedEffects: readonly ExpectedSemanticEffectContract[],
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new ConfigurePluginOperation(configurationName, packageName),
    expectedEffects,
  );
}

export function i18nConfigurationPlanStep(): AuthoringPlanStep {
  return configurePluginPlanStep(
    'I18nConfiguration',
    '@aurelia/i18n',
    [
      ExpectedSemanticEffect.discriminatorFact('I18n plugin configuration should admit static translation resources.', 'dependency-injection', 'di', 'plugin'),
      ExpectedSemanticEffect.discriminatorFact('Static i18n resources should expose the app title translation key.', 'i18n-translation-key', 'template', 'plugin', 'present', null, [
        new ExpectedSemanticEffectFilter('key', 'app.title'),
        new ExpectedSemanticEffectFilter('locale', 'en'),
        new ExpectedSemanticEffectFilter('namespace', 'translation'),
      ]),
      ExpectedSemanticEffect.signatureTaste('Authoring orientation should recognize plugin registration admission.', 'resource-admission-mode', 'plugin-registration-admission', 'plugin'),
    ],
  );
}

export function validationHtmlConfigurationPlanStep(): AuthoringPlanStep {
  return configurePluginPlanStep(
    'ValidationHtmlConfiguration',
    '@aurelia/validation-html',
    [
      ExpectedSemanticEffect.discriminatorFact('Validation plugin configuration should admit DI and validation-html resources.', 'dependency-injection', 'di', 'plugin'),
      ExpectedSemanticEffect.discriminatorTaste('Authoring orientation should recognize validation controller usage.', 'validation-ownership', 'validation-controller-usage', 'template-binding'),
    ],
  );
}

export function stateModelPlanStep(
  statePath: string,
  stateClassName: string,
  expectedEffects: readonly ExpectedSemanticEffectContract[],
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateStateModelOperation(statePath, stateClassName),
    expectedEffects,
  );
}

export function servicePlanStep(
  servicePath: string,
  serviceClassName: string,
  expectedEffects: readonly ExpectedSemanticEffectContract[],
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateServiceOperation(servicePath, serviceClassName),
    expectedEffects,
  );
}

export function domainModelPlanStep(
  sourcePath: string,
  className: string,
  expectedEffects: readonly ExpectedSemanticEffectContract[] = [],
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateDomainModelOperation(sourcePath, className),
    expectedEffects,
  );
}

export function routePlanStep(
  routePath: string,
  componentClassName: string,
  expectedEffects: readonly ExpectedSemanticEffectContract[],
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new AddRouteOperation(routePath, componentClassName),
    expectedEffects,
  );
}

export function componentPlanStep(
  componentPath: string,
  componentClassName: string,
  elementName: string,
  componentLabel: string,
  scope: 'route' | 'component' = 'component',
  additionalEffects: readonly ExpectedSemanticEffectContract[] = [],
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateComponentOperation(componentPath, componentClassName, elementName),
    [
      ExpectedSemanticEffect.fact(`${componentLabel} should be a custom element.`, 'component', 'resource', scope),
      ...additionalEffects,
    ],
  );
}

export function externalTemplatePlanStep(
  templatePath: string,
  componentClassName: string,
  componentLabel: string,
  additionalEffects: readonly ExpectedSemanticEffectContract[] = [],
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateExternalTemplateOperation(templatePath, componentClassName),
    [
      ExpectedSemanticEffect.fact(`${componentLabel} should use an external template.`, 'external-template', 'template', 'template'),
      ...additionalEffects,
    ],
  );
}

export function formComponentPlanStep(
  formComponentPath: string,
  formComponentClassName: string,
  formElementName: string,
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateFormComponentOperation(formComponentPath, formComponentClassName, formElementName),
    [
      ExpectedSemanticEffect.fact('Form component should be a custom element.', 'component', 'resource', 'component'),
    ],
  );
}

export function templateBindingPlanStep(
  templatePath: string,
  summary: string,
  expectedEffects: readonly ExpectedSemanticEffectContract[],
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new AddTemplateBindingOperation(templatePath, summary),
    expectedEffects,
  );
}

export function verifyAppPlanStep(
  topology: ApplicationTopology,
  expectedEffects: readonly ExpectedSemanticEffectContract[],
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new VerifyAppOperation(topology),
    expectedEffects,
  );
}
