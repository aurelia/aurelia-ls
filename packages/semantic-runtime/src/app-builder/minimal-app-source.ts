import { moduleSpecifier } from '../application/module-specifier.js';
import { AppBuilderResourceDeclarationMode } from './aurelia-lowering-option.js';
import {
  SourcePlan,
  SourcePlanConflictPolicy,
  SourcePlanEditKind,
  SourcePlanFile,
  SourcePlanFileRole,
  SourcePlanFormattingPolicy,
  SourcePlanLanguage,
  SourcePlanPackageToolingPolicy,
  SourcePlanPolicy,
  SourcePlanText,
  SourcePlanTextAuthority,
} from '../source-plan/source-plan.js';

export interface AppBuilderMinimalAppSourceRequest {
  readonly rootDir: string;
  readonly appName: string;
  readonly declarationMode: AppBuilderResourceDeclarationMode;
}

interface AppBuilderMinimalAppSourceModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
  readonly declarationMode: AppBuilderResourceDeclarationMode;
}

export function appBuilderMinimalAppSourcePlan(
  request: AppBuilderMinimalAppSourceRequest,
): SourcePlan {
  const model = normalizeMinimalAppSourceRequest(request);
  return new SourcePlan(
    model.rootDir,
    new SourcePlanPolicy(
      SourcePlanConflictPolicy.MustNotExist,
      SourcePlanFormattingPolicy.AppBuilderBaseline,
      SourcePlanPackageToolingPolicy.NotModeled,
    ),
    [
      new SourcePlanFile(
        model.entrypointPath,
        SourcePlanFileRole.Entrypoint,
        SourcePlanLanguage.TypeScript,
        SourcePlanEditKind.Create,
        null,
        new SourcePlanText(minimalEntrypointSource(model), SourcePlanTextAuthority.AppBuilderGenerated),
      ),
      new SourcePlanFile(
        model.rootComponentPath,
        SourcePlanFileRole.RootComponent,
        SourcePlanLanguage.TypeScript,
        SourcePlanEditKind.Create,
        null,
        new SourcePlanText(minimalRootComponentSource(model), SourcePlanTextAuthority.AppBuilderGenerated),
      ),
      new SourcePlanFile(
        model.rootTemplatePath,
        SourcePlanFileRole.Template,
        SourcePlanLanguage.Html,
        SourcePlanEditKind.Create,
        null,
        new SourcePlanText(minimalRootTemplateSource(), SourcePlanTextAuthority.AppBuilderGenerated),
      ),
    ],
  );
}

function normalizeMinimalAppSourceRequest(
  request: AppBuilderMinimalAppSourceRequest,
): AppBuilderMinimalAppSourceModel {
  if (request.declarationMode === AppBuilderResourceDeclarationMode.ConventionResource) {
    return {
      rootDir: request.rootDir,
      appName: request.appName,
      entrypointPath: 'src/main.ts',
      rootComponentPath: 'src/my-app.ts',
      rootTemplatePath: 'src/my-app.html',
      rootComponentClassName: 'MyApp',
      rootElementName: 'my-app',
      declarationMode: request.declarationMode,
    };
  }
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: 'src/main.ts',
    rootComponentPath: 'src/app.ts',
    rootTemplatePath: 'src/app.html',
    rootComponentClassName: 'App',
    rootElementName: 'app-root',
    declarationMode: request.declarationMode,
  };
}

function minimalEntrypointSource(
  model: AppBuilderMinimalAppSourceModel,
): string {
  return `import Aurelia from 'aurelia';
import { ${model.rootComponentClassName} } from '${moduleSpecifier(model.entrypointPath, model.rootComponentPath, false)}';

Aurelia
  .app(${model.rootComponentClassName})
  .start();
`;
}

function minimalRootComponentSource(
  model: AppBuilderMinimalAppSourceModel,
): string {
  if (model.declarationMode === AppBuilderResourceDeclarationMode.ConventionResource) {
    return `export class ${model.rootComponentClassName} {
  message = 'Hello from Aurelia';
}
`;
  }

  return `import { customElement } from 'aurelia';
import template from '${moduleSpecifier(model.rootComponentPath, model.rootTemplatePath, true)}';

@customElement({
  name: '${model.rootElementName}',
  template,
})
export class ${model.rootComponentClassName} {
  message = 'Hello from Aurelia';
}
`;
}

function minimalRootTemplateSource(): string {
  return `<main>
  <h1>\${message}</h1>
</main>
`;
}
