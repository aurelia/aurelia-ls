import path from 'node:path';

import {
  AuthoringSourceEditPlan,
  domainNeutralSourcePattern,
  recipeSourceEditPolicy,
  recipeSourceFile,
} from './source-plan.js';
import { aureliaRecipeProjectToolingPlan } from './package-tooling.js';
import {
  fillSourceTemplate,
  sourceText,
} from './source-template.js';
import { standardAureliaEntrypointFile } from './aurelia-entrypoint-source-plan.js';
import { MINIMAL_APP_ROOT_TEMPLATE_SOURCE } from './minimal-app-source-plan.js';
import { SourcePatternModules } from './source-pattern-modules.js';

export interface ConventionMinimalAppSourcePlanModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootComponentClassName: string;
}

export function conventionMinimalAppSourcePlan(model: ConventionMinimalAppSourcePlanModel): AuthoringSourceEditPlan {
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
        fillSourceTemplate(CONVENTION_ROOT_COMPONENT_SOURCE, {
          ROOT_COMPONENT_CLASS: model.rootComponentClassName,
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
      'convention-minimal-app.domain-neutral',
      'Convention-based minimal shell pattern',
      'A domain-neutral minimal app shell using the currently modeled Aurelia component/template convention instead of decorator metadata.',
      'none',
      [
        'Use this when the caller wants convention-oriented source shape; add explicit decorators only when the app style or dependency metadata requires them.',
        'Replace the greeting with the caller feature surface before treating this as production app code.',
      ],
      [],
      [
        SourcePatternModules.AppShell,
        SourcePatternModules.ConventionResource,
      ],
    ),
  );
}

export function conventionTemplatePathForSource(sourcePath: string): string {
  const parsed = path.posix.parse(sourcePath.replace(/\\/g, '/'));
  return path.posix.join(parsed.dir, `${parsed.name}.html`);
}

const CONVENTION_ROOT_COMPONENT_SOURCE = sourceText(`
export class __ROOT_COMPONENT_CLASS__ {
  message = 'Hello semantic runtime';
}
`).trimStart();
