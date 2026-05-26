import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
  ExpectedSemanticEffectCardinality,
  ExpectedSemanticEffectKind,
  ExpectedSemanticEffectScope,
  ExpectedSemanticEffectTopologyNodeKind,
} from './expected-effect.js';

export function projectToolingExpectedEffects(
  appDescription: string,
): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.fact(
      `${appDescription} has package manifest tooling.`,
      ExpectedSemanticEffectKind.ProjectTooling,
      ExpectedSemanticEffectScope.Project,
      ExpectedSemanticEffectTopologyNodeKind.PackageManifest,
      ExpectedSemanticEffectCardinality.Present,
      null,
      [new ExpectedSemanticEffectFilter('role', 'package-manifest')],
    ),
    ExpectedSemanticEffect.fact(
      `${appDescription} has TypeScript project tooling.`,
      ExpectedSemanticEffectKind.ProjectTooling,
      ExpectedSemanticEffectScope.Project,
      ExpectedSemanticEffectTopologyNodeKind.BuildTool,
      ExpectedSemanticEffectCardinality.Present,
      null,
      [new ExpectedSemanticEffectFilter('role', 'tooling-config')],
    ),
    ExpectedSemanticEffect.fact(
      `${appDescription} has local asset module declarations.`,
      ExpectedSemanticEffectKind.ProjectTooling,
      ExpectedSemanticEffectScope.Project,
      ExpectedSemanticEffectTopologyNodeKind.BuildTool,
      ExpectedSemanticEffectCardinality.Present,
      null,
      [new ExpectedSemanticEffectFilter('role', 'declaration')],
    ),
  ];
}
