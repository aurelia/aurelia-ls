import {
  AuthoringSourceEditPlan,
  domainNeutralSourcePattern,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import { moduleSpecifier } from '../application/module-specifier.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';
import { standardAureliaEntrypointFile } from './aurelia-entrypoint-source-plan.js';
import { SourcePatternModules } from './source-pattern-modules.js';

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
      standardAureliaEntrypointFile(model),
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
        MINIMAL_APP_ROOT_TEMPLATE_SOURCE,
      ),
    ],
    aureliaRecipeProjectToolingPlan({
      appName: model.appName,
    }),
    domainNeutralSourcePattern(
      'minimal-app.domain-neutral',
      'Minimal Aurelia shell pattern',
      'A domain-neutral app shell with an explicit entrypoint, root custom element, external template, and package/typecheck baseline.',
      'none',
      [
        'Replace the greeting with the caller feature surface before treating this as production app code.',
        'Use this as the smallest source-plan baseline before layering state, routing, forms, plugins, or domain services.',
      ],
      [],
      [
        SourcePatternModules.AppShell,
      ],
    ),
  );
}

const ROOT_COMPONENT_SOURCE = sourceText(`
import { customElement } from 'aurelia';
import template from '__ROOT_TEMPLATE_MODULE__';

@customElement({
  name: '__ROOT_ELEMENT_NAME__',
  template,
})
export class __ROOT_COMPONENT_CLASS__ {
  message = 'Hello semantic runtime';
}
`).trimStart();

export const MINIMAL_APP_ROOT_TEMPLATE_SOURCE = sourceText(`
<main>
  <h1>\${message}</h1>
</main>
`).trimStart();
