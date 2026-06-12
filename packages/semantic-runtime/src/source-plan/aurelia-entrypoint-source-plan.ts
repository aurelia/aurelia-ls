import { moduleSpecifier } from '../application/module-specifier.js';
import type { AureliaConfigurationAdmissionSourceSet } from './aurelia-configuration-admission-source.js';
import {
  SourcePlanEditKind,
  SourcePlanFile,
  SourcePlanFileRole,
  SourcePlanLanguage,
  SourcePlanOperationKind,
  SourcePlanText,
  SourcePlanTextAuthority,
  sourcePlanSourceFragmentContribution,
  sourcePlanTypeScriptImportContribution,
  type SourcePlanContribution,
} from './source-plan.js';
import {
  fillSourceTemplate,
  indentSourceLines,
  sourceText,
} from './source-template.js';
import {
  type TypeScriptImportRequirement,
  typeScriptImportStatements,
} from './typescript-import-source.js';

export interface StandardAureliaEntrypointFileModel {
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootComponentClassName: string;
}

export interface ConfiguredAureliaEntrypointFileModel extends StandardAureliaEntrypointFileModel {
  readonly configurationAdmission?: AureliaConfigurationAdmissionSourceSet;
  readonly configurationImports?: readonly AureliaEntrypointImport[];
  readonly registrationExpressions?: readonly AureliaEntrypointRegistrationExpression[];
  readonly contributions?: readonly SourcePlanContribution[];
  readonly textAuthority?: SourcePlanTextAuthority;
  readonly editKind?: SourcePlanEditKind;
}

/** Static import needed by an Aurelia entrypoint before app registration. */
export interface AureliaEntrypointImport extends TypeScriptImportRequirement {
  /** Optional source-plan contributions that explain why this import exists. */
  readonly contributions?: readonly SourcePlanContribution[];
}

/** Registration expression source needed before app registration. */
export type AureliaEntrypointRegistrationExpression =
  | string
  | AureliaEntrypointRegistrationExpressionSource;

/** Registration expression plus already-known contribution facts. */
export interface AureliaEntrypointRegistrationExpressionSource {
  readonly text: string;
  readonly contributions?: readonly SourcePlanContribution[];
}

export function standardAureliaEntrypointFile(
  model: StandardAureliaEntrypointFileModel,
): SourcePlanFile {
  return configuredAureliaEntrypointFile(model);
}

export function configuredAureliaEntrypointFile(
  model: ConfiguredAureliaEntrypointFileModel,
): SourcePlanFile {
  const configurationImports = model.configurationAdmission?.configurationImports ?? model.configurationImports ?? [];
  const registrationExpressions = model.configurationAdmission?.registrationExpressions ?? model.registrationExpressions ?? [];
  const rootComponentModuleSpecifier = moduleSpecifier(model.entrypointPath, model.rootComponentPath, false);
  const entrypointImports: readonly AureliaEntrypointImport[] = [
    {
      moduleSpecifier: 'aurelia',
      defaultImport: 'Aurelia',
    },
    ...configurationImports,
    {
      moduleSpecifier: rootComponentModuleSpecifier,
      namedImports: [model.rootComponentClassName],
    },
  ];
  const contributions = [
    ...aureliaEntrypointImportContributions(entrypointImports),
    ...aureliaEntrypointRegistrationExpressionContributions(registrationExpressions),
    ...(model.contributions ?? []),
  ];
  return new SourcePlanFile(
    model.entrypointPath,
    SourcePlanFileRole.Entrypoint,
    SourcePlanLanguage.TypeScript,
    model.editKind ?? SourcePlanEditKind.Create,
    SourcePlanOperationKind.CreateEntrypoint,
    new SourcePlanText(
      fillSourceTemplate(CONFIGURED_AURELIA_ENTRYPOINT_SOURCE, {
        ENTRYPOINT_IMPORTS: aureliaEntrypointImportStatements(entrypointImports),
        CONFIGURATION_REGISTRATION_CHAIN: aureliaRegistrationChain(registrationExpressions),
        ROOT_COMPONENT_CLASS: model.rootComponentClassName,
      }),
      model.textAuthority ?? SourcePlanTextAuthority.SemanticRuntimeGenerated,
    ),
    contributions,
  );
}

export function aureliaEntrypointImportStatements(
  imports: readonly AureliaEntrypointImport[],
): string {
  return typeScriptImportStatements(imports);
}

/** Read source-plan import contributions for entrypoint import requirements. */
export function aureliaEntrypointImportContributions(
  imports: readonly AureliaEntrypointImport[],
): readonly SourcePlanContribution[] {
  return imports.flatMap((importRequirement) =>
    importRequirement.contributions ?? [sourcePlanTypeScriptImportContribution(importRequirement)]
  );
}

export function aureliaRegistrationChain(registrations: readonly AureliaEntrypointRegistrationExpression[]): string {
  if (registrations.length === 0) {
    return '';
  }
  if (registrations.length === 1) {
    const registrationText = aureliaEntrypointRegistrationExpressionText(registrations[0]!).trim();
    if (!registrationText.includes('\n')) {
      return `\n  .register(${registrationText})`;
    }
  }

  return `\n  .register(\n${registrations
    .map((registration) => indentSourceLines(aureliaEntrypointRegistrationExpressionText(registration).trim(), '    '))
    .join(',\n')}\n  )`;
}

export function aureliaEntrypointRegistrationExpressionSource(
  text: string,
  contributions: readonly SourcePlanContribution[] = [
    sourcePlanSourceFragmentContribution(SourcePlanLanguage.TypeScript, text),
  ],
): AureliaEntrypointRegistrationExpressionSource {
  return { text, contributions };
}

export function aureliaEntrypointRegistrationExpressionText(
  expression: AureliaEntrypointRegistrationExpression,
): string {
  return typeof expression === 'string' ? expression : expression.text;
}

function aureliaEntrypointRegistrationExpressionContributions(
  expressions: readonly AureliaEntrypointRegistrationExpression[],
): readonly SourcePlanContribution[] {
  return expressions.flatMap((expression) =>
    typeof expression === 'string'
      ? [sourcePlanSourceFragmentContribution(SourcePlanLanguage.TypeScript, expression)]
      : expression.contributions ?? [
          sourcePlanSourceFragmentContribution(SourcePlanLanguage.TypeScript, expression.text),
        ]);
}

const CONFIGURED_AURELIA_ENTRYPOINT_SOURCE = sourceText(`__ENTRYPOINT_IMPORTS__
Aurelia__CONFIGURATION_REGISTRATION_CHAIN__
  .app(__ROOT_COMPONENT_CLASS__)
  .start();
`);
