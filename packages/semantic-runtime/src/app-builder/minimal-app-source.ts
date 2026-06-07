import { AppBuilderResourceCarrier } from './aurelia-lowering-option.js';
import {
  appBuilderRootCustomElementSourceLayout,
  appBuilderCustomElementClassSource,
  appBuilderCustomElementTypeScriptPreludeSource,
  type AppBuilderCustomElementSourceLayout,
} from './custom-element-source-layout.js';
import { appBuilderTextInterpolationFragment } from './source-lowering-helpers.js';
import {
  SourcePlan,
  type SourcePlanFileArtifact,
  SourcePlanFileRole,
  SourcePlanLanguage,
  SourcePlanOperationKind,
} from '../source-plan/source-plan.js';
import { appBuilderMinimalAppShellSourcePattern } from './source-patterns.js';
import { AppBuilderSourcePlanAssembly } from './source-plan-assembly.js';
import {
  appBuilderHtmlTemplateFileArtifact,
  type AppBuilderHtmlTemplateSource,
} from './template-source-plan.js';

export interface AppBuilderMinimalAppSourceRequest {
  readonly rootDir: string;
  readonly appName: string;
  readonly carrier: AppBuilderResourceCarrier;
}

interface AppBuilderMinimalAppSourceModel extends AppBuilderCustomElementSourceLayout {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
}

export function appBuilderMinimalAppSourcePlan(
  request: AppBuilderMinimalAppSourceRequest,
): SourcePlan {
  const model = normalizeMinimalAppSourceRequest(request);
  return new AppBuilderSourcePlanAssembly({
    rootDir: model.rootDir,
    appName: model.appName,
  })
    .addConfiguredEntrypoint({
      entrypointPath: model.entrypointPath,
      rootComponentPath: model.componentPath,
      rootComponentClassName: model.className,
    })
    .addFile(minimalRootComponentFileArtifact(model))
    .addFile(appBuilderHtmlTemplateFileArtifact(model.templatePath, minimalRootTemplateSource()))
    .build(appBuilderMinimalAppShellSourcePattern(model.carrier));
}

function normalizeMinimalAppSourceRequest(
  request: AppBuilderMinimalAppSourceRequest,
): AppBuilderMinimalAppSourceModel {
  const layout = appBuilderRootCustomElementSourceLayout(request.carrier);
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: 'src/main.ts',
    ...layout,
  };
}

function minimalRootComponentFileArtifact(
  model: AppBuilderMinimalAppSourceModel,
): SourcePlanFileArtifact {
  const prelude = appBuilderCustomElementTypeScriptPreludeSource(model);
  return {
    path: model.componentPath,
    role: SourcePlanFileRole.RootComponent,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateComponentViewModel,
    text: appBuilderCustomElementClassSource(model, prelude, "  message = 'Hello from Aurelia';\n"),
    contributions: prelude.contributions,
  };
}

function minimalRootTemplateSource(): AppBuilderHtmlTemplateSource {
  const message = appBuilderTextInterpolationFragment('message');
  return {
    text: `<main>
  <h1>${message.text}</h1>
</main>
`,
    fragments: [message],
  };
}
