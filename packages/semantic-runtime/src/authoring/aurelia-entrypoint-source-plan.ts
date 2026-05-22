import { moduleSpecifier } from '../application/module-specifier.js';
import {
  recipeSourceFile,
  type AuthoringSourceFileEdit,
} from './source-plan.js';
import {
  fillSourceTemplate,
  indentSourceLines,
  sourceText,
} from './source-template.js';

export interface StandardAureliaEntrypointFileModel {
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootComponentClassName: string;
}

export interface ConfiguredAureliaEntrypointFileModel extends StandardAureliaEntrypointFileModel {
  readonly configurationImports?: string;
  readonly registrationExpressions?: readonly string[];
}

export function standardAureliaEntrypointFile(
  model: StandardAureliaEntrypointFileModel,
): AuthoringSourceFileEdit {
  return configuredAureliaEntrypointFile(model);
}

export function configuredAureliaEntrypointFile(
  model: ConfiguredAureliaEntrypointFileModel,
): AuthoringSourceFileEdit {
  return recipeSourceFile(
    model.entrypointPath,
    'entrypoint',
    'typescript',
    'create-entrypoint',
    fillSourceTemplate(CONFIGURED_AURELIA_ENTRYPOINT_SOURCE, {
      CONFIGURATION_IMPORTS: model.configurationImports ?? '',
      CONFIGURATION_REGISTRATION_CHAIN: aureliaRegistrationChain(model.registrationExpressions ?? []),
      ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      ROOT_COMPONENT_MODULE: moduleSpecifier(model.entrypointPath, model.rootComponentPath, false),
    }),
  );
}

export function aureliaRegistrationChain(registrations: readonly string[]): string {
  if (registrations.length === 0) {
    return '';
  }

  return `\n  .register(\n${registrations
    .map((registration) => indentSourceLines(registration.trim(), '    '))
    .join(',\n')}\n  )`;
}

const CONFIGURED_AURELIA_ENTRYPOINT_SOURCE = sourceText(`import Aurelia from 'aurelia';
__CONFIGURATION_IMPORTS__\
import { __ROOT_COMPONENT_CLASS__ } from '__ROOT_COMPONENT_MODULE__';

Aurelia__CONFIGURATION_REGISTRATION_CHAIN__
  .app(__ROOT_COMPONENT_CLASS__)
  .start();
`);
