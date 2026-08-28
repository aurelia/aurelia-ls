import type {
  CompilerCaseBindableDefinition,
  CompilerCaseData,
  CompilerSetupInvocation,
} from "./compiler-case.js";
import {
  CUSTOM_ATTRIBUTE_SETUP_ID,
  CUSTOM_ATTRIBUTE_SETUP_VERSION,
  CUSTOM_ELEMENT_SETUP_ID,
  CUSTOM_ELEMENT_SETUP_VERSION,
  readCustomAttributeArgs,
  readCustomElementArgs,
} from "./jit-oracle-setups.js";

export const SEMANTIC_COMPILER_GALLERY_SETUP_SOURCE_PROJECTION_VERSION =
  "aurelia-ls/aot-semantic-compiler-gallery-setup-source/v1" as const;

export const enum SemanticCompilerGallerySetupResourceKind {
  CustomElement = "custom-element",
  CustomAttribute = "custom-attribute",
}

/** One source-declarable Aurelia resource produced from trusted declarative setup data. */
export class SemanticCompilerGallerySetupSourceResource {
  constructor(
    readonly kind: SemanticCompilerGallerySetupResourceKind,
    readonly className: string,
    readonly publicName: string,
    readonly aliases: readonly string[],
    readonly metadata: CompilerCaseData,
  ) {}
}

/** One named setup export, retaining the identity of its source resource carrier. */
export class SemanticCompilerGallerySetupSourceExport {
  constructor(
    readonly exportName: string,
    readonly resource: SemanticCompilerGallerySetupSourceResource,
  ) {}
}

/** Versioned source projection for one setup invocation; every projection owns fresh carriers. */
export class SemanticCompilerGallerySetupSourceProjection {
  constructor(
    readonly projectionVersion: typeof SEMANTIC_COMPILER_GALLERY_SETUP_SOURCE_PROJECTION_VERSION,
    readonly factoryId: string,
    readonly factoryVersion: number,
    readonly setupSymbol: string,
    readonly exports: readonly SemanticCompilerGallerySetupSourceExport[],
    readonly resources: readonly SemanticCompilerGallerySetupSourceResource[],
  ) {}
}

export function semanticCompilerGallerySetupIsSourceProjectable(
  invocation: CompilerSetupInvocation,
): boolean {
  return invocation.factory === CUSTOM_ELEMENT_SETUP_ID
    || invocation.factory === CUSTOM_ATTRIBUTE_SETUP_ID;
}

/**
 * Projects only the two declarative resource setup shapes owned by this module.
 * It deliberately reads plain setup arguments rather than executing a setup factory or JIT materializer.
 */
export function projectSemanticCompilerGallerySetup(
  invocation: CompilerSetupInvocation,
  className: string,
): SemanticCompilerGallerySetupSourceProjection {
  switch (invocation.factory) {
    case CUSTOM_ELEMENT_SETUP_ID:
      return customElementProjection(invocation, className);
    case CUSTOM_ATTRIBUTE_SETUP_ID:
      return customAttributeProjection(invocation, className);
    default:
      throw new Error(`Compiler setup ${invocation.factory} cannot be projected as trusted gallery source.`);
  }
}

function customElementProjection(
  invocation: CompilerSetupInvocation,
  className: string,
): SemanticCompilerGallerySetupSourceProjection {
  const args = readCustomElementArgs(invocation.args);
  const resource = new SemanticCompilerGallerySetupSourceResource(
    SemanticCompilerGallerySetupResourceKind.CustomElement,
    className,
    args.name,
    [],
    {
      name: args.name,
      template: args.template,
      bindables: bindableMetadata(args.bindables),
      capture: args.capture,
      containerless: args.containerless,
      shadowOptions: args.shadowMode == null ? null : { mode: args.shadowMode },
    },
  );
  return setupProjection(
    invocation,
    CUSTOM_ELEMENT_SETUP_VERSION,
    resource,
  );
}

function customAttributeProjection(
  invocation: CompilerSetupInvocation,
  className: string,
): SemanticCompilerGallerySetupSourceProjection {
  const args = readCustomAttributeArgs(invocation.args);
  const resource = new SemanticCompilerGallerySetupSourceResource(
    SemanticCompilerGallerySetupResourceKind.CustomAttribute,
    className,
    args.name,
    [...args.aliases],
    {
      name: args.name,
      bindables: bindableMetadata(args.bindables),
      isTemplateController: args.isTemplateController,
      noMultiBindings: args.noMultiBindings,
      ...(args.defaultProperty == null ? {} : { defaultProperty: args.defaultProperty }),
      aliases: [...args.aliases],
    },
  );
  return setupProjection(
    invocation,
    CUSTOM_ATTRIBUTE_SETUP_VERSION,
    resource,
  );
}

function setupProjection(
  invocation: CompilerSetupInvocation,
  factoryVersion: number,
  resource: SemanticCompilerGallerySetupSourceResource,
): SemanticCompilerGallerySetupSourceProjection {
  return new SemanticCompilerGallerySetupSourceProjection(
    SEMANTIC_COMPILER_GALLERY_SETUP_SOURCE_PROJECTION_VERSION,
    invocation.factory,
    factoryVersion,
    invocation.symbol,
    [new SemanticCompilerGallerySetupSourceExport("resource", resource)],
    [resource],
  );
}

function bindableMetadata(
  bindables: readonly CompilerCaseBindableDefinition[],
): CompilerCaseData {
  const metadata: Record<string, CompilerCaseData> = {};
  for (const bindable of bindables) {
    metadata[bindable.name] = bindable.attribute == null && bindable.mode == null
      ? true
      : {
          ...(bindable.attribute == null ? {} : { attribute: bindable.attribute }),
          ...(bindable.mode == null ? {} : { mode: bindable.mode }),
        };
  }
  return metadata;
}
