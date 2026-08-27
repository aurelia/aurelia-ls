import type { AppRootReference } from '../configuration/app-root.js';
import type { ControllerReference } from '../configuration/controller.js';
import { ConfigurationDetailDescriptors } from '../configuration/detail-descriptors.js';
import type { ContainerReference } from '../di/container-reference.js';
import type { ProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import type { KernelRecordHandle, ProductHandle } from '../kernel/handles.js';
import {
  kernelFieldProvenanceReferences,
  kernelProductDetailReference,
  kernelProductDetailReferences as detailReferences,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReferenceClosure,
} from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import {
  InquiryLocusKind,
  type InquiryLocus,
} from '../inquiry/locus.js';
import { ObservationDetailDescriptors } from '../observation/detail-descriptors.js';
import type { RuntimeWatcherObservedDependency } from '../observation/runtime-watcher-observation.js';
import { RuntimeExpressionDetailDescriptors } from '../runtime-expression/detail-descriptors.js';
import type { AttributePatternDefinitionEntry } from '../resources/attribute-pattern-definition.js';
import type {
  BindableDefinition,
  BindableDefinitionReference,
} from '../resources/bindable-definition.js';
import { ResourceDetailDescriptors } from '../resources/detail-descriptors.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import {
  resourceTargetReferenceKernelReferences as resourceTargetReferenceReferences,
} from '../resources/structural-references.js';
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
import type { TemplateCompilerHookSet } from './compiler-hook-world.js';
import type { CssClassMappingAuthority } from './css-class-mapping.js';
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
  CompiledTemplateReference,
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
  TemplateStructuralTreeKind,
  type TemplateStructuralAttribute,
  type TemplateStructuralAttributeReference,
  type TemplateStructuralNode,
  type TemplateStructuralNodeReference,
  type TemplateStructuralTree,
  type TemplateStructuralTreeReference,
} from './template-structure.js';
import type {
  TemplateStructureDerivation,
  TemplateStructureReference,
} from './template-structure-derivation.js';
import {
  compareStructuralAttributeDetails,
  compareStructuralNodeDetails,
  compareStructuralTreeDetails,
  compareStructureDerivationDetails,
} from './template-structure-comparison.js';
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
import {
  compareCompiledTemplateDetails,
  compareTemplateInstructionSequenceDetails,
  compareTemplateRenderTargetDetails,
} from './compiled-template-comparison.js';
import {
  compareAttributeParserMachineDetails,
  compareAttributeParserServiceDetails,
  compareAttributePatternExecutableDetails,
  compareBindingCommandExecutableDetails,
  compareBindingCommandResolverDetails,
  compareCompiledAttributePatternDetails,
  compareCssClassMappingAuthorityDetails,
  compareRuntimeRendererDetails,
  compareTemplateAttributeMapperServiceDetails,
  compareTemplateCompilerIssueDetails,
  compareTemplateCompilerServiceDetails,
  compareTemplateCompilerHookSetDetails,
  compareTemplateCompilerWorldDetails,
  compareTemplateExpressionParserServiceDetails,
  compareTemplateRenderingServiceDetails,
  compareTemplateResourceResolverServiceDetails,
  compareTemplateResourceScopeDetails,
} from './compiler-world-comparison.js';

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
  World: defineProductDetailSlot(TemplateDetailDescriptors.World, referencesForTemplateCompilerWorld, compareTemplateCompilerWorldDetails),
  ResourceScope: defineProductDetailSlot(TemplateDetailDescriptors.ResourceScope, referencesForTemplateResourceScope, compareTemplateResourceScopeDetails),
  TemplateCompilerService: defineProductDetailSlot(TemplateDetailDescriptors.TemplateCompilerService, referencesForTemplateCompilerService, compareTemplateCompilerServiceDetails),
  CompilerHookSet: defineProductDetailSlot(TemplateDetailDescriptors.CompilerHookSet, referencesForTemplateCompilerHookSet, compareTemplateCompilerHookSetDetails),
  CssClassMapping: defineProductDetailSlot(TemplateDetailDescriptors.CssClassMapping, referencesForCssClassMapping, compareCssClassMappingAuthorityDetails),
  ResourceResolverService: defineProductDetailSlot(TemplateDetailDescriptors.ResourceResolverService, referencesForTemplateResourceResolverService, compareTemplateResourceResolverServiceDetails),
  ExpressionParserService: defineProductDetailSlot(TemplateDetailDescriptors.ExpressionParserService, referencesForTemplateExpressionParserService, compareTemplateExpressionParserServiceDetails),
  AttributeMapperService: defineProductDetailSlot(TemplateDetailDescriptors.AttributeMapperService, referencesForTemplateAttributeMapperService, compareTemplateAttributeMapperServiceDetails),
  RenderingService: defineProductDetailSlot(TemplateDetailDescriptors.RenderingService, referencesForTemplateRenderingService, compareTemplateRenderingServiceDetails),
  AttributeParserService: defineProductDetailSlot(TemplateDetailDescriptors.AttributeParserService, referencesForAttributeParserService, compareAttributeParserServiceDetails),
  AttributeParserMachine: defineProductDetailSlot(TemplateDetailDescriptors.AttributeParserMachine, referencesForAttributeParserMachine, compareAttributeParserMachineDetails),
  BindingCommandResolver: defineProductDetailSlot(TemplateDetailDescriptors.BindingCommandResolver, referencesForBindingCommandResolver, compareBindingCommandResolverDetails),
  BuiltInSyntaxCatalog: defineProductDetailSlot(TemplateDetailDescriptors.BuiltInSyntaxCatalog, referencesForBuiltInSyntaxCatalog),
  ConfiguredBuiltInSyntaxCatalogSelection: defineProductDetailSlot(TemplateDetailDescriptors.ConfiguredBuiltInSyntaxCatalogSelection, referencesForConfiguredBuiltInSyntaxCatalogSelection),
  BuiltInRuntimeRendererCatalog: defineProductDetailSlot(TemplateDetailDescriptors.BuiltInRuntimeRendererCatalog, referencesForBuiltInRuntimeRendererCatalog),
  ConfiguredBuiltInRuntimeRendererCatalogSelection: defineProductDetailSlot(TemplateDetailDescriptors.ConfiguredBuiltInRuntimeRendererCatalogSelection, referencesForConfiguredBuiltInRuntimeRendererCatalogSelection),
  RuntimeRenderer: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeRenderer, referencesForRuntimeRenderer, compareRuntimeRendererDetails),
  RuntimeRendererIssue: defineProductDetailSlot(TemplateDetailDescriptors.RuntimeRendererIssue, referencesForRuntimeRendererIssue),
  CompiledAttributePattern: defineProductDetailSlot(TemplateDetailDescriptors.CompiledAttributePattern, referencesForCompiledAttributePattern, compareCompiledAttributePatternDetails),
  AttributePatternExecutable: defineProductDetailSlot(TemplateDetailDescriptors.AttributePatternExecutable, referencesForAttributePatternExecutable, compareAttributePatternExecutableDetails),
  BindingCommandExecutable: defineProductDetailSlot(TemplateDetailDescriptors.BindingCommandExecutable, referencesForBindingCommandExecutable, compareBindingCommandExecutableDetails),
  HtmlDocument: defineProductDetailSlot(TemplateDetailDescriptors.HtmlDocument, referencesForHtmlDocument),
  HtmlNode: defineProductDetailSlot(TemplateDetailDescriptors.HtmlNode, referencesForHtmlNode),
  HtmlAttribute: defineProductDetailSlot(TemplateDetailDescriptors.HtmlAttribute, referencesForHtmlAttribute),
  HtmlRecovery: defineProductDetailSlot(TemplateDetailDescriptors.HtmlRecovery, referencesForHtmlRecovery),
  StructuralTree: defineProductDetailSlot(
    TemplateDetailDescriptors.StructuralTree,
    referencesForStructuralTree,
    compareStructuralTreeDetails,
  ),
  StructuralNode: defineProductDetailSlot(
    TemplateDetailDescriptors.StructuralNode,
    referencesForStructuralNode,
    compareStructuralNodeDetails,
  ),
  StructuralAttribute: defineProductDetailSlot(
    TemplateDetailDescriptors.StructuralAttribute,
    referencesForStructuralAttribute,
    compareStructuralAttributeDetails,
  ),
  StructureDerivation: defineProductDetailSlot(
    TemplateDetailDescriptors.StructureDerivation,
    referencesForStructureDerivation,
    compareStructureDerivationDetails,
  ),
  CompiledTemplate: defineProductDetailSlot(
    TemplateDetailDescriptors.CompiledTemplate,
    referencesForCompiledTemplate,
    compareCompiledTemplateDetails,
  ),
  RenderTarget: defineProductDetailSlot(
    TemplateDetailDescriptors.RenderTarget,
    referencesForTemplateRenderTarget,
    compareTemplateRenderTargetDetails,
  ),
  AttributeSyntax: defineProductDetailSlot(TemplateDetailDescriptors.AttributeSyntax, referencesForAttributeSyntax),
  AttributeClassification: defineProductDetailSlot(TemplateDetailDescriptors.AttributeClassification, referencesForAttributeClassification),
  ValueSite: defineProductDetailSlot(TemplateDetailDescriptors.ValueSite, referencesForTemplateValueSite),
  ExpressionParse: defineProductDetailSlot(TemplateDetailDescriptors.ExpressionParse, referencesForTemplateExpressionParse),
  BindingCommandBuildInput: defineProductDetailSlot(TemplateDetailDescriptors.BindingCommandBuildInput, referencesForBindingCommandBuildInput),
  BindingCommandLowering: defineProductDetailSlot(TemplateDetailDescriptors.BindingCommandLowering, referencesForBindingCommandLowering),
  CompilerIssue: defineProductDetailSlot(TemplateDetailDescriptors.CompilerIssue, referencesForTemplateCompilerIssue, compareTemplateCompilerIssueDetails),
  MultiBindingSegment: defineProductDetailSlot(TemplateDetailDescriptors.MultiBindingSegment, referencesForMultiBindingSegment),
  MultiBindingLowering: defineProductDetailSlot(TemplateDetailDescriptors.MultiBindingLowering, referencesForMultiBindingLowering),
  Instruction: defineProductDetailSlot(TemplateDetailDescriptors.Instruction, referencesForTemplateInstruction),
  InstructionSequence: defineProductDetailSlot(
    TemplateDetailDescriptors.InstructionSequence,
    referencesForTemplateInstructionSequence,
    compareTemplateInstructionSequenceDetails,
  ),
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

function detailsReferences(
  slot: ProductDetailDescriptor<unknown>,
  handles: readonly (ProductHandle | null | undefined)[],
): KernelDetailReferenceClosure {
  return detailReferences(slot, ...handles);
}

function productIdentityAddressReferences(
  productHandle: ProductHandle | null | undefined,
  identityHandle: KernelRecordHandle | null | undefined,
  addressHandle: KernelRecordHandle | null | undefined,
  slot: ProductDetailDescriptor<unknown> | null = null,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(productHandle, identityHandle, addressHandle),
    slot == null ? [] : [kernelProductDetailReference(slot, productHandle)],
  );
}

function containerReferenceReferences(
  container: ContainerReference,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(container.productHandle, container.identityHandle, container.addressHandle),
  );
}

function appRootReferenceReferences(
  appRoot: AppRootReference | null,
): KernelDetailReferenceClosure {
  return appRoot == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        kernelRecordReferences(appRoot.productHandle, appRoot.identityHandle, appRoot.addressHandle),
      );
}

function controllerReferenceReferences(
  controller: ControllerReference | null,
): KernelDetailReferenceClosure {
  return controller == null
    ? mergeKernelDetailReferences()
    : productIdentityAddressReferences(
        controller.productHandle,
        controller.identityHandle,
        controller.addressHandle,
        ConfigurationDetailDescriptors.Controller,
      );
}

function referencesForTemplateSourceOwner(
  owner: TemplateSourceOwnerReference | null,
): KernelDetailReferenceClosure {
  return owner == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        kernelRecordReferences(owner.productHandle, owner.identityHandle, owner.addressHandle),
      );
}

function referencesForTemplateSource(
  source: TemplateSource,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    referencesForTemplateSourceOwner(source.owner),
    kernelRecordReferences(source.templateAddressHandle),
    kernelFieldProvenanceReferences(source.fieldProvenance),
  );
}

function inquiryLocusReferences(locus: InquiryLocus | null): KernelDetailReferenceClosure {
  if (locus == null) {
    return mergeKernelDetailReferences();
  }
  switch (locus.kind) {
    case InquiryLocusKind.Workspace:
    case InquiryLocusKind.Project:
      return mergeKernelDetailReferences();
    case InquiryLocusKind.SourceFile:
    case InquiryLocusKind.SourceCursor:
    case InquiryLocusKind.SourceRange:
      return mergeKernelDetailReferences(kernelRecordReferences(locus.addressHandle));
    case InquiryLocusKind.KernelRecord:
      return mergeKernelDetailReferences(kernelRecordReferences(locus.handle));
  }
}

function templateParseFrontierReferences(
  frontier: TemplateParseFrontier,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    inquiryLocusReferences(frontier.locus),
    kernelRecordReferences(frontier.addressHandle),
  );
}

function referencesForTemplateParseContext(
  context: TemplateParseContext,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    templateParseFrontierReferences(context.frontier),
    kernelFieldProvenanceReferences(context.fieldProvenance),
  );
}

function templateSourceReferenceReferences(
  source: TemplateSourceReference,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return context == null
    ? mergeKernelDetailReferences()
    : productIdentityAddressReferences(
        context.productHandle,
        context.identityHandle,
        context.sourceAddressHandle,
        TemplateDetailDescriptors.CompilationContext,
      );
}

function templateResourceScopeReferenceReferences(
  scope: TemplateResourceScopeReference,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    containerReferenceReferences(scope.container),
    ...(scope.parent == null ? [] : [templateResourceScopeReferenceReferences(scope.parent)]),
    ...scope.resources.map(templateVisibleResourceReferences),
    ...scope.exclusions.map((exclusion) => mergeKernelDetailReferences(
      templateVisibleResourceReferences(exclusion.winner),
      templateVisibleResourceReferences(exclusion.loser),
      kernelRecordReferences(
        exclusion.winnerKeySourceAddressHandle,
        exclusion.loserKeySourceAddressHandle,
      ),
    )),
    ...scope.lookups.map((lookup) => mergeKernelDetailReferences(
      templateVisibleResourceReferences(lookup.winner),
      kernelRecordReferences(lookup.sourceAddressHandle),
    )),
    ...scope.blockedLookups.map((lookup) => kernelRecordReferences(lookup.sourceAddressHandle)),
    ...scope.syntaxResources.map(templateVisibleResourceReferences),
    kernelFieldProvenanceReferences(scope.fieldProvenance),
  );
}

function referencesForTemplateCompilerService(
  service: TemplateCompilerService,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    containerReferenceReferences(service.container),
    kernelFieldProvenanceReferences(service.fieldProvenance),
  );
}

function referencesForTemplateCompilerHookSet(
  hookSet: TemplateCompilerHookSet,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    ...hookSet.entries.map((entry) => mergeKernelDetailReferences(
      kernelRecordReferences(
        entry.cause.productHandle,
        entry.cause.identityHandle,
        entry.cause.sourceAddressHandle,
        entry.callable.identityHandle,
        entry.callable.sourceAddressHandle,
        ...entry.provider.openSeamHandles,
        ...entry.callable.openSeamHandles,
      ),
      entry.cssClassMapping == null
        ? mergeKernelDetailReferences()
        : productIdentityAddressReferences(
            entry.cssClassMapping.productHandle,
            entry.cssClassMapping.identityHandle,
            entry.cssClassMapping.sourceAddressHandle,
            TemplateDetailDescriptors.CssClassMapping,
          ),
    )),
    ...hookSet.openReasons.map((reason) => kernelRecordReferences(
      reason.sourceAddressHandle,
      ...reason.openSeamHandles,
    )),
    kernelRecordReferences(hookSet.sourceAddressHandle),
  );
}

function referencesForCssClassMapping(
  mapping: CssClassMappingAuthority,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      mapping.sourceAddressHandle,
      ...mapping.openReasons.flatMap((reason) => [
        reason.sourceAddressHandle,
        ...reason.openSeamHandles,
      ]),
    ),
  );
}

function referencesForTemplateResourceResolverService(
  service: TemplateResourceResolverService,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    containerReferenceReferences(service.container),
    ...service.resources.map(templateVisibleResourceReferences),
    ...service.lookups.map((lookup) => mergeKernelDetailReferences(
      templateVisibleResourceReferences(lookup.winner),
      kernelRecordReferences(lookup.sourceAddressHandle),
    )),
    ...service.blockedLookups.map((lookup) => kernelRecordReferences(lookup.sourceAddressHandle)),
    kernelFieldProvenanceReferences(service.fieldProvenance),
  );
}

function referencesForTemplateExpressionParserService(
  service: TemplateExpressionParserService,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    containerReferenceReferences(service.container),
    kernelFieldProvenanceReferences(service.fieldProvenance),
  );
}

function referencesForTemplateAttributeMapperService(
  service: TemplateAttributeMapperService,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    containerReferenceReferences(service.container),
    kernelFieldProvenanceReferences(service.fieldProvenance),
  );
}

function referencesForTemplateRenderingService(
  service: TemplateRenderingService,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    containerReferenceReferences(service.container),
    ...service.renderers.map((renderer) => detailReferences(TemplateDetailDescriptors.RuntimeRenderer, renderer.productHandle)),
    kernelFieldProvenanceReferences(service.fieldProvenance),
  );
}

function templateCompilerServiceReferenceReferences(
  service: TemplateCompilerServiceReference,
): KernelDetailReferenceClosure {
  let slot: ProductDetailDescriptor<unknown>;
  switch (service.serviceKind) {
    case TemplateCompilerServiceKind.TemplateCompiler:
      slot = TemplateDetailDescriptors.TemplateCompilerService;
      break;
    case TemplateCompilerServiceKind.CompilerHooks:
      slot = TemplateDetailDescriptors.CompilerHookSet;
      break;
    case TemplateCompilerServiceKind.CssClassMapping:
      slot = TemplateDetailDescriptors.CssClassMapping;
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
): KernelDetailReferenceClosure {
  const definitionProductHandle = resource.definitionProductHandle;
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
): KernelDetailReferenceClosure {
  return resource == null
    ? mergeKernelDetailReferences()
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
): KernelDetailReferenceClosure {
  // App definitions reuse the definition handle; built-ins retain a distinct header; syntax resources use executables.
  if (productHandle === definitionProductHandle) {
    return mergeKernelDetailReferences();
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
        ? mergeKernelDetailReferences()
        : detailReferences(ResourceDetailDescriptors.DefinitionHeader, productHandle);
  }
}

function bindableDefinitionReferences(
  bindable: BindableDefinition,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      bindable.sourceAddressHandle,
      bindable.nameSourceAddressHandle,
      bindable.attributeSourceAddressHandle,
      bindable.callbackSourceAddressHandle,
      bindable.modeSourceAddressHandle,
      bindable.setSourceAddressHandle,
      bindable.typeSourceAddressHandle,
      bindable.nullableSourceAddressHandle,
    ),
    resourceTargetReferenceReferences(bindable.set.target),
    resourceTargetReferenceReferences(bindable.propertyTarget),
    resourceTargetReferenceReferences(bindable.callbackTarget),
    kernelFieldProvenanceReferences(bindable.fieldProvenance),
  );
}

function bindableDefinitionReferenceReferences(
  bindable: BindableDefinitionReference,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return bindable == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        bindableDefinitionReferences(bindable.definition),
        bindableDefinitionReferenceReferences(bindable.reference),
      );
}

function attributePatternDefinitionEntryReferences(
  definition: AttributePatternDefinitionEntry | null,
): KernelDetailReferenceClosure {
  return definition == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        kernelRecordReferences(definition.addressHandle, definition.provenanceHandle),
      );
}

function referencesForCompiledAttributePattern(
  pattern: CompiledAttributePattern,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    attributePatternDefinitionEntryReferences(pattern.definition),
    detailReferences(TemplateDetailDescriptors.AttributePatternExecutable, pattern.executableProductHandle),
  );
}

function referencesForAttributePatternExecutable(
  executable: AttributePatternExecutable,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    detailReferences(ResourceDetailDescriptors.Definition, executable.definitionProductHandle),
    resourceTargetReferenceReferences(executable.target),
    ...executable.patterns.map(attributePatternDefinitionEntryReferences),
    kernelFieldProvenanceReferences(executable.fieldProvenance),
  );
}

function referencesForBindingCommandExecutable(
  executable: BindingCommandExecutable,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    detailReferences(ResourceDetailDescriptors.Definition, executable.definitionProductHandle),
    resourceTargetReferenceReferences(executable.target),
    kernelFieldProvenanceReferences(executable.fieldProvenance),
  );
}

function referencesForAttributeParserMachine(
  machine: AttributeParserMachine,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(selection.registrationAdmissionProductHandle),
    detailsReferences(TemplateDetailDescriptors.BuiltInSyntaxCatalog, selection.catalogProductHandles),
    kernelFieldProvenanceReferences(selection.fieldProvenance),
  );
}

function referencesForBuiltInRuntimeRendererCatalog(
  catalog: BuiltInRuntimeRendererCatalog,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(selection.registrationAdmissionProductHandle),
    detailsReferences(TemplateDetailDescriptors.BuiltInRuntimeRendererCatalog, selection.catalogProductHandles),
    kernelFieldProvenanceReferences(selection.fieldProvenance),
  );
}

function referencesForRuntimeRenderer(
  renderer: RuntimeRenderer,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(kernelFieldProvenanceReferences(renderer.fieldProvenance));
}

function htmlNodeReferenceReferences(
  node: HtmlNodeReference | null,
): KernelDetailReferenceClosure {
  return node == null
    ? mergeKernelDetailReferences()
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
): KernelDetailReferenceClosure {
  return attribute == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        kernelRecordReferences(attribute.productHandle, attribute.addressHandle),
        [kernelProductDetailReference(TemplateDetailDescriptors.HtmlAttribute, attribute.productHandle)],
      );
}

function referencesForHtmlRecovery(
  recovery: HtmlRecovery,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(recovery.addressHandle, recovery.provenanceHandle),
  );
}

function htmlRecoveryReferenceReferences(
  recovery: HtmlRecovery,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    productIdentityAddressReferences(
      recovery.productHandle,
      recovery.identityHandle,
      recovery.addressHandle,
      TemplateDetailDescriptors.HtmlRecovery,
    ),
  );
}

function referencesForHtmlDocument(
  document: HtmlDocument,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    ...document.rootNodes.map(htmlNodeReferenceReferences),
    ...document.recoveries.map(htmlRecoveryReferenceReferences),
    kernelFieldProvenanceReferences(document.fieldProvenance),
  );
}

function referencesForHtmlNode(
  node: HtmlIrNode,
): KernelDetailReferenceClosure {
  switch (node.nodeKind) {
    case HtmlIrNodeKind.Document:
      return referencesForHtmlDocument(node);
    case HtmlIrNodeKind.Fragment:
      return mergeKernelDetailReferences(
        ...node.children.map(htmlNodeReferenceReferences),
        ...node.recoveries.map(htmlRecoveryReferenceReferences),
      );
    case HtmlIrNodeKind.Element:
      return mergeKernelDetailReferences(
        ...node.attributes.map(htmlAttributeReferenceReferences),
        ...node.children.map(htmlNodeReferenceReferences),
        kernelRecordReferences(node.tagNameAddressHandle, node.closingTagNameAddressHandle),
        ...node.recoveries.map(htmlRecoveryReferenceReferences),
        kernelFieldProvenanceReferences(node.fieldProvenance),
      );
    case HtmlIrNodeKind.Text:
      return mergeKernelDetailReferences(
        ...node.recoveries.map(htmlRecoveryReferenceReferences),
        kernelFieldProvenanceReferences(node.fieldProvenance),
      );
    case HtmlIrNodeKind.Comment:
      return mergeKernelDetailReferences(
        ...node.recoveries.map(htmlRecoveryReferenceReferences),
        kernelFieldProvenanceReferences(node.fieldProvenance),
      );
    case HtmlIrNodeKind.Doctype:
      return mergeKernelDetailReferences(...node.recoveries.map(htmlRecoveryReferenceReferences));
  }
}

function referencesForHtmlAttribute(
  attribute: HtmlAttribute,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(attribute.nameAddressHandle, attribute.valueAddressHandle),
    ...attribute.recoveries.map(htmlRecoveryReferenceReferences),
    kernelFieldProvenanceReferences(attribute.fieldProvenance),
  );
}

function structuralTreeReferenceReferences(
  tree: TemplateStructuralTreeReference,
): KernelDetailReferenceClosure {
  return productIdentityAddressReferences(
    tree.productHandle,
    tree.identityHandle,
    tree.addressHandle,
    TemplateDetailDescriptors.StructuralTree,
  );
}

function structuralNodeReferenceReferences(
  node: TemplateStructuralNodeReference | null,
): KernelDetailReferenceClosure {
  return node == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        kernelRecordReferences(node.treeProductHandle),
        productIdentityAddressReferences(
          node.productHandle,
          node.identityHandle,
          node.addressHandle,
          TemplateDetailDescriptors.StructuralNode,
        ),
      );
}

function structuralAttributeReferenceReferences(
  attribute: TemplateStructuralAttributeReference,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(attribute.treeProductHandle),
    productIdentityAddressReferences(
      attribute.productHandle,
      attribute.identityHandle,
      attribute.addressHandle,
      TemplateDetailDescriptors.StructuralAttribute,
    ),
  );
}

function referencesForStructuralTree(
  tree: TemplateStructuralTree,
): KernelDetailReferenceClosure {
  switch (tree.treeKind) {
    case TemplateStructuralTreeKind.BrowserEffective:
      return mergeKernelDetailReferences(
        templateSourceReferenceReferences(tree.templateSource),
        structuralNodeReferenceReferences(tree.inputFragment),
        structuralNodeReferenceReferences(tree.compilerCarrier),
        structuralNodeReferenceReferences(tree.authoredCarrier),
        structuralNodeReferenceReferences(tree.compilerContent),
        ...tree.discardedInputNodes.map(structuralNodeReferenceReferences),
        kernelFieldProvenanceReferences(tree.fieldProvenance),
      );
    case TemplateStructuralTreeKind.CompilerTransformed:
      return mergeKernelDetailReferences(
        templateSourceReferenceReferences(tree.templateSource),
        structuralTreeReferenceReferences(tree.inputTree),
        structuralNodeReferenceReferences(tree.compilerCarrier),
        structuralNodeReferenceReferences(tree.compilerContent),
        kernelFieldProvenanceReferences(tree.fieldProvenance),
      );
  }
  throw new Error('Unknown structural tree kind.');
}

function referencesForStructuralNode(
  node: TemplateStructuralNode,
): KernelDetailReferenceClosure {
  const common = mergeKernelDetailReferences(
    structuralTreeReferenceReferences(node.tree),
    kernelFieldProvenanceReferences(node.fieldProvenance),
  );
  switch (node.nodeKind) {
    case HtmlIrNodeKind.Fragment:
      return mergeKernelDetailReferences(
        common,
        ...node.children.map(structuralNodeReferenceReferences),
      );
    case HtmlIrNodeKind.Element:
      return mergeKernelDetailReferences(
        common,
        ...node.attributes.map(structuralAttributeReferenceReferences),
        ...node.children.map(structuralNodeReferenceReferences),
        structuralNodeReferenceReferences(node.templateContent),
      );
    case HtmlIrNodeKind.Text:
    case HtmlIrNodeKind.Comment:
    case HtmlIrNodeKind.Doctype:
      return common;
  }
}

function referencesForStructuralAttribute(
  attribute: TemplateStructuralAttribute,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    structuralTreeReferenceReferences(attribute.tree),
    structuralNodeReferenceReferences(attribute.owner),
    kernelFieldProvenanceReferences(attribute.fieldProvenance),
  );
}

function templateStructureReferenceReferences(
  reference: TemplateStructureReference,
): KernelDetailReferenceClosure {
  const descriptor = templateStructureReferenceDescriptor(reference);
  return productIdentityAddressReferences(
    reference.productHandle,
    reference.identityHandle,
    reference.addressHandle,
    descriptor,
  );
}

function templateStructureReferenceDescriptor(
  reference: TemplateStructureReference,
): ProductDetailDescriptor<unknown> {
  switch (reference.productKindKey) {
    case KernelVocabulary.Template.HtmlDocument.key:
      return TemplateDetailDescriptors.HtmlDocument;
    case KernelVocabulary.Template.HtmlNode.key:
      return TemplateDetailDescriptors.HtmlNode;
    case KernelVocabulary.Template.HtmlAttribute.key:
      return TemplateDetailDescriptors.HtmlAttribute;
    case KernelVocabulary.Template.StructuralTree.key:
      return TemplateDetailDescriptors.StructuralTree;
    case KernelVocabulary.Template.StructuralNode.key:
      return TemplateDetailDescriptors.StructuralNode;
    case KernelVocabulary.Template.StructuralAttribute.key:
      return TemplateDetailDescriptors.StructuralAttribute;
    default:
      throw new Error(
        `Template structure derivation references non-structural product kind ${reference.productKindKey}.`,
      );
  }
}

function referencesForStructureDerivation(
  derivation: TemplateStructureDerivation,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    ...derivation.inputs.map((term) => mergeKernelDetailReferences(
      templateStructureReferenceReferences(term.structure),
      kernelRecordReferences(term.segmentAddressHandle),
    )),
    ...derivation.outputs.map((term) => mergeKernelDetailReferences(
      templateStructureReferenceReferences(term.structure),
      kernelRecordReferences(term.segmentAddressHandle),
    )),
    kernelRecordReferences(...derivation.causeHandles),
    kernelFieldProvenanceReferences(derivation.fieldProvenance),
  );
}

function bindingCommandExecutableReferenceReferences(
  command: BindingCommandExecutableReference | null,
): KernelDetailReferenceClosure {
  return command == null
    ? mergeKernelDetailReferences()
    : productIdentityAddressReferences(
        command.productHandle,
        command.identityHandle,
        null,
        TemplateDetailDescriptors.BindingCommandExecutable,
      );
}

function referencesForAttributeSyntax(
  syntax: AttributeSyntax,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    detailReferences(TemplateDetailDescriptors.AttributeSyntax, classification.syntaxProductHandle),
    htmlNodeReferenceReferences(classification.ownerNode),
    classification.resource == null ? [] : templateVisibleResourceReferences(classification.resource),
    bindingCommandExecutableReferenceReferences(classification.bindingCommand),
    templateBindableReferenceReferences(classification.bindable),
    kernelFieldProvenanceReferences(classification.fieldProvenance),
  );
}

function templateValueSiteReferenceReferences(
  site: TemplateValueSiteReference,
): KernelDetailReferenceClosure {
  return productIdentityAddressReferences(
    site.productHandle,
    site.identityHandle,
    site.sourceAddressHandle,
    TemplateDetailDescriptors.ValueSite,
  );
}

function referencesForTemplateValueSite(
  site: TemplateValueSite,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    templateValueSiteReferenceReferences(parse.site),
    detailReferences(TemplateDetailDescriptors.ExpressionParserService, parse.parserProductHandle),
    kernelFieldProvenanceReferences(parse.fieldProvenance),
  );
}

function referencesForBindingCommandBuildInput(
  input: BindingCommandBuildInput,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    bindingCommandExecutableReferenceReferences(lowering.command),
    detailReferences(TemplateDetailDescriptors.BindingCommandBuildInput, lowering.inputProductHandle),
    detailsReferences(TemplateDetailDescriptors.Instruction, lowering.instructionProductHandles),
    kernelFieldProvenanceReferences(lowering.fieldProvenance),
  );
}

function referencesForTemplateCompilerIssue(
  issue: TemplateCompilerIssue,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelFieldProvenanceReferences(issue.fieldProvenance),
    kernelRecordReferences(...issue.relatedInformation.map((related) => related.sourceAddressHandle)),
  );
}

function referencesForMultiBindingSegment(
  segment: MultiBindingSegment,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    templateValueSiteReferenceReferences(lowering.site),
    detailsReferences(TemplateDetailDescriptors.MultiBindingSegment, lowering.segmentProductHandles),
    detailsReferences(TemplateDetailDescriptors.Instruction, lowering.instructionProductHandles),
    kernelFieldProvenanceReferences(lowering.fieldProvenance),
  );
}

function referencesForCompiledTemplate(
  template: CompiledTemplate,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    detailReferences(TemplateDetailDescriptors.HtmlDocument, template.htmlDocumentProductHandle),
    detailsReferences(TemplateDetailDescriptors.HtmlNode, template.compilerReachableNodeProductHandles),
    ...template.nativeSlotOutlets.map((outlet) =>
      mergeKernelDetailReferences(
        htmlNodeReferenceReferences(outlet.node),
        kernelRecordReferences(outlet.nameSourceAddressHandle),
      )
    ),
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    htmlNodeReferenceReferences(target.htmlNode),
    detailReferences(TemplateDetailDescriptors.InstructionSequence, target.instructionSequenceProductHandle),
    kernelFieldProvenanceReferences(target.fieldProvenance),
  );
}

function templateInstructionReferenceReferences(
  instruction: TemplateInstructionReference,
): KernelDetailReferenceClosure {
  return productIdentityAddressReferences(
    instruction.productHandle,
    instruction.identityHandle,
    instruction.addressHandle,
    TemplateDetailDescriptors.Instruction,
  );
}

function compiledTemplateReferenceReferences(
  template: CompiledTemplateReference | null,
): KernelDetailReferenceClosure {
  return template == null
    ? mergeKernelDetailReferences()
    : productIdentityAddressReferences(
        template.productHandle,
        template.identityHandle,
        null,
        TemplateDetailDescriptors.CompiledTemplate,
      );
}

function expressionReferences(
  ...handles: readonly (ProductHandle | null | undefined)[]
): KernelDetailReferenceClosure {
  return detailsReferences(TemplateDetailDescriptors.ExpressionParse, handles);
}

function referencesForTemplateInstructionSequence(
  sequence: TemplateInstructionSequence,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    kernelRecordReferences(sequence.ownerProductHandle),
    ...sequence.instructions.map(templateInstructionReferenceReferences),
  );
}

function referencesForTemplateInstruction(
  instruction: TemplateInstruction,
): KernelDetailReferenceClosure {
  const common = mergeKernelDetailReferences(
    htmlNodeReferenceReferences(instruction.node),
    kernelFieldProvenanceReferences(instruction.fieldProvenance),
  );
  switch (instruction.instructionKind) {
    case TemplateInstructionKind.HydrateElement:
      return mergeKernelDetailReferences(
        common,
        templateVisibleResourceReferenceReferences(instruction.resource),
        ...instruction.projections.map((projection) =>
          compiledTemplateReferenceReferences(projection.compiledTemplate)
        ),
        ...instruction.projections.map((projection) =>
          mergeKernelDetailReferences(
            ...projection.contributors.map((contributor) =>
              mergeKernelDetailReferences(
                htmlNodeReferenceReferences(contributor.node),
                htmlAttributeReferenceReferences(contributor.slotAttribute),
                kernelRecordReferences(contributor.slotNameSourceAddressHandle),
              )
            ),
            kernelRecordReferences(projection.sourceAddressHandle),
          )
        ),
        ...instruction.discardedProjectionContributors.map((contributor) =>
          mergeKernelDetailReferences(
            htmlNodeReferenceReferences(contributor.node),
            htmlAttributeReferenceReferences(contributor.slotAttribute),
            kernelRecordReferences(contributor.slotNameSourceAddressHandle),
          )
        ),
        kernelRecordReferences(instruction.auSlotProcessContent?.nameSourceAddressHandle ?? null),
        ...(instruction.auSlotProcessContent?.removedChildNodes.map(htmlNodeReferenceReferences) ?? []),
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
        templateVisibleResourceReferenceReferences(instruction.resource),
        detailsReferences(
          TemplateDetailDescriptors.Instruction,
          instruction.bindingInstructionProductHandles,
        ),
      );
    case TemplateInstructionKind.HydrateTemplateController:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        templateVisibleResourceReferenceReferences(instruction.resource),
        compiledTemplateReferenceReferences(instruction.childCompiledTemplate),
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
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        expressionReferences(instruction.expressionProductHandle),
      );
    case TemplateInstructionKind.StateBinding:
    case TemplateInstructionKind.DispatchBinding:
      return mergeKernelDetailReferences(
        common,
        htmlAttributeReferenceReferences(instruction.attribute),
        kernelRecordReferences(instruction.storeNameSourceAddressHandle),
        expressionReferences(instruction.expressionProductHandle),
      );
  }
}

function runtimeRendererReferenceReferences(
  renderer: RuntimeRendererReference | null,
): KernelDetailReferenceClosure {
  return renderer == null
    ? mergeKernelDetailReferences()
    : productIdentityAddressReferences(
        renderer.productHandle,
        renderer.identityHandle,
        renderer.sourceAddressHandle,
        TemplateDetailDescriptors.RuntimeRenderer,
      );
}

function runtimeBindingScopeEffectReferenceReferences(
  effect: RuntimeBindingScopeEffectReference,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    detailReferences(ConfigurationDetailDescriptors.Controller, productHandle),
    kernelRecordReferences(identityHandle),
  );
}

function referencesForRuntimeBinding(
  binding: RuntimeBinding,
): KernelDetailReferenceClosure {
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
        kernelRecordReferences(binding.storeNameSourceAddressHandle),
        expressionReferences(binding.expressionProductHandle),
      );
  }
}

function referencesForRuntimeBindingScopeEffect(
  effect: RuntimeBindingScopeEffect,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return key == null ? mergeKernelDetailReferences() : resourceTargetReferenceReferences(key.target);
}

function watchExpressionReferences(
  expression: WatchExpressionDefinition,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    watchPropertyKeyReferences(expression.propertyKey),
    resourceTargetReferenceReferences(expression.target),
  );
}

function watchCallbackReferences(
  callback: WatchCallbackDefinition,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    watchPropertyKeyReferences(callback.methodName),
    resourceTargetReferenceReferences(callback.target),
  );
}

function runtimeWatcherObservedDependencyReferences(
  dependency: RuntimeWatcherObservedDependency,
): KernelDetailReferenceClosure {
  return productIdentityAddressReferences(
    dependency.productHandle,
    dependency.identityHandle,
    dependency.occurrence.sourceAddressHandle,
    ObservationDetailDescriptors.RuntimeWatcherObservedDependency,
  );
}

function referencesForRuntimeWatcher(
  watcher: RuntimeWatcher,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    runtimeControllerReferences(watcher.controllerProductHandle, watcher.controllerIdentityHandle),
    detailReferences(ResourceDetailDescriptors.Definition, watcher.definitionProductHandle),
    watchExpressionReferences(watcher.expression),
    watchCallbackReferences(watcher.callback),
    ...watcher.accessUses.map((accessUse) => mergeKernelDetailReferences(
      kernelRecordReferences(
        accessUse.productHandle,
        accessUse.identityHandle,
        accessUse.sourceAddressHandle,
        accessUse.nameSourceAddressHandle,
      ),
      [kernelProductDetailReference(
        RuntimeExpressionDetailDescriptors.AccessUse,
        accessUse.productHandle,
      )],
    )),
    ...watcher.observedDependencies.map(runtimeWatcherObservedDependencyReferences),
    kernelFieldProvenanceReferences(watcher.fieldProvenance),
  );
}

function referencesForRuntimeBindingTargetAccess(
  access: RuntimeBindingTargetAccess,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(access.binding),
    htmlNodeReferenceReferences(access.targetNode),
    runtimeControllerReferences(access.targetControllerProductHandle),
    detailReferences(
      ObservationDetailDescriptors.ComputedObserverSource,
      access.observerSourceProductHandle,
    ),
    kernelRecordReferences(
      access.observerSourceIdentityHandle,
      access.observerSourceAddressHandle,
      ...access.objectObservationAdapters.flatMap((adapter) => [
        adapter.sourceAddressHandle,
        adapter.provenanceHandle,
      ]),
      ...access.selectionProvenance.allHandles(),
    ),
    checkerTypeReferenceKernelReferences(access.targetType),
    checkerTypeReferenceKernelReferences(access.propertyType),
    kernelFieldProvenanceReferences(access.fieldProvenance),
  );
}

function referencesForRuntimeBindingTargetOperation(
  operation: RuntimeBindingTargetOperation,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(issue.binding),
    kernelFieldProvenanceReferences(issue.fieldProvenance),
  );
}

function referencesForRuntimeRendererIssue(
  issue: RuntimeRendererIssue,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    runtimeRendererReferenceReferences(issue.renderer),
    detailReferences(TemplateDetailDescriptors.Instruction, issue.instructionProductHandle),
    kernelRecordReferences(issue.instructionIdentityHandle),
    kernelFieldProvenanceReferences(issue.fieldProvenance),
  );
}

function referencesForRuntimeBindingBehaviorApplication(
  application: RuntimeBindingBehaviorApplication,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    runtimeBindingReferenceReferences(application.binding),
    templateVisibleResourceReferenceReferences(application.resource),
    expressionReferences(application.expressionProductHandle),
    kernelFieldProvenanceReferences(application.fieldProvenance),
  );
}

function referencesForRuntimeValueConverterIssue(
  issue: RuntimeValueConverterIssue,
): KernelDetailReferenceClosure {
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
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    issue.ownerProductKindKey === KernelVocabulary.Binding.ScopeEffect.key
      ? detailReferences(TemplateDetailDescriptors.RuntimeBindingScopeEffect, issue.ownerProductHandle)
      : detailReferences(TemplateDetailDescriptors.Instruction, issue.ownerProductHandle),
    kernelRecordReferences(issue.ownerIdentityHandle),
    checkerTypeReferenceKernelReferences(issue.sourceType),
  );
}

function referencesForRuntimeControllerIssue(
  issue: RuntimeControllerIssue,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    runtimeControllerReferences(issue.controllerProductHandle, issue.controllerIdentityHandle),
    detailReferences(TemplateDetailDescriptors.Instruction, issue.instructionProductHandle),
    kernelFieldProvenanceReferences(issue.fieldProvenance),
  );
}

function compositionActivationModelHandoffReferences(
  handoff: CompositionActivationModelHandoff | null,
): KernelDetailReferenceClosure {
  return handoff == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        checkerTypeReferenceKernelReferences(handoff.activationParameterType),
        checkerTypeReferenceKernelReferences(handoff.modelType),
      );
}

function compositionResolvedComponentReferences(
  component: CompositionResolvedComponent,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    detailReferences(ResourceDetailDescriptors.Definition, component.definitionProductHandle),
    detailReferences(TemplateDetailDescriptors.CompiledTemplate, component.compiledTemplateProductHandle),
    controllerReferenceReferences(component.composedController),
    compositionActivationModelHandoffReferences(component.activationModelHandoff),
  );
}

function compositionContextReferenceReferences(
  context: CompositionContextReference,
): KernelDetailReferenceClosure {
  return productIdentityAddressReferences(
    context.productHandle,
    context.identityHandle,
    context.sourceAddressHandle,
    TemplateDetailDescriptors.CompositionContext,
  );
}

function referencesForCompositionContext(
  context: CompositionContext,
): KernelDetailReferenceClosure {
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
    checkerTypeReferenceKernelReferences(context.templateInputType),
    checkerTypeReferenceKernelReferences(context.componentInputType),
    expressionReferences(
      context.templateExpressionProductHandle,
      context.componentExpressionProductHandle,
      context.modelExpressionProductHandle,
    ),
  );
}

function referencesForCompositionController(
  controller: CompositionController,
): KernelDetailReferenceClosure {
  return mergeKernelDetailReferences(
    compositionContextReferenceReferences(controller.context),
    runtimeControllerReferences(controller.hostControllerProductHandle),
    runtimeControllerReferences(controller.parentControllerProductHandle),
    ...controller.resolvedComponents.map(compositionResolvedComponentReferences),
    compositionActivationModelHandoffReferences(controller.objectViewModelActivationHandoff),
  );
}
