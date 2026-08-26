import { createHash } from "node:crypto";

import {
  BrowserTemplateDraftNodeKind,
  parseBrowserTemplateFragmentDraft,
  type BrowserTemplateNodeDraft,
} from "@aurelia-ls/semantic-runtime/browser-template";
import type { CompilerCase, CompilerElementDefinition } from "./compiler-case.js";
import { canonicalCompilerJson } from "./compiler-canonical-data.js";

export const SEMANTIC_COMPILER_GALLERY_ADAPTER_VERSION =
  "aurelia-ls/aot-semantic-compiler-gallery/v1" as const;
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
    readonly worldFingerprint: string,
    /** Differences expected from the currently pinned semantic adapter; execution records the observed set anew. */
    readonly anticipatedWorldDifferences: readonly SemanticCompilerGalleryWorldDifference[],
  ) {}
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
    const preliminarilyAdmitted: CompilerCase[] = [];
    const unsupported = new Map<string, SemanticCompilerGalleryUnsupportedCase>();
    for (const candidate of selected) {
      const reasons = unsupportedReasons(candidate);
      if (reasons.length === 0) {
        preliminarilyAdmitted.push(candidate);
      } else {
        unsupported.set(candidate.id, new SemanticCompilerGalleryUnsupportedCase(
          candidate.id,
          candidate.family,
          reasons,
        ));
      }
    }

    const definitionNames = new Set(preliminarilyAdmitted.map((candidate) =>
      compileDefinition(candidate).name.toLowerCase()
    ));
    const interferenceByCase = new Map<string, readonly string[]>();
    for (const candidate of preliminarilyAdmitted) {
      const template = compileDefinition(candidate).template;
      if (template?.kind !== "markup") continue;
      const interferingNames = [...resourceNamesUsedByMarkup(template.value)]
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

    const admittedCandidates = preliminarilyAdmitted.filter((candidate) => !interferenceByCase.has(candidate.id));
    const names = admittedCandidates.map((candidate) => compileDefinition(candidate).name);
    if (new Set(names).size !== names.length) {
      throw new Error("Semantic compiler gallery definition names must be unique.");
    }
    const admitted = admittedCandidates.map((candidate, index) => new SemanticCompilerGalleryCase(
      candidate,
      `SemanticGalleryCase${index}`,
      digest(canonicalCompilerJson(candidate.world)),
      [
        ...(candidate.world.compiler.resolveResources
          ? []
          : [SemanticCompilerGalleryWorldDifference.ResolveResources]),
        SemanticCompilerGalleryWorldDifference.SharedResourceScope,
        SemanticCompilerGalleryWorldDifference.CompilerTreeAuthority,
        SemanticCompilerGalleryWorldDifference.GeneratedDefinitionType,
      ],
    ));
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
  if (candidate.world.setups.length > 0) {
    reasons.push(SemanticCompilerGalleryUnsupportedReason.SetupMaterialization);
  }
  if (candidate.world.registrations.length > 0) {
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
  const declarations = cases.map(({ candidate, className }) => {
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
      `// compiler-case:${candidate.id}`,
      `@customElement(${canonicalCompilerJson(metadata)})`,
      `class ${className} {}`,
    ].join("\n");
  });
  const classNames = cases.map((candidate) => candidate.className);
  const rootMetadata = `{ name: "aot-semantic-gallery-root", template: "", dependencies: [${classNames.join(", ")}] }`;
  return [
    "import { Aurelia, customElement, StandardConfiguration } from '@aurelia/runtime-html';",
    ...declarations,
    `@customElement(${rootMetadata})`,
    "class AotSemanticGalleryRoot {}",
    `void new Aurelia().register(StandardConfiguration${classNames.length === 0 ? "" : `, ${classNames.join(", ")}`})`,
    "  .app({ host: globalThis.document.body, component: AotSemanticGalleryRoot })",
    "  .start();",
    "",
  ].join("\n\n");
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
