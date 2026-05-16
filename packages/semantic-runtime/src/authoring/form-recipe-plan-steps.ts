import type { ApplicationTopology } from '../application/index.js';
import {
  AddTemplateBindingOperation,
  CreateEntrypointOperation,
  CreateExternalTemplateOperation,
  CreateFormComponentOperation,
  CreateProjectFilesOperation,
  CreateRootComponentOperation,
  CreateStyleAssetOperation,
  VerifyAppOperation,
} from './operation.js';
import { AuthoringPlanStep } from './plan.js';
import { ExpectedSemanticEffect } from './expected-effect.js';
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
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateRootComponentOperation(rootComponentPath, rootComponentClassName, rootElementName),
    [
      ExpectedSemanticEffect.fact('Root component should be a custom element.', 'component', 'resource', 'app-root'),
    ],
  );
}

export function componentStyleAssetPlanStep(stylePath: string): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateStyleAssetOperation(stylePath, 'component'),
    componentStyleAssetExpectedEffects(),
  );
}

export function externalTemplatePlanStep(
  templatePath: string,
  componentClassName: string,
  componentLabel: string,
): AuthoringPlanStep {
  return new AuthoringPlanStep(
    new CreateExternalTemplateOperation(templatePath, componentClassName),
    [
      ExpectedSemanticEffect.fact(`${componentLabel} should use an external template.`, 'external-template', 'template', 'template'),
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
