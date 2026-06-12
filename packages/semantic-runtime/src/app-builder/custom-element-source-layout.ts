import { moduleSpecifier } from '../application/module-specifier.js';
import { uniqueStrings } from '../kernel/collections.js';
import { indentSourceLines } from '../source-plan/source-template.js';
import {
  SourcePlanLanguage,
  type SourcePlanContribution,
} from '../source-plan/source-plan.js';
import { type TypeScriptImportRequirement } from '../source-plan/typescript-import-source.js';
import { typeScriptSourceText } from '../source-plan/typescript-source-text.js';
import { AppBuilderResourceCarrier } from './aurelia-lowering-option.js';
import { appBuilderPartSourceFragmentContributions } from './source-plan-contributions.js';
import {
  appBuilderCustomElementDecoratorFragment,
  appBuilderCustomElementDefineCallExpressionFragment,
  appBuilderCustomElementStaticAuFragment,
} from './source-lowering-helpers.js';

/** File/name layout for one generated custom-element view-model plus its template. */
export interface AppBuilderCustomElementSourceLayout {
  readonly carrier: AppBuilderResourceCarrier;
  readonly componentPath: string;
  readonly templatePath: string;
  readonly className: string;
  readonly resourceName: string;
}

/** Explicit file/name request for a generated custom element. */
export interface AppBuilderCustomElementSourceLayoutRequest extends AppBuilderCustomElementSourceLayout {}

/** Import/decorator prelude for a generated custom-element view-model. */
export interface AppBuilderCustomElementTypeScriptPreludeSource {
  readonly text: string;
  readonly importText: string;
  readonly metadataDecoratorText: string;
  readonly classMemberText: string;
  readonly classEpilogueText: string;
  readonly contributions: readonly SourcePlanContribution[];
}

/** Resolve a custom-element layout and reject carriers that cannot establish custom elements yet. */
export function appBuilderCustomElementSourceLayout(
  request: AppBuilderCustomElementSourceLayoutRequest,
): AppBuilderCustomElementSourceLayout {
  assertSupportedCustomElementSourceCarrier(request.carrier);
  return request;
}

/** Resolve the root custom-element layout for the selected source carrier. */
export function appBuilderRootCustomElementSourceLayout(
  carrier: AppBuilderResourceCarrier,
): AppBuilderCustomElementSourceLayout {
  assertSupportedCustomElementSourceCarrier(carrier);
  switch (carrier) {
    case AppBuilderResourceCarrier.Convention:
      return {
        carrier,
        componentPath: 'src/my-app.ts',
        templatePath: 'src/my-app.html',
        className: 'MyApp',
        resourceName: 'my-app',
      };
    case AppBuilderResourceCarrier.Decorator:
    case AppBuilderResourceCarrier.StaticAu:
    case AppBuilderResourceCarrier.DefineCall:
      return {
        carrier,
        componentPath: 'src/app.ts',
        templatePath: 'src/app.html',
        className: 'App',
        resourceName: 'app-root',
      };
  }
  throw new Error(`App-builder custom-element source layout does not support carrier '${carrier}' yet.`);
}

/** Add `customElement` to an Aurelia import when the selected custom-element carrier needs it. */
export function appBuilderCustomElementAureliaImports(
  layout: AppBuilderCustomElementSourceLayout,
  namedImports: readonly string[] = [],
): readonly string[] {
  switch (layout.carrier) {
    case AppBuilderResourceCarrier.Decorator:
      return uniqueStrings(['customElement', ...namedImports]);
    case AppBuilderResourceCarrier.DefineCall:
      return uniqueStrings(['CustomElement', ...namedImports]);
    case AppBuilderResourceCarrier.Convention:
    case AppBuilderResourceCarrier.StaticAu:
    case AppBuilderResourceCarrier.AttributePatternCreate:
      return uniqueStrings(namedImports);
  }
}

/** Lower imports plus decorator metadata for a generated custom-element view-model. */
export function appBuilderCustomElementTypeScriptPreludeSource(
  layout: AppBuilderCustomElementSourceLayout,
  importRequirements: readonly TypeScriptImportRequirement[] = [],
  sourceContributions: readonly SourcePlanContribution[] = [],
): AppBuilderCustomElementTypeScriptPreludeSource {
  const decoratorFragment = layout.carrier === AppBuilderResourceCarrier.Decorator
    ? appBuilderCustomElementDecoratorFragment(layout.resourceName, 'template')
    : null;
  const staticAuFragment = layout.carrier === AppBuilderResourceCarrier.StaticAu
    ? appBuilderCustomElementStaticAuFragment(layout.resourceName, 'template')
    : null;
  const defineCallFragment = layout.carrier === AppBuilderResourceCarrier.DefineCall
    ? appBuilderCustomElementDefineCallExpressionFragment(layout.resourceName, layout.className, 'template')
    : null;
  const aureliaImports = decoratorFragment == null && defineCallFragment == null
    ? appBuilderCustomElementAureliaImports(layout)
    : [];
  const preludeImportRequirements: readonly TypeScriptImportRequirement[] = [
    ...(aureliaImports.length === 0 ? [] : [{ moduleSpecifier: 'aurelia', namedImports: aureliaImports }]),
    ...(requiresTemplateImport(layout.carrier)
      ? [{
          moduleSpecifier: moduleSpecifier(layout.componentPath, layout.templatePath, true),
          defaultImport: 'template',
        }]
      : []),
    ...importRequirements,
  ];
  const decoratorContributions = decoratorFragment == null
    ? []
    : appBuilderPartSourceFragmentContributions(decoratorFragment, SourcePlanLanguage.TypeScript);
  const staticAuContributions = staticAuFragment == null
    ? []
    : appBuilderPartSourceFragmentContributions(staticAuFragment, SourcePlanLanguage.TypeScript);
  const defineCallContributions = defineCallFragment == null
    ? []
    : appBuilderPartSourceFragmentContributions(defineCallFragment, SourcePlanLanguage.TypeScript);
  const contributions = [
    ...sourceContributions,
    ...decoratorContributions,
    ...staticAuContributions,
    ...defineCallContributions,
  ];
  const metadataDecoratorText = decoratorFragment == null ? '' : decoratorFragment.text;
  const importSource = typeScriptSourceText('', preludeImportRequirements, contributions);
  const prelude = typeScriptSourceText(
    metadataDecoratorText.length === 0 ? '' : `${metadataDecoratorText}\n`,
    preludeImportRequirements,
    contributions,
  );
  return {
    ...prelude,
    importText: importSource.text,
    metadataDecoratorText,
    classMemberText: staticAuFragment == null ? '' : `${indentSourceLines(staticAuFragment.text, '  ')}\n`,
    classEpilogueText: defineCallFragment == null ? '' : `\n${defineCallFragment.text};\n`,
  };
}

/** Compose a generated custom-element class with carrier-specific metadata source. */
export function appBuilderCustomElementClassSource(
  layout: AppBuilderCustomElementSourceLayout,
  prelude: AppBuilderCustomElementTypeScriptPreludeSource,
  classBodyText = '',
  decoratorTexts: readonly string[] = [],
  topLevelDeclarationText = '',
): string {
  const prefix = customElementClassPrefixSource(layout.carrier, prelude.importText);
  const topLevelDeclarations = topLevelDeclarationText.length === 0 ? '' : `${topLevelDeclarationText.trimEnd()}\n\n`;
  const carrierDecorator = prelude.metadataDecoratorText.length === 0 ? '' : `${prelude.metadataDecoratorText}\n`;
  const decorators = decoratorTexts.length === 0 ? '' : `${decoratorTexts.join('\n')}\n`;
  const classMembers = `${prelude.classMemberText}${classBodyText}`;
  const classSource = classMembers.length === 0
    ? `export class ${layout.className} {}`
    : `export class ${layout.className} {\n${classMembers}}`;
  return `${prefix}${topLevelDeclarations}${carrierDecorator}${decorators}${classSource}${prelude.classEpilogueText}`;
}

function requiresTemplateImport(
  carrier: AppBuilderResourceCarrier,
): boolean {
  switch (carrier) {
    case AppBuilderResourceCarrier.Decorator:
    case AppBuilderResourceCarrier.StaticAu:
    case AppBuilderResourceCarrier.DefineCall:
      return true;
    case AppBuilderResourceCarrier.Convention:
    case AppBuilderResourceCarrier.AttributePatternCreate:
      return false;
  }
}

function customElementClassPrefixSource(
  carrier: AppBuilderResourceCarrier,
  text: string,
): string {
  if (text.length === 0) {
    return '';
  }
  const trimmed = text.trimEnd();
  return carrier === AppBuilderResourceCarrier.Decorator
    ? `${trimmed}\n`
    : `${trimmed}\n\n`;
}

function assertSupportedCustomElementSourceCarrier(
  carrier: AppBuilderResourceCarrier,
): void {
  switch (carrier) {
    case AppBuilderResourceCarrier.Convention:
    case AppBuilderResourceCarrier.Decorator:
    case AppBuilderResourceCarrier.StaticAu:
    case AppBuilderResourceCarrier.DefineCall:
      return;
    case AppBuilderResourceCarrier.AttributePatternCreate:
      throw new Error(`App-builder custom-element source layout does not support carrier '${carrier}' yet.`);
  }
}
