import { createHash } from "node:crypto";

import {
  BrowserTemplateDraftNodeKind,
  parseBrowserTemplateFragmentDraft,
  type BrowserTemplateNodeDraft,
} from "@aurelia-ls/semantic-runtime/browser-template";
import type {
  CompilerCase,
  CompilerCaseData,
  CompilerElementDefinition,
  CompilerRegistration,
  CompilerSetupInvocation,
} from "./compiler-case.js";
import { canonicalCompilerJson } from "./compiler-canonical-data.js";
import {
  projectSemanticCompilerGallerySetup,
  semanticCompilerGallerySetupIsSourceProjectable,
  SemanticCompilerGallerySetupResourceKind,
  type SemanticCompilerGallerySetupSourceExport,
  type SemanticCompilerGallerySetupSourceProjection,
} from "./semantic-compiler-gallery-setup-source.js";

export const SEMANTIC_COMPILER_GALLERY_ADAPTER_VERSION =
  "aurelia-ls/aot-semantic-compiler-gallery/v2" as const;
export const SEMANTIC_COMPILER_GALLERY_TREE_PROFILE =
  "semantic-runtime/authored-html-compiler-input/v1" as const;

export const enum SemanticCompilerGalleryUnsupportedReason {
  CompileSpread = "compile-spread",
  NonMarkupTemplate = "non-markup-template",
  CompilerBypass = "compiler-bypass",
  DebugProfile = "debug-profile",
  SetupMaterialization = "setup-materialization",
  RegistrationMaterialization = "registration-materialization",
  PrecompiledDefinitionFields = "precompiled-definition-fields",
  ExecutableDefinitionField = "executable-definition-field",
  BindableDefinition = "bindable-definition",
  GalleryResourceInterference = "gallery-resource-interference",
}

export const enum SemanticCompilerGalleryWorldDifference {
  ResolveResources = "resolve-resources-profile",
  Debug = "debug-profile",
  SharedResourceScope = "shared-gallery-resource-scope",
  DeclarativeSetupSource = "declarative-setup-source",
  CompilerTreeAuthority = "compiler-tree-authority",
  GeneratedDefinitionType = "generated-definition-type",
}

export class SemanticCompilerGalleryUnsupportedCase {
  constructor(
    readonly caseId: string,
    readonly family: string,
    readonly reasons: readonly SemanticCompilerGalleryUnsupportedReason[],
    readonly notes: readonly string[] = [],
  ) {}
}

export class SemanticCompilerGalleryCase {
  constructor(
    readonly candidate: CompilerCase,
    readonly className: string,
    readonly setupProjections: readonly SemanticCompilerGallerySetupSourceProjection[],
    readonly dependencies: readonly SemanticCompilerGalleryDependency[],
    readonly worldFingerprint: string,
    /** Differences expected from the currently pinned semantic adapter; execution records the observed set anew. */
    readonly anticipatedWorldDifferences: readonly SemanticCompilerGalleryWorldDifference[],
  ) {}
}

/** One source-projected setup export installed only in its owning definition dependency scope. */
export class SemanticCompilerGalleryDependency {
  constructor(
    readonly registration: CompilerRegistration,
    readonly projection: SemanticCompilerGallerySetupSourceProjection,
    readonly setupExport: SemanticCompilerGallerySetupSourceExport,
  ) {
    if (
      registration.site !== "definition-dependency"
      || registration.cardinality !== "single"
      || registration.value.setup !== projection.setupSymbol
      || registration.value.export !== setupExport.exportName
      || !projection.exports.includes(setupExport)
    ) {
      throw new Error("Semantic compiler gallery dependency lost setup export or registration authority.");
    }
  }

  get resource() {
    return this.setupExport.resource;
  }
}

export class SemanticCompilerGalleryPlan {
  constructor(
    readonly adapterVersion: typeof SEMANTIC_COMPILER_GALLERY_ADAPTER_VERSION,
    readonly compilerTreeProfile: typeof SEMANTIC_COMPILER_GALLERY_TREE_PROFILE,
    readonly selectedCaseCount: number,
    readonly admitted: readonly SemanticCompilerGalleryCase[],
    readonly unsupported: readonly SemanticCompilerGalleryUnsupportedCase[],
    readonly sourceText: string,
    readonly sourceDigest: string,
  ) {}
}

/**
 * Plans one source gallery without claiming that its shared compiler world equals the JIT's fresh per-case container.
 * Every excluded case and every known world difference remains explicit in the plan.
 */
export class SemanticCompilerGalleryPlanner {
  plan(cases: readonly CompilerCase[]): SemanticCompilerGalleryPlan {
    const selected = [...cases].sort((left, right) => left.id.localeCompare(right.id));
    const preliminarilyAdmitted: SemanticCompilerGalleryCase[] = [];
    const unsupported = new Map<string, SemanticCompilerGalleryUnsupportedCase>();
    for (const [selectedIndex, candidate] of selected.entries()) {
      const reasons = unsupportedReasons(candidate);
      if (reasons.length === 0) {
        preliminarilyAdmitted.push(projectGalleryCase(candidate, selectedIndex));
      } else {
        unsupported.set(candidate.id, new SemanticCompilerGalleryUnsupportedCase(
          candidate.id,
          candidate.family,
          reasons,
        ));
      }
    }

    const definitionNames = new Set(preliminarilyAdmitted.map((candidate) =>
      compileDefinition(candidate.candidate).name.toLowerCase()
    ));
    const interferenceByCase = new Map<string, readonly string[]>();
    for (const galleryCase of preliminarilyAdmitted) {
      const candidate = galleryCase.candidate;
      const template = compileDefinition(candidate).template;
      if (template?.kind !== "markup") continue;
      const setupNames = galleryCase.setupProjections.flatMap((projection) =>
        projection.resources.flatMap((resource) => [resource.publicName, ...resource.aliases])
      ).map((name) => name.toLowerCase());
      const supportTemplateNames = galleryCase.setupProjections.flatMap((projection) =>
        projection.resources.flatMap((resource) => {
          if (resource.kind !== SemanticCompilerGallerySetupResourceKind.CustomElement) return [];
          const metadata = resourceMetadata(resource.metadata);
          const setupTemplate = metadata.template;
          return typeof setupTemplate === "string" ? [...resourceNamesUsedByMarkup(setupTemplate)] : [];
        })
      );
      const interferingNames = [...new Set([
        ...resourceNamesUsedByMarkup(template.value),
        ...supportTemplateNames,
        ...setupNames.filter((name) => definitionNames.has(name)),
      ])]
        .filter((name) => definitionNames.has(name))
        .sort();
      if (interferingNames.length > 0) {
        interferenceByCase.set(candidate.id, interferingNames);
        unsupported.set(candidate.id, new SemanticCompilerGalleryUnsupportedCase(
          candidate.id,
          candidate.family,
          [SemanticCompilerGalleryUnsupportedReason.GalleryResourceInterference],
          [`Generated gallery scope would resolve: ${interferingNames.join(", ")}.`],
        ));
      }
    }

    const admitted = preliminarilyAdmitted.filter((candidate) => !interferenceByCase.has(candidate.candidate.id));
    const names = admitted.map((candidate) => compileDefinition(candidate.candidate).name);
    if (new Set(names).size !== names.length) {
      throw new Error("Semantic compiler gallery definition names must be unique.");
    }
    const sourceText = gallerySource(admitted);
    return new SemanticCompilerGalleryPlan(
      SEMANTIC_COMPILER_GALLERY_ADAPTER_VERSION,
      SEMANTIC_COMPILER_GALLERY_TREE_PROFILE,
      selected.length,
      admitted,
      [...unsupported.values()].sort((left, right) => left.caseId.localeCompare(right.caseId)),
      sourceText,
      digest(sourceText),
    );
  }
}

function unsupportedReasons(candidate: CompilerCase): readonly SemanticCompilerGalleryUnsupportedReason[] {
  const reasons: SemanticCompilerGalleryUnsupportedReason[] = [];
  if (candidate.world.entry.kind !== "compile") {
    reasons.push(SemanticCompilerGalleryUnsupportedReason.CompileSpread);
    return reasons;
  }
  const definition = candidate.world.entry.definition;
  if (definition.template?.kind !== "markup") {
    reasons.push(SemanticCompilerGalleryUnsupportedReason.NonMarkupTemplate);
  }
  if (definition.needsCompile === false) {
    reasons.push(SemanticCompilerGalleryUnsupportedReason.CompilerBypass);
  }
  if (candidate.world.compiler.debug) {
    reasons.push(SemanticCompilerGalleryUnsupportedReason.DebugProfile);
  }
  const sourceProjectableSetups = candidate.world.setups.every(
    semanticCompilerGallerySetupIsSourceProjectable,
  );
  if (candidate.world.setups.length > 0 && !sourceProjectableSetups) {
    reasons.push(SemanticCompilerGalleryUnsupportedReason.SetupMaterialization);
  }
  if (candidate.world.registrations.some((registration) =>
    !registrationIsSourceProjectable(registration, candidate.world.setups)
  )) {
    reasons.push(SemanticCompilerGalleryUnsupportedReason.RegistrationMaterialization);
  }
  if (definition.instructions !== undefined || definition.surrogates !== undefined) {
    reasons.push(SemanticCompilerGalleryUnsupportedReason.PrecompiledDefinitionFields);
  }
  if (
    typeof definition.capture === "object"
    || definition.processContent != null
    || definition.Type != null
  ) {
    reasons.push(SemanticCompilerGalleryUnsupportedReason.ExecutableDefinitionField);
  }
  if (definition.bindables != null) {
    reasons.push(SemanticCompilerGalleryUnsupportedReason.BindableDefinition);
  }
  return reasons;
}

function compileDefinition(candidate: CompilerCase): CompilerElementDefinition {
  if (candidate.world.entry.kind !== "compile") {
    throw new Error(`Compiler case ${candidate.id} is not a compile entry.`);
  }
  return candidate.world.entry.definition;
}

function gallerySource(cases: readonly SemanticCompilerGalleryCase[]): string {
  const declarations = cases.map((galleryCase) => {
    const { candidate, className } = galleryCase;
    const definition = compileDefinition(candidate);
    if (definition.template?.kind !== "markup") {
      throw new Error(`Admitted semantic gallery case ${candidate.id} lost its markup template.`);
    }
    const metadata = {
      name: definition.name,
      template: definition.template.value,
      ...(definition.needsCompile === undefined ? {} : { needsCompile: definition.needsCompile }),
      ...(definition.containerless === undefined ? {} : { containerless: definition.containerless }),
      ...(definition.hasSlots === undefined ? {} : { hasSlots: definition.hasSlots }),
      ...(definition.shadowOptions === undefined ? {} : { shadowOptions: definition.shadowOptions }),
      ...(definition.enhance === undefined ? {} : { enhance: definition.enhance }),
      ...(typeof definition.capture === "boolean" ? { capture: definition.capture } : {}),
    };
    return [
      ...galleryCase.setupProjections.flatMap((projection) => projection.resources.map((resource) => [
        `// compiler-case:${candidate.id}:setup:${projection.setupSymbol}`,
        `@${resource.kind === SemanticCompilerGallerySetupResourceKind.CustomElement
          ? "customElement"
          : "customAttribute"}(${metadataSource(resourceMetadata(resource.metadata), [])})`,
        `class ${resource.className} {}`,
      ].join("\n"))),
      `// compiler-case:${candidate.id}`,
      `@customElement(${metadataSource(metadata, galleryCase.dependencies.map((dependency) =>
        dependency.resource.className
      ))})`,
      `class ${className} {}`,
    ].join("\n");
  });
  const classNames = cases.map((candidate) => candidate.className);
  const rootMetadata = `{ name: "aot-semantic-gallery-root", template: "", dependencies: [${classNames.join(", ")}] }`;
  return [
    "import { Aurelia, customAttribute, customElement, StandardConfiguration } from '@aurelia/runtime-html';",
    ...declarations,
    `@customElement(${rootMetadata})`,
    "class AotSemanticGalleryRoot {}",
    `void new Aurelia().register(StandardConfiguration${classNames.length === 0 ? "" : `, ${classNames.join(", ")}`})`,
    "  .app({ host: globalThis.document.body, component: AotSemanticGalleryRoot })",
    "  .start();",
    "",
  ].join("\n\n");
}

function projectGalleryCase(candidate: CompilerCase, selectedIndex: number): SemanticCompilerGalleryCase {
  const className = `SemanticGalleryCase${selectedIndex}`;
  const setupProjections = candidate.world.setups.map((invocation, setupIndex) =>
    projectSemanticCompilerGallerySetup(
      invocation,
      `${className}Setup${setupIndex}Resource`,
    )
  );
  const projectionBySymbol = new Map(setupProjections.map((projection) => [
    projection.setupSymbol,
    projection,
  ]));
  if (projectionBySymbol.size !== setupProjections.length) {
    throw new Error(`Semantic compiler gallery case ${candidate.id} repeats a setup symbol.`);
  }
  const dependencies = candidate.world.registrations.map((registration) => {
    const projection = projectionBySymbol.get(registration.value.setup) ?? null;
    const setupExport = projection?.exports.find((candidateExport) =>
      candidateExport.exportName === registration.value.export
    ) ?? null;
    if (projection == null || setupExport == null) {
      throw new Error(`Semantic compiler gallery case ${candidate.id} lost a projected dependency export.`);
    }
    return new SemanticCompilerGalleryDependency(registration, projection, setupExport);
  });
  return new SemanticCompilerGalleryCase(
    candidate,
    className,
    setupProjections,
    dependencies,
    digest(canonicalCompilerJson({
      world: candidate.world,
      setupSource: setupProjections.map(setupProjectionFingerprint),
    })),
    [
      ...(candidate.world.compiler.resolveResources
        ? []
        : [SemanticCompilerGalleryWorldDifference.ResolveResources]),
      ...(setupProjections.length === 0
        ? []
        : [SemanticCompilerGalleryWorldDifference.DeclarativeSetupSource]),
      SemanticCompilerGalleryWorldDifference.SharedResourceScope,
      SemanticCompilerGalleryWorldDifference.CompilerTreeAuthority,
      SemanticCompilerGalleryWorldDifference.GeneratedDefinitionType,
    ],
  );
}

function registrationIsSourceProjectable(
  registration: CompilerRegistration,
  setups: readonly CompilerSetupInvocation[],
): boolean {
  if (registration.site !== "definition-dependency" || registration.cardinality !== "single") return false;
  const setup = setups.find((candidate) => candidate.symbol === registration.value.setup) ?? null;
  return setup != null
    && registration.value.export === "resource"
    && semanticCompilerGallerySetupIsSourceProjectable(setup);
}

function setupProjectionFingerprint(
  projection: SemanticCompilerGallerySetupSourceProjection,
): CompilerCaseData {
  return {
    projectionVersion: projection.projectionVersion,
    factoryId: projection.factoryId,
    factoryVersion: projection.factoryVersion,
    setupSymbol: projection.setupSymbol,
    exports: projection.exports.map((setupExport) => ({
      exportName: setupExport.exportName,
      resourceClassName: setupExport.resource.className,
    })),
    resources: projection.resources.map((resource) => ({
      kind: resource.kind,
      className: resource.className,
      publicName: resource.publicName,
      aliases: resource.aliases,
      metadata: resource.metadata,
    })),
  };
}

function resourceMetadata(metadata: CompilerCaseData): Readonly<Record<string, CompilerCaseData>> {
  if (metadata == null || Array.isArray(metadata) || typeof metadata !== "object") {
    throw new Error("Semantic compiler gallery setup resource metadata must be an object.");
  }
  return metadata as Readonly<Record<string, CompilerCaseData>>;
}

function metadataSource(
  metadata: Readonly<Record<string, CompilerCaseData>>,
  dependencyClassNames: readonly string[],
): string {
  const fields = Object.entries(metadata).map(([key, value]) =>
    `${JSON.stringify(key)}:${canonicalCompilerJson(value)}`
  );
  if (dependencyClassNames.length > 0) {
    fields.push(`"dependencies":[${dependencyClassNames.join(",")}]`);
  }
  return `{${fields.join(",")}}`;
}

function resourceNamesUsedByMarkup(markup: string): ReadonlySet<string> {
  const names = new Set<string>();
  const visit = (nodes: readonly BrowserTemplateNodeDraft[]): void => {
    for (const node of nodes) {
      if (node.nodeKind !== BrowserTemplateDraftNodeKind.Element) continue;
      names.add(node.tagName.toLowerCase());
      for (const attribute of node.attributes) {
        if (attribute.name === "as-element") names.add(attribute.value.toLowerCase());
      }
      visit(node.children);
      visit(node.templateContent?.children ?? []);
    }
  };
  visit(parseBrowserTemplateFragmentDraft(markup).fragment.children);
  // The semantic lane still traverses authored HTML. Retain a conservative lexical backstop for tags that the pinned
  // browser parser may drop or reconstruct before the contamination check sees them.
  for (const match of markup.matchAll(/<\s*([A-Za-z][A-Za-z0-9._:-]*)/gu)) {
    names.add(match[1]!.toLowerCase());
  }
  for (const match of markup.matchAll(/\bas-element\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu)) {
    names.add((match[1] ?? match[2] ?? match[3] ?? "").toLowerCase());
  }
  return names;
}

function digest(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
