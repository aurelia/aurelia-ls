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

export interface MinimalAppSourcePlanModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
}

export function minimalAppSourcePlan(model: MinimalAppSourcePlanModel): AuthoringSourceEditPlan {
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
          ROOT_COMPONENT_CLASS: model.rootComponentClassName,
          ROOT_ELEMENT_NAME: model.rootElementName,
          ROOT_TEMPLATE_MODULE: moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true),
        }),
      ),
      recipeSourceFile(
        model.rootTemplatePath,
        'template',
        'html',
        'create-external-template',
        ROOT_TEMPLATE_SOURCE,
      ),
    ],
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
    }),
  );
}

const ENTRYPOINT_SOURCE = sourceText(`
import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { __ROOT_COMPONENT_CLASS__ } from '__ROOT_COMPONENT_MODULE__';

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: __ROOT_COMPONENT_CLASS__,
  })
  .start();
`).trimStart();

const ROOT_COMPONENT_SOURCE = sourceText(`
import { customElement } from '@aurelia/runtime-html';
import template from '__ROOT_TEMPLATE_MODULE__';

@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
})
export class __ROOT_COMPONENT_CLASS__ {
  message = 'Hello semantic runtime';
}
`).trimStart();

const ROOT_TEMPLATE_SOURCE = sourceText(`
<main>
  <h1>\${message}</h1>
</main>
`).trimStart();
