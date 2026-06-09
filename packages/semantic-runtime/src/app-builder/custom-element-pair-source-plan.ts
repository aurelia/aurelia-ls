import {
  SourcePlan,
  SourcePlanAssembly,
  SourcePlanConflictPolicy,
  SourcePlanFileRole,
  SourcePlanFormattingPolicy,
  SourcePlanLanguage,
  SourcePlanOperationKind,
  SourcePlanPackageToolingPolicy,
  SourcePlanPolicy,
  SourcePlanTextAuthority,
  type SourcePattern,
  type SourcePlanFileArtifact,
} from '../source-plan/source-plan.js';
import {
  appBuilderCustomElementClassSource,
  appBuilderCustomElementSourceLayout,
  appBuilderCustomElementTypeScriptPreludeSource,
  type AppBuilderCustomElementSourceLayout,
} from './custom-element-source-layout.js';
import type { AureliaConfigurationAdmissionSourceSet } from '../source-plan/aurelia-configuration-admission-source.js';
import {
  appBuilderTypeScriptClassMemberFragmentsText,
} from './source-lowering-helpers.js';
import type {
  AppBuilderTypeScriptClassMemberPartSourceFragment,
  AppBuilderPartSourceFragment,
} from './part-source-invocation.js';
import {
  AppBuilderPartSourceFragmentKind,
} from './part-source-invocation.js';
import {
  appBuilderPartSourceFragmentsContributions,
} from './source-plan-contributions.js';
import {
  appBuilderHtmlTemplateFileArtifact,
} from './template-source-plan.js';
import {
  AppBuilderSourcePlanAssembly,
} from './source-plan-assembly.js';

/** Explicit custom-element companion files assembled from template and class-member source-lowering fragments. */
export interface AppBuilderCustomElementPairSourcePlanRequest {
  readonly rootDir: string;
  readonly layout: AppBuilderCustomElementSourceLayout;
  readonly componentFileRole?: SourcePlanFileRole;
  readonly supportFileArtifacts?: readonly SourcePlanFileArtifact[];
  readonly templateFileTextFragments: readonly AppBuilderPartSourceFragment[];
  readonly templateContributionFragments: readonly AppBuilderPartSourceFragment[];
  readonly typeScriptTopLevelFragments?: readonly AppBuilderPartSourceFragment[];
  readonly classMemberFragments: readonly AppBuilderPartSourceFragment[];
}

/** Custom-element pair request elevated to a runnable root app-shell SourcePlan. */
export interface AppBuilderRootCustomElementPairSourcePlanRequest extends AppBuilderCustomElementPairSourcePlanRequest {
  readonly appName: string;
  readonly entrypointPath?: string;
  readonly dependencySpecifiers?: readonly string[];
  readonly configurationAdmission?: AureliaConfigurationAdmissionSourceSet;
  readonly pattern?: SourcePattern | null;
}

/** Build a custom-element companion SourcePlan from already-lowered template and class-member fragments. */
export function appBuilderCustomElementPairSourcePlan(
  request: AppBuilderCustomElementPairSourcePlanRequest,
): SourcePlan {
  const layout = appBuilderCustomElementSourceLayout(request.layout);
  const assembly = new SourcePlanAssembly(
    request.rootDir,
    new SourcePlanPolicy(
      SourcePlanConflictPolicy.MustNotExist,
      SourcePlanFormattingPolicy.AppBuilderBaseline,
      SourcePlanPackageToolingPolicy.NotModeled,
    ),
    SourcePlanTextAuthority.AppBuilderGenerated,
  )
    .addFile(appBuilderCustomElementClassFileArtifact(layout, {
      componentFileRole: request.componentFileRole,
      typeScriptTopLevelFragments: request.typeScriptTopLevelFragments ?? [],
      classMemberFragments: request.classMemberFragments,
    }))
    .addFile(appBuilderHtmlTemplateFileArtifact(layout.templatePath, {
      text: request.templateFileTextFragments.map((fragment) => fragment.text).join('\n'),
      fragments: request.templateContributionFragments,
    }));
  for (const artifact of request.supportFileArtifacts ?? []) {
    assembly.addFile(artifact);
  }
  return assembly.build();
}

/** Build a runnable Aurelia app whose root component is assembled from component-pair fragments. */
export function appBuilderRootCustomElementPairSourcePlan(
  request: AppBuilderRootCustomElementPairSourcePlanRequest,
): SourcePlan {
  const layout = appBuilderCustomElementSourceLayout(request.layout);
  const assembly = new AppBuilderSourcePlanAssembly({
    rootDir: request.rootDir,
    appName: request.appName,
    dependencySpecifiers: request.dependencySpecifiers,
  })
    .addConfiguredEntrypoint({
      entrypointPath: request.entrypointPath ?? 'src/main.ts',
      rootComponentPath: layout.componentPath,
      rootComponentClassName: layout.className,
      rootElementName: layout.resourceName,
      configurationAdmission: request.configurationAdmission,
    })
    .addFile(appBuilderCustomElementClassFileArtifact(layout, {
      componentFileRole: SourcePlanFileRole.RootComponent,
      typeScriptTopLevelFragments: request.typeScriptTopLevelFragments ?? [],
      classMemberFragments: request.classMemberFragments,
    }))
    .addFile(appBuilderHtmlTemplateFileArtifact(layout.templatePath, {
      text: request.templateFileTextFragments.map((fragment) => fragment.text).join('\n'),
      fragments: request.templateContributionFragments,
    }));
  for (const artifact of request.supportFileArtifacts ?? []) {
    assembly.addFile(artifact);
  }
  return assembly.build(request.pattern ?? null);
}

/** Build a component view-model artifact from class-member fragments and carrier-specific metadata. */
export function appBuilderCustomElementClassFileArtifact(
  layout: AppBuilderCustomElementSourceLayout,
  fragments: {
    readonly componentFileRole?: SourcePlanFileRole;
    readonly typeScriptTopLevelFragments?: readonly AppBuilderPartSourceFragment[];
    readonly classMemberFragments: readonly AppBuilderPartSourceFragment[];
  },
): SourcePlanFileArtifact {
  const typeScriptFragments = [
    ...(fragments.typeScriptTopLevelFragments ?? []),
    ...fragments.classMemberFragments,
  ];
  const typeScriptContributions = appBuilderPartSourceFragmentsContributions(
    typeScriptFragments,
    SourcePlanLanguage.TypeScript,
  );
  const prelude = appBuilderCustomElementTypeScriptPreludeSource(
    layout,
    typeScriptFragments.flatMap((fragment) => fragment.requiredImports ?? []),
    typeScriptContributions,
  );
  return {
    path: layout.componentPath,
    role: fragments.componentFileRole ?? SourcePlanFileRole.Component,
    language: SourcePlanLanguage.TypeScript,
    operationKind: SourcePlanOperationKind.CreateComponentViewModel,
    text: appBuilderCustomElementClassSource(
      layout,
      prelude,
      classMemberBodyText(fragments.classMemberFragments),
      [],
      typeScriptTopLevelDeclarationText(fragments.typeScriptTopLevelFragments ?? []),
    ),
    contributions: prelude.contributions,
  };
}

function classMemberBodyText(
  fragments: readonly AppBuilderPartSourceFragment[],
): string {
  if (fragments.length === 0) {
    return '';
  }
  return `${appBuilderTypeScriptClassMemberFragmentsText(
    fragments.filter(isTypeScriptClassMemberFragment),
  )}\n`;
}

function isTypeScriptClassMemberFragment(
  fragment: AppBuilderPartSourceFragment,
): fragment is AppBuilderTypeScriptClassMemberPartSourceFragment {
  return fragment.kind === AppBuilderPartSourceFragmentKind.TypeScriptClassMember;
}

function typeScriptTopLevelDeclarationText(
  fragments: readonly AppBuilderPartSourceFragment[],
): string {
  return fragments
    .map((fragment) => fragment.text)
    .filter((text) => text.length > 0)
    .join('\n\n');
}
