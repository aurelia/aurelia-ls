import {
  BuiltInResourcePackage,
  builtInResourcePackageModuleSpecifier,
} from '../resources/built-in-resources.js';
import { uniqueStrings } from '../kernel/collections.js';
import { AureliaConfigurationAdmissionKind } from './aurelia-configuration-admission-kind.js';
import {
  aureliaEntrypointRegistrationExpressionSource,
  aureliaEntrypointRegistrationExpressionText,
  type AureliaEntrypointImport,
  type AureliaEntrypointRegistrationExpression,
} from './aurelia-entrypoint-source-plan.js';
import {
  SourcePlanLanguage,
  sourcePlanAureliaConfigurationAdmissionOrigin,
  sourcePlanSourceFragmentContribution,
  sourcePlanTypeScriptImportContribution,
} from './source-plan.js';
import { singleQuotedTypeScriptStringLiteralText } from './source-template.js';
import type { TypeScriptImportRequirement } from './typescript-import-source.js';

/** Source contribution needed to admit one Aurelia framework configuration into an app entrypoint. */
export interface AureliaConfigurationAdmissionSource {
  readonly kind: AureliaConfigurationAdmissionKind;
  readonly dependencySpecifiers: readonly string[];
  readonly configurationImports: readonly AureliaEntrypointImport[];
  readonly registrationExpressions: readonly AureliaEntrypointRegistrationExpression[];
}

/** Entrypoint imports, registrations, and package dependencies for one or more framework admissions. */
export interface AureliaConfigurationAdmissionSourceSet {
  readonly dependencySpecifiers: readonly string[];
  readonly configurationImports: readonly AureliaEntrypointImport[];
  readonly registrationExpressions: readonly AureliaEntrypointRegistrationExpression[];
}

export interface AureliaRouterConfigurationAdmissionSourceModel {
  readonly registrationExpression?: string;
}

export interface AureliaStateDefaultConfigurationAdmissionSourceModel {
  readonly stateModuleSpecifier: string;
  readonly initialStateName: string;
  readonly handlerName: string;
  readonly namedStores?: readonly AureliaNamedStateStoreAdmissionSourceModel[];
}

export interface AureliaNamedStateStoreAdmissionSourceModel {
  readonly storeName: string;
  readonly initialStateName: string;
  readonly handlerName: string;
  readonly stateModuleSpecifier?: string;
}

export interface AureliaI18nConfigurationAdmissionSourceModel {
  readonly registrationExpression?: string;
  readonly initOptionsExpression?: string;
}

export interface AureliaValidationHtmlConfigurationAdmissionSourceModel {
  readonly registrationExpression?: string;
}

export interface AureliaUiVirtualizationConfigurationAdmissionSourceModel {
  readonly registrationExpression?: string;
}

/** Entrypoint source contribution for registering @aurelia/router's RouterConfiguration. */
export function aureliaRouterConfigurationAdmissionSource(
  model: AureliaRouterConfigurationAdmissionSourceModel = {},
): AureliaConfigurationAdmissionSource {
  return aureliaConfigurationAdmissionSource(
    AureliaConfigurationAdmissionKind.RouterConfiguration,
    BuiltInResourcePackage.Router,
    'RouterConfiguration',
    model.registrationExpression ?? 'RouterConfiguration',
  );
}

/** Entrypoint source contribution for registering @aurelia/state's StateDefaultConfiguration. */
export function aureliaStateDefaultConfigurationAdmissionSource(
  model: AureliaStateDefaultConfigurationAdmissionSourceModel,
): AureliaConfigurationAdmissionSource {
  const stateModuleImports = [
    aureliaConfigurationAdmissionImport(AureliaConfigurationAdmissionKind.StateDefaultConfiguration, {
      moduleSpecifier: model.stateModuleSpecifier,
      namedImports: [model.handlerName, model.initialStateName],
    }),
    ...(model.namedStores ?? []).map((store) => aureliaConfigurationAdmissionImport(
      AureliaConfigurationAdmissionKind.StateDefaultConfiguration,
      {
      moduleSpecifier: store.stateModuleSpecifier ?? model.stateModuleSpecifier,
      namedImports: [store.handlerName, store.initialStateName],
      },
    )),
  ];
  return {
    kind: AureliaConfigurationAdmissionKind.StateDefaultConfiguration,
    dependencySpecifiers: [builtInResourcePackageModuleSpecifier(BuiltInResourcePackage.State)],
    configurationImports: [
      aureliaConfigurationAdmissionImport(AureliaConfigurationAdmissionKind.StateDefaultConfiguration, {
        moduleSpecifier: builtInResourcePackageModuleSpecifier(BuiltInResourcePackage.State),
        namedImports: ['StateDefaultConfiguration'],
      }),
      ...stateModuleImports,
    ],
    registrationExpressions: [
      aureliaConfigurationAdmissionRegistrationExpression(
        AureliaConfigurationAdmissionKind.StateDefaultConfiguration,
        stateDefaultConfigurationRegistrationExpression(model),
      ),
    ],
  };
}

/** Entrypoint source contribution for registering @aurelia/i18n's I18nConfiguration. */
export function aureliaI18nConfigurationAdmissionSource(
  model: AureliaI18nConfigurationAdmissionSourceModel = {},
): AureliaConfigurationAdmissionSource {
  return aureliaConfigurationAdmissionSource(
    AureliaConfigurationAdmissionKind.I18nConfiguration,
    BuiltInResourcePackage.I18n,
    'I18nConfiguration',
    model.registrationExpression ?? i18nConfigurationRegistrationExpression(model.initOptionsExpression),
  );
}

/** Entrypoint source contribution for registering @aurelia/validation-html's ValidationHtmlConfiguration. */
export function aureliaValidationHtmlConfigurationAdmissionSource(
  model: AureliaValidationHtmlConfigurationAdmissionSourceModel = {},
): AureliaConfigurationAdmissionSource {
  const source = aureliaConfigurationAdmissionSource(
    AureliaConfigurationAdmissionKind.ValidationHtmlConfiguration,
    BuiltInResourcePackage.ValidationHtml,
    'ValidationHtmlConfiguration',
    model.registrationExpression ?? 'ValidationHtmlConfiguration',
  );
  return {
    ...source,
    dependencySpecifiers: [...source.dependencySpecifiers, '@aurelia/validation'],
  };
}

/** Entrypoint source contribution for registering @aurelia/ui-virtualization's default configuration. */
export function aureliaUiVirtualizationConfigurationAdmissionSource(
  model: AureliaUiVirtualizationConfigurationAdmissionSourceModel = {},
): AureliaConfigurationAdmissionSource {
  return aureliaConfigurationAdmissionSource(
    AureliaConfigurationAdmissionKind.UiVirtualizationDefaultConfiguration,
    BuiltInResourcePackage.UiVirtualization,
    'DefaultVirtualizationConfiguration',
    model.registrationExpression ?? 'DefaultVirtualizationConfiguration',
  );
}

/** Merge several framework configuration admissions into one entrypoint contribution. */
export function aureliaConfigurationAdmissionSourceSet(
  sources: readonly AureliaConfigurationAdmissionSource[],
): AureliaConfigurationAdmissionSourceSet {
  return {
    dependencySpecifiers: uniqueStrings(sources.flatMap((source) => source.dependencySpecifiers)),
    configurationImports: sources.flatMap((source) => source.configurationImports),
    registrationExpressions: uniqueAureliaRegistrationExpressions(sources.flatMap((source) => source.registrationExpressions)),
  };
}

function aureliaConfigurationAdmissionSource(
  kind: AureliaConfigurationAdmissionKind,
  packageId: BuiltInResourcePackage,
  namedImport: string,
  registrationExpression: string,
): AureliaConfigurationAdmissionSource {
  const moduleSpecifier = builtInResourcePackageModuleSpecifier(packageId);
  return {
    kind,
    dependencySpecifiers: [moduleSpecifier],
    configurationImports: [
      aureliaConfigurationAdmissionImport(kind, {
        moduleSpecifier,
        namedImports: [namedImport],
      }),
    ],
    registrationExpressions: [aureliaConfigurationAdmissionRegistrationExpression(kind, registrationExpression)],
  };
}

function aureliaConfigurationAdmissionImport(
  kind: AureliaConfigurationAdmissionKind,
  importRequirement: TypeScriptImportRequirement,
): AureliaEntrypointImport {
  const origin = sourcePlanAureliaConfigurationAdmissionOrigin(kind);
  return {
    ...importRequirement,
    contributions: [sourcePlanTypeScriptImportContribution(importRequirement, origin)],
  };
}

function aureliaConfigurationAdmissionRegistrationExpression(
  kind: AureliaConfigurationAdmissionKind,
  text: string,
): AureliaEntrypointRegistrationExpression {
  const origin = sourcePlanAureliaConfigurationAdmissionOrigin(kind);
  return aureliaEntrypointRegistrationExpressionSource(text, [
    sourcePlanSourceFragmentContribution(
      SourcePlanLanguage.TypeScript,
      text,
      origin,
    ),
  ]);
}

function uniqueAureliaRegistrationExpressions(
  expressions: readonly AureliaEntrypointRegistrationExpression[],
): readonly AureliaEntrypointRegistrationExpression[] {
  const seen = new Set<string>();
  const result: AureliaEntrypointRegistrationExpression[] = [];
  for (const expression of expressions) {
    const text = aureliaEntrypointRegistrationExpressionText(expression);
    if (seen.has(text)) {
      continue;
    }
    seen.add(text);
    result.push(expression);
  }
  return result;
}

function stateDefaultConfigurationRegistrationExpression(
  model: AureliaStateDefaultConfigurationAdmissionSourceModel,
): string {
  const base = `StateDefaultConfiguration.init(${model.initialStateName}, ${model.handlerName})`;
  const namedStores = model.namedStores ?? [];
  if (namedStores.length === 0) {
    return base;
  }
  return [
    base,
    ...namedStores.map((store) =>
      `  .withStore(${singleQuotedTypeScriptStringLiteralText(store.storeName)}, ${store.initialStateName}, ${store.handlerName})`
    ),
  ].join('\n');
}

function i18nConfigurationRegistrationExpression(
  initOptionsExpression: string | undefined,
): string {
  if (initOptionsExpression == null || initOptionsExpression.trim().length === 0) {
    return 'I18nConfiguration';
  }
  return `I18nConfiguration.customize((options) => {
  options.initOptions = ${continuationIndentedExpression(initOptionsExpression.trim(), '  ')};
})`;
}

function continuationIndentedExpression(
  expression: string,
  indent: string,
): string {
  const lines = expression.split('\n');
  const first = lines[0] ?? '';
  const rest = lines.slice(1).map((line) => `${indent}${line}`);
  return [first, ...rest].join('\n');
}
