import {
  ApplicationImport,
  ApplicationTopology,
  ApplicationTopologyBuilder,
} from '../application/index.js';
import {
  AuthoringIntent,
  AuthoringPlan,
  AuthoringPlanStep,
  AuthoringPrecondition,
} from './plan.js';
import { ExpectedSemanticEffect } from './expected-effect.js';
import { AuthoringPreference } from './ontology.js';
import { minimalAppSourcePlan } from './minimal-app-source-plan.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';
import {
  entrypointPlanStep,
  externalTemplatePlanStep,
  projectFilesPlanStep,
  rootComponentPlanStep,
  verifyAppPlanStep,
} from './recipe-plan-steps.js';

export interface MinimalAppRecipeRequest {
  /** Project root that the authored app should occupy. */
  readonly rootDir: string;
  /** User-facing app name for plan summaries. */
  readonly appName: string;
  /** Entrypoint source path, usually `src/main.ts`. */
  readonly entrypointPath?: string;
  /** Root component source path, usually `src/app.ts`. */
  readonly rootComponentPath?: string;
  /** Root component template path, usually `src/app.html`. */
  readonly rootTemplatePath?: string;
  /** Root component class name. */
  readonly rootComponentClassName?: string;
  /** Root custom element name. */
  readonly rootElementName?: string;
}

interface MinimalAppRecipeModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
}

export function buildMinimalAppPlan(request: MinimalAppRecipeRequest): AuthoringPlan {
  const model = normalizeMinimalAppRecipe(request);
  const topology = minimalAppTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      `Create ${model.appName} as a minimal Aurelia app with an external root template.`,
      topology,
      null,
      [
        new AuthoringPreference('resource-declaration-mode', 'decorator-resource-declaration'),
        new AuthoringPreference('template-source-ownership', 'external-template-file'),
        new AuthoringPreference('package-topology', 'single-app-package'),
        new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
      ],
    ),
    minimalAppPreconditions(),
    minimalAppPlanSteps(model, topology),
    topology,
    minimalAppSourcePlan(model),
  );
}

function normalizeMinimalAppRecipe(request: MinimalAppRecipeRequest): MinimalAppRecipeModel {
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: request.entrypointPath ?? 'src/main.ts',
    rootComponentPath: request.rootComponentPath ?? 'src/app.ts',
    rootTemplatePath: request.rootTemplatePath ?? 'src/app.html',
    rootComponentClassName: request.rootComponentClassName ?? 'App',
    rootElementName: request.rootElementName ?? 'app-root',
  };
}

function minimalAppPreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia package and TypeScript module resolution are available.'),
  ];
}

function minimalAppPlanSteps(
  model: MinimalAppRecipeModel,
  topology: ApplicationTopology,
): readonly AuthoringPlanStep[] {
  return [
    projectFilesPlanStep([
      model.entrypointPath,
      model.rootComponentPath,
      model.rootTemplatePath,
    ]),
    entrypointPlanStep(model.entrypointPath, model.rootComponentClassName),
    rootComponentPlanStep(
      model.rootComponentPath,
      model.rootComponentClassName,
      model.rootElementName,
      [
        ExpectedSemanticEffect.signatureTaste('Minimal app should use explicit decorator resource declaration.', 'resource-declaration-mode', 'decorator-resource-declaration', 'custom-element'),
      ],
    ),
    externalTemplatePlanStep(
      model.rootTemplatePath,
      model.rootComponentClassName,
      'Root component',
      [
        ExpectedSemanticEffect.signatureTaste('Minimal app should use an external root template.', 'template-source-ownership', 'external-template-file', 'template'),
      ],
    ),
    verifyAppPlanStep(topology, minimalAppExpectedEffects()),
  ];
}

function minimalAppTopology(model: MinimalAppRecipeModel): ApplicationTopology {
  const builder = new ApplicationTopologyBuilder(model.rootDir);
  const root = builder.component({
    className: model.rootComponentClassName,
    referenceFromPath: model.entrypointPath,
    sourcePath: model.rootComponentPath,
    elementName: model.rootElementName,
    templatePath: model.rootTemplatePath,
  });
  builder.entrypoint({
    path: model.entrypointPath,
    startupLane: 'Aurelia.app(...).start()',
    rootComponent: root.reference,
    imports: [
      new ApplicationImport('aurelia', [], 'Aurelia'),
      new ApplicationImport(root.reference.moduleSpecifier, [model.rootComponentClassName]),
    ],
  });
  return builder.toTopology();
}

function minimalAppExpectedEffects(): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.fact('Minimal app reopens as an Aurelia project.', 'project-shape'),
    ...projectToolingExpectedEffects('Minimal app'),
    ExpectedSemanticEffect.fact('Minimal app has an app root.', 'app-root'),
    ExpectedSemanticEffect.atLeast('Minimal app has a root custom element.', 'component', 'resource', 1, 'app-root'),
    ExpectedSemanticEffect.signatureAtLeast('Minimal app has an external root template.', 'external-template', 'template', 1, 'template'),
    ExpectedSemanticEffect.atLeast('Minimal app has compiled template facts.', 'template-compilation', 'template', 1, 'template'),
    ExpectedSemanticEffect.fact('Minimal app has runtime controller facts.', 'runtime-controller', 'template', 'component'),
    ExpectedSemanticEffect.absent('Minimal app has no open semantic seams.', 'open-seam-closure'),
    ExpectedSemanticEffect.capability('Minimal app exposes verifiable app-shell authoring.', 'app-shell', 'verifiable'),
    ExpectedSemanticEffect.capability('Minimal app exposes verifiable external-template authoring.', 'external-template', 'verifiable'),
    ExpectedSemanticEffect.capability('Minimal app exposes closed-loop verification.', 'closed-loop-verification', 'verifiable'),
    ExpectedSemanticEffect.signatureTaste('Minimal app reports decorator resource declaration.', 'resource-declaration-mode', 'decorator-resource-declaration', 'custom-element'),
    ExpectedSemanticEffect.signatureTaste('Minimal app reports external template ownership.', 'template-source-ownership', 'external-template-file', 'template'),
    ExpectedSemanticEffect.signatureTaste('Minimal app reports single-package topology.', 'package-topology', 'single-app-package', 'workspace'),
  ];
}
