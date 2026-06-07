import {
  aureliaConfigurationAdmissionSourceSet,
  aureliaRouterConfigurationAdmissionSource,
} from '../source-plan/aurelia-configuration-admission-source.js';
import {
  SourcePlan,
  SourcePlanFileRole,
  SourcePlanLanguage,
  SourcePlanOperationKind,
  type SourcePlanFileArtifact,
} from '../source-plan/source-plan.js';
import type { TypeScriptImportRequirement } from '../source-plan/typescript-import-source.js';
import {
  authoredTemplateElementSource,
  authoredTemplateElementSourceText,
  authoredTemplateTextContentText,
} from '../template/authored-template-source.js';
import { AppBuilderResourceCarrier } from './aurelia-lowering-option.js';
import {
  appBuilderCustomElementClassSource,
  appBuilderCustomElementTypeScriptPreludeSource,
  appBuilderRootCustomElementSourceLayout,
  type AppBuilderCustomElementSourceLayout,
} from './custom-element-source-layout.js';
import {
  appBuilderRoutedCollectionDetailRouteAreaRootImports,
  appBuilderRoutedCollectionDetailRouteAreaSourceFrame,
  type AppBuilderRoutedCollectionDetailRouteAreaSourceFrame,
  type AppBuilderRoutedCollectionDetailSourceRequest,
} from './routed-collection-detail-source.js';
import {
  appBuilderRouteDecoratorFragment,
  appBuilderRouterLoadAttributeFragment,
  appBuilderViewportElementFragment,
} from './source-lowering-helpers.js';
import { AppBuilderSourcePlanAssembly } from './source-plan-assembly.js';
import { appBuilderPartSourceFragmentContributions } from './source-plan-contributions.js';
import { appBuilderApplicationAssemblySourcePattern } from './source-patterns.js';
import {
  appBuilderHtmlTemplateFileArtifact,
  type AppBuilderHtmlTemplateSource,
} from './template-source-plan.js';

/** Source request for assembling several generated app areas under one root route shell. */
export interface AppBuilderApplicationAssemblySourceRequest {
  /** SourcePlan root directory for the generated application. */
  readonly rootDir: string;
  /** Human-facing app name emitted into route titles and package tooling. */
  readonly appName: string;
  /** Custom-element source carrier selected for root and route components. */
  readonly carrier: AppBuilderResourceCarrier;
  /** Child routed browse/detail areas to assemble under the root route shell. */
  readonly routeAreas: readonly AppBuilderRoutedCollectionDetailSourceRequest[];
}

/** Build a multi-area routed application from child route-area source frames. */
export function appBuilderApplicationAssemblySourcePlan(
  request: AppBuilderApplicationAssemblySourceRequest,
): SourcePlan {
  const rootLayout = appBuilderRootCustomElementSourceLayout(request.carrier);
  const routeAreaFrames = request.routeAreas.map(appBuilderRoutedCollectionDetailRouteAreaSourceFrame);
  const routerAdmission = aureliaConfigurationAdmissionSourceSet([
    aureliaRouterConfigurationAdmissionSource(),
  ]);
  const assembly = new AppBuilderSourcePlanAssembly({
    rootDir: request.rootDir,
    appName: request.appName,
    dependencySpecifiers: routerAdmission.dependencySpecifiers,
  })
    .addConfiguredEntrypoint({
      entrypointPath: 'src/main.ts',
      rootComponentPath: rootLayout.componentPath,
      rootComponentClassName: rootLayout.className,
      configurationAdmission: routerAdmission,
    })
    .addFile(applicationAssemblyRootComponentFileArtifact(rootLayout, request.appName, routeAreaFrames))
    .addFile(applicationAssemblyRootTemplateFileArtifact(rootLayout, routeAreaFrames));
  for (const frame of routeAreaFrames) {
    for (const file of frame.files) {
      assembly.addFile(file);
    }
  }
  return assembly.build(appBuilderApplicationAssemblySourcePattern(request.carrier));
}

function applicationAssemblyRootComponentFileArtifact(
  rootLayout: AppBuilderCustomElementSourceLayout,
  appName: string,
  routeAreaFrames: readonly AppBuilderRoutedCollectionDetailRouteAreaSourceFrame[],
): SourcePlanFileArtifact {
  const routeDecorator = appBuilderRouteDecoratorFragment({
    title: appName,
    routes: [
      ...(routeAreaFrames[0] == null ? [] : [{ path: '', redirectTo: routeAreaFrames[0].navigationLink.path }]),
      ...routeAreaFrames.map((frame) => frame.routeConfig),
    ],
  });
  const routeDecoratorContributions = appBuilderPartSourceFragmentContributions(routeDecorator, SourcePlanLanguage.TypeScript);
  const prelude = appBuilderCustomElementTypeScriptPreludeSource(
    rootLayout,
    applicationAssemblyRootImports(rootLayout.componentPath, routeAreaFrames),
    routeDecoratorContributions,
  );
  return {
    path: rootLayout.componentPath,
    role: SourcePlanFileRole.RootComponent,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateComponentViewModel,
    text: appBuilderCustomElementClassSource(rootLayout, prelude, '', [routeDecorator.text]),
    contributions: prelude.contributions,
  };
}

function applicationAssemblyRootTemplateFileArtifact(
  rootLayout: AppBuilderCustomElementSourceLayout,
  routeAreaFrames: readonly AppBuilderRoutedCollectionDetailRouteAreaSourceFrame[],
): SourcePlanFileArtifact {
  return appBuilderHtmlTemplateFileArtifact(rootLayout.templatePath, applicationAssemblyRootTemplateSource(routeAreaFrames));
}

function applicationAssemblyRootTemplateSource(
  routeAreaFrames: readonly AppBuilderRoutedCollectionDetailRouteAreaSourceFrame[],
): AppBuilderHtmlTemplateSource {
  const loadFragments = routeAreaFrames.map((frame) =>
    appBuilderRouterLoadAttributeFragment(frame.navigationLink.path)
  );
  const viewport = appBuilderViewportElementFragment({ name: 'main' });
  return {
    text: `${authoredTemplateElementSourceText(authoredTemplateElementSource('main', [], null, [
      authoredTemplateElementSource('nav', [], null, routeAreaFrames.map((frame, index) =>
        authoredTemplateElementSource(
          'a',
          [loadFragments[index]!.templateAttribute],
          authoredTemplateTextContentText(frame.navigationLink.title),
        )
      )),
      viewport.templateElement,
    ]))}
`,
    fragments: [...loadFragments, viewport],
  };
}

function applicationAssemblyRootImports(
  rootComponentPath: string,
  routeAreaFrames: readonly AppBuilderRoutedCollectionDetailRouteAreaSourceFrame[],
): readonly TypeScriptImportRequirement[] {
  return routeAreaFrames.flatMap((frame) =>
    appBuilderRoutedCollectionDetailRouteAreaRootImports(frame, rootComponentPath)
  );
}
