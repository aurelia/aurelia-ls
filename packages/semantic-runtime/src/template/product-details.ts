import type { AppRootReference } from '../configuration/app-root.js';
import type { ControllerReference } from '../configuration/controller.js';
import { ConfigurationDetailDescriptors } from '../configuration/detail-descriptors.js';
import type { ContainerReference } from '../di/container-reference.js';
import type { ProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import type { KernelRecordHandle, ProductHandle } from '../kernel/handles.js';
import {
  kernelFieldProvenanceReferences,
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReference,
} from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import {
  InquiryLocusKind,
  type InquiryLocus,
} from '../inquiry/locus.js';
import { ObservationDetailDescriptors } from '../observation/detail-descriptors.js';
import type { RuntimeWatcherObservedDependency } from '../observation/runtime-watcher-observation.js';
import type { AttributePatternDefinitionEntry } from '../resources/attribute-pattern-definition.js';
import type {
  BindableDefinition,
  BindableDefinitionReference,
} from '../resources/bindable-definition.js';
import { ResourceDetailDescriptors } from '../resources/detail-descriptors.js';
import type { ResourceTargetReference } from '../resources/resource-reference.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type {
  WatchCallbackDefinition,
  WatchExpressionDefinition,
  WatchPropertyKeyDefinition,
} from '../resources/watch-definition.js';
import { checkerTypeReferenceKernelReferences } from '../type-system/structural-references.js';
import type {
  AttributeClassification,
  AttributeParserMachine,
  AttributeParserService,
  AttributeSyntax,
  AttributePatternExecutable,
  CompiledAttributePattern,
} from './attribute-syntax.js';
import type { BindingCommandExecutableReference } from './binding-command-reference.js';
import type {
  BindingCommandBuildInput,
  BindingCommandExecutable,
  BindingCommandLowering,
  BindingCommandResolverService,
  MultiBindingLowering,
  MultiBindingSegment,
} from './binding-command-execution.js';
import type {
  TemplateCompilerIssue,
} from './compiler-issue.js';
import type {
  BuiltInSyntaxCatalog,
  ConfiguredBuiltInSyntaxCatalogSelection,
} from './built-in-syntax.js';
import type {
  TemplateAttributeMapperService,
  TemplateCompilerService,
  TemplateCompilerWorld,
  TemplateCompilerWorldReference,
  TemplateExpressionParserService,
  TemplateRenderingService,
  TemplateResourceResolverService,
  TemplateResourceScope,
  TemplateResourceScopeReference,
} from './compiler-world.js';
import {
  TemplateCompilerServiceKind,
  type TemplateBindableReference,
  type TemplateCompilerServiceReference,
  type TemplateVisibleResource,
  type TemplateVisibleResourceReference,
} from './compiler-world-reference.js';
import type {
  CompiledTemplate,
  TemplateRenderTarget,
} from './compiled-template.js';
import type {
  TemplateCompilationContext,
  TemplateCompilationContextReference,
  TemplateCompilationUnit,
  TemplateSource,
  TemplateSourceOwnerReference,
  TemplateSourceReference,
} from './compilation-unit.js';
import type {
  HtmlAttribute,
  HtmlAttributeReference,
  HtmlDocument,
  HtmlIrNode,
  HtmlNodeReference,
  HtmlRecovery,
} from './html-ir.js';
import { HtmlIrNodeKind } from './html-ir.js';
import {
  TemplateInstructionKind,
  type TemplateInstructionReference,
  type TemplateInstruction,
  type TemplateInstructionSequence,
} from './instruction-ir.js';
import type {
  TemplateParseContext,
  TemplateParseFrontier,
} from './parse-context.js';
import {
  RuntimeBindingKind,
  RuntimeBindingScopeEffectKind,
  type RuntimeBindingScopeEffectReference,
  type RuntimeBinding,
  type RuntimeBindingScopeEffect,
  type RuntimeBindingSourceOperation,
  type RuntimeBindingTargetAccess,
  type RuntimeBindingTargetOperation,
} from './runtime-binding.js';
import {
  runtimeBindingReferenceReferences,
  runtimeBindingTargetAccessReferenceReferences,
} from './structural-references.js';
import type { RuntimeRendererReference } from './runtime-renderer-reference.js';
import type { RuntimeWatcher } from './runtime-watcher.js';
import type {
  RuntimeBindingIssue,
} from './runtime-binding-issue.js';
import type {
  RuntimeBindingBehaviorApplication,
  RuntimeBindingBehaviorIssue,
} from './runtime-binding-behavior.js';
import type {
  RuntimeValueConverterApplication,
  RuntimeValueConverterIssue,
} from './runtime-value-converter.js';
import type {
  RuntimeBindingScopeIssue,
} from './runtime-binding-scope-issue.js';
import type { RuntimeControllerIssue } from './runtime-controller-issue.js';
import type {
  CompositionActivationModelHandoff,
  CompositionContext,
  CompositionContextReference,
  CompositionController,
  CompositionResolvedComponent,
} from './runtime-composition.js';
import type {
  BuiltInRuntimeRendererCatalog,
  ConfiguredBuiltInRuntimeRendererCatalogSelection,
  RuntimeRenderer,
} from './runtime-renderer.js';
import type { RuntimeRendererIssue } from './runtime-renderer-issue.js';
import type {
  TemplateExpressionParse,
  TemplateValueSiteReference,
  TemplateValueSite,
} from './value-site.js';
import { TemplateDetailDescriptors } from './detail-descriptors.js';

/**
 * Typed detail slots for template/compiler products.
 *
 * These slots intentionally mirror the product-kind vocabulary and auLink-shaped runtime models. They let inquiry and
 * Atlas and tooling hydrate rich in-memory products from handles without putting generic payloads back into kernel records.
 */
export const TemplateProductDetails = {
  Source: defineProductDetailSlot(TemplateDetailDescriptors.Source, referencesForTemplateSource),
  ParseContext: defineProductDetailSlot(TemplateDetailDescriptors.ParseContext, referencesForTemplateParseContext),
  CompilationUnit: defineProductDetailSlot(TemplateDetailDescriptors.CompilationUnit, referencesForTemplateCompilationUnit),
  CompilationContext: defineProductDetailSlot(TemplateDetailDescriptors.CompilationContext, referencesForTemplateCompilationContext),
  World: defineProductDetailSlot(TemplateDetailDescriptors.World, referencesForTemplateCompilerWorld),
  ResourceScope: defineProductDetailSlot(TemplateDetailDescriptors.ResourceScope, referencesForTemplateResourceScope),
  TemplateCompilerService: defineProductDetailSlot(TemplateDetailDescriptors.TemplateCompilerService, referencesForTemplateCompilerService),
  ResourceResolverService: defineProductDetailSlot(TemplateDetailDescriptors.ResourceResolverService, referencesForTemplateResourceResolverService),
  ExpressionParserService: defineProductDetailSlot(TemplateDetailDescriptors.ExpressionParserService, referencesForTemplateExpressionParserService),
  AttributeMapperService: defineProductDetailSlot(TemplateDetailDescriptors.AttributeMapperService, referencesForTemplateAttributeMapperService),
  RenderingService: defineProductDetailSlot(TemplateDetailDescriptors.RenderingService, referencesForTemplateRenderingService),
  AttributeParserService: defineProductDetailSlot(TemplateDetailDescriptors.AttributeParserService, referencesForAttributeParserService),
  AttributeParserMachine: defineProductDetailSlot(TemplateDetailDescriptors.AttributeParserMachine, referencesForAttributeParserMachine),
  BindingCommandResolver: defineProductDetailSlot(TemplateDetailDescriptors.BindingCommandResolver, referencesForBindingCommandResolver),
  BuiltInSyntaxCatalog: defineProductDetailSlot(TemplateDetailDescriptors.BuiltInSyntaxCatalog, referencesForBuiltInSyntaxCatalog),
  ConfiguredBuiltInSyntaxCatalogSelection: defineProductDetailSlot(TemplateDetailDescriptors.ConfiguredBuiltInSyntaxCatalogSelection, referencesForConfiguredBuiltInSyntaxCatalogSelection),
  BuiltInRuntimeRendererCatalog: defineProductDetailSlot(TemplateDetailDescriptors.BuiltInRuntimeRendererCatalog, referencesForBuiltInRuntimeRendererCatalog),
  ConfiguredBuiltInRuntimeRendererCatalogSelection: defineProductDetailSlot(TemplateDetailDescriptors.ConfiguredBuiltInRuntimeRendererCatalogSelection, referencesForConfiguredBuiltInRuntimeRendererCatalogSelection),
  RuntimeRenderer: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeRenderer, referencesForRuntimeRenderer),
  RuntimeRendererIssue: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeRendererIssue, referencesForRuntimeRendererIssue),
  CompiledAttributePattern: defineProductDetailSlot(TemplateDetailDescriptors.CompiledAttributePattern, referencesForCompiledAttributePattern),
  AttributePatternExecutable: defineProductDetailSlot(TemplateDetailDescriptors.AttributePatternExecutable, referencesForAttributePatternExecutable),
  BindingCommandExecutable: defineProductDetailSlot(TemplateDetailDescriptors.BindingCommandExecutable, referencesForBindingCommandExecutable),
  HtmlDocument: defineProductDetailSlot(TemplateDetailDescriptors.HtmlDocument, referencesForHtmlDocument),
  HtmlNode: defineProductDetailSlot(TemplateDetailDescriptors.HtmlNode, referencesForHtmlNode),
  HtmlAttribute: defineProductDetailSlot(TemplateDetailDescriptors.HtmlAttribute, referencesForHtmlAttribute),
  CompiledTemplate: defineProductDetailSlot(TemplateDetailDescriptors.CompiledTemplate, referencesForCompiledTemplate),
  RenderTarget: defineProductDetailSlot(TemplateDetailDescriptors.RenderTarget, referencesForTemplateRenderTarget),
  AttributeSyntax: defineProductDetailSlot(TemplateDetailDescriptors.AttributeSyntax, referencesForAttributeSyntax),
  AttributeClassification: defineProductDetailSlot(TemplateDetailDescriptors.AttributeClassification, referencesForAttributeClassification),
  ValueSite: defineProductDetailSlot(TemplateDetailDescriptors.ValueSite, referencesForTemplateValueSite),
  ExpressionParse: defineProductDetailSlot(TemplateDetailDescriptors.ExpressionParse, referencesForTemplateExpressionParse),
  BindingCommandBuildInput: defineProductDetailSlot(TemplateDetailDescriptors.BindingCommandBuildInput, referencesForBindingCommandBuildInput),
  BindingCommandLowering: defineProductDetailSlot(TemplateDetailDescriptors.BindingCommandLowering, referencesForBindingCommandLowering),
  CompilerIssue: defineProductDetailSlot(TemplateDetailDescriptors.CompilerIssue, referencesForTemplateCompilerIssue),
  MultiBindingSegment: defineProductDetailSlot(TemplateDetailDescriptors.MultiBindingSegment, referencesForMultiBindingSegment),
  MultiBindingLowering: defineProductDetailSlot(TemplateDetailDescriptors.MultiBindingLowering, referencesForMultiBindingLowering),
  Instruction: defineProductDetailSlot(TemplateDetailDescriptors.Instruction, referencesForTemplateInstruction),
  InstructionSequence: defineProductDetailSlot(TemplateDetailDescriptors.InstructionSequence, referencesForTemplateInstructionSequence),
  RuntimeBinding: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeBinding, referencesForRuntimeBinding),
  RuntimeWatcher: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeWatcher, referencesForRuntimeWatcher),
  RuntimeBindingIssue: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeBindingIssue, referencesForRuntimeBindingIssue),
  RuntimeBindingBehaviorApplication: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeBindingBehaviorApplication, referencesForRuntimeBindingBehaviorApplication),
  RuntimeBindingBehaviorIssue: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeBindingBehaviorIssue, referencesForRuntimeBindingBehaviorIssue),
  RuntimeValueConverterApplication: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeValueConverterApplication, referencesForRuntimeValueConverterApplication),
  RuntimeValueConverterIssue: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeValueConverterIssue, referencesForRuntimeValueConverterIssue),
  RuntimeBindingScopeEffect: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeBindingScopeEffect, referencesForRuntimeBindingScopeEffect),
  RuntimeBindingScopeIssue: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeBindingScopeIssue, referencesForRuntimeBindingScopeIssue),
  RuntimeControllerIssue: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeControllerIssue, referencesForRuntimeControllerIssue),
  CompositionContext: defineProductDetailSlot(TemplateDetailDescriptors.CompositionContext, referencesForCompositionContext),
  CompositionController: defineProductDetailSlot(TemplateDetailDescriptors.CompositionController, referencesForCompositionController),
  RuntimeBindingTargetAccess: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeBindingTargetAccess, referencesForRuntimeBindingTargetAccess),
  RuntimeBindingTargetOperation: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeBindingTargetOperation, referencesForRuntimeBindingTargetOperation),
  RuntimeBindingSourceOperation: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeBindingSourceOperation, referencesForRuntimeBindingSourceOperation),
} as const;

function detailReferences(
  slot: ProductDetailDescriptor<unknown>,
  handle: ProductHandle | null | undefined,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    kernelRecordReferences(handle),
    [kernelProductDetailReference(slot, handle)],
  );
}

function detailsReferences(
  slot: ProductDetailDescriptor<unknown>,
  handles: readonly (ProductHandle | null | undefined)[],
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(...handles.map((handle) => detailReferences(slot, handle)));
}

function productIdentityAddressReferences(
  productHandle: ProductHandle | null | undefined,
  identityHandle: KernelRecordHandle | null | undefined,
  addressHandle: KernelRecordHandle | null | undefined,
  slot: ProductDetailDescriptor<unknown> | null = null,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    kernelRecordReferences(productHandle, identityHandle, addressHandle),
    slot == null ? [] : [kernelProductDetailReference(slot, productHandle)],
  );
}

function containerReferenceReferences(
  container: ContainerReference,
): readonly KernelDetailReference[] {
  return kernelRecordReferences(container.productHandle, container.identityHandle, container.addressHandle);
}

function appRootReferenceReferences(
  appRoot: AppRootReference | null,
): readonly KernelDetailReference[] {
  return appRoot == null
    ? []
    : kernelRecordReferences(appRoot.productHandle, appRoot.identityHandle, appRoot.addressHandle);
}

function controllerReferenceReferences(
  controller: ControllerReference | null,
): readonly KernelDetailReference[] {
  return controller == null
    ? []
    : productIdentityAddressReferences(
        controller.productHandle,
        controller.identityHandle,
        controller.addressHandle,
        ConfigurationDetailDescriptors.Controller,
      );
}

function resourceTargetReferenceReferences(
  target: ResourceTargetReference | null,
): readonly KernelDetailReference[] {
  return target == null
    ? []
    : mergeKernelDetailReferences(
        kernelRecordReferences(
          target.identityHandle,
          target.addressHandle,
          target.declarationSourceAddressHandle,
        ),
        checkerTypeReferenceKernelReferences(target.targetType),
      );
}

function referencesForTemplateSourceOwner(
  owner: TemplateSourceOwnerReference | null,
): readonly KernelDetailReference[] {
  return owner == null
    ? []
    : kernelRecordReferences(owner.productHandle, owner.identityHandle, owner.addressHandle);
}

function referencesForTemplateSource(
  source: TemplateSource,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    referencesForTemplateSourceOwner(source.owner),
    kernelRecordReferences(source.templateAddressHandle),
    kernelFieldProvenanceReferences(source.fieldProvenance),
  );
}

function inquiryLocusReferences(locus: InquiryLocus | null): readonly KernelDetailReference[] {
  if (locus == null) {
    return [];
  }
  switch (locus.kind) {
    case InquiryLocusKind.Workspace:
    case InquiryLocusKind.Project:
      return [];
    case InquiryLocusKind.SourceFile:
    case InquiryLocusKind.SourceCursor:
    case InquiryLocusKind.SourceRange:
      return kernelRecordReferences(locus.addressHandle);
    case InquiryLocusKind.KernelRecord:
      return kernelRecordReferences(locus.handle);
  }
}

function templateParseFrontierReferences(
  frontier: TemplateParseFrontier,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    inquiryLocusReferences(frontier.locus),
    kernelRecordReferences(frontier.addressHandle),
  );
}

function referencesForTemplateParseContext(
  context: TemplateParseContext,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    templateParseFrontierReferences(context.frontier),
    kernelFieldProvenanceReferences(context.fieldProvenance),
  );
}

function templateSourceReferenceReferences(
  source: TemplateSourceReference,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    productIdentityAddressReferences(
      source.productHandle,
      source.identityHandle,
      source.sourceAddressHandle,
      TemplateDetailDescriptors.Source,
    ),
    kernelRecordReferences(source.templateAddressHandle),
  );
}

function templateCompilerWorldReferenceReferences(
  world: TemplateCompilerWorldReference,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    productIdentityAddressReferences(
      world.productHandle,
      world.identityHandle,
      world.sourceAddressHandle,
      TemplateDetailDescriptors.World,
    ),
    containerReferenceReferences(world.container),
  );
}

function templateCompilationContextReferenceReferences(
  context: TemplateCompilationContextReference | null,
): readonly KernelDetailReference[] {
  return context == null
    ? []
    : productIdentityAddressReferences(
        context.productHandle,
        context.identityHandle,
        context.sourceAddressHandle,
        TemplateDetailDescriptors.CompilationContext,
      );
}

function templateResourceScopeReferenceReferences(
  scope: TemplateResourceScopeReference,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    productIdentityAddressReferences(
      scope.productHandle,
      scope.identityHandle,
      scope.sourceAddressHandle,
      TemplateDetailDescriptors.ResourceScope,
    ),
    containerReferenceReferences(scope.container),
  );
}

function templateParseContextReferenceReferences(
  context: TemplateCompilationUnit['parseContext'],
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    productIdentityAddressReferences(
      context.productHandle,
      null,
      context.sourceAddressHandle,
      TemplateDetailDescriptors.ParseContext,
    ),
    templateParseFrontierReferences(context.frontier),
  );
}

function referencesForTemplateCompilationUnit(
  unit: TemplateCompilationUnit,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    templateSourceReferenceReferences(unit.templateSource),
    templateCompilerWorldReferenceReferences(unit.compilerWorld),
    templateParseContextReferenceReferences(unit.parseContext),
    templateCompilationContextReferenceReferences(unit.rootContext),
    kernelFieldProvenanceReferences(unit.fieldProvenance),
  );
}

function referencesForTemplateCompilationContext(
  context: TemplateCompilationContext,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    detailReferences(TemplateDetailDescriptors.CompilationUnit, context.compilationUnitProductHandle),
    templateCompilerWorldReferenceReferences(context.compilerWorld),
    templateCompilationContextReferenceReferences(context.parent),
    templateCompilationContextReferenceReferences(context.root),
    templateResourceScopeReferenceReferences(context.resourceScope),
    ...context.services.map(templateCompilerServiceReferenceReferences),
    templateParseContextReferenceReferences(context.parseContext),
    kernelRecordReferences(...context.dependencyIdentityHandles),
    kernelFieldProvenanceReferences(context.fieldProvenance),
  );
}

function referencesForTemplateCompilerWorld(
  world: TemplateCompilerWorld,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    appRootReferenceReferences(world.appRoot),
    containerReferenceReferences(world.container),
    detailReferences(TemplateDetailDescriptors.ResourceScope, world.resourceScopeProductHandle),
    ...world.services.map(templateCompilerServiceReferenceReferences),
    kernelFieldProvenanceReferences(world.fieldProvenance),
  );
}

function referencesForTemplateResourceScope(
  scope: TemplateResourceScope,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    containerReferenceReferences(scope.container),
    ...scope.resources.map(templateVisibleResourceReferences),
    ...scope.syntaxResources.map(templateVisibleResourceReferences),
    kernelFieldProvenanceReferences(scope.fieldProvenance),
  );
}

function referencesForTemplateCompilerService(
  service: TemplateCompilerService,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    containerReferenceReferences(service.container),
    kernelFieldProvenanceReferences(service.fieldProvenance),
  );
}

function referencesForTemplateResourceResolverService(
  service: TemplateResourceResolverService,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    containerReferenceReferences(service.container),
    ...service.resources.map(templateVisibleResourceReferences),
    kernelFieldProvenanceReferences(service.fieldProvenance),
  );
}

function referencesForTemplateExpressionParserService(
  service: TemplateExpressionParserService,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    containerReferenceReferences(service.container),
    kernelFieldProvenanceReferences(service.fieldProvenance),
  );
}

function referencesForTemplateAttributeMapperService(
  service: TemplateAttributeMapperService,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    containerReferenceReferences(service.container),
    kernelFieldProvenanceReferences(service.fieldProvenance),
  );
}

function referencesForTemplateRenderingService(
  service: TemplateRenderingService,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    containerReferenceReferences(service.container),
    ...service.renderers.map((renderer) => detailReferences(TemplateDetailDescriptors.RuntimeRenderer, renderer.productHandle)),
    kernelFieldProvenanceReferences(service.fieldProvenance),
  );
}

function templateCompilerServiceReferenceReferences(
  service: TemplateCompilerServiceReference,
): readonly KernelDetailReference[] {
  let slot: ProductDetailDescriptor<unknown>;
  switch (service.serviceKind) {
    case TemplateCompilerServiceKind.TemplateCompiler:
      slot = TemplateDetailDescriptors.TemplateCompilerService;
      break;
    case TemplateCompilerServiceKind.ResourceResolver:
      slot = TemplateDetailDescriptors.ResourceResolverService;
      break;
    case TemplateCompilerServiceKind.AttributeParser:
      slot = TemplateDetailDescriptors.AttributeParserService;
      break;
    case TemplateCompilerServiceKind.BindingCommandResolver:
      slot = TemplateDetailDescriptors.BindingCommandResolver;
      break;
    case TemplateCompilerServiceKind.ExpressionParser:
      slot = TemplateDetailDescriptors.ExpressionParserService;
      break;
    case TemplateCompilerServiceKind.AttributeMapper:
      slot = TemplateDetailDescriptors.AttributeMapperService;
      break;
    case TemplateCompilerServiceKind.Rendering:
      slot = TemplateDetailDescriptors.RenderingService;
      break;
  }
  return productIdentityAddressReferences(
    service.productHandle,
    service.identityHandle,
    service.addressHandle,
    slot,
  );
}

function templateVisibleResourceReferences(
  resource: TemplateVisibleResource,
): readonly KernelDetailReference[] {
  const definitionProductHandle = resource.definitionProductHandle ?? resource.definition?.productHandle ?? null;
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      resource.resourceProductHandle,
      resource.resourceIdentityHandle,
      definitionProductHandle,
      resource.sourceAddressHandle,
    ),
    visibleResourceProductDetailReferences(
      resource.resourceKind,
      resource.resourceProductHandle,
      definitionProductHandle,
    ),
    detailReferences(ResourceDetailDescriptors.Definition, definitionProductHandle),
  );
}

function templateVisibleResourceReferenceReferences(
  resource: TemplateVisibleResourceReference | null,
): readonly KernelDetailReference[] {
  return resource == null
    ? []
    : mergeKernelDetailReferences(
        kernelRecordReferences(
          resource.resourceProductHandle,
          resource.resourceIdentityHandle,
          resource.definitionProductHandle,
          resource.sourceAddressHandle,
        ),
        visibleResourceProductDetailReferences(
          resource.resourceKind,
          resource.resourceProductHandle,
          resource.definitionProductHandle,
        ),
        detailReferences(ResourceDetailDescriptors.Definition, resource.definitionProductHandle),
      );
}

function visibleResourceProductDetailReferences(
  resourceKind: ResourceDefinitionKind,
  productHandle: ProductHandle | null,
  definitionProductHandle: ProductHandle | null,
): readonly KernelDetailReference[] {
  // App definitions reuse the definition handle; built-ins retain a distinct header; syntax resources use executables.
  if (productHandle === definitionProductHandle) {
    return [];
  }
  switch (resourceKind) {
    case ResourceDefinitionKind.BindingCommand:
      return detailReferences(TemplateDetailDescriptors.BindingCommandExecutable, productHandle);
    case ResourceDefinitionKind.AttributePattern:
      return detailReferences(TemplateDetailDescriptors.AttributePatternExecutable, productHandle);
    case ResourceDefinitionKind.CustomElement:
    case ResourceDefinitionKind.CustomAttribute:
    case ResourceDefinitionKind.TemplateController:
    case ResourceDefinitionKind.ValueConverter:
    case ResourceDefinitionKind.BindingBehavior:
      return definitionProductHandle == null
        ? []
        : detailReferences(ResourceDetailDescriptors.DefinitionHeader, productHandle);
  }
}

function bindableDefinitionReferences(
  bindable: BindableDefinition,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      bindable.sourceAddressHandle,
      bindable.nameSourceAddressHandle,
      bindable.attributeSourceAddressHandle,
      bindable.callbackSourceAddressHandle,
      bindable.modeSourceAddressHandle,
      bindable.setSourceAddressHandle,
    ),
    resourceTargetReferenceReferences(bindable.set.target),
    resourceTargetReferenceReferences(bindable.propertyTarget),
    resourceTargetReferenceReferences(bindable.callbackTarget),
    kernelFieldProvenanceReferences(bindable.fieldProvenance),
  );
}

function bindableDefinitionReferenceReferences(
  bindable: BindableDefinitionReference,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    detailReferences(ResourceDetailDescriptors.Definition, bindable.ownerDefinitionProductHandle),
    kernelRecordReferences(
      bindable.sourceAddressHandle,
      bindable.nameSourceAddressHandle,
      bindable.attributeSourceAddressHandle,
    ),
    resourceTargetReferenceReferences(bindable.propertyTarget),
  );
}

function templateBindableReferenceReferences(
  bindable: TemplateBindableReference | null,
): readonly KernelDetailReference[] {
  return bindable == null
    ? []
    : mergeKernelDetailReferences(
        bindableDefinitionReferences(bindable.definition),
        bindableDefinitionReferenceReferences(bindable.reference),
      );
}

function attributePatternDefinitionEntryReferences(
  definition: AttributePatternDefinitionEntry | null,
): readonly KernelDetailReference[] {
  return definition == null
    ? []
    : kernelRecordReferences(definition.addressHandle, definition.provenanceHandle);
}

function referencesForCompiledAttributePattern(
  pattern: CompiledAttributePattern,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    attributePatternDefinitionEntryReferences(pattern.definition),
    detailReferences(TemplateDetailDescriptors.AttributePatternExecutable, pattern.executableProductHandle),
  );
}

function referencesForAttributePatternExecutable(
  executable: AttributePatternExecutable,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    detailReferences(ResourceDetailDescriptors.Definition, executable.definitionProductHandle),
    resourceTargetReferenceReferences(executable.target),
    ...executable.patterns.map(attributePatternDefinitionEntryReferences),
    kernelFieldProvenanceReferences(executable.fieldProvenance),
  );
}

function referencesForBindingCommandExecutable(
  executable: BindingCommandExecutable,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    detailReferences(ResourceDetailDescriptors.Definition, executable.definitionProductHandle),
    resourceTargetReferenceReferences(executable.target),
    kernelFieldProvenanceReferences(executable.fieldProvenance),
  );
}

function referencesForAttributeParserMachine(
  machine: AttributeParserMachine,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    ...machine.compiledPatterns.map((pattern) =>
      productIdentityAddressReferences(
        pattern.productHandle,
        pattern.identityHandle,
        pattern.sourceAddressHandle,
        TemplateDetailDescriptors.CompiledAttributePattern,
      )
    ),
    kernelFieldProvenanceReferences(machine.fieldProvenance),
  );
}

function referencesForAttributeParserService(
  service: AttributeParserService,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    ...service.patternExecutables.map((executable) =>
      productIdentityAddressReferences(
        executable.productHandle,
        executable.identityHandle,
        executable.sourceAddressHandle,
        TemplateDetailDescriptors.AttributePatternExecutable,
      )
    ),
    service.machine == null
      ? []
      : productIdentityAddressReferences(
          service.machine.productHandle,
          service.machine.identityHandle,
          service.machine.sourceAddressHandle,
          TemplateDetailDescriptors.AttributeParserMachine,
        ),
    kernelFieldProvenanceReferences(service.fieldProvenance),
  );
}

function referencesForBindingCommandResolver(
  resolver: BindingCommandResolverService,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    ...resolver.commands.map((command) =>
      productIdentityAddressReferences(
        command.productHandle,
        command.identityHandle,
        command.sourceAddressHandle,
        TemplateDetailDescriptors.BindingCommandExecutable,
      )
    ),
    kernelFieldProvenanceReferences(resolver.fieldProvenance),
  );
}

function referencesForBuiltInSyntaxCatalog(
  catalog: BuiltInSyntaxCatalog,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    ...catalog.attributePatterns.map((pattern) =>
      productIdentityAddressReferences(
        pattern.productHandle,
        pattern.identityHandle,
        pattern.sourceAddressHandle,
        TemplateDetailDescriptors.AttributePatternExecutable,
      )
    ),
    ...catalog.bindingCommands.map((command) =>
      productIdentityAddressReferences(
        command.productHandle,
        command.identityHandle,
        command.sourceAddressHandle,
        TemplateDetailDescriptors.BindingCommandExecutable,
      )
    ),
    kernelFieldProvenanceReferences(catalog.fieldProvenance),
  );
}

function referencesForConfiguredBuiltInSyntaxCatalogSelection(
  selection: ConfiguredBuiltInSyntaxCatalogSelection,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    kernelRecordReferences(selection.registrationAdmissionProductHandle),
    detailsReferences(TemplateDetailDescriptors.BuiltInSyntaxCatalog, selection.catalogProductHandles),
    kernelFieldProvenanceReferences(selection.fieldProvenance),
  );
}

function referencesForBuiltInRuntimeRendererCatalog(
  catalog: BuiltInRuntimeRendererCatalog,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    ...catalog.renderers.map((renderer) =>
      productIdentityAddressReferences(
        renderer.productHandle,
        renderer.identityHandle,
        renderer.sourceAddressHandle,
        TemplateDetailDescriptors.RuntimeRenderer,
      )
    ),
    kernelFieldProvenanceReferences(catalog.fieldProvenance),
  );
}

function referencesForConfiguredBuiltInRuntimeRendererCatalogSelection(
  selection: ConfiguredBuiltInRuntimeRendererCatalogSelection,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    kernelRecordReferences(selection.registrationAdmissionProductHandle),
    detailsReferences(TemplateDetailDescriptors.BuiltInRuntimeRendererCatalog, selection.catalogProductHandles),
    kernelFieldProvenanceReferences(selection.fieldProvenance),
  );
}

function referencesForRuntimeRenderer(
  renderer: RuntimeRenderer,
): readonly KernelDetailReference[] {
  return kernelFieldProvenanceReferences(renderer.fieldProvenance);
}

function htmlNodeReferenceReferences(
  node: HtmlNodeReference | null,
): readonly KernelDetailReference[] {
  return node == null
    ? []
    : productIdentityAddressReferences(
        node.productHandle,
        node.identityHandle,
        node.addressHandle,
        node.nodeKind === HtmlIrNodeKind.Document
          ? TemplateDetailDescriptors.HtmlDocument
          : TemplateDetailDescriptors.HtmlNode,
      );
}

function htmlAttributeReferenceReferences(
  attribute: HtmlAttributeReference | null,
): readonly KernelDetailReference[] {
  return attribute == null
    ? []
    : mergeKernelDetailReferences(
        kernelRecordReferences(attribute.productHandle, attribute.addressHandle),
        [kernelProductDetailReference(TemplateDetailDescriptors.HtmlAttribute, attribute.productHandle)],
      );
}

function htmlRecoveryReferences(
  recovery: HtmlRecovery,
): readonly KernelDetailReference[] {
  return kernelRecordReferences(recovery.addressHandle, recovery.provenanceHandle);
}

function referencesForHtmlDocument(
  document: HtmlDocument,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    ...document.rootNodes.map(htmlNodeReferenceReferences),
    ...document.recoveries.map(htmlRecoveryReferences),
    kernelFieldProvenanceReferences(document.fieldProvenance),
  );
}

function referencesForHtmlNode(
  node: HtmlIrNode,
): readonly KernelDetailReference[] {
  switch (node.nodeKind) {
    case HtmlIrNodeKind.Document:
      return referencesForHtmlDocument(node);
    case HtmlIrNodeKind.Fragment:
      return mergeKernelDetailReferences(
        ...node.children.map(htmlNodeReferenceReferences),
        ...node.recoveries.map(htmlRecoveryReferences),
      );
    case HtmlIrNodeKind.Element:
      return mergeKernelDetailReferences(
        ...node.attributes.map(htmlAttributeReferenceReferences),
        ...node.children.map(htmlNodeReferenceReferences),
        kernelRecordReferences(node.tagNameAddressHandle, node.closingTagNameAddressHandle),
        ...node.recoveries.map(htmlRecoveryReferences),
        kernelFieldProvenanceReferences(node.fieldProvenance),
      );
    case HtmlIrNodeKind.Text:
      return kernelFieldProvenanceReferences(node.fieldProvenance);
    case HtmlIrNodeKind.Comment:
      return mergeKernelDetailReferences(
        ...node.recoveries.map(htmlRecoveryReferences),
        kernelFieldProvenanceReferences(node.fieldProvenance),
      );
    case HtmlIrNodeKind.Doctype:
      return mergeKernelDetailReferences(...node.recoveries.map(htmlRecoveryReferences));
  }
}

function referencesForHtmlAttribute(
  attribute: HtmlAttribute,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    kernelRecordReferences(attribute.nameAddressHandle, attribute.valueAddressHandle),
    ...attribute.recoveries.map(htmlRecoveryReferences),
    kernelFieldProvenanceReferences(attribute.fieldProvenance),
  );
}

function bindingCommandExecutableReferenceReferences(
  command: BindingCommandExecutableReference | null,
): readonly KernelDetailReference[] {
  return command == null
    ? []
    : productIdentityAddressReferences(
        command.productHandle,
        command.identityHandle,
        null,
        TemplateDetailDescriptors.BindingCommandExecutable,
      );
}

function referencesForAttributeSyntax(
  syntax: AttributeSyntax,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      syntax.nameSourceAddressHandle,
      syntax.targetSourceAddressHandle,
      syntax.commandSourceAddressHandle,
      ...syntax.patternParts.map((part) => part.sourceAddressHandle),
      ...syntax.patternLiterals.map((literal) => literal.sourceAddressHandle),
    ),
    attributePatternDefinitionEntryReferences(syntax.pattern),
    detailReferences(TemplateDetailDescriptors.CompiledAttributePattern, syntax.compiledPatternProductHandle),
    htmlAttributeReferenceReferences(syntax.attribute),
    kernelFieldProvenanceReferences(syntax.fieldProvenance),
  );
}

function referencesForAttributeClassification(
  classification: AttributeClassification,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    detailReferences(TemplateDetailDescriptors.AttributeSyntax, classification.syntaxProductHandle),
    htmlNodeReferenceReferences(classification.ownerNode),
    classification.resource == null ? [] : templateVisibleResourceReferences(classification.resource),
    bindingCommandExecutableReferenceReferences(classification.bindingCommand),
    templateBindableReferenceReferences(classification.bindable),
    detailsReferences(TemplateDetailDescriptors.Instruction, classification.instructionProductHandles),
    kernelFieldProvenanceReferences(classification.fieldProvenance),
  );
}

function templateValueSiteReferenceReferences(
  site: TemplateValueSiteReference,
): readonly KernelDetailReference[] {
  return productIdentityAddressReferences(
    site.productHandle,
    site.identityHandle,
    site.sourceAddressHandle,
    TemplateDetailDescriptors.ValueSite,
  );
}

function referencesForTemplateValueSite(
  site: TemplateValueSite,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    htmlNodeReferenceReferences(site.node),
    htmlAttributeReferenceReferences(site.attribute),
    site.syntax == null
      ? []
      : productIdentityAddressReferences(
          site.syntax.productHandle,
          site.syntax.identityHandle,
          site.syntax.sourceAddressHandle,
          TemplateDetailDescriptors.AttributeSyntax,
        ),
    site.classification == null
      ? []
      : productIdentityAddressReferences(
          site.classification.productHandle,
          site.classification.identityHandle,
          site.classification.sourceAddressHandle,
          TemplateDetailDescriptors.AttributeClassification,
        ),
    bindingCommandExecutableReferenceReferences(site.bindingCommand),
    templateBindableReferenceReferences(site.bindable),
    kernelFieldProvenanceReferences(site.fieldProvenance),
  );
}

function referencesForTemplateExpressionParse(
  parse: TemplateExpressionParse,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    templateValueSiteReferenceReferences(parse.site),
    detailReferences(TemplateDetailDescriptors.ExpressionParserService, parse.parserProductHandle),
    kernelFieldProvenanceReferences(parse.fieldProvenance),
  );
}

function referencesForBindingCommandBuildInput(
  input: BindingCommandBuildInput,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    htmlNodeReferenceReferences(input.node),
    htmlAttributeReferenceReferences(input.attribute),
    detailReferences(TemplateDetailDescriptors.AttributeSyntax, input.syntaxProductHandle),
    detailReferences(ResourceDetailDescriptors.Definition, input.bindableOwnerProductHandle),
    detailReferences(ResourceDetailDescriptors.Definition, input.definitionProductHandle),
    kernelFieldProvenanceReferences(input.fieldProvenance),
  );
}

function referencesForBindingCommandLowering(
  lowering: BindingCommandLowering,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    bindingCommandExecutableReferenceReferences(lowering.command),
    detailReferences(TemplateDetailDescriptors.BindingCommandBuildInput, lowering.inputProductHandle),
    detailsReferences(TemplateDetailDescriptors.Instruction, lowering.instructionProductHandles),
    kernelFieldProvenanceReferences(lowering.fieldProvenance),
  );
}

function referencesForTemplateCompilerIssue(
  issue: TemplateCompilerIssue,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    kernelFieldProvenanceReferences(issue.fieldProvenance),
    kernelRecordReferences(...issue.relatedInformation.map((related) => related.sourceAddressHandle)),
  );
}

function referencesForMultiBindingSegment(
  segment: MultiBindingSegment,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    templateValueSiteReferenceReferences(segment.site),
    htmlAttributeReferenceReferences(segment.attribute),
    detailReferences(TemplateDetailDescriptors.AttributeSyntax, segment.syntaxProductHandle),
    templateBindableReferenceReferences(segment.bindable),
    bindingCommandExecutableReferenceReferences(segment.command),
    kernelRecordReferences(segment.targetSourceAddressHandle),
    kernelFieldProvenanceReferences(segment.fieldProvenance),
  );
}

function referencesForMultiBindingLowering(
  lowering: MultiBindingLowering,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    templateValueSiteReferenceReferences(lowering.site),
    detailsReferences(TemplateDetailDescriptors.MultiBindingSegment, lowering.segmentProductHandles),
    detailsReferences(TemplateDetailDescriptors.Instruction, lowering.instructionProductHandles),
    kernelFieldProvenanceReferences(lowering.fieldProvenance),
  );
}

function referencesForCompiledTemplate(
  template: CompiledTemplate,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    detailReferences(TemplateDetailDescriptors.HtmlDocument, template.htmlDocumentProductHandle),
    ...template.targets.map((target) =>
      productIdentityAddressReferences(
        target.productHandle,
        target.identityHandle,
        target.sourceAddressHandle,
        TemplateDetailDescriptors.RenderTarget,
      )
    ),
    template.surrogateSequence == null
      ? []
      : productIdentityAddressReferences(
          template.surrogateSequence.productHandle,
          template.surrogateSequence.identityHandle,
          template.surrogateSequence.sourceAddressHandle,
          TemplateDetailDescriptors.InstructionSequence,
        ),
    kernelFieldProvenanceReferences(template.fieldProvenance),
  );
}

function referencesForTemplateRenderTarget(
  target: TemplateRenderTarget,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    htmlNodeReferenceReferences(target.htmlNode),
    detailReferences(TemplateDetailDescriptors.InstructionSequence, target.instructionSequenceProductHandle),
    kernelFieldProvenanceReferences(target.fieldProvenance),
  );
}

function templateInstructionReferenceReferences(
  instruction: TemplateInstructionReference,
): readonly KernelDetailReference[] {
  return productIdentityAddressReferences(
    instruction.productHandle,
    instruction.identityHandle,
    instruction.addressHandle,
    TemplateDetailDescriptors.Instruction,
  );
}

function expressionReferences(
  ...handles: readonly (ProductHandle | null | undefined)[]
): readonly KernelDetailReference[] {
  return detailsReferences(TemplateDetailDescriptors.ExpressionParse, handles);
}

function referencesForTemplateInstructionSequence(
  sequence: TemplateInstructionSequence,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    kernelRecordReferences(sequence.ownerProductHandle),
    ...sequence.instructions.map(templateInstructionReferenceReferences),
  );
}

function referencesForTemplateInstruction(
  instruction: TemplateInstruction,
): readonly KernelDetailReference[] {
  const common = mergeKernelDetailReferences(
    htmlNodeReferenceReferences(instruction.node),
    kernelFieldProvenanceReferences(instruction.fieldProvenance),
  );
  switch (instruction.instructionKind) {
    case TemplateInstructionKind.HydrateElement:
      return mergeKernelDetailReferences(
        common,
        detailReferences(ResourceDetailDescriptors.Definition, instruction.definitionProductHandle),
        detailReferences(
          TemplateDetailDescriptors.InstructionSequence,
          instruction.childInstructionSequenceProductHandle,
        ),
        ...instruction.projectionInstructionSequences.map((projection) =>
          mergeKernelDetailReferences(
            detailReferences(
              TemplateDetailDescriptors.InstructionSequence,
              projection.instructionSequenceProductHandle,
            ),
            kernelRecordReferences(projection.sourceAddressHandle),
          )
        ),
        detailsReferences(
          TemplateDetailDescriptors.Instruction,
          instruction.bindableInstructionProductHandles,
        ),
        detailsReferences(
          TemplateDetailDescriptors.AttributeSyntax,
          instruction.captureSyntaxProductHandles,
        ),
      );
    case TemplateInstructionKind.HydrateAttribute:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        detailReferences(ResourceDetailDescriptors.Definition, instruction.definitionProductHandle),
        detailsReferences(
          TemplateDetailDescriptors.Instruction,
          instruction.bindingInstructionProductHandles,
        ),
      );
    case TemplateInstructionKind.HydrateTemplateController:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        detailReferences(ResourceDetailDescriptors.Definition, instruction.definitionProductHandle),
        detailReferences(
          TemplateDetailDescriptors.InstructionSequence,
          instruction.childInstructionSequenceProductHandle,
        ),
        detailsReferences(
          TemplateDetailDescriptors.Instruction,
          instruction.bindingInstructionProductHandles,
        ),
      );
    case TemplateInstructionKind.HydrateLetElement:
      return mergeKernelDetailReferences(
        common,
        detailsReferences(TemplateDetailDescriptors.Instruction, instruction.instructionProductHandles),
      );
    case TemplateInstructionKind.PropertyBinding:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        expressionReferences(instruction.expressionProductHandle),
        bindingCommandExecutableReferenceReferences(instruction.command),
      );
    case TemplateInstructionKind.Interpolation:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        expressionReferences(...instruction.expressionProductHandles),
      );
    case TemplateInstructionKind.ListenerBinding:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        kernelRecordReferences(
          instruction.eventNameSourceAddressHandle,
          instruction.eventModifierSourceAddressHandle,
        ),
        expressionReferences(instruction.expressionProductHandle),
        bindingCommandExecutableReferenceReferences(instruction.command),
      );
    case TemplateInstructionKind.IteratorBinding:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        expressionReferences(instruction.iterableExpressionProductHandle),
        detailsReferences(TemplateDetailDescriptors.Instruction, instruction.tailInstructionProductHandles),
      );
    case TemplateInstructionKind.RefBinding:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        kernelRecordReferences(instruction.targetSourceAddressHandle),
        expressionReferences(instruction.expressionProductHandle),
      );
    case TemplateInstructionKind.LetBinding:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        kernelRecordReferences(instruction.targetSourceAddressHandle),
        expressionReferences(instruction.expressionProductHandle),
      );
    case TemplateInstructionKind.TextBinding:
      return mergeKernelDetailReferences(common, expressionReferences(instruction.expressionProductHandle));
    case TemplateInstructionKind.SetProperty:
    case TemplateInstructionKind.SetAttribute:
    case TemplateInstructionKind.SetClassAttribute:
    case TemplateInstructionKind.SetStyleAttribute:
      return mergeKernelDetailReferences(common, htmlAttributeReferenceReferences(instruction.attribute));
    case TemplateInstructionKind.StylePropertyBinding:
    case TemplateInstructionKind.AttributeBinding:
    case TemplateInstructionKind.MultiAttr:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        expressionReferences(instruction.expressionProductHandle),
      );
    case TemplateInstructionKind.SpreadTransferedBinding:
      return mergeKernelDetailReferences(common, htmlAttributeReferenceReferences(instruction.attribute));
    case TemplateInstructionKind.SpreadElementPropBinding:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        detailReferences(TemplateDetailDescriptors.Instruction, instruction.instructionProductHandle),
      );
    case TemplateInstructionKind.SpreadValueBinding:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        kernelRecordReferences(instruction.targetSourceAddressHandle),
        expressionReferences(instruction.expressionProductHandle),
      );
    case TemplateInstructionKind.TranslationBinding:
      return mergeKernelDetailReferences(common, htmlAttributeReferenceReferences(instruction.attribute));
    case TemplateInstructionKind.TranslationBindBinding:
    case TemplateInstructionKind.TranslationParametersBinding:
    case TemplateInstructionKind.StateBinding:
    case TemplateInstructionKind.DispatchBinding:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        expressionReferences(instruction.expressionProductHandle),
      );
  }
}

function runtimeRendererReferenceReferences(
  renderer: RuntimeRendererReference | null,
): readonly KernelDetailReference[] {
  return renderer == null
    ? []
    : productIdentityAddressReferences(
        renderer.productHandle,
        renderer.identityHandle,
        renderer.sourceAddressHandle,
        TemplateDetailDescriptors.RuntimeRenderer,
      );
}

function runtimeBindingScopeEffectReferenceReferences(
  effect: RuntimeBindingScopeEffectReference,
): readonly KernelDetailReference[] {
  return productIdentityAddressReferences(
    effect.productHandle,
    effect.identityHandle,
    effect.addressHandle,
    TemplateDetailDescriptors.RuntimeBindingScopeEffect,
  );
}

function runtimeControllerReferences(
  productHandle: ProductHandle | null | undefined,
  identityHandle: KernelRecordHandle | null | undefined = null,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    detailReferences(ConfigurationDetailDescriptors.Controller, productHandle),
    kernelRecordReferences(identityHandle),
  );
}

function referencesForRuntimeBinding(
  binding: RuntimeBinding,
): readonly KernelDetailReference[] {
  const common = mergeKernelDetailReferences(
    detailReferences(TemplateDetailDescriptors.Instruction, binding.instructionProductHandle),
    runtimeRendererReferenceReferences(binding.renderer),
    htmlNodeReferenceReferences(binding.node),
    ...binding.scopeEffects.map(runtimeBindingScopeEffectReferenceReferences),
    kernelFieldProvenanceReferences(binding.fieldProvenance),
  );
  switch (binding.bindingKind) {
    case RuntimeBindingKind.Property:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(binding.attribute),
        expressionReferences(binding.expressionProductHandle),
        bindingCommandExecutableReferenceReferences(binding.command),
      );
    case RuntimeBindingKind.Attribute:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(binding.attribute),
        expressionReferences(binding.expressionProductHandle),
      );
    case RuntimeBindingKind.Let:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(binding.attribute),
        kernelRecordReferences(binding.targetSourceAddressHandle),
        expressionReferences(binding.expressionProductHandle),
      );
    case RuntimeBindingKind.Listener:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(binding.attribute),
        kernelRecordReferences(
          binding.eventNameSourceAddressHandle,
          binding.eventModifierSourceAddressHandle,
        ),
        expressionReferences(binding.expressionProductHandle),
        bindingCommandExecutableReferenceReferences(binding.command),
      );
    case RuntimeBindingKind.Interpolation:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(binding.attribute),
        expressionReferences(...binding.expressionProductHandles),
      );
    case RuntimeBindingKind.Ref:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(binding.attribute),
        kernelRecordReferences(binding.targetSourceAddressHandle),
        expressionReferences(binding.expressionProductHandle),
      );
    case RuntimeBindingKind.Content:
      return mergeKernelDetailReferences(common, expressionReferences(binding.expressionProductHandle));
    case RuntimeBindingKind.Spread:
      return mergeKernelDetailReferences(common, htmlAttributeReferenceReferences(binding.attribute));
    case RuntimeBindingKind.SpreadValue:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(binding.attribute),
        expressionReferences(binding.expressionProductHandle),
      );
    case RuntimeBindingKind.Translation:
    case RuntimeBindingKind.TranslationParameters:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(binding.attribute),
        expressionReferences(binding.expressionProductHandle),
      );
    case RuntimeBindingKind.State:
    case RuntimeBindingKind.StateDispatch:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(binding.attribute),
        expressionReferences(binding.expressionProductHandle),
      );
  }
}

function referencesForRuntimeBindingScopeEffect(
  effect: RuntimeBindingScopeEffect,
): readonly KernelDetailReference[] {
  const common = mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(effect.binding),
    detailReferences(TemplateDetailDescriptors.Instruction, effect.ownerInstructionProductHandle),
    kernelFieldProvenanceReferences(effect.fieldProvenance),
  );
  switch (effect.effectKind) {
    case RuntimeBindingScopeEffectKind.Let:
      return mergeKernelDetailReferences(
        common,
        expressionReferences(effect.expressionProductHandle),
        kernelRecordReferences(effect.targetSourceAddressHandle),
      );
    case RuntimeBindingScopeEffectKind.Iterator:
      return mergeKernelDetailReferences(
        common,
        expressionReferences(effect.iterableExpressionProductHandle),
      );
  }
}

function watchPropertyKeyReferences(
  key: WatchPropertyKeyDefinition | null,
): readonly KernelDetailReference[] {
  return key == null ? [] : resourceTargetReferenceReferences(key.target);
}

function watchExpressionReferences(
  expression: WatchExpressionDefinition,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    watchPropertyKeyReferences(expression.propertyKey),
    resourceTargetReferenceReferences(expression.target),
  );
}

function watchCallbackReferences(
  callback: WatchCallbackDefinition,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    watchPropertyKeyReferences(callback.methodName),
    resourceTargetReferenceReferences(callback.target),
  );
}

function runtimeWatcherObservedDependencyReferences(
  dependency: RuntimeWatcherObservedDependency,
): readonly KernelDetailReference[] {
  return productIdentityAddressReferences(
    dependency.productHandle,
    dependency.identityHandle,
    dependency.sourceAddressHandle,
    ObservationDetailDescriptors.RuntimeWatcherObservedDependency,
  );
}

function referencesForRuntimeWatcher(
  watcher: RuntimeWatcher,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    runtimeControllerReferences(watcher.controllerProductHandle, watcher.controllerIdentityHandle),
    detailReferences(ResourceDetailDescriptors.Definition, watcher.definitionProductHandle),
    watchExpressionReferences(watcher.expression),
    watchCallbackReferences(watcher.callback),
    ...watcher.observedDependencies.map(runtimeWatcherObservedDependencyReferences),
    kernelFieldProvenanceReferences(watcher.fieldProvenance),
  );
}

function referencesForRuntimeBindingTargetAccess(
  access: RuntimeBindingTargetAccess,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(access.binding),
    htmlNodeReferenceReferences(access.targetNode),
    runtimeControllerReferences(access.targetControllerProductHandle),
    checkerTypeReferenceKernelReferences(access.targetType),
    checkerTypeReferenceKernelReferences(access.propertyType),
    kernelFieldProvenanceReferences(access.fieldProvenance),
  );
}

function referencesForRuntimeBindingTargetOperation(
  operation: RuntimeBindingTargetOperation,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(operation.binding),
    runtimeRendererReferenceReferences(operation.renderer),
    detailReferences(TemplateDetailDescriptors.Instruction, operation.instructionProductHandle),
    htmlNodeReferenceReferences(operation.targetNode),
    runtimeControllerReferences(operation.targetControllerProductHandle),
    kernelFieldProvenanceReferences(operation.fieldProvenance),
  );
}

function referencesForRuntimeBindingSourceOperation(
  operation: RuntimeBindingSourceOperation,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(operation.binding),
    detailReferences(TemplateDetailDescriptors.Instruction, operation.instructionProductHandle),
    htmlNodeReferenceReferences(operation.targetNode),
    runtimeControllerReferences(operation.targetControllerProductHandle),
    checkerTypeReferenceKernelReferences(operation.targetType),
    kernelFieldProvenanceReferences(operation.fieldProvenance),
  );
}

function referencesForRuntimeBindingIssue(
  issue: RuntimeBindingIssue,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(issue.binding),
    kernelFieldProvenanceReferences(issue.fieldProvenance),
  );
}

function referencesForRuntimeRendererIssue(
  issue: RuntimeRendererIssue,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    runtimeRendererReferenceReferences(issue.renderer),
    detailReferences(TemplateDetailDescriptors.Instruction, issue.instructionProductHandle),
    kernelRecordReferences(issue.instructionIdentityHandle),
    kernelFieldProvenanceReferences(issue.fieldProvenance),
  );
}

function referencesForRuntimeBindingBehaviorApplication(
  application: RuntimeBindingBehaviorApplication,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(application.binding),
    templateVisibleResourceReferenceReferences(application.resource),
    runtimeBindingTargetAccessReferenceReferences(application.targetAccess),
    expressionReferences(application.expressionProductHandle),
    kernelFieldProvenanceReferences(application.fieldProvenance),
  );
}

function referencesForRuntimeBindingBehaviorIssue(
  issue: RuntimeBindingBehaviorIssue,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    productIdentityAddressReferences(
      issue.application.productHandle,
      issue.application.identityHandle,
      issue.application.addressHandle,
      TemplateDetailDescriptors.RuntimeBindingBehaviorApplication,
    ),
    runtimeBindingReferenceReferences(issue.binding),
    runtimeBindingTargetAccessReferenceReferences(issue.targetAccess),
    kernelFieldProvenanceReferences(issue.fieldProvenance),
  );
}

function referencesForRuntimeValueConverterApplication(
  application: RuntimeValueConverterApplication,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(application.binding),
    templateVisibleResourceReferenceReferences(application.resource),
    expressionReferences(application.expressionProductHandle),
    kernelFieldProvenanceReferences(application.fieldProvenance),
  );
}

function referencesForRuntimeValueConverterIssue(
  issue: RuntimeValueConverterIssue,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    productIdentityAddressReferences(
      issue.application.productHandle,
      issue.application.identityHandle,
      issue.application.addressHandle,
      TemplateDetailDescriptors.RuntimeValueConverterApplication,
    ),
    runtimeBindingReferenceReferences(issue.binding),
    kernelFieldProvenanceReferences(issue.fieldProvenance),
  );
}

function referencesForRuntimeBindingScopeIssue(
  issue: RuntimeBindingScopeIssue,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    detailReferences(
      TemplateDetailDescriptors.RuntimeBindingScopeEffect,
      issue.ownerScopeEffectProductHandle,
    ),
    kernelRecordReferences(issue.ownerScopeEffectIdentityHandle),
    checkerTypeReferenceKernelReferences(issue.sourceType),
  );
}

function referencesForRuntimeControllerIssue(
  issue: RuntimeControllerIssue,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    runtimeControllerReferences(issue.controllerProductHandle, issue.controllerIdentityHandle),
    detailReferences(TemplateDetailDescriptors.Instruction, issue.instructionProductHandle),
    kernelFieldProvenanceReferences(issue.fieldProvenance),
  );
}

function compositionActivationModelHandoffReferences(
  handoff: CompositionActivationModelHandoff | null,
): readonly KernelDetailReference[] {
  return handoff == null
    ? []
    : mergeKernelDetailReferences(
        checkerTypeReferenceKernelReferences(handoff.activationParameterType),
        checkerTypeReferenceKernelReferences(handoff.modelType),
      );
}

function compositionResolvedComponentReferences(
  component: CompositionResolvedComponent,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    detailReferences(ResourceDetailDescriptors.Definition, component.definitionProductHandle),
    detailReferences(TemplateDetailDescriptors.CompiledTemplate, component.compiledTemplateProductHandle),
    controllerReferenceReferences(component.composedController),
    compositionActivationModelHandoffReferences(component.activationModelHandoff),
  );
}

function compositionContextReferenceReferences(
  context: CompositionContextReference,
): readonly KernelDetailReference[] {
  return productIdentityAddressReferences(
    context.productHandle,
    context.identityHandle,
    context.sourceAddressHandle,
    TemplateDetailDescriptors.CompositionContext,
  );
}

function referencesForCompositionContext(
  context: CompositionContext,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    runtimeControllerReferences(context.hostControllerProductHandle),
    runtimeControllerReferences(context.parentControllerProductHandle),
    detailReferences(TemplateDetailDescriptors.Instruction, context.instructionProductHandle),
    runtimeBindingReferenceReferences(context.templateBinding),
    runtimeBindingReferenceReferences(context.componentBinding),
    runtimeBindingReferenceReferences(context.modelBinding),
    runtimeBindingReferenceReferences(context.scopeBehaviorBinding),
    runtimeBindingReferenceReferences(context.tagBinding),
    runtimeBindingReferenceReferences(context.flushModeBinding),
    runtimeBindingReferenceReferences(context.composingBinding),
    runtimeBindingReferenceReferences(context.compositionBinding),
    expressionReferences(
      context.templateExpressionProductHandle,
      context.componentExpressionProductHandle,
      context.modelExpressionProductHandle,
    ),
  );
}

function referencesForCompositionController(
  controller: CompositionController,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    compositionContextReferenceReferences(controller.context),
    runtimeControllerReferences(controller.hostControllerProductHandle),
    runtimeControllerReferences(controller.parentControllerProductHandle),
    ...controller.resolvedComponents.map(compositionResolvedComponentReferences),
    compositionActivationModelHandoffReferences(controller.objectViewModelActivationHandoff),
  );
}
