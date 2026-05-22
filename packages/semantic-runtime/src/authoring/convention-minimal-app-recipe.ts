import path from 'node:path';

import {
  ApplicationImport,
  ApplicationTopology,
  ApplicationTopologyBuilder,
} from '../application/index.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  conventionalResourceNameForFilePath,
  isConventionResourceNameCompatible,
  readResourceNameConvention,
} from '../resources/resource-convention.js';
import {
  AuthoringIntent,
  AuthoringPlan,
  AuthoringPlanStep,
  AuthoringPrecondition,
} from './plan.js';
import { ExpectedSemanticEffect } from './expected-effect.js';
import { AuthoringPreference } from './ontology.js';
import {
  conventionMinimalAppSourcePlan,
  conventionTemplatePathForSource,
} from './convention-minimal-app-source-plan.js';
import { projectToolingExpectedEffects } from './project-tooling-expected-effects.js';
import {
  entrypointPlanStep,
  externalTemplatePlanStep,
  projectFilesPlanStep,
  rootComponentPlanStep,
  verifyAppPlanStep,
} from './recipe-plan-steps.js';

export interface ConventionMinimalAppRecipeRequest {
  /** Project root that the authored app should occupy. */
  readonly rootDir: string;
  /** User-facing app name for plan summaries. */
  readonly appName: string;
  /** Entrypoint source path, usually `src/main.ts`. */
  readonly entrypointPath?: string;
  /** Root component source path, usually `src/my-app.ts`. */
  readonly rootComponentPath?: string;
  /** Root component template path. Must match the currently modeled convention template pair. */
  readonly rootTemplatePath?: string;
  /** Root component class name. Must derive the same convention name as the source file. */
  readonly rootComponentClassName?: string;
  /** Root custom element name. Defaults to the class/file convention name. */
  readonly rootElementName?: string;
}

interface ConventionMinimalAppRecipeModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly entrypointPath: string;
  readonly rootComponentPath: string;
  readonly rootTemplatePath: string;
  readonly rootComponentClassName: string;
  readonly rootElementName: string;
}

export function buildConventionMinimalAppPlan(request: ConventionMinimalAppRecipeRequest): AuthoringPlan {
  const model = normalizeConventionMinimalAppRecipe(request);
  const topology = conventionMinimalAppTopology(model);

  return new AuthoringPlan(
    new AuthoringIntent(
      `Create ${model.appName} as a minimal Aurelia app using the currently modeled source/template conventions.`,
      topology,
      null,
      [
        new AuthoringPreference('resource-declaration-mode', 'legacy-convention-resource-declaration'),
        new AuthoringPreference('resource-admission-mode', 'convention-discovery-admission'),
        new AuthoringPreference('template-source-ownership', 'convention-template-file'),
        new AuthoringPreference('package-topology', 'single-app-package'),
        new AuthoringPreference('build-tool-profile', 'host-selected-build-tool'),
      ],
    ),
    conventionMinimalAppPreconditions(),
    conventionMinimalAppPlanSteps(model, topology),
    topology,
    conventionMinimalAppSourcePlan(model),
  );
}

function normalizeConventionMinimalAppRecipe(request: ConventionMinimalAppRecipeRequest): ConventionMinimalAppRecipeModel {
  const rootComponentPath = request.rootComponentPath ?? 'src/my-app.ts';
  const rootTemplatePath = request.rootTemplatePath ?? conventionTemplatePathForSource(rootComponentPath);
  const rootComponentClassName = request.rootComponentClassName ?? 'MyApp';
  const rootElementName = request.rootElementName ?? requiredCustomElementConventionName(rootComponentClassName);
  assertConventionRootShape(rootComponentClassName, rootElementName, rootComponentPath, rootTemplatePath);
  return {
    rootDir: request.rootDir,
    appName: request.appName,
    entrypointPath: request.entrypointPath ?? 'src/main.ts',
    rootComponentPath,
    rootTemplatePath,
    rootComponentClassName,
    rootElementName,
  };
}

function requiredCustomElementConventionName(className: string): string {
  const convention = readResourceNameConvention(className);
  if (convention?.resourceKind !== ResourceDefinitionKind.CustomElement) {
    throw new Error(`Class ${className} does not derive a custom-element convention name.`);
  }
  return convention.name;
}

function assertConventionRootShape(
  className: string,
  elementName: string,
  componentPath: string,
  templatePath: string,
): void {
  const conventionName = requiredCustomElementConventionName(className);
  const fileConventionName = conventionalResourceNameForFilePath(componentPath);
  if (elementName !== conventionName) {
    throw new Error(`Convention root element '${elementName}' does not match class convention '${conventionName}'.`);
  }
  if (!isConventionResourceNameCompatible(conventionName, fileConventionName)) {
    throw new Error(`Convention root class ${className} is not compatible with source file '${componentPath}'.`);
  }
  if (!conventionalTemplatePathsForSource(componentPath).includes(normalizePath(templatePath))) {
    throw new Error(`Convention root template '${templatePath}' is not a recognized template pair for '${componentPath}'.`);
  }
}

function conventionalTemplatePathsForSource(sourcePath: string): readonly string[] {
  const parsed = path.posix.parse(normalizePath(sourcePath));
  return [
    path.posix.join(parsed.dir, `${parsed.name}.html`),
    path.posix.join(parsed.dir, `${parsed.name}-view.html`),
  ];
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function conventionMinimalAppPreconditions(): readonly AuthoringPrecondition[] {
  return [
    new AuthoringPrecondition('Project source edits can be applied outside semantic-runtime.'),
    new AuthoringPrecondition('Aurelia package, TypeScript module resolution, and convention-aware template discovery are available.'),
  ];
}

function conventionMinimalAppPlanSteps(
  model: ConventionMinimalAppRecipeModel,
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
        ExpectedSemanticEffect.discriminatorTaste('Convention minimal app should use convention resource declaration.', 'resource-declaration-mode', 'legacy-convention-resource-declaration', 'custom-element'),
        ExpectedSemanticEffect.discriminatorTaste('Convention minimal app should admit the root through convention discovery.', 'resource-admission-mode', 'convention-discovery-admission', 'custom-element'),
      ],
    ),
    externalTemplatePlanStep(
      model.rootTemplatePath,
      model.rootComponentClassName,
      'Convention root component',
      [
        ExpectedSemanticEffect.discriminatorTaste('Convention minimal app should use a convention template file.', 'template-source-ownership', 'convention-template-file', 'template'),
      ],
    ),
    verifyAppPlanStep(topology, conventionMinimalAppExpectedEffects()),
  ];
}

function conventionMinimalAppTopology(model: ConventionMinimalAppRecipeModel): ApplicationTopology {
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

function conventionMinimalAppExpectedEffects(): readonly ExpectedSemanticEffect[] {
  return [
    ExpectedSemanticEffect.fact('Convention minimal app reopens as an Aurelia project.', 'project-shape'),
    ...projectToolingExpectedEffects('Convention minimal app'),
    ExpectedSemanticEffect.fact('Convention minimal app has an app root.', 'app-root'),
    ExpectedSemanticEffect.atLeast('Convention minimal app has a convention custom element.', 'component', 'resource', 1, 'app-root'),
    ExpectedSemanticEffect.signatureAtLeast('Convention minimal app has a convention template file.', 'external-template', 'template', 1, 'template'),
    ExpectedSemanticEffect.atLeast('Convention minimal app has compiled template facts.', 'template-compilation', 'template', 1, 'template'),
    ExpectedSemanticEffect.fact('Convention minimal app has runtime controller facts.', 'runtime-controller', 'template', 'component'),
    ExpectedSemanticEffect.absent('Convention minimal app has no open semantic seams.', 'open-seam-closure'),
    ExpectedSemanticEffect.capability('Convention minimal app exposes verifiable app-shell authoring.', 'app-shell', 'verifiable'),
    ExpectedSemanticEffect.capability('Convention minimal app exposes convention authoring evidence.', 'convention-authoring', 'observable'),
    ExpectedSemanticEffect.capability('Convention minimal app exposes verifiable external-template authoring.', 'external-template', 'verifiable'),
    ExpectedSemanticEffect.capability('Convention minimal app exposes closed-loop verification.', 'closed-loop-verification', 'verifiable'),
    ExpectedSemanticEffect.discriminatorTaste('Convention minimal app reports convention resource declaration.', 'resource-declaration-mode', 'legacy-convention-resource-declaration', 'custom-element'),
    ExpectedSemanticEffect.discriminatorTaste('Convention minimal app reports convention resource admission.', 'resource-admission-mode', 'convention-discovery-admission', 'custom-element'),
    ExpectedSemanticEffect.discriminatorTaste('Convention minimal app reports convention template ownership.', 'template-source-ownership', 'convention-template-file', 'template'),
    ExpectedSemanticEffect.signatureTaste('Convention minimal app reports single-package topology.', 'package-topology', 'single-app-package', 'workspace'),
  ];
}
