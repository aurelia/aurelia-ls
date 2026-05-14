import {
  ExpectedSemanticEffect,
  ExpectedSemanticEffectFilter,
} from './expected-effect.js';

export function projectToolingExpectedEffects(
  appDescription: string,
): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.fact(
      `${appDescription} has package manifest tooling.`,
      'project-tooling',
      'project',
      'package-manifest',
      'present',
      null,
      [new ExpectedSemanticEffectFilter('role', 'package-manifest')],
    ),
    ExpectedSemanticEffect.fact(
      `${appDescription} has TypeScript project tooling.`,
      'project-tooling',
      'project',
      'build-tool',
      'present',
      null,
      [new ExpectedSemanticEffectFilter('role', 'tooling-config')],
    ),
    ExpectedSemanticEffect.fact(
      `${appDescription} has local asset module declarations.`,
      'project-tooling',
      'project',
      'build-tool',
      'present',
      null,
      [new ExpectedSemanticEffectFilter('role', 'declaration')],
    ),
    ExpectedSemanticEffect.taste(
      `${appDescription} reports typecheck-only project tooling after reopen.`,
      'build-tool-profile',
      'typecheck-only-tooling',
      'build-tool',
    ),
  ];
}
