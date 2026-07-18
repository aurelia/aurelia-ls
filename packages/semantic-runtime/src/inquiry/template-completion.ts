import {
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  type InterpolationActiveHoleCompanion,
  ExpressionParseResultKind,
  type ExpressionParseResult,
} from '../expression/parse-result-algebra.js';
import ts from 'typescript';
import { ExpressionParser } from '../expression/expression-parser.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import {
  ExpressionParseResultInspector,
  type ExpressionObjectLiteralKeyContext,
} from '../expression/parse-result-inspection.js';
import { expressionSpanContainsOffset, type SourceSpan } from '../expression/source-span.js';
import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { SourceSpanAddress, SourceSpanRole } from '../kernel/address.js';
import type { MaterializedProduct } from '../kernel/materialization.js';
import type { KernelStore } from '../kernel/store.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import {
  BindingContextKind,
  BindingContextSlot,
  BindingScope,
  BindingScopeOwnerKind,
} from '../configuration/scope.js';
import {
  TemplateProductDetails,
} from '../template/product-details.js';
import {
  bindingExpressionAstForProductAtOffset,
  readTemplateExpressionParse,
} from '../template/expression-parse-product.js';
import { TypeSystemHotDetails, TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
  type CheckerExpressionTypeOpenSubject,
  type CheckerExpressionTypeEvaluation,
} from '../type-system/expression-type-evaluation.js';
import {
  CheckerExpressionTypeEvaluationContext,
} from '../type-system/expression-type-context.js';
import { CheckerExpressionTypeWorld } from '../type-system/expression-type-world.js';
import { checkerNullishType } from '../type-system/checker-related-types.js';
import type {
  CheckerIndexedAccessKeyKind,
  CheckerTypeMember,
  CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  CheckerTypeShapeKind,
  type CheckerTypeMemberKind,
  type CheckerTypeMemberVisibilityKind,
  checkerIndexedAccessSupportsString,
  checkerTypeMemberReachableIdentityHandle,
  sameCheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  checkerTypeMemberIsCallable,
  checkerTypeMemberVisibilityKind,
} from '../type-system/checker-member-surface.js';
import { checkerTypeMemberSourceAddressHandle } from '../type-system/checker-type-member-source.js';
import { readOrProjectCheckerTypeMembersInProjection } from '../type-system/checker-type-member-surface.js';
import type { CheckerTypeProjector } from '../type-system/checker-projector.js';
import {
  RouteConfigKind,
  type EndpointModel,
  type RouteConfigModel,
} from '../router/model.js';
import { RouterProductDetails } from '../router/product-details.js';
import type { RouteParameterEndpointPlan } from '../router/route-instruction-materialization.js';
import {
  checkerTypeDeclaresRouteViewModel,
  routerViewModelHookKindForName,
  RouterViewModelHookKind,
} from '../router/route-view-model-hook.js';
import { I18nProductDetails } from '../i18n/product-details.js';
import type { I18nTranslationKey } from '../i18n/model.js';
import {
  TemplateResourceScope,
  templateBindableReferences,
} from '../template/compiler-world.js';
import { findVisibleTemplateResource } from '../template/compiler-resource-lookup.js';
import { expressionResourceOccurrences } from '../template/expression-resource-occurrence.js';
import {
  TemplateVisibleResource,
  type TemplateBindableReference,
} from '../template/compiler-world-reference.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../template/template-compilation-project-pass.js';
import type { MultiBindingSegment } from '../template/binding-command-execution.js';
import type {
  TemplateExpressionParse,
  TemplateValueSite,
} from '../template/value-site.js';
import { TemplateValueSiteKind } from '../template/value-site.js';
import type { TemplateSource } from '../template/compilation-unit.js';
import {
  AttributeClassificationKind,
  type AttributeClassification,
  type AttributeSyntax,
} from '../template/attribute-syntax.js';
import { HydrateAttributeInstruction, HydrateElementInstruction } from '../template/instruction-ir.js';
import { namedRefTargetController } from '../template/runtime-ref-target.js';
import {
  HtmlAttribute,
  HtmlElement,
  type HtmlIrNode,
} from '../template/html-ir.js';
import {
  BuiltInTemplateControllerValueDomainKind,
  frameworkTemplateControllerSemanticsForName,
} from '../template/template-controller-semantics.js';
import { componentLifecycleHookName } from '../template/component-lifecycle-source.js';
import {
  bindingSourceContextProjectionForTemplateExpressionParseAtOffset,
  bindingScopeForTemplateExpressionParse,
  templateScopeRangeAddressHandle,
} from '../template/template-expression-selection.js';
import {
  resourceLocalBindingSourceOperations,
  resourceLocalDynamicTemplateInstructions,
  resourceLocalTemplateExpressionParses,
  resourceLocalTemplateInstructions,
  resourceLocalTemplateValueSites,
} from '../template/runtime-resource-ownership.js';
import { templateScopeChain } from '../template/template-scope-replay.js';
import {
  checkerContextForRuntimeBindingSourceExpressionProjection,
} from '../observation/runtime-binding-source-expression-context.js';
import {
  InquiryAnswer,
  InquiryContinuation,
  InquiryContinuationKind,
  InquiryExpansion,
  InquiryExpansionKind,
  InquiryOutcomeKind,
  InquiryProjection,
  InquiryProjectionKind,
} from './answer.js';
import { KernelExactBasis } from './basis.js';
import { uniqueValues } from '../collections.js';
import { InquiryLocusKind, type InquiryLocus } from './locus.js';
import type { SourceCursorInquiryLocus } from './locus.js';
import {
  clampPublicInquiryPageSize,
  InquiryPageInfo,
  InquiryPageRequest,
  PUBLIC_INQUIRY_MAX_PAGE_SIZE,
} from './page.js';
import { PAGED_INQUIRY_CONTINUATION } from './continuation-intent.js';

export const enum TemplateCompletionSiteKind {
  /** Completion is inside an element/tag name. */
  ElementName = 'element-name',
  /** Completion is inside an attribute name or attribute shorthand. */
  AttributeName = 'attribute-name',
  /** Completion is inside an attribute value before a narrower expression site has been selected. */
  AttributeValue = 'attribute-value',
  /** Completion is inside an Aurelia binding command name such as `.bind` or `.trigger`. */
  BindingCommandName = 'binding-command-name',
  /** Completion is inside a binding expression where top-level scope names may be offered. */
  Expression = 'expression',
  /** Completion is after a member-access frontier; this needs type/member closure above scope lookup. */
  ExpressionMember = 'expression-member',
  /** Completion is inside a value-converter tail name. */
  ExpressionValueConverter = 'expression-value-converter',
  /** Completion is inside a binding-behavior tail name. */
  ExpressionBindingBehavior = 'expression-binding-behavior',
  /** Completion site exists but has not been classified by the template parser yet. */
  Unknown = 'unknown',
}

export const enum TemplateCompletionCandidateKind {
  BindingContextSlot = 'binding-context-slot',
  OverrideContextSlot = 'override-context-slot',
  ScopeKeyword = 'scope-keyword',
  CustomElement = 'custom-element',
  CustomAttribute = 'custom-attribute',
  TemplateController = 'template-controller',
  BindableAttribute = 'bindable-attribute',
  AttributeValue = 'attribute-value',
  RouterRoute = 'router-route',
  RouterRouteParameter = 'router-route-parameter',
  I18nTranslationKey = 'i18n-translation-key',
  ValueConverter = 'value-converter',
  BindingBehavior = 'binding-behavior',
  BindingCommand = 'binding-command',
  AttributePattern = 'attribute-pattern',
  TypeMember = 'type-member',
}

export const enum TemplateCompletionCandidateSourceKind {
  BindingScope = 'binding-scope',
  ResourceScope = 'resource-scope',
  ResourceDefinition = 'resource-definition',
  TypeSystem = 'type-system',
  Router = 'router',
  I18n = 'i18n',
}

export const enum TemplateCompletionAureliaHookKind {
  /** Callable custom-element view-model member discovered by Controller as a component lifecycle hook. */
  ComponentLifecycle = 'component-lifecycle',
  /** Callable member on a proven routed view model discovered during router transition lifecycle. */
  RouterLifecycle = 'router-lifecycle',
  /** Member is the routed component's dynamic route-configuration hook. */
  RouterConfiguration = 'router-configuration',
}

export class TemplateCompletionTypeMemberFacts {
  constructor(
    /** Checker member lane used by callers to distinguish property, method, accessor, and index-signature suggestions. */
    readonly memberKind: CheckerTypeMemberKind,
    /** TypeScript accessibility recovered from the member declaration when the checker exposes one. */
    readonly visibilityKind: CheckerTypeMemberVisibilityKind,
    /** Whether the member is optional on the owner type surface. */
    readonly isOptional: boolean,
    /** Whether the member is readonly on the owner type surface. */
    readonly isReadonly: boolean,
    /** Framework hook category proven from member callability and the owning Aurelia role. */
    readonly aureliaHookKind: TemplateCompletionAureliaHookKind | null = null,
  ) {}
}

export class TemplateCompletionCandidate {
  readonly key: string;

  constructor(
    /** Candidate lane; consumers decide ranking and display. */
    readonly candidateKind: TemplateCompletionCandidateKind,
    /** Authored name or syntax segment to offer. */
    readonly name: string,
    /** Product surface that supplied this candidate. */
    readonly sourceKind: TemplateCompletionCandidateSourceKind,
    /** Product handle for the candidate or owning product, when known. */
    readonly productHandle: ProductHandle | null = null,
    /** Identity handle for the candidate or owning product, when known. */
    readonly identityHandle: IdentityHandle | null = null,
    /** Source address for navigation/explanation, when known. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Compact explanation of what this candidate represents. */
    readonly summary: string | null = null,
    /** Type reached by this candidate, when checker projection has supplied one. */
    readonly typeReference: CheckerTypeReference | null = null,
    /** Checker member facts for type-member candidates, when the candidate came from a projected member. */
    readonly typeMemberFacts: TemplateCompletionTypeMemberFacts | null = null,
  ) {
    this.key = [
      candidateKind,
      sourceKind,
      name,
      productHandle ?? '',
      identityHandle ?? '',
    ].join('|');
  }
}

export class TemplateExpressionCompletionFrontier {
  constructor(
    /** Parser-owned frontier, if the expression parser published one. */
    readonly frontierKind: ExpressionFrontierKind | null,
    /** Parser-owned continuation classes that constrain what semantic candidates can honestly be offered. */
    readonly expectedContinuationClasses: readonly ExpressionExpectedContinuationClass[],
  ) {}
}

export class TemplateCompletionResult {
  constructor(
    /** Classified completion site the answer attempted to spend. */
    readonly siteKind: TemplateCompletionSiteKind,
    /** Candidate rows for this page. */
    readonly candidates: readonly TemplateCompletionCandidate[],
    /** Expression parser frontier, when an expression parse product was supplied. */
    readonly expressionFrontier: TemplateExpressionCompletionFrontier | null,
    /** Inputs that would make this answer more complete but were not supplied or not hydrated. */
    readonly missingInputs: readonly string[] = [],
  ) {}
}

export class TemplateCompletionQuery {
  readonly kind = 'template-completion' as const;

  constructor(
    /** Source or product locus this completion applies to. */
    readonly locus: InquiryLocus,
    /** Parser-classified site. Cursor-to-site classification happens before this answer. */
    readonly siteKind: TemplateCompletionSiteKind,
    /** Page request for ordered candidates. */
    readonly page: InquiryPageRequest = new InquiryPageRequest(),
    /** Binding scope visible to expression completion. */
    readonly bindingScopeProductHandle: ProductHandle | null = null,
    /** Compiler resource scope visible to markup and expression resource-tail completion. */
    readonly resourceScopeProductHandle: ProductHandle | null = null,
    /** Selected element/attribute definition whose bindables may be offered as attributes. */
    readonly selectedDefinitionProductHandle: ProductHandle | null = null,
    /** Expression parse publication that explains the parser frontier. */
    readonly expressionParseProductHandle: ProductHandle | null = null,
    /** Type shape whose members should be offered for member-access completion. */
    readonly memberOwnerTypeProductHandle: ProductHandle | null = null,
    /** Template value-site product under the cursor, when a parsed or owned value produced this site. */
    readonly valueSiteProductHandle: ProductHandle | null = null,
    /** Projection requested by the caller. */
    readonly projection: InquiryProjection = new InquiryProjection(InquiryProjectionKind.Compact),
    /** Router route configs visible to this app/template context, when route-aware value completion is requested. */
    readonly routeConfigProductHandles: readonly ProductHandle[] = [],
    /** Route-recognizer endpoints selected for the active router params object. */
    readonly routeParameterEndpointProductHandles: readonly ProductHandle[] = [],
    /** Static i18n translation keys visible to this app/template context. */
    readonly i18nTranslationKeyProductHandles: readonly ProductHandle[] = [],
  ) {}

  withPage(page: InquiryPageRequest): TemplateCompletionQuery {
    return new TemplateCompletionQuery(
      this.locus,
      this.siteKind,
      page,
      this.bindingScopeProductHandle,
      this.resourceScopeProductHandle,
      this.selectedDefinitionProductHandle,
      this.expressionParseProductHandle,
      this.memberOwnerTypeProductHandle,
      this.valueSiteProductHandle,
      this.projection,
      this.routeConfigProductHandles,
      this.routeParameterEndpointProductHandles,
      this.i18nTranslationKeyProductHandles,
    );
  }

  withMemberOwnerTypeProductHandle(memberOwnerTypeProductHandle: ProductHandle | null): TemplateCompletionQuery {
    return new TemplateCompletionQuery(
      this.locus,
      this.siteKind,
      this.page,
      this.bindingScopeProductHandle,
      this.resourceScopeProductHandle,
      this.selectedDefinitionProductHandle,
      this.expressionParseProductHandle,
      memberOwnerTypeProductHandle,
      this.valueSiteProductHandle,
      this.projection,
      this.routeConfigProductHandles,
      this.routeParameterEndpointProductHandles,
      this.i18nTranslationKeyProductHandles,
    );
  }
}

export interface TemplateCompletionCursorContextRequest {
  /** Concrete source cursor inside a materialized template compilation emission. */
  readonly locus: SourceCursorInquiryLocus;
  /** Horizontal template compilation emission that owns HTML, syntax, value, render, and scope products. */
  readonly resource: TemplateResourceRuntimeAnalysisEmission;
  /** Page request copied into the resulting completion query. */
  readonly page?: InquiryPageRequest;
  /** Projection copied into the resulting completion query. */
  readonly projection?: InquiryProjection;
  /** Router route configs visible to the app/template context. */
  readonly routeConfigProductHandles?: readonly ProductHandle[];
  /** Endpoint plans keyed by the exact authored router-resource attribute product. */
  readonly routeParameterEndpointPlans: ReadonlyMap<ProductHandle, RouteParameterEndpointPlan>;
  /** Static i18n translation keys visible to the app/template context. */
  readonly i18nTranslationKeyProductHandles?: readonly ProductHandle[];
  /** Hot expression-evaluation world shared by broader cursor/file scans. */
  readonly expressionWorld?: CheckerExpressionTypeWorld;
}

export class TemplateCompletionCursorContext {
  constructor(
    /** Product-handle query ready for `answerTemplateCompletion`. */
    readonly query: TemplateCompletionQuery,
    /** Generation-bound expression world shared by cursor derivation and answer materialization. */
    readonly expressionWorld: CheckerExpressionTypeWorld,
    /** HTML node under the cursor, when one could be selected. */
    readonly htmlNodeProductHandle: ProductHandle | null,
    /** HTML attribute under the cursor, when one could be selected. */
    readonly htmlAttributeProductHandle: ProductHandle | null,
    /** Value-site product under the cursor, when expression/value parsing owns the site. */
    readonly valueSiteProductHandle: ProductHandle | null,
    /** Bindable selected by the cursor's classification or active value site, when one exists. */
    readonly selectedBindable: TemplateBindableReference | null,
    /** Public resource name matched at this cursor; differs from the canonical name for alias usages. */
    readonly selectedDefinitionMatchedName: string | null,
    /** Binding-scope slot selected by a root scope access such as `message` or `save()`. */
    readonly selectedScopeSlot: BindingContextSlot | null,
    /** Closed member token selected by the cursor, when the cursor is on an authored member name. */
    readonly selectedMemberName: string | null,
    /** Parser frontier under the cursor, when the cursor selected an expression parse. */
    readonly expressionFrontier: TemplateExpressionCompletionFrontier | null,
    /** Evaluator-owned subject for an open member-owner type, when narrower than the selected member token. */
    readonly memberOwnerTypeOpenSubject: CheckerExpressionTypeOpenSubject | null,
    /** Source route that produced the member-owner value type, when narrower than the reusable type product. */
    readonly memberOwnerTypeSourceAddressHandle: AddressHandle | null,
    /** Exact materialized authored token address selected by the cursor, when the token has a kernel address. */
    readonly activeSourceAddressHandle: AddressHandle | null,
    /** Exact parser-owned expression token span selected by the cursor; kept span-only to avoid per-token kernel growth. */
    readonly activeExpressionSpan: SourceSpan | null,
    /** Extra context gaps found while turning a cursor into product handles. */
    readonly missingInputs: readonly string[] = [],
  ) {}
}

interface TemplateCompletionAnswerFrame {
  readonly store: KernelStore;
  readonly query: TemplateCompletionQuery;
  readonly expressionWorld: CheckerExpressionTypeWorld;
  readonly missingInputs: string[];
  readonly candidates: TemplateCompletionCandidate[];
  readonly expressionParse: TemplateExpressionParse | null;
  readonly expressionResult: ExpressionParseResult | null;
  readonly expressionFrontier: TemplateExpressionCompletionFrontier | null;
  readonly bindingScope: BindingScope | null;
  readonly resourceScope: TemplateResourceScope | null;
  readonly frameworkHookBasisProductHandles: ProductHandle[];
  memberOwnerTypeProductHandle: ProductHandle | null;
}

interface TemplateCompletionCandidatePage {
  readonly rows: readonly TemplateCompletionCandidate[];
  readonly info: InquiryPageInfo;
}

type TemplateCompletionExpressionEvaluator = ReturnType<CheckerExpressionTypeWorld['evaluator']>;

interface DerivedMemberOwnerType {
  readonly productHandle: ProductHandle | null;
  readonly openSubject: CheckerExpressionTypeOpenSubject | null;
  readonly sourceAddressHandle: AddressHandle | null;
}

interface TemplateDefinitionCursorSelection {
  readonly productHandle: ProductHandle;
  readonly matchedName: string | null;
}

/** Resolve a materialized template cursor into the product-handle completion query shape. */
export function templateCompletionQueryForCursor(
  store: KernelStore,
  input: TemplateCompletionCursorContextRequest,
): TemplateCompletionCursorContext {
  return new TemplateCompletionCursorContextBuilder(store, input).build();
}

class TemplateCompletionCursorContextBuilder {
  private readonly page: InquiryPageRequest;
  private readonly projection: InquiryProjection;
  private readonly expressionWorld: CheckerExpressionTypeWorld;

  constructor(
    private readonly store: KernelStore,
    private readonly input: TemplateCompletionCursorContextRequest,
  ) {
    this.page = input.page ?? new InquiryPageRequest();
    this.projection = input.projection ?? new InquiryProjection(InquiryProjectionKind.Compact);
    this.expressionWorld = input.expressionWorld
      ?? input.resource.runtimeAnalysis.expressionWorld.freshInquiryGeneration();
  }

  build(): TemplateCompletionCursorContext {
    const offset = this.input.locus.cursor.offset;
    return offset == null
      ? this.missingOffsetContext()
      : this.contextForOffset(offset);
  }

  private missingOffsetContext(): TemplateCompletionCursorContext {
    return new TemplateCompletionCursorContext(
      new TemplateCompletionQuery(
        this.input.locus,
        TemplateCompletionSiteKind.Unknown,
        this.page,
        null,
        this.input.resource.compilation.compilerWorld.resourceScope.productHandle,
        null,
        null,
        null,
        null,
        this.projection,
        this.input.routeConfigProductHandles ?? [],
        [],
        this.input.i18nTranslationKeyProductHandles ?? [],
      ),
      this.expressionWorld,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      ['source-offset'],
    );
  }

  private contextForOffset(offset: number): TemplateCompletionCursorContext {
    const htmlNode = this.htmlNodeForOffset(offset);
    const htmlAttribute = this.htmlAttributeForOffset(offset);
    const valueSite = this.valueSiteForOffset(offset, htmlAttribute);
    const expressionParse = this.expressionParseForValueSite(valueSite);
    const expressionResult = expressionParse == null
      ? null
      : cursorFocusedExpressionResult(this.store, expressionParse, offset);
    const expressionFrontier = expressionResult == null
      ? null
      : expressionCompletionFrontier(expressionResult);
    const topLevelSyntax = this.syntaxForCursorAttribute(htmlAttribute);
    const nestedSyntax = this.multiBindingSyntaxForCursor(offset, htmlAttribute);
    const syntax = nestedSyntax ?? topLevelSyntax;
    const classification = this.classificationForCursorSyntax(topLevelSyntax);
    const multiBindingSegment = this.multiBindingSegmentForCursor(offset, valueSite, nestedSyntax);
    const activeElement = elementForCursorContext(this.input.resource.compilation.html.nodes, htmlNode, classification);
    const siteKind = this.siteKindForCursor(offset, htmlNode, activeElement, htmlAttribute, syntax, valueSite, expressionResult);
    const declarationSelection = sourceBackedScopeSlotDeclarationForCursor(
      this.store,
      this.input.resource,
      offset,
    );
    const bindingScope = declarationSelection?.scope ?? bindingScopeForCursor(
      this.store,
      this.input.resource,
      this.expressionWorld,
      offset,
      expressionParse,
    );
    const declarationBindable = selectedBindableForDeclarationCursor(
      this.store,
      this.input.resource,
      offset,
    );
    const selectedDefinition = selectedDefinitionForCursor(
      this.store,
      this.input.resource,
      activeElement,
      syntax,
      classification,
      siteKind,
      expressionResult,
      offset,
      declarationBindable,
    );
    const selectedBindable = selectedBindableForCursor(classification, valueSite, multiBindingSegment)
      ?? declarationBindable;
    const selectedScopeSlot = selectedScopeSlotForCursor(
      siteKind,
      expressionResult,
      offset,
      bindingScope,
      declarationSelection?.slot ?? null,
    );
    const missingInputs: string[] = [];
    const routeParameterEndpointProductHandles = this.routeParameterEndpointProductHandles(
      multiBindingSegment,
      siteKind,
      expressionResult,
      offset,
      missingInputs,
    );
    const memberOwnerType = this.memberOwnerType(
      offset,
      siteKind,
      expressionParse,
      expressionResult,
      bindingScope,
      valueSite,
      selectedScopeSlot == null ? missingInputs : [],
    );
    const selectedMemberName = selectedScopeSlot?.name
      ?? selectedMemberNameForCursor(siteKind, expressionResult, offset);
    const activeExpressionSpan = expressionResult == null
      ? null
      : ExpressionParseResultInspector.authoredTokenSpanAtOffset(expressionResult, offset);
    const activeSourceAddressHandle = activeExpressionSpan == null
      ? activeTemplateSourceAddressHandle(
          this.store,
          offset,
          syntax,
          htmlAttribute,
          activeElement,
          declarationSelection,
          valueSite,
          selectedBindable,
        )
      : null;

    return new TemplateCompletionCursorContext(
      new TemplateCompletionQuery(
        this.input.locus,
        siteKind,
        this.page,
        bindingScope?.productHandle ?? null,
        this.input.resource.compilation.compilerWorld.resourceScope.productHandle,
        selectedDefinition?.productHandle ?? null,
        siteKindUsesExpressionParse(siteKind) ? expressionParse?.productHandle ?? null : null,
        memberOwnerType.productHandle,
        valueSite?.productHandle ?? null,
        this.projection,
        this.input.routeConfigProductHandles ?? [],
        routeParameterEndpointProductHandles,
        this.input.i18nTranslationKeyProductHandles ?? [],
      ),
      this.expressionWorld,
      htmlNode?.productHandle ?? null,
      htmlAttribute?.productHandle ?? null,
      valueSite?.productHandle ?? null,
      selectedBindable,
      selectedDefinition?.matchedName ?? null,
      selectedScopeSlot,
      selectedMemberName,
      expressionFrontier,
      memberOwnerType.openSubject,
      memberOwnerType.sourceAddressHandle,
      activeSourceAddressHandle,
      activeExpressionSpan,
      uniqueValues(missingInputs),
    );
  }

  private routeParameterEndpointProductHandles(
    segment: MultiBindingSegment | null,
    siteKind: TemplateCompletionSiteKind,
    expressionResult: ExpressionParseResult | null,
    offset: number,
    missingInputs: string[],
  ): readonly ProductHandle[] {
    if (
      segment?.bindable?.reference.name !== 'params'
      || objectLiteralKeyCompletionContext(siteKind, expressionResult, offset) == null
    ) {
      return [];
    }
    const attributeProductHandle = segment.attribute.productHandle;
    const plan = attributeProductHandle == null
      ? null
      : this.input.routeParameterEndpointPlans.get(attributeProductHandle) ?? null;
    if (plan == null) {
      missingInputs.push('router-route-parameter-endpoints');
      return [];
    }
    if (plan.isOpen) {
      missingInputs.push('router-route-parameter-endpoints-open');
    }
    return plan.endpointProductHandles;
  }

  private htmlNodeForOffset(offset: number): HtmlIrNode | null {
    return smallestContaining(
      this.input.resource.compilation.html.nodes,
      offset,
      (node) => sourceSpanFor(this.store, node.sourceAddressHandle),
    );
  }

  private multiBindingSegmentForCursor(
    offset: number,
    valueSite: TemplateValueSite | null,
    nestedSyntax: AttributeSyntax | null,
  ): MultiBindingSegment | null {
    if (nestedSyntax != null) {
      return this.input.resource.compilation.bindingCommandLowering.multiBindingSegments
        .find((segment) => segment.syntaxProductHandle === nestedSyntax.productHandle) ?? null;
    }
    const targetSegment = smallestContaining(
      this.input.resource.compilation.bindingCommandLowering.multiBindingSegments,
      offset,
      (segment) => sourceSpanFor(this.store, segment.targetSourceAddressHandle),
    );
    if (targetSegment != null || valueSite == null) {
      return targetSegment;
    }
    for (const claimHandle of this.store.readClaimsForObject(valueSite.productHandle)) {
      const claim = this.store.readClaim(claimHandle);
      if (claim?.predicateKey !== KernelVocabulary.Template.SelectsValueSite.key) {
        continue;
      }
      const segment = this.multiBindingSegmentForValueOwner(claim.subjectHandle as ProductHandle);
      if (segment != null) {
        return segment;
      }
    }
    return null;
  }

  private multiBindingSyntaxForCursor(
    offset: number,
    activeAttribute: HtmlAttribute | null,
  ): AttributeSyntax | null {
    const syntax = smallestContaining(
      this.input.resource.compilation.bindingCommandLowering.attributeSyntaxes,
      offset,
      (syntax) => sourceSpanFor(this.store, syntax.nameSourceAddressHandle),
    );
    return syntax != null
      && activeAttribute != null
      && syntax.attribute.productHandle === activeAttribute.productHandle
      ? syntax
      : null;
  }

  private multiBindingSegmentForValueOwner(productHandle: ProductHandle): MultiBindingSegment | null {
    const product = this.store.readProduct(productHandle);
    if (product?.productKindKey === KernelVocabulary.Compiler.MultiBindingSegment.key) {
      return this.store.productDetails.read(TemplateProductDetails.MultiBindingSegment, productHandle);
    }
    if (product?.productKindKey !== KernelVocabulary.Compiler.BindingCommandBuildInput.key) {
      return null;
    }
    for (const claimHandle of this.store.readClaimsForObject(productHandle)) {
      const claim = this.store.readClaim(claimHandle);
      if (claim?.predicateKey !== KernelVocabulary.Compiler.BuildsCommandInput.key) {
        continue;
      }
      const segmentHandle = claim.subjectHandle as ProductHandle;
      const segmentProduct = this.store.readProduct(segmentHandle);
      if (segmentProduct?.productKindKey === KernelVocabulary.Compiler.MultiBindingSegment.key) {
        return this.store.productDetails.read(TemplateProductDetails.MultiBindingSegment, segmentHandle);
      }
    }
    return null;
  }

  private htmlAttributeForOffset(offset: number): HtmlAttribute | null {
    return smallestContaining(
      this.input.resource.compilation.html.attributes,
      offset,
      (attribute) => sourceSpanFor(this.store, attribute.sourceAddressHandle),
    );
  }

  private valueSiteForOffset(
    offset: number,
    activeAttribute: HtmlAttribute | null,
  ): TemplateValueSite | null {
    const site = smallestContaining(
      resourceLocalTemplateValueSites(this.store, this.input.resource),
      offset,
      (site) => sourceSpanFor(this.store, site.sourceAddressHandle),
    );
    if (site?.attribute?.productHandle == null) {
      return activeAttribute == null ? site : null;
    }
    return site.attribute.productHandle === activeAttribute?.productHandle ? site : null;
  }

  private expressionParseForValueSite(valueSite: TemplateValueSite | null): TemplateExpressionParse | null {
    return valueSite == null
      ? null
      : resourceLocalTemplateExpressionParses(this.store, this.input.resource)
        .find((parse) => parse.site.productHandle === valueSite.productHandle) ?? null;
  }

  private syntaxForCursorAttribute(htmlAttribute: HtmlAttribute | null): AttributeSyntax | null {
    return htmlAttribute == null
      ? null
      : syntaxForAttribute(this.input.resource.compilation.attributeSyntax.syntaxes, htmlAttribute);
  }

  private classificationForCursorSyntax(syntax: AttributeSyntax | null): AttributeClassification | null {
    return syntax == null
      ? null
      : classificationForSyntax(this.input.resource.compilation.attributeClassification.classifications, syntax);
  }

  private siteKindForCursor(
    offset: number,
    htmlNode: HtmlIrNode | null,
    activeElement: HtmlElement | null,
    htmlAttribute: HtmlAttribute | null,
    syntax: AttributeSyntax | null,
    valueSite: TemplateValueSite | null,
    expressionResult: ExpressionParseResult | null,
  ): TemplateCompletionSiteKind {
    const source = this.input.resource.compilation.unit.templateSource;
    return classifyTemplateCompletionSite(
      this.store,
      offset,
      source.markup,
      source.sourceAddressHandle,
      source.sourceMap,
      htmlNode,
      activeElement,
      htmlAttribute,
      syntax,
      valueSite,
      expressionResult,
    );
  }

  private memberOwnerType(
    offset: number,
    siteKind: TemplateCompletionSiteKind,
    expressionParse: TemplateExpressionParse | null,
    expressionResult: ExpressionParseResult | null,
    bindingScope: BindingScope | null,
    valueSite: TemplateValueSite | null,
    missingInputs: string[],
  ): DerivedMemberOwnerType {
    return expressionSiteSelectsMember(siteKind, expressionResult, offset)
      && bindingScope != null
      && expressionParse != null
      ? deriveMemberOwnerTypeForCursorExpression(
        this.store,
        this.input.locus.key,
        expressionResult,
        expressionParse,
        offset,
        expressionParse.sourceAddressHandle,
        bindingScope,
        this.input.resource,
        this.input.resource.compilation.compilerWorld.resourceScope,
        valueSite == null
          ? null
          : bindableTypeMember(this.store, this.expressionWorld.projector, valueSite)?.valueType ?? null,
        this.expressionWorld,
        missingInputs,
      )
      : missingDerivedMemberOwnerType();
  }
}

function activeTemplateSourceAddressHandle(
  store: KernelStore,
  offset: number,
  syntax: AttributeSyntax | null,
  attribute: HtmlAttribute | null,
  element: HtmlElement | null,
  declarationSelection: SourceBackedScopeSlotDeclarationSelection | null,
  valueSite: TemplateValueSite | null,
  selectedBindable: TemplateBindableReference | null,
): AddressHandle | null {
  const handles = [
    ...(syntax?.patternParts.map((part) => part.sourceAddressHandle) ?? []),
    syntax?.targetSourceAddressHandle ?? null,
    syntax?.commandSourceAddressHandle ?? null,
    syntax?.nameSourceAddressHandle ?? null,
    attribute?.nameAddressHandle ?? null,
    attribute?.valueAddressHandle ?? null,
    element?.tagNameAddressHandle ?? null,
    element?.closingTagNameAddressHandle ?? null,
    declarationSelection?.sourceSpan.handle ?? null,
    valueSite?.sourceAddressHandle ?? null,
    selectedBindable?.definition.nameSourceAddressHandle ?? null,
    selectedBindable?.definition.attributeSourceAddressHandle ?? null,
    selectedBindable?.definition.callbackSourceAddressHandle ?? null,
    selectedBindable?.definition.modeSourceAddressHandle ?? null,
    selectedBindable?.definition.setSourceAddressHandle ?? null,
  ];
  return handles.find((handle) => cursorTouchesSpan(sourceSpanFor(store, handle), offset)) ?? null;
}

function selectedMemberNameForCursor(
  siteKind: TemplateCompletionSiteKind,
  expressionResult: ExpressionParseResult | null,
  offset: number,
): string | null {
  if (expressionResult == null) {
    return null;
  }
  if (siteKind === TemplateCompletionSiteKind.ExpressionMember) {
    return ExpressionParseResultInspector.memberNameAtOffset(expressionResult, offset)
      ?? ExpressionParseResultInspector.scopeAccessAtOffset(expressionResult, offset)?.name.name
      ?? null;
  }
  return siteKind === TemplateCompletionSiteKind.Expression
    ? ExpressionParseResultInspector.scopeAccessAtOffset(expressionResult, offset)?.name.name ?? null
    : null;
}

function expressionSiteSelectsMember(
  siteKind: TemplateCompletionSiteKind,
  expressionResult: ExpressionParseResult | null,
  offset: number,
): boolean {
  return siteKind === TemplateCompletionSiteKind.ExpressionMember
    || (
      siteKind === TemplateCompletionSiteKind.Expression
      && expressionResult != null
      && ExpressionParseResultInspector.scopeAccessAtOffset(expressionResult, offset) != null
    );
}

function selectedScopeSlotForCursor(
  siteKind: TemplateCompletionSiteKind,
  expressionResult: ExpressionParseResult | null,
  offset: number,
  bindingScope: BindingScope | null,
  declarationSlot: BindingContextSlot | null,
): BindingContextSlot | null {
  if (declarationSlot != null) {
    return declarationSlot;
  }
  if (bindingScope == null) {
    return null;
  }

  if (
    (
      siteKind === TemplateCompletionSiteKind.Expression
      || siteKind === TemplateCompletionSiteKind.ExpressionMember
    )
    && expressionResult != null
  ) {
    const access = ExpressionParseResultInspector.scopeAccessAtOffset(expressionResult, offset);
    if (access != null) {
      return bindingScope.locate(access.name.name, access.ancestor).slot;
    }
    const bindingIdentifier = ExpressionParseResultInspector.bindingIdentifierAtOffset(expressionResult, offset);
    return bindingIdentifier == null
      ? null
      : bindingScope.locate(bindingIdentifier.name.name, 0).slot;
  }

  return null;
}

interface SourceBackedScopeSlotDeclarationSelection {
  readonly scope: BindingScope;
  readonly slot: BindingContextSlot;
  readonly contextKind: BindingContextKind;
  readonly sourceSpan: SourceSpanAddress;
}

function sourceBackedScopeSlotDeclarationForCursor(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  offset: number,
): SourceBackedScopeSlotDeclarationSelection | null {
  const templateSourceHandle = sourceSpanFor(
    store,
    resource.compilation.unit.templateSource.sourceAddressHandle,
  )?.fileHandle ?? null;
  if (templateSourceHandle == null) {
    return null;
  }
  const candidates: SourceBackedScopeSlotDeclarationSelection[] = [];
  for (const scope of resource.runtimeAnalysis.scopes.readScopes()) {
    for (const [contextKind, slots] of [
      [scope.bindingContext.contextKind, scope.bindingContext.slots],
      [BindingContextKind.Override, scope.overrideContext.slots],
    ] as const) {
      for (const slot of slots) {
        const span = sourceSpanFor(store, slot.sourceAddressHandle);
        // Slot sources can be broad causal carriers (for example a listener expression introducing `$event`).
        // Only a name-role span proves that the cursor is on an authored declaration token.
        if (
          span?.fileHandle !== templateSourceHandle
          || span.role !== SourceSpanRole.Name
          || !cursorTouchesSpan(span, offset)
          || predecessorHasScopeSlot(scope.predecessor, contextKind, slot)
        ) {
          continue;
        }
        candidates.push({ scope, slot, contextKind, sourceSpan: span });
      }
    }
  }
  const minimumSpanLength = Math.min(...candidates.map((candidate) => spanLength(candidate.sourceSpan)));
  const narrowest = candidates.filter((candidate) => spanLength(candidate.sourceSpan) === minimumSpanLength);
  if (narrowest.length === 0 || !scopeSlotDeclarationCandidatesConverge(narrowest)) {
    return null;
  }
  return [...narrowest].sort((left, right) =>
    left.scope.productHandle.localeCompare(right.scope.productHandle)
  )[0] ?? null;
}

function predecessorHasScopeSlot(
  predecessor: BindingScope | null,
  contextKind: BindingContextKind,
  slot: BindingContextSlot,
): boolean {
  const slots = contextKind === BindingContextKind.Override
    ? predecessor?.overrideContext.slots ?? []
    : predecessor?.bindingContext.slots ?? [];
  return slots.some((candidate) =>
    candidate.name === slot.name
    && candidate.sourceAddressHandle === slot.sourceAddressHandle
  );
}

function scopeSlotDeclarationCandidatesConverge(
  candidates: readonly SourceBackedScopeSlotDeclarationSelection[],
): boolean {
  const first = candidates[0];
  if (first == null) {
    return false;
  }
  return candidates.every((candidate) =>
    candidate.contextKind === first.contextKind
    && candidate.slot.name === first.slot.name
    && candidate.slot.sourceAddressHandle === first.slot.sourceAddressHandle
    && candidate.slot.targetIdentityHandle === first.slot.targetIdentityHandle
    && candidate.slot.targetProductHandle === first.slot.targetProductHandle
    && sameNullableCheckerTypeReference(candidate.slot.targetType, first.slot.targetType)
  );
}

function sameNullableCheckerTypeReference(
  left: CheckerTypeReference | null,
  right: CheckerTypeReference | null,
): boolean {
  return left == null || right == null
    ? left === right
    : sameCheckerTypeReference(left, right);
}

/** Answer template and expression completion candidates from already-materialized product details. */
export function answerTemplateCompletion(
  store: KernelStore,
  query: TemplateCompletionQuery,
  expressionWorld: CheckerExpressionTypeWorld,
): InquiryAnswer<TemplateCompletionResult, TemplateCompletionQuery> {
  const frame = createTemplateCompletionAnswerFrame(store, query, expressionWorld);
  collectTemplateCompletionCandidates(frame);
  const uniqueCandidates = uniqueCandidatesByKey(frame.candidates);
  const page = pageCandidates(uniqueCandidates, query.page);
  return templateCompletionAnswer(frame, uniqueCandidates, page);
}

function createTemplateCompletionAnswerFrame(
  store: KernelStore,
  query: TemplateCompletionQuery,
  expressionWorld: CheckerExpressionTypeWorld,
): TemplateCompletionAnswerFrame {
  const missingInputs: string[] = [];
  const expressionParse = siteKindUsesExpressionParse(query.siteKind)
    ? readExpressionParse(store, query.expressionParseProductHandle, missingInputs)
    : null;
  const expressionResult = siteKindUsesExpressionParse(query.siteKind)
    ? focusedExpressionResultForQuery(store, query, expressionParse)
    : null;
  const expressionFrontier = expressionResult == null
    ? null
    : expressionCompletionFrontier(expressionResult);
  const requiresBindingScope = shouldOfferBindingScopeCandidates(query.siteKind, expressionFrontier);
  const needsResourceScope = shouldReadResourceScope(query.siteKind, expressionFrontier);
  const bindingScope = requiresBindingScope
    ? readBindingScope(store, query.bindingScopeProductHandle, missingInputs)
    : query.siteKind === TemplateCompletionSiteKind.ExpressionMember
      && query.bindingScopeProductHandle != null
      ? store.productDetails.read(ConfigurationProductDetails.BindingScope, query.bindingScopeProductHandle)
      : null;
  const resourceScope = needsResourceScope
    ? readResourceScope(store, query.resourceScopeProductHandle, missingInputs)
    : null;
  return {
    store,
    query,
    expressionWorld,
    missingInputs,
    candidates: [],
    expressionParse,
    expressionResult,
    expressionFrontier,
    bindingScope,
    resourceScope,
    frameworkHookBasisProductHandles: [],
    memberOwnerTypeProductHandle: query.memberOwnerTypeProductHandle,
  };
}

function collectTemplateCompletionCandidates(
  frame: TemplateCompletionAnswerFrame,
): void {
  collectBindingScopeCandidates(frame);
  collectRouterRouteParameterCandidates(frame);
  collectResourceScopeCandidates(frame);
  collectBindableCandidates(frame);
  collectExpressionMemberCandidates(frame);
  collectAttributeValueDomainCandidates(frame);
}

function collectRouterRouteParameterCandidates(
  frame: TemplateCompletionAnswerFrame,
): void {
  const objectContext = objectLiteralKeyCompletionContext(
    frame.query.siteKind,
    frame.expressionResult,
    frame.query.locus.kind === InquiryLocusKind.SourceCursor
      ? frame.query.locus.cursor.offset
      : null,
  );
  if (objectContext == null || frame.query.routeParameterEndpointProductHandles.length === 0) {
    return;
  }
  const occupiedKeys = new Set(objectContext.keys
    .filter((key) => key !== objectContext.activeKey)
    .map(String));
  frame.candidates.push(...routerRouteParameterCandidates(
    frame.store,
    frame.query.routeParameterEndpointProductHandles,
    occupiedKeys,
    frame.missingInputs,
  ));
}

function objectLiteralKeyCompletionContext(
  siteKind: TemplateCompletionSiteKind,
  result: ExpressionParseResult | null,
  offset: number | null,
): ExpressionObjectLiteralKeyContext | null {
  return siteKind === TemplateCompletionSiteKind.Expression && result != null && offset != null
    ? routeParameterObjectKeyContext(ExpressionParseResultInspector.objectLiteralKeyContextAtOffset(result, offset))
    : null;
}

function routeParameterObjectKeyContext(
  context: ExpressionObjectLiteralKeyContext | null,
): ExpressionObjectLiteralKeyContext | null {
  return context?.objectDepth === 0 ? context : null;
}

function collectBindingScopeCandidates(
  frame: TemplateCompletionAnswerFrame,
): void {
  if (!shouldOfferBindingScopeCandidates(frame.query.siteKind, frame.expressionFrontier) || frame.bindingScope == null) {
    return;
  }
  frame.candidates.push(...scopeCandidates(frame, frame.bindingScope));
}

function collectResourceScopeCandidates(
  frame: TemplateCompletionAnswerFrame,
): void {
  if (!shouldReadResourceScope(frame.query.siteKind, frame.expressionFrontier) || frame.resourceScope == null) {
    return;
  }
  frame.candidates.push(...resourceScopeCandidates(frame.resourceScope, frame.query.siteKind, frame.expressionFrontier));
}

function collectBindableCandidates(
  frame: TemplateCompletionAnswerFrame,
): void {
  if (!shouldOfferBindableCandidates(frame.query.siteKind)) {
    return;
  }
  const selectedDefinition = readSelectedDefinition(frame.store, frame.query.selectedDefinitionProductHandle, frame.missingInputs);
  if (selectedDefinition != null) {
    frame.candidates.push(...bindableCandidates(selectedDefinition));
  }
}

function collectExpressionMemberCandidates(
  frame: TemplateCompletionAnswerFrame,
): void {
  if (frame.query.siteKind !== TemplateCompletionSiteKind.ExpressionMember) {
    return;
  }
  if (frame.memberOwnerTypeProductHandle == null) {
    frame.missingInputs.push('member-owner-type');
    return;
  }
  const members = readTypeMembers(
    frame.store,
    frame.expressionWorld.projector,
    frame.memberOwnerTypeProductHandle,
    frame.missingInputs,
  );
  if (members != null) {
    frame.candidates.push(...typeMemberCandidates(frame, members));
  }
}

function collectAttributeValueDomainCandidates(
  frame: TemplateCompletionAnswerFrame,
): void {
  if (frame.query.siteKind !== TemplateCompletionSiteKind.AttributeValue) {
    return;
  }
  const site = readValueSite(frame.store, frame.query.valueSiteProductHandle, frame.missingInputs);
  if (site == null) {
    return;
  }
  const candidates = attributeValueDomainCandidates(
    frame.store,
    frame.expressionWorld.projector,
    site,
    frame.query.routeConfigProductHandles,
    frame.query.i18nTranslationKeyProductHandles,
  );
  if (candidates.length > 0) {
    frame.candidates.push(...candidates);
    return;
  }
  const reason = attributeValueCompletionMissingInput(frame.store, frame.expressionWorld.projector, site);
  if (reason != null) {
    frame.missingInputs.push(reason);
  }
}

function templateCompletionAnswer(
  frame: TemplateCompletionAnswerFrame,
  uniqueCandidates: readonly TemplateCompletionCandidate[],
  page: TemplateCompletionCandidatePage,
): InquiryAnswer<TemplateCompletionResult, TemplateCompletionQuery> {
  const products = completionCandidateProducts(
    frame.store,
    page.rows,
    frame.frameworkHookBasisProductHandles,
  );
  const missingInputs = uniqueValues(frame.missingInputs);
  return new InquiryAnswer(
    outcomeForCompletion(page.rows, uniqueCandidates, missingInputs, frame.expressionFrontier),
    frame.query.locus,
    summaryForCompletion(page.rows.length, uniqueCandidates.length, missingInputs, frame.expressionFrontier),
    KernelExactBasis,
    templateCompletionResult(frame, page.rows, missingInputs),
    [],
    completionProductProvenanceHandles(products),
    completionProductClaimHandles(frame.store, products),
    [],
    completionContinuations(frame.query, page.info),
    page.info,
    completionProjection(frame),
  );
}

function templateCompletionResult(
  frame: TemplateCompletionAnswerFrame,
  rows: readonly TemplateCompletionCandidate[],
  missingInputs: readonly string[],
): TemplateCompletionResult {
  return new TemplateCompletionResult(
    frame.query.siteKind,
    rows,
    frame.expressionFrontier,
    missingInputs,
  );
}

function completionCandidateProducts(
  store: KernelStore,
  rows: readonly TemplateCompletionCandidate[],
  basisProductHandles: readonly ProductHandle[] = [],
): readonly MaterializedProduct[] {
  return uniqueValues(
    [
      ...rows
      .map((candidate) => candidate.productHandle)
      .filter((handle): handle is ProductHandle => handle != null),
      ...basisProductHandles,
    ],
  )
    .map((handle) => store.readProduct(handle))
    .filter((product): product is MaterializedProduct => product != null);
}

function completionProductClaimHandles(
  store: KernelStore,
  products: readonly MaterializedProduct[],
): readonly ClaimHandle[] {
  return uniqueValues(products.flatMap((product) => [
    ...store.readClaimsForSubject(product.handle),
    ...store.readClaimsForObject(product.handle),
  ]));
}

function completionProductProvenanceHandles(
  products: readonly MaterializedProduct[],
): readonly ProvenanceHandle[] {
  return uniqueValues(products.map((product) => product.provenanceHandle));
}

function completionContinuations(
  query: TemplateCompletionQuery,
  page: InquiryPageInfo,
): readonly InquiryContinuation<TemplateCompletionQuery>[] {
  return page.nextCursor == null
    ? []
    : [
      new InquiryContinuation(
        InquiryContinuationKind.NextPage,
        'Read the next page of completion candidates.',
        query.withPage(new InquiryPageRequest(page.size, page.nextCursor)),
        PAGED_INQUIRY_CONTINUATION,
      ),
    ];
}

function completionProjection(
  frame: TemplateCompletionAnswerFrame,
): InquiryProjection {
  return new InquiryProjection(
    frame.query.projection.projectionKind,
    [
      new InquiryExpansion(
        InquiryExpansionKind.ProductDetail,
        [],
        completionProjectionProductHandles(frame),
        'Completion answer read typed product details supplied by parser, resource, and scope materializers.',
      ),
    ],
  );
}

function completionProjectionProductHandles(
  frame: TemplateCompletionAnswerFrame,
): readonly ProductHandle[] {
  return [
    frame.query.bindingScopeProductHandle,
    frame.query.resourceScopeProductHandle,
    frame.query.selectedDefinitionProductHandle,
    frame.query.expressionParseProductHandle,
    frame.memberOwnerTypeProductHandle,
    ...frame.frameworkHookBasisProductHandles,
  ].filter((handle): handle is ProductHandle => handle != null);
}

function readBindingScope(
  store: KernelStore,
  productHandle: ProductHandle | null,
  missingInputs: string[],
): BindingScope | null {
  if (productHandle == null) {
    missingInputs.push('binding-scope');
    return null;
  }
  const detail = store.productDetails.read(ConfigurationProductDetails.BindingScope, productHandle);
  if (detail == null) {
    missingInputs.push('binding-scope-detail');
  }
  return detail;
}

function readResourceScope(
  store: KernelStore,
  productHandle: ProductHandle | null,
  missingInputs: string[],
): TemplateResourceScope | null {
  if (productHandle == null) {
    missingInputs.push('resource-scope');
    return null;
  }
  const detail = store.productDetails.read(TemplateProductDetails.ResourceScope, productHandle);
  if (detail == null) {
    missingInputs.push('resource-scope-detail');
  }
  return detail;
}

function readSelectedDefinition(
  store: KernelStore,
  productHandle: ProductHandle | null,
  missingInputs: string[],
): FullResourceDefinition | null {
  if (productHandle == null) {
    return null;
  }
  const detail = store.productDetails.read(ResourceProductDetails.Definition, productHandle);
  if (detail == null) {
    missingInputs.push('selected-resource-definition-detail');
  }
  return detail;
}

function readExpressionParse(
  store: KernelStore,
  productHandle: ProductHandle | null,
  missingInputs: string[],
): TemplateExpressionParse | null {
  if (productHandle == null) {
    return null;
  }
  const detail = readTemplateExpressionParse(store, productHandle);
  if (detail == null) {
    missingInputs.push('expression-parse-detail');
  }
  return detail;
}

function focusedExpressionResultForQuery(
  store: KernelStore,
  query: TemplateCompletionQuery,
  expressionParse: TemplateExpressionParse | null,
): ExpressionParseResult | null {
  if (expressionParse == null) {
    return null;
  }
  return query.locus.kind === InquiryLocusKind.SourceCursor && query.locus.cursor.offset != null
    ? cursorFocusedExpressionResult(store, expressionParse, query.locus.cursor.offset)
    : expressionParse.result;
}

function cursorFocusedExpressionResult(
  store: KernelStore,
  expressionParse: TemplateExpressionParse,
  offset: number,
): ExpressionParseResult {
  const site = expressionParse.site.productHandle == null
    ? null
    : store.productDetails.read(TemplateProductDetails.ValueSite, expressionParse.site.productHandle);
  if (site?.entryFamily !== 'Interpolation') {
    return expressionParse.result;
  }

  const span = sourceSpanFor(store, expressionParse.sourceAddressHandle);
  if (span == null || !cursorTouchesSpan(span, offset)) {
    return expressionParse.result;
  }

  return new ExpressionParser().parse(
    site.rawValue,
    site.entryFamily,
    {
      baseOffset: span.start,
      activeOffset: offset,
    },
  );
}

function readTypeMembers(
  store: KernelStore,
  projector: CheckerTypeProjector,
  productHandle: ProductHandle | null,
  missingInputs: string[],
): readonly CheckerTypeMember[] | null {
  if (productHandle == null) {
    missingInputs.push('expression-member-target');
    return null;
  }
  const detail = store.productDetails.read(TypeSystemProductDetails.TypeShape, productHandle);
  if (detail == null) {
    missingInputs.push('type-shape-detail');
    return null;
  }
  const members = readOrProjectCheckerTypeMembersInProjection(projector, detail, productHandle);
  if (members.length === 0) {
    missingInputs.push(expressionMemberSurfaceMissingInput(
      detail.shapeKind,
      detail.indexedValueType,
      detail.indexedAccessKeyKind,
    ));
  }
  return members;
}

function readValueSite(
  store: KernelStore,
  productHandle: ProductHandle | null,
  missingInputs: string[],
): TemplateValueSite | null {
  if (productHandle == null) {
    return null;
  }
  const detail = store.productDetails.read(TemplateProductDetails.ValueSite, productHandle);
  if (detail == null) {
    missingInputs.push('attribute-value-site-detail');
    return null;
  }
  return detail;
}

function attributeValueCompletionMissingInput(
  store: KernelStore,
  projector: CheckerTypeProjector,
  site: TemplateValueSite,
): string | null {
  switch (site.siteKind) {
    case TemplateValueSiteKind.BindingCommandValue:
      if (i18nTranslationValueHasOpenEndedDomain(site)) {
        return null;
      }
      return `attribute-value-domain:binding-command:${site.bindingCommand?.name ?? 'unknown'}`;
    case TemplateValueSiteKind.BindableValue:
      if (bindableValueHasOpenEndedScalarDomain(store, projector, site)) {
        return null;
      }
      return `attribute-value-domain:bindable:${site.bindable?.reference.attribute ?? 'unknown'}`;
    case TemplateValueSiteKind.CustomAttributeValue:
      if (routerResourcePrimaryValueHasOpenEndedDomain(site)) {
        return null;
      }
      if (site.bindable != null) {
        if (bindableValueHasOpenEndedScalarDomain(store, projector, site)) {
          return null;
        }
        return `attribute-value-domain:bindable:${site.bindable.reference.attribute}`;
      }
      return `attribute-value-domain:custom-attribute:${site.classification?.resource?.name ?? 'unknown'}`;
    case TemplateValueSiteKind.MultiBindingValue:
      return `attribute-value-domain:inline-multi-binding:${site.classification?.resource?.name ?? 'unknown'}`;
    case TemplateValueSiteKind.TemplateControllerValue:
      if (templateControllerPrimaryValueHasOpenEndedDomain(site)) {
        return null;
      }
      return `attribute-value-domain:template-controller:${site.classification?.resource?.name ?? 'unknown'}`;
    case TemplateValueSiteKind.CapturedValue:
      return `attribute-value-domain:captured:${site.syntax?.target ?? 'unknown'}`;
    case TemplateValueSiteKind.SpreadValue:
      return 'attribute-value-domain:spread';
    case TemplateValueSiteKind.PlainAttributeValue:
    case TemplateValueSiteKind.PlainAttributeInterpolation:
    case TemplateValueSiteKind.TextInterpolation:
      return null;
  }
}

function templateControllerPrimaryValueHasOpenEndedDomain(
  site: TemplateValueSite,
): boolean {
  const semantics = templateControllerSemanticsForValueSite(site);
  return semantics?.valueDomainKind === BuiltInTemplateControllerValueDomainKind.OpenEnded
    && semantics.valueProperty != null
    && site.bindable?.reference.name === semantics.valueProperty;
}

function templateControllerSemanticsForValueSite(
  site: TemplateValueSite,
) {
  const resourceName = site.classification?.resource?.name
    ?? site.syntax?.target
    ?? null;
  return resourceName == null
    ? null
    : frameworkTemplateControllerSemanticsForName(resourceName);
}

function bindableValueHasOpenEndedScalarDomain(
  store: KernelStore,
  projector: CheckerTypeProjector,
  site: TemplateValueSite,
): boolean {
  const member = bindableTypeMember(store, projector, site);
  const carrier = member?.carrier;
  return carrier?.valueType == null ? false : isOpenEndedScalarType(carrier.checker, carrier.valueType);
}

function attributeValueDomainCandidates(
  store: KernelStore,
  projector: CheckerTypeProjector,
  site: TemplateValueSite,
  routeConfigProductHandles: readonly ProductHandle[],
  i18nTranslationKeyProductHandles: readonly ProductHandle[],
): readonly TemplateCompletionCandidate[] {
  return [
    ...routerResourceRouteCandidates(store, site, routeConfigProductHandles),
    ...i18nTranslationKeyCandidates(store, site, i18nTranslationKeyProductHandles),
    ...inlineMultiBindingTargetCandidates(store, site),
    ...(site.bindable == null ? [] : bindableAttributeValueCandidates(store, projector, site)),
  ];
}

function i18nTranslationKeyCandidates(
  store: KernelStore,
  site: TemplateValueSite,
  i18nTranslationKeyProductHandles: readonly ProductHandle[],
): readonly TemplateCompletionCandidate[] {
  if (!isI18nTranslationBindingValueSite(site)) {
    return [];
  }
  return uniqueI18nTranslationKeyCandidates(
    i18nTranslationKeyProductHandles
      .map((handle) => store.productDetails.read(I18nProductDetails.TranslationKey, handle))
      .filter((translationKey): translationKey is I18nTranslationKey => translationKey != null)
      .map((translationKey) => i18nTranslationKeyCandidate(translationKey)),
  );
}

function i18nTranslationValueHasOpenEndedDomain(
  site: TemplateValueSite,
): boolean {
  return isI18nTranslationBindingValueSite(site);
}

function isI18nTranslationBindingValueSite(site: TemplateValueSite): boolean {
  return site.siteKind === TemplateValueSiteKind.BindingCommandValue
    && (
      site.bindingCommand?.key === 'au:resource:binding-command:t'
      || site.bindingCommand?.name === 't'
    );
}

function i18nTranslationKeyCandidate(
  translationKey: I18nTranslationKey,
): TemplateCompletionCandidate {
  return new TemplateCompletionCandidate(
    TemplateCompletionCandidateKind.I18nTranslationKey,
    translationKey.key,
    TemplateCompletionCandidateSourceKind.I18n,
    translationKey.productHandle,
    translationKey.identityHandle,
    translationKey.sourceAddressHandle,
    'I18n translation key admitted from static init resources.',
  );
}

function uniqueI18nTranslationKeyCandidates(
  candidates: readonly TemplateCompletionCandidate[],
): readonly TemplateCompletionCandidate[] {
  const seen = new Set<string>();
  const unique: TemplateCompletionCandidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.name)) {
      continue;
    }
    seen.add(candidate.name);
    unique.push(candidate);
  }
  return unique.sort((left, right) => left.name.localeCompare(right.name));
}

function routerResourceRouteCandidates(
  store: KernelStore,
  site: TemplateValueSite,
  routeConfigProductHandles: readonly ProductHandle[],
): readonly TemplateCompletionCandidate[] {
  if (!isRouterResourcePrimaryValueSite(site)) {
    return [];
  }
  return uniqueRouteConfigCandidates(
    routeConfigProductHandles
      .map((handle) => store.productDetails.read(RouterProductDetails.RouteConfig, handle))
      .filter((routeConfig): routeConfig is RouteConfigModel => routeConfig != null)
      .flatMap(routeConfigRouteCandidates),
  );
}

function routerRouteParameterCandidates(
  store: KernelStore,
  endpointProductHandles: readonly ProductHandle[],
  occupiedKeys: ReadonlySet<string>,
  missingInputs: string[],
): readonly TemplateCompletionCandidate[] {
  const candidates: TemplateCompletionCandidate[] = [];
  for (const productHandle of endpointProductHandles) {
    const endpoint = store.productDetails.read(RouterProductDetails.Endpoint, productHandle);
    if (endpoint == null) {
      missingInputs.push('router-route-parameter-endpoint');
      continue;
    }
    candidates.push(...endpoint.parameters
      .filter((parameter) => !occupiedKeys.has(parameter.name))
      .map((parameter) => routerRouteParameterCandidate(endpoint, parameter)));
  }
  const seen = new Set<string>();
  return candidates
    .filter((candidate) => {
      if (seen.has(candidate.name)) {
        return false;
      }
      seen.add(candidate.name);
      return true;
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function routerRouteParameterCandidate(
  endpoint: EndpointModel,
  parameter: EndpointModel['parameters'][number],
): TemplateCompletionCandidate {
  const shape = parameter.isStar ? 'star' : parameter.isOptional ? 'optional' : 'required';
  return new TemplateCompletionCandidate(
    TemplateCompletionCandidateKind.RouterRouteParameter,
    parameter.name,
    TemplateCompletionCandidateSourceKind.Router,
    endpoint.productHandle,
    endpoint.identityHandle,
    endpoint.sourceAddressHandle,
    `${shape[0]!.toUpperCase()}${shape.slice(1)} parameter accepted by route endpoint '${endpoint.path}'.`,
  );
}

function routerResourcePrimaryValueHasOpenEndedDomain(
  site: TemplateValueSite,
): boolean {
  return isRouterResourcePrimaryValueSite(site);
}

function isRouterResourcePrimaryValueSite(site: TemplateValueSite): boolean {
  if (site.siteKind !== TemplateValueSiteKind.CustomAttributeValue) {
    return false;
  }
  const definition = site.classification?.resource?.definition ?? null;
  return definition?.type === ResourceDefinitionKind.CustomAttribute
    && (
      (definition.name === 'load' && definition.target.localName === 'LoadCustomAttribute')
      || (definition.name === 'href' && definition.target.localName === 'HrefCustomAttribute')
    );
}

function routeConfigRouteCandidates(
  routeConfig: RouteConfigModel,
): readonly TemplateCompletionCandidate[] {
  if (routeConfig.routeKind === RouteConfigKind.Open) {
    return [];
  }
  const entries = [
    ...(routeConfig.id == null || routeConfig.id.length === 0
      ? []
      : [{ value: routeConfig.id, sourceAddressHandle: routeConfig.sourceAddressHandle }]),
    ...routeConfig.paths.flatMap((value, index) => value.length === 0
      ? []
      : [{ value, sourceAddressHandle: routeConfig.pathSourceAddressHandles[index] ?? routeConfig.sourceAddressHandle }]),
  ];
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.value)) return false;
    seen.add(entry.value);
    return true;
  }).map((entry) => new TemplateCompletionCandidate(
    TemplateCompletionCandidateKind.RouterRoute,
    entry.value,
    TemplateCompletionCandidateSourceKind.Router,
    routeConfig.productHandle,
    routeConfig.identityHandle,
    entry.sourceAddressHandle,
    'Router route id or path accepted by a router resource primary value.',
  ));
}

function uniqueRouteConfigCandidates(
  candidates: readonly TemplateCompletionCandidate[],
): readonly TemplateCompletionCandidate[] {
  const seen = new Set<string>();
  const unique: TemplateCompletionCandidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.name}:${candidate.productHandle ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}

function inlineMultiBindingTargetCandidates(
  store: KernelStore,
  site: TemplateValueSite,
): readonly TemplateCompletionCandidate[] {
  if (site.siteKind !== TemplateValueSiteKind.MultiBindingValue) {
    return [];
  }
  const definition = valueSiteResourceDefinition(store, site);
  return definition == null ? [] : bindableCandidates(definition);
}

function bindableAttributeValueCandidates(
  store: KernelStore,
  projector: CheckerTypeProjector,
  site: TemplateValueSite,
): readonly TemplateCompletionCandidate[] {
  const member = bindableTypeMember(store, projector, site);
  if (member == null) {
    return [];
  }
  return finiteStaticValueCandidatesForMember(member).map((value) => new TemplateCompletionCandidate(
    TemplateCompletionCandidateKind.AttributeValue,
    value,
    TemplateCompletionCandidateSourceKind.TypeSystem,
    member.productHandle,
    checkerTypeMemberReachableIdentityHandle(member),
    checkerTypeMemberSourceAddressHandle(store, member),
    'Finite static value accepted by the checker-projected bindable type.',
    member.valueType,
  ));
}

function valueSiteResourceDefinition(
  store: KernelStore,
  site: TemplateValueSite,
): FullResourceDefinition | null {
  const definitionHandle = site.classification?.resource?.definitionProductHandle ?? null;
  return definitionHandle == null
    ? null
    : store.productDetails.read(ResourceProductDetails.Definition, definitionHandle);
}

function bindableTypeMember(
  store: KernelStore,
  projector: CheckerTypeProjector,
  site: TemplateValueSite,
): CheckerTypeMember | null {
  const ownerDefinitionHandle = site.bindable?.reference.ownerDefinitionProductHandle ?? null;
  const bindableName = site.bindable?.reference.name ?? null;
  if (ownerDefinitionHandle == null || bindableName == null) {
    return null;
  }
  const definition = store.productDetails.read(ResourceProductDetails.Definition, ownerDefinitionHandle);
  const targetTypeProductHandle = definition?.target.targetType?.productHandle ?? null;
  if (targetTypeProductHandle == null) {
    return null;
  }
  const targetType = store.productDetails.read(TypeSystemProductDetails.TypeShape, targetTypeProductHandle);
  const members = targetType == null
    ? []
    : readOrProjectCheckerTypeMembersInProjection(projector, targetType, targetTypeProductHandle);
  return members.find((member) => member.name === bindableName) ?? null;
}

function finiteStaticValueCandidatesForMember(
  member: CheckerTypeMember,
): readonly string[] {
  const carrier = member.carrier;
  return carrier?.valueType == null ? [] : finiteStaticValueCandidatesForType(carrier.checker, carrier.valueType);
}

function finiteStaticValueCandidatesForType(
  checker: ts.TypeChecker,
  type: ts.Type,
): readonly string[] {
  if (type.isUnion()) {
    return finiteStaticValueCandidatesForUnion(checker, type);
  }
  if (isBooleanType(type)) {
    return ['false', 'true'];
  }
  const literal = literalCandidateForType(type);
  return literal == null ? [] : [literal];
}

function isOpenEndedScalarType(
  checker: ts.TypeChecker,
  type: ts.Type,
): boolean {
  if (type.isUnion()) {
    return type.types.some((constituent) => !checkerNullishType(checker, constituent))
      && type.types.every((constituent) => checkerNullishType(checker, constituent) || isOpenEndedScalarType(checker, constituent));
  }
  return (type.flags & ts.TypeFlags.String) !== 0
    || (type.flags & ts.TypeFlags.Number) !== 0
    || (type.flags & ts.TypeFlags.BigInt) !== 0;
}

function finiteStaticValueCandidatesForUnion(
  checker: ts.TypeChecker,
  type: ts.UnionType,
): readonly string[] {
  const values: string[] = [];
  for (const constituent of type.types) {
    if (checkerNullishType(checker, constituent)) {
      continue;
    }
    if (isBooleanType(constituent)) {
      values.push('false', 'true');
      continue;
    }
    const literal = literalCandidateForType(constituent);
    if (literal == null) {
      return [];
    }
    values.push(literal);
  }
  return [...uniqueValues(values)].sort((left: string, right: string) => left.localeCompare(right));
}

function literalCandidateForType(
  type: ts.Type,
): string | null {
  if ((type.flags & ts.TypeFlags.StringLiteral) !== 0) {
    return String((type as ts.StringLiteralType).value);
  }
  if ((type.flags & ts.TypeFlags.NumberLiteral) !== 0) {
    return String((type as ts.NumberLiteralType).value);
  }
  if ((type.flags & ts.TypeFlags.BooleanLiteral) !== 0) {
    const intrinsicName = (type as unknown as { readonly intrinsicName?: string }).intrinsicName;
    return intrinsicName === 'true' ? 'true' : 'false';
  }
  return null;
}

function isBooleanType(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.Boolean) !== 0;
}

function expressionMemberSurfaceMissingInput(
  shapeKind: CheckerTypeShapeKind,
  indexedValueType: CheckerTypeReference | null,
  indexedAccessKeyKind: CheckerIndexedAccessKeyKind | null,
): string {
  if (shapeKind === CheckerTypeShapeKind.Any) {
    return 'expression-member-owner-type:any';
  }
  if (indexedValueType != null && checkerIndexedAccessSupportsString(indexedAccessKeyKind)) {
    return 'expression-member-owner-type:index-signature-only';
  }
  return `expression-member-owner-type:no-members:${shapeKind}`;
}

function deriveMemberOwnerTypeForCursorExpression(
  store: KernelStore,
  locusKey: string,
  result: ExpressionParseResult | null,
  expressionParse: TemplateExpressionParse,
  offset: number,
  sourceAddressHandle: AddressHandle | null,
  bindingScope: BindingScope,
  resource: TemplateResourceRuntimeAnalysisEmission,
  resourceScope: TemplateResourceScope | null,
  contextualType: CheckerTypeReference | null,
  expressionWorld: CheckerExpressionTypeWorld,
  missingInputs: string[],
): DerivedMemberOwnerType {
  const context = memberOwnerEvaluationContextForCursorExpression(
    store,
    locusKey,
    result,
    expressionParse,
    offset,
    sourceAddressHandle,
    bindingScope,
    resource,
    contextualType,
    expressionWorld,
  );
  if (context == null) {
    missingInputs.push('expression-member-owner');
    return missingDerivedMemberOwnerType();
  }

  const evaluator = expressionWorld.evaluator(resourceScope);
  const evaluation = result != null && ExpressionParseResultInspector.hasCanonicalAst(result)
    ? evaluator.evaluateMemberOwnerAtOffset(context, offset)
    : evaluateMemberOwnerFrontierAtOffset(
      evaluator,
      result,
      offset,
      context,
      contextualType,
      missingInputs,
    );
  if (evaluation == null) {
    return missingDerivedMemberOwnerType();
  }

  return deriveMemberOwnerTypeFromEvaluation(evaluation, missingInputs);
}

function memberOwnerEvaluationContextForCursorExpression(
  store: KernelStore,
  locusKey: string,
  result: ExpressionParseResult | null,
  expressionParse: TemplateExpressionParse,
  offset: number,
  sourceAddressHandle: AddressHandle | null,
  bindingScope: BindingScope,
  resource: TemplateResourceRuntimeAnalysisEmission,
  contextualType: CheckerTypeReference | null,
  expressionWorld: CheckerExpressionTypeWorld,
): CheckerExpressionTypeEvaluationContext | null {
  const expression = bindingExpressionAstForProductAtOffset(store, expressionParse.productHandle, offset)
    ?? (result == null ? null : ExpressionParseResultInspector.memberOwnerAtOffset(result, offset));
  if (expression == null) {
    return null;
  }

  const projection = bindingSourceContextProjectionForTemplateExpressionParseAtOffset(
    store,
    resource,
    expressionWorld,
    expressionParse,
    offset,
    bindingScope,
  );
  return projection == null
    ? CheckerExpressionTypeEvaluationContext.knownScope(
      expression,
      bindingScope,
      memberOwnerLocalKey(locusKey),
      sourceAddressHandle,
      contextualType,
    )
    : checkerContextForRuntimeBindingSourceExpressionProjection(
      projection,
      false,
      contextualType,
      memberOwnerLocalKey(locusKey),
    );
}

function memberOwnerLocalKey(locusKey: string): string {
  return `template-completion:${locusKey}:member-owner`;
}

function evaluateMemberOwnerFrontierAtOffset(
  evaluator: TemplateCompletionExpressionEvaluator,
  result: ExpressionParseResult | null,
  offset: number,
  context: CheckerExpressionTypeEvaluationContext,
  contextualType: CheckerTypeReference | null,
  missingInputs: string[],
): CheckerExpressionTypeEvaluation | null {
  const owner = result == null ? null : ExpressionParseResultInspector.memberOwnerAtOffset(result, offset);
  if (owner == null) {
    missingInputs.push('expression-member-owner');
    return null;
  }
  return evaluator.evaluate(
    context.expression === owner
      ? context
      : context.child(owner, 'frontier', contextualType),
  );
}

function deriveMemberOwnerTypeFromEvaluation(
  evaluation: CheckerExpressionTypeEvaluation,
  missingInputs: string[],
): DerivedMemberOwnerType {
  if (evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type) {
    return {
      productHandle: evaluation.typeReference.productHandle,
      openSubject: null,
      sourceAddressHandle: evaluation.sourceAddressHandle,
    };
  }

  missingInputs.push(`expression-member-owner-type:${evaluation.openKind}`);
  return {
    productHandle: null,
    openSubject: evaluation.subject,
    sourceAddressHandle: evaluation.subject?.sourceAddressHandle ?? null,
  };
}

function missingDerivedMemberOwnerType(): DerivedMemberOwnerType {
  return {
    productHandle: null,
    openSubject: null,
    sourceAddressHandle: null,
  };
}

function expressionCompletionFrontier(
  result: ExpressionParseResult,
): TemplateExpressionCompletionFrontier | null {
  switch (result.kind) {
    case ExpressionParseResultKind.PropertyLikeDegradedPublication:
    case ExpressionParseResultKind.PropertyLikeFrontierPublication:
    case ExpressionParseResultKind.IteratorDegradedPublication:
    case ExpressionParseResultKind.IteratorFrontierPublication:
      return new TemplateExpressionCompletionFrontier(
        result.frontierKind,
        result.expectedContinuationClasses,
      );
    case ExpressionParseResultKind.InterpolationDegradedPublication:
    case ExpressionParseResultKind.InterpolationFrontierPublication:
      return new TemplateExpressionCompletionFrontier(
        result.activeHole.frontierKind,
        result.activeHole.expectedContinuationClasses,
      );
    case ExpressionParseResultKind.ExpressionSuccess:
    case ExpressionParseResultKind.EmptyExpressionSuccess:
    case ExpressionParseResultKind.IteratorSuccess:
    case ExpressionParseResultKind.InterpolationSuccess:
    case ExpressionParseResultKind.InterpolationAbsent:
    case ExpressionParseResultKind.OpaqueSuccess:
    case ExpressionParseResultKind.CompleteInputParseError:
      return null;
  }
}

function shouldOfferBindingScopeCandidates(
  siteKind: TemplateCompletionSiteKind,
  frontier: TemplateExpressionCompletionFrontier | null,
): boolean {
  switch (siteKind) {
    case TemplateCompletionSiteKind.Expression:
      return frontier == null
        || frontier.expectedContinuationClasses.length === 0
        || frontierOnlyExpectsInterpolationHoleClose(frontier)
        || frontier.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.Expression)
        || frontier.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.BindingDeclaration);
    default:
      return false;
  }
}

function shouldReadResourceScope(
  siteKind: TemplateCompletionSiteKind,
  frontier: TemplateExpressionCompletionFrontier | null,
): boolean {
  switch (siteKind) {
    case TemplateCompletionSiteKind.ElementName:
    case TemplateCompletionSiteKind.AttributeName:
    case TemplateCompletionSiteKind.BindingCommandName:
    case TemplateCompletionSiteKind.ExpressionValueConverter:
    case TemplateCompletionSiteKind.ExpressionBindingBehavior:
      return true;
    case TemplateCompletionSiteKind.Expression:
      return frontier?.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.ValueConverterName) === true
        || frontier?.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.BindingBehaviorName) === true;
    default:
      return false;
  }
}

function shouldOfferBindableCandidates(siteKind: TemplateCompletionSiteKind): boolean {
  return siteKind === TemplateCompletionSiteKind.AttributeName;
}

function resourceScopeCandidates(
  scope: TemplateResourceScope,
  siteKind: TemplateCompletionSiteKind,
  frontier: TemplateExpressionCompletionFrontier | null,
): readonly TemplateCompletionCandidate[] {
  const candidates: TemplateCompletionCandidate[] = [];
  for (const resource of [...scope.resources, ...scope.syntaxResources]) {
    const candidateKind = candidateKindForResource(resource, siteKind, frontier);
    if (candidateKind == null) {
      continue;
    }
    candidates.push(visibleResourceCandidate(resource, candidateKind));
  }
  return candidates;
}

function candidateKindForResource(
  resource: TemplateVisibleResource,
  siteKind: TemplateCompletionSiteKind,
  frontier: TemplateExpressionCompletionFrontier | null,
): TemplateCompletionCandidateKind | null {
  switch (resource.resourceKind) {
    case ResourceDefinitionKind.CustomElement:
      return siteKind === TemplateCompletionSiteKind.ElementName
        ? TemplateCompletionCandidateKind.CustomElement
        : null;
    case ResourceDefinitionKind.CustomAttribute:
      return siteKind === TemplateCompletionSiteKind.AttributeName
        ? TemplateCompletionCandidateKind.CustomAttribute
        : null;
    case ResourceDefinitionKind.TemplateController:
      return siteKind === TemplateCompletionSiteKind.AttributeName
        ? TemplateCompletionCandidateKind.TemplateController
        : null;
    case ResourceDefinitionKind.ValueConverter:
      return shouldOfferValueConverter(siteKind, frontier)
        ? TemplateCompletionCandidateKind.ValueConverter
        : null;
    case ResourceDefinitionKind.BindingBehavior:
      return shouldOfferBindingBehavior(siteKind, frontier)
        ? TemplateCompletionCandidateKind.BindingBehavior
        : null;
    case ResourceDefinitionKind.BindingCommand:
      // Binding commands are suffix syntax (`attr.bind`), authorable only after the dot; offering
      // them as standalone attribute names would complete markup the user cannot legally write.
      return siteKind === TemplateCompletionSiteKind.BindingCommandName
        ? TemplateCompletionCandidateKind.BindingCommand
        : null;
    case ResourceDefinitionKind.AttributePattern:
      // Attribute patterns are meta-resources that shape the attribute grammar; their resource name
      // is a registration class name (DotSeparatedAttributePattern, ...), never authorable markup.
      return null;
  }
}

function shouldOfferValueConverter(
  siteKind: TemplateCompletionSiteKind,
  frontier: TemplateExpressionCompletionFrontier | null,
): boolean {
  return siteKind === TemplateCompletionSiteKind.ExpressionValueConverter
    || (siteKind === TemplateCompletionSiteKind.Expression
      && frontier?.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.ValueConverterName) === true);
}

function shouldOfferBindingBehavior(
  siteKind: TemplateCompletionSiteKind,
  frontier: TemplateExpressionCompletionFrontier | null,
): boolean {
  return siteKind === TemplateCompletionSiteKind.ExpressionBindingBehavior
    || (siteKind === TemplateCompletionSiteKind.Expression
      && frontier?.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.BindingBehaviorName) === true);
}

function visibleResourceCandidate(
  resource: TemplateVisibleResource,
  candidateKind: TemplateCompletionCandidateKind,
): TemplateCompletionCandidate {
  return new TemplateCompletionCandidate(
    candidateKind,
    resource.name,
    TemplateCompletionCandidateSourceKind.ResourceScope,
    resource.resourceProductHandle ?? resource.definitionProductHandle,
    resource.resourceIdentityHandle,
    resource.sourceAddressHandle,
    `Visible ${resource.resourceKind} from compiler resource scope.`,
  );
}

function bindableCandidates(
  definition: FullResourceDefinition,
): readonly TemplateCompletionCandidate[] {
  if (!('bindables' in definition)) {
    return [];
  }
  return definition.bindables.map((bindable) => new TemplateCompletionCandidate(
    TemplateCompletionCandidateKind.BindableAttribute,
    bindable.attribute,
    TemplateCompletionCandidateSourceKind.ResourceDefinition,
    definition.productHandle,
    definition.identityHandle,
    bindable.sourceAddressHandle ?? definition.sourceAddressHandle,
    `Bindable attribute for ${definition.type}.`,
  ));
}

function typeMemberCandidates(
  frame: TemplateCompletionAnswerFrame,
  members: readonly CheckerTypeMember[],
): readonly TemplateCompletionCandidate[] {
  return members.map((member) => new TemplateCompletionCandidate(
    TemplateCompletionCandidateKind.TypeMember,
    member.name,
    TemplateCompletionCandidateSourceKind.TypeSystem,
    member.productHandle,
    checkerTypeMemberReachableIdentityHandle(member),
    checkerTypeMemberSourceAddressHandle(frame.store, member),
    `Member visible on checker-projected type.`,
    member.valueType,
    typeMemberFacts(frame, member),
  ));
}

function typeMemberFacts(
  frame: TemplateCompletionAnswerFrame,
  member: CheckerTypeMember,
  scope: BindingScope | null = frameworkOwnerScopeForMemberExpression(frame, member),
): TemplateCompletionTypeMemberFacts {
  return new TemplateCompletionTypeMemberFacts(
    member.memberKind,
    checkerTypeMemberVisibilityKind(member),
    member.isOptional,
    member.isReadonly,
    aureliaHookKindForMember(frame, member, scope),
  );
}

function aureliaHookKindForMember(
  frame: TemplateCompletionAnswerFrame,
  member: CheckerTypeMember,
  ownerScope: BindingScope | null,
): TemplateCompletionAureliaHookKind | null {
  if (
    ownerScope?.ownerKind !== BindingScopeOwnerKind.CustomElementController
    || ownerScope.bindingContext.contextKind !== BindingContextKind.ViewModel
    || !checkerTypeMemberIsCallable(member)
  ) {
    return null;
  }

  const routerHookKind = routerViewModelHookKindForName(member.name);
  if (routerHookKind != null) {
    const basisProductHandle = routerViewModelBasisProductHandle(frame, ownerScope);
    if (basisProductHandle != null) {
      frame.frameworkHookBasisProductHandles.push(basisProductHandle);
      return routerHookKind === RouterViewModelHookKind.Configuration
        ? TemplateCompletionAureliaHookKind.RouterConfiguration
        : TemplateCompletionAureliaHookKind.RouterLifecycle;
    }
  }

  if (componentLifecycleHookName(member.name) != null) {
    const basisProductHandle = ownerScope.bindingContext.ownerProductHandle;
    if (basisProductHandle != null) {
      frame.frameworkHookBasisProductHandles.push(basisProductHandle);
    }
    return TemplateCompletionAureliaHookKind.ComponentLifecycle;
  }
  return null;
}

function frameworkOwnerScopeForMemberExpression(
  frame: TemplateCompletionAnswerFrame,
  member: CheckerTypeMember,
): BindingScope | null {
  const offset = frame.query.locus.kind === InquiryLocusKind.SourceCursor
    ? frame.query.locus.cursor.offset
    : null;
  if (frame.bindingScope == null || frame.expressionResult == null || offset == null) {
    return null;
  }
  const owner = ExpressionParseResultInspector.memberOwnerAtOffset(frame.expressionResult, offset);
  const ownerScope = directBindingContextScopeForExpression(frame.bindingScope, owner);
  return ownerScope?.bindingContext.contextType != null
    && sameCheckerTypeReference(ownerScope.bindingContext.contextType, member.ownerType)
    ? ownerScope
    : null;
}

function directBindingContextScopeForExpression(
  scope: BindingScope,
  expression: ExpressionAstNode | null,
): BindingScope | null {
  switch (expression?.$kind) {
    case 'AccessThis':
      return scope.locateThis(expression.ancestor).scope;
    case 'AccessBoundary':
      return scope.locateBoundary();
    default:
      return null;
  }
}

function routerViewModelBasisProductHandle(
  frame: TemplateCompletionAnswerFrame,
  scope: BindingScope,
): ProductHandle | null {
  const routeConfig = routeConfigForScopeDefinition(frame.store, scope, frame.query.routeConfigProductHandles);
  if (routeConfig != null) {
    return routeConfig.productHandle;
  }
  const contextType = scope.bindingContext.contextType;
  const typeShape = contextType?.productHandle == null
    ? null
    : frame.store.productDetails.read(TypeSystemProductDetails.TypeShape, contextType.productHandle);
  return checkerTypeDeclaresRouteViewModel(typeShape)
    ? contextType?.productHandle ?? null
    : null;
}

function routeConfigForScopeDefinition(
  store: KernelStore,
  scope: BindingScope,
  routeConfigProductHandles: readonly ProductHandle[],
): RouteConfigModel | null {
  const controllerProductHandle = scope.bindingContext.ownerProductHandle;
  const controller = controllerProductHandle == null
    ? null
    : store.productDetails.read(ConfigurationProductDetails.Controller, controllerProductHandle);
  const definitionProductHandle = controller != null && 'definitionProductHandle' in controller
    ? controller.definitionProductHandle
    : null;
  const definition = definitionProductHandle == null
    ? null
    : store.productDetails.read(ResourceProductDetails.Definition, definitionProductHandle);
  if (definition?.type !== ResourceDefinitionKind.CustomElement) {
    return null;
  }
  return routeConfigProductHandles
    .map((productHandle) => store.productDetails.read(RouterProductDetails.RouteConfig, productHandle))
    .find((routeConfig): routeConfig is RouteConfigModel =>
      routeConfig != null
      && (
        routeConfig.component?.resolvedIdentityHandle === definition.target.identityHandle
        || routeConfig.component?.resolvedProductHandle === definition.productHandle
      )
    ) ?? null;
}

function scopeCandidates(
  frame: TemplateCompletionAnswerFrame,
  scope: BindingScope,
): readonly TemplateCompletionCandidate[] {
  const candidates: TemplateCompletionCandidate[] = [];
  let current: BindingScope | null = scope;
  let depth = 0;

  while (current != null) {
    for (const slot of current.overrideContext.slots) {
      candidates.push(scopeSlotCandidate(frame, slot, current, depth, BindingContextKind.Override));
    }
    for (const slot of current.bindingContext.slots) {
      candidates.push(scopeSlotCandidate(frame, slot, current, depth, current.bindingContext.contextKind));
    }
    if (current.isBoundary) {
      break;
    }
    current = current.runtimeParent;
    depth++;
  }

  if (scope.runtimeParent != null) {
    candidates.push(new TemplateCompletionCandidate(
      TemplateCompletionCandidateKind.ScopeKeyword,
      '$parent',
      TemplateCompletionCandidateSourceKind.BindingScope,
      scope.runtimeParent.productHandle,
      scope.runtimeParent.identityHandle,
      scope.runtimeParent.sourceAddressHandle,
      'Runtime scope parent traversal keyword.',
    ));
  }

  return candidates;
}

function scopeSlotCandidate(
  frame: TemplateCompletionAnswerFrame,
  slot: BindingContextSlot,
  scope: BindingScope,
  depth: number,
  contextKind: BindingContextKind,
): TemplateCompletionCandidate {
  const typeMemberFacts = typeMemberFactsForSlot(frame, slot, scope, contextKind);
  return new TemplateCompletionCandidate(
    contextKind === BindingContextKind.Override
      ? TemplateCompletionCandidateKind.OverrideContextSlot
      : TemplateCompletionCandidateKind.BindingContextSlot,
    slot.name,
    TemplateCompletionCandidateSourceKind.BindingScope,
    slot.targetProductHandle ?? scope.productHandle,
    slot.targetIdentityHandle ?? scope.identityHandle,
    slot.sourceAddressHandle ?? scope.sourceAddressHandle,
    depth === 0
      ? `Name visible in current ${contextKind}.`
      : `Name visible from ancestor ${depth} ${contextKind}.`,
    slot.targetType,
    typeMemberFacts,
  );
}

function typeMemberFactsForSlot(
  frame: TemplateCompletionAnswerFrame,
  slot: BindingContextSlot,
  scope: BindingScope,
  contextKind: BindingContextKind,
): TemplateCompletionTypeMemberFacts | null {
  const member = slot.targetProductHandle == null
    ? null
    : frame.store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle);
  return member == null
    ? null
    : typeMemberFacts(
      frame,
      member,
      contextKind === BindingContextKind.ViewModel && slot.name === member.name ? scope : null,
    );
}

function uniqueCandidatesByKey(
  candidates: readonly TemplateCompletionCandidate[],
): readonly TemplateCompletionCandidate[] {
  const seenNames = new Set<string>();
  const uniqueRows: TemplateCompletionCandidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.candidateKind}:${candidate.name}`;
    if (seenNames.has(key)) {
      continue;
    }
    seenNames.add(key);
    uniqueRows.push(candidate);
  }
  return sortCandidates(uniqueRows);
}

function sortCandidates(
  candidates: readonly TemplateCompletionCandidate[],
): readonly TemplateCompletionCandidate[] {
  return [...candidates].sort((left, right) =>
    left.name.localeCompare(right.name)
    || left.candidateKind.localeCompare(right.candidateKind)
    || left.key.localeCompare(right.key)
  );
}

function pageCandidates(
  candidates: readonly TemplateCompletionCandidate[],
  request: InquiryPageRequest,
): {
  readonly rows: readonly TemplateCompletionCandidate[];
  readonly info: InquiryPageInfo;
} {
  const requestedSize = Math.max(1, request.size);
  const size = clampPublicInquiryPageSize(requestedSize, 1);
  const start = request.cursor == null
    ? 0
    : Math.max(0, candidates.findIndex((candidate) => candidate.key === request.cursor) + 1);
  const rows = candidates.slice(start, start + size);
  const nextCursor = start + size < candidates.length
    ? rows[rows.length - 1]?.key ?? null
    : null;
  return {
    rows,
    info: new InquiryPageInfo(
      size,
      request.cursor,
      nextCursor,
      rows.length,
      candidates.length,
      requestedSize === size ? null : requestedSize,
      requestedSize === size ? null : PUBLIC_INQUIRY_MAX_PAGE_SIZE,
      requestedSize !== size,
    ),
  };
}

function outcomeForCompletion(
  pageRows: readonly TemplateCompletionCandidate[],
  allRows: readonly TemplateCompletionCandidate[],
  missingInputs: readonly string[],
  expressionFrontier: TemplateExpressionCompletionFrontier | null,
): InquiryOutcomeKind {
  if (pageRows.length > 0) {
    return missingInputs.length === 0 ? InquiryOutcomeKind.Hit : InquiryOutcomeKind.Partial;
  }
  if (allRows.length > 0) {
    return InquiryOutcomeKind.Hit;
  }
  return missingInputs.length === 0 && !frontierContributesPartialAnswer(expressionFrontier)
    ? InquiryOutcomeKind.Miss
    : InquiryOutcomeKind.Partial;
}

function summaryForCompletion(
  pageCount: number,
  totalCount: number,
  missingInputs: readonly string[],
  expressionFrontier: TemplateExpressionCompletionFrontier | null,
): string {
  const base = totalCount === 0
    ? 'No completion candidates were available from the supplied product details.'
    : `Returned ${pageCount} of ${totalCount} completion candidates.`;
  const notes = [
    missingInputs.length === 0 ? null : `Missing inputs: ${missingInputs.join(', ')}.`,
    expectedContinuationSummary(expressionFrontier),
  ].filter((note): note is string => note != null);
  return notes.length === 0
    ? base
    : `${base} ${notes.join(' ')}`;
}

function frontierContributesPartialAnswer(
  frontier: TemplateExpressionCompletionFrontier | null,
): boolean {
  return frontier != null
    && frontier.expectedContinuationClasses.length > 0
    && !frontierOnlyExpectsInterpolationHoleClose(frontier);
}

function expectedContinuationSummary(
  frontier: TemplateExpressionCompletionFrontier | null,
): string | null {
  if (frontier == null || frontier.expectedContinuationClasses.length === 0) {
    return null;
  }
  return `Expected continuation classes: ${frontier.expectedContinuationClasses.join(', ')}.`;
}

function frontierOnlyExpectsInterpolationHoleClose(
  frontier: TemplateExpressionCompletionFrontier,
): boolean {
  return frontier.expectedContinuationClasses.length === 1
    && frontier.expectedContinuationClasses[0] === ExpressionExpectedContinuationClass.InterpolationHoleClose;
}

function sourceSpanFor(
  store: KernelStore,
  addressHandle: AddressHandle | null,
): SourceSpanAddress | null {
  if (addressHandle == null) {
    return null;
  }
  const address = store.readAddress(addressHandle);
  return address instanceof SourceSpanAddress ? address : null;
}

function cursorTouchesSpan(
  span: SourceSpanAddress | null,
  offset: number,
): boolean {
  // Source spans are half-open for text ranges, but completion cursors also belong to the end insertion point.
  return span != null && span.start <= offset && offset <= span.end;
}

function spanLength(span: SourceSpanAddress): number {
  return span.end - span.start;
}

function smallestContaining<TValue>(
  values: readonly TValue[],
  offset: number,
  readSpan: (value: TValue) => SourceSpanAddress | null,
): TValue | null {
  let best: {
    readonly value: TValue;
    readonly span: SourceSpanAddress;
    readonly ownsCharacter: boolean;
  } | null = null;
  for (const value of values) {
    const span = readSpan(value);
    if (!cursorTouchesSpan(span, offset) || span == null) {
      continue;
    }
    const ownsCharacter = span.start <= offset && offset < span.end;
    if (
      best == null
      || (ownsCharacter && !best.ownsCharacter)
      || (ownsCharacter === best.ownsCharacter && spanLength(span) < spanLength(best.span))
    ) {
      best = { value, span, ownsCharacter };
    }
  }
  return best?.value ?? null;
}

function syntaxForAttribute(
  syntaxes: readonly AttributeSyntax[],
  attribute: HtmlAttribute,
): AttributeSyntax | null {
  return syntaxes.find((syntax) => syntax.attribute.productHandle === attribute.productHandle) ?? null;
}

function classificationForSyntax(
  classifications: readonly AttributeClassification[],
  syntax: AttributeSyntax,
): AttributeClassification | null {
  return classifications.find((classification) => classification.syntaxProductHandle === syntax.productHandle) ?? null;
}

function elementForCursorContext(
  nodes: readonly HtmlIrNode[],
  activeNode: HtmlIrNode | null,
  classification: AttributeClassification | null,
): HtmlElement | null {
  if (activeNode instanceof HtmlElement) {
    return activeNode;
  }
  const ownerProductHandle = classification?.ownerNode.productHandle ?? null;
  if (ownerProductHandle == null) {
    return null;
  }
  const owner = nodes.find((node) => node.productHandle === ownerProductHandle) ?? null;
  return owner instanceof HtmlElement ? owner : null;
}

function classifyTemplateCompletionSite(
  store: KernelStore,
  offset: number,
  templateMarkup: string | null,
  templateSourceAddressHandle: AddressHandle | null,
  templateSourceMap: TemplateSource['sourceMap'],
  htmlNode: HtmlIrNode | null,
  activeElement: HtmlElement | null,
  htmlAttribute: HtmlAttribute | null,
  syntax: AttributeSyntax | null,
  valueSite: TemplateValueSite | null,
  expressionResult: ExpressionParseResult | null,
): TemplateCompletionSiteKind {
  if (isBindingCommandNameOffset(store, offset, syntax)) {
    return TemplateCompletionSiteKind.BindingCommandName;
  }

  if (valueSite != null && expressionResult != null) {
    if (!valueSiteOwnsExpressionOffset(store, valueSite, expressionResult, offset)) {
      return valueSite.attribute == null
        ? TemplateCompletionSiteKind.Unknown
        : TemplateCompletionSiteKind.AttributeValue;
    }
    return completionSiteForExpressionOffset(expressionResult, offset);
  }

  if (cursorTouchesSpan(sourceSpanFor(store, syntax?.nameSourceAddressHandle ?? null), offset)) {
    return TemplateCompletionSiteKind.AttributeName;
  }
  if (htmlAttribute != null && cursorTouchesSpan(sourceSpanFor(store, htmlAttribute.nameAddressHandle), offset)) {
    return TemplateCompletionSiteKind.AttributeName;
  }

  if (valueSite != null) {
    return TemplateCompletionSiteKind.AttributeValue;
  }

  if (htmlAttribute != null) {
    if (cursorTouchesSpan(sourceSpanFor(store, htmlAttribute.valueAddressHandle), offset)) {
      if (expressionResult == null) {
        return TemplateCompletionSiteKind.AttributeValue;
      }
      return completionSiteForExpressionOffset(expressionResult, offset);
    }
  }

  if (activeElement != null && isElementNameOffset(store, offset, activeElement)) {
    return TemplateCompletionSiteKind.ElementName;
  }

  if (activeElement != null && isElementStartTagAttributeOffset(store, offset, activeElement, templateMarkup, templateSourceAddressHandle, templateSourceMap)) {
    return TemplateCompletionSiteKind.AttributeName;
  }

  if (htmlNode != null) {
    return TemplateCompletionSiteKind.Unknown;
  }
  return TemplateCompletionSiteKind.Unknown;
}

function siteKindUsesExpressionParse(siteKind: TemplateCompletionSiteKind): boolean {
  switch (siteKind) {
    case TemplateCompletionSiteKind.Expression:
    case TemplateCompletionSiteKind.ExpressionMember:
    case TemplateCompletionSiteKind.ExpressionValueConverter:
    case TemplateCompletionSiteKind.ExpressionBindingBehavior:
      return true;
    default:
      return false;
  }
}

function valueSiteOwnsExpressionOffset(
  store: KernelStore,
  site: TemplateValueSite,
  result: ExpressionParseResult,
  offset: number,
): boolean {
  if (site.entryFamily !== 'Interpolation') {
    return cursorTouchesSpan(sourceSpanFor(store, site.sourceAddressHandle), offset);
  }

  switch (result.kind) {
    case ExpressionParseResultKind.InterpolationAbsent:
      return false;
    case ExpressionParseResultKind.InterpolationSuccess:
      return result.ast.expressions.some((expression) => expressionSpanContainsOffset(expression.span, offset));
    case ExpressionParseResultKind.InterpolationDegradedPublication:
    case ExpressionParseResultKind.InterpolationFrontierPublication:
      return interpolationActiveHoleContainsOffset(result.activeHole, offset)
        || result.closedHoles.some((hole) => expressionSpanContainsOffset(hole.span, offset));
    case ExpressionParseResultKind.CompleteInputParseError:
      return result.primarySpan != null && expressionSpanContainsOffset(result.primarySpan, offset);
    default:
      return cursorTouchesSpan(sourceSpanFor(store, site.sourceAddressHandle), offset);
  }
}

function interpolationActiveHoleContainsOffset(
  activeHole: InterpolationActiveHoleCompanion,
  offset: number,
): boolean {
  if (expressionSpanContainsOffset(activeHole.holeSpan, offset)) {
    return true;
  }

  const openSpan = activeHole.boundaryState.openSpan;
  const closeSpan = activeHole.boundaryState.closeSpan;
  const start = openSpan?.start ?? activeHole.holeSpan.start;
  const end = closeSpan?.end ?? activeHole.holeSpan.end;
  return start <= offset && offset <= end;
}

function completionSiteForExpressionResult(
  expressionResult: ExpressionParseResult,
): TemplateCompletionSiteKind {
  const frontier = expressionCompletionFrontier(expressionResult);
  if (frontier?.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.MemberName) === true) {
    return TemplateCompletionSiteKind.ExpressionMember;
  }
  if (frontier?.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.ValueConverterName) === true) {
    return TemplateCompletionSiteKind.ExpressionValueConverter;
  }
  if (frontier?.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.BindingBehaviorName) === true) {
    return TemplateCompletionSiteKind.ExpressionBindingBehavior;
  }
  return TemplateCompletionSiteKind.Expression;
}

function completionSiteForExpressionOffset(
  expressionResult: ExpressionParseResult,
  offset: number,
): TemplateCompletionSiteKind {
  if (ExpressionParseResultInspector.memberOwnerAtOffset(expressionResult, offset) != null) {
    return TemplateCompletionSiteKind.ExpressionMember;
  }
  const scopeAccess = ExpressionParseResultInspector.scopeAccessAtOffset(expressionResult, offset);
  if (scopeAccess?.authoredScopePath != null) {
    return TemplateCompletionSiteKind.ExpressionMember;
  }
  return expressionTailCompletionSiteForOffset(expressionResult, offset)
    ?? completionSiteForExpressionResult(expressionResult);
}

function expressionTailCompletionSiteForOffset(
  result: ExpressionParseResult,
  offset: number,
): TemplateCompletionSiteKind | null {
  if (ExpressionParseResultInspector.hasCanonicalAst(result)) {
    return expressionTailCompletionSiteForNodeOffset(result.ast, offset);
  }
  switch (result.kind) {
    case ExpressionParseResultKind.InterpolationDegradedPublication:
    case ExpressionParseResultKind.InterpolationFrontierPublication:
      return expressionTailCompletionSiteForNodeRefs(result.activeHole.closedSubtreeRefs, offset);
    case ExpressionParseResultKind.PropertyLikeDegradedPublication:
    case ExpressionParseResultKind.PropertyLikeFrontierPublication:
      return expressionTailCompletionSiteForNodeRefs(result.closedSubtreeRefs, offset);
    case ExpressionParseResultKind.InterpolationAbsent:
    case ExpressionParseResultKind.CompleteInputParseError:
    case ExpressionParseResultKind.IteratorDegradedPublication:
    case ExpressionParseResultKind.IteratorFrontierPublication:
      return null;
  }
}

function expressionTailCompletionSiteForNodeRefs(
  refs: readonly { readonly node: ExpressionAstNode }[],
  offset: number,
): TemplateCompletionSiteKind | null {
  for (const ref of refs) {
    const site = expressionTailCompletionSiteForNodeOffset(ref.node, offset);
    if (site != null) {
      return site;
    }
  }
  return null;
}

function expressionTailCompletionSiteForNodeOffset(
  expression: ExpressionAstNode,
  offset: number,
  seen: Set<object> = new Set(),
): TemplateCompletionSiteKind | null {
  if (seen.has(expression)) {
    return null;
  }
  seen.add(expression);

  if (expression.$kind === 'ValueConverter' && expressionSpanContainsOffset(expression.name.span, offset)) {
    return TemplateCompletionSiteKind.ExpressionValueConverter;
  }
  if (expression.$kind === 'BindingBehavior' && expressionSpanContainsOffset(expression.name.span, offset)) {
    return TemplateCompletionSiteKind.ExpressionBindingBehavior;
  }

  for (const child of Object.values(expression as unknown as Record<string, unknown>)) {
    const site = expressionTailCompletionSiteForChild(child, offset, seen);
    if (site != null) {
      return site;
    }
  }
  return null;
}

function expressionTailCompletionSiteForChild(
  child: unknown,
  offset: number,
  seen: Set<object>,
): TemplateCompletionSiteKind | null {
  if (Array.isArray(child)) {
    for (const item of child) {
      const site = expressionTailCompletionSiteForChild(item, offset, seen);
      if (site != null) {
        return site;
      }
    }
    return null;
  }
  if (child == null || typeof child !== 'object' || !('$kind' in child)) {
    return null;
  }
  return expressionTailCompletionSiteForNodeOffset(child as ExpressionAstNode, offset, seen);
}

function isElementNameOffset(
  store: KernelStore,
  offset: number,
  element: HtmlElement,
): boolean {
  const span = sourceSpanFor(store, element.sourceAddressHandle);
  if (span == null) {
    return false;
  }
  const start = span.start + 1;
  const end = start + element.tagName.length;
  return start <= offset && offset <= end;
}

function isElementStartTagAttributeOffset(
  store: KernelStore,
  offset: number,
  element: HtmlElement,
  templateMarkup: string | null,
  templateSourceAddressHandle: AddressHandle | null,
  templateSourceMap: TemplateSource['sourceMap'],
): boolean {
  if (templateMarkup == null || templateSourceAddressHandle == null) {
    return false;
  }
  const elementSpan = sourceSpanFor(store, element.sourceAddressHandle);
  const templateSpan = sourceSpanFor(store, templateSourceAddressHandle);
  if (elementSpan == null || templateSpan == null) {
    return false;
  }

  const elementStart = sourceOffsetToTemplateOffset(elementSpan.start, templateSpan.start, templateSourceMap);
  const localOffset = sourceOffsetToTemplateOffset(offset, templateSpan.start, templateSourceMap);
  if (
    elementStart == null
    || localOffset == null
    || elementStart < 0
    || localOffset < elementStart
    || elementStart >= templateMarkup.length
    || templateMarkup[elementStart] !== '<'
  ) {
    return false;
  }

  const startTagEnd = findStartTagEnd(templateMarkup, elementStart);
  if (startTagEnd == null || localOffset > startTagEnd) {
    return false;
  }

  const tagNameEnd = elementStart + 1 + element.tagName.length;
  return tagNameEnd <= localOffset && localOffset <= startTagEnd;
}

function sourceOffsetToTemplateOffset(
  sourceOffset: number,
  sourceStart: number,
  sourceMap: TemplateSource['sourceMap'],
): number | null {
  if (sourceMap == null) {
    return sourceOffset - sourceStart;
  }
  const offsets = sourceMap.decodedToSourceOffsets;
  if (offsets.length !== sourceMap.decodedLength + 1) {
    return null;
  }
  const first = offsets[0];
  const last = offsets[offsets.length - 1];
  if (first == null || last == null || sourceOffset < first || sourceOffset > last) {
    return null;
  }

  let candidate = 0;
  for (let index = 0; index < offsets.length; index++) {
    const boundary = offsets[index];
    if (boundary == null || boundary > sourceOffset) {
      break;
    }
    candidate = index;
    if (boundary === sourceOffset) {
      break;
    }
  }
  return Math.min(candidate, sourceMap.decodedLength);
}

function findStartTagEnd(
  markup: string,
  elementStart: number,
): number | null {
  let quote: '"' | "'" | null = null;
  for (let index = elementStart + 1; index < markup.length; index++) {
    const char = markup[index];
    if (quote != null) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '>') {
      return index;
    }
  }
  return null;
}

function isBindingCommandNameOffset(
  store: KernelStore,
  offset: number,
  syntax: AttributeSyntax | null,
): boolean {
  if (syntax?.command == null) {
    return false;
  }
  return cursorTouchesSpan(sourceSpanFor(store, syntax.commandSourceAddressHandle), offset);
}

function bindingScopeForCursor(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionWorld: CheckerExpressionTypeWorld,
  offset: number,
  expressionParse: TemplateExpressionParse | null,
): BindingScope | null {
  const instructionScope = expressionParse == null
    ? null
    : bindingSourceScopeForTemplateExpressionParse(store, resource, expressionWorld, expressionParse, offset)
      ?? bindingScopeForTemplateExpressionParse(resource, expressionParse);
  if (instructionScope != null) {
    return instructionScope;
  }

  return bestBindingScopeForOffset(store, resource, offset) ?? resource.runtimeAnalysis.scopes.rootScope;
}

function bestBindingScopeForOffset(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  offset: number,
): BindingScope | null {
  let best: { readonly scope: BindingScope; readonly span: SourceSpanAddress } | null = null;
  for (const scope of resource.runtimeAnalysis.scopes.readScopes()) {
    const span = sourceSpanFor(store, templateScopeRangeAddressHandle(resource, scope));
    if (!cursorTouchesSpan(span, offset) || span == null) {
      continue;
    }
    if (
      best == null
      || spanLength(span) < spanLength(best.span)
      || (spanLength(span) === spanLength(best.span) && scopeDepth(scope) > scopeDepth(best.scope))
    ) {
      best = { scope, span };
    }
  }
  return best?.scope ?? null;
}

function bindingSourceScopeForTemplateExpressionParse(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  expressionWorld: CheckerExpressionTypeWorld,
  expressionParse: TemplateExpressionParse,
  offset: number,
): BindingScope | null {
  return bindingSourceContextProjectionForTemplateExpressionParseAtOffset(
    store,
    resource,
    expressionWorld,
    expressionParse,
    offset,
  )?.scope ?? null;
}

function scopeDepth(scope: BindingScope): number {
  return templateScopeChain(scope).length - 1;
}

function selectedDefinitionForCursor(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  activeElement: HtmlElement | null,
  syntax: AttributeSyntax | null,
  classification: AttributeClassification | null,
  siteKind: TemplateCompletionSiteKind,
  expressionResult: ExpressionParseResult | null,
  offset: number,
  declarationBindable: TemplateBindableReference | null,
): TemplateDefinitionCursorSelection | null {
  if (
    siteKind === TemplateCompletionSiteKind.ExpressionValueConverter
    || siteKind === TemplateCompletionSiteKind.ExpressionBindingBehavior
  ) {
    return expressionResourceForCursor(resource, siteKind, expressionResult, offset);
  }
  if (siteKind === TemplateCompletionSiteKind.BindingCommandName && syntax?.command != null) {
    const command = findVisibleTemplateResource(
      resource.compilation.compilerWorld.resourceScope,
      ResourceDefinitionKind.BindingCommand,
      syntax.command.toLowerCase(),
    );
    if (command?.definitionProductHandle != null) {
      return { productHandle: command.definitionProductHandle, matchedName: syntax.command };
    }
  }
  const refTarget = namedRefTargetDefinitionForCursor(store, resource, offset);
  if (refTarget != null) {
    return refTarget;
  }
  const attributePattern = attributePatternDefinitionForCursor(store, syntax, offset);
  if (attributePattern != null) {
    return attributePattern;
  }
  const dynamicAttribute = dynamicAttributeDefinitionForCursor(store, resource, syntax, offset);
  if (dynamicAttribute != null) {
    return dynamicAttribute;
  }
  const elementSelection = definitionForElement(store, resource, activeElement);
  const classifiedProductHandle = classification?.bindable?.reference.ownerDefinitionProductHandle
    ?? classification?.resource?.definitionProductHandle
    ?? null;
  if (
    classifiedProductHandle != null
    && classificationSelectsAuthoredResource(classification)
  ) {
    const matchedName = classification?.resource?.definitionProductHandle === classifiedProductHandle
      ? classification.resource.resourceKind === ResourceDefinitionKind.CustomElement
        ? elementSelection?.matchedName ?? classification.resource.name
        : syntax?.target ?? classification.resource.name
      : elementSelection?.productHandle === classifiedProductHandle
        ? elementSelection.matchedName
        : null;
    return { productHandle: classifiedProductHandle, matchedName };
  }
  return elementSelection ?? definitionForDeclarationCursor(store, resource, offset, declarationBindable);
}

function classificationSelectsAuthoredResource(
  classification: AttributeClassification | null,
): boolean {
  switch (classification?.classificationKind) {
    case AttributeClassificationKind.Bindable:
    case AttributeClassificationKind.BindingCommand:
    case AttributeClassificationKind.CustomAttribute:
    case AttributeClassificationKind.TemplateController:
      return true;
    default:
      return false;
  }
}

function dynamicAttributeDefinitionForCursor(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  syntax: AttributeSyntax | null,
  offset: number,
): TemplateDefinitionCursorSelection | null {
  if (
    syntax == null
    || !cursorTouchesSpan(sourceSpanFor(store, syntax.targetSourceAddressHandle), offset)
  ) {
    return null;
  }
  const instructions = resourceLocalDynamicTemplateInstructions(store, resource).filter((candidate): candidate is HydrateAttributeInstruction =>
    candidate instanceof HydrateAttributeInstruction
    && candidate.attribute.productHandle === syntax.attribute.productHandle
    && candidate.definitionProductHandle != null
  );
  const definitions = new Set(instructions.map((instruction) => instruction.definitionProductHandle));
  if (definitions.size !== 1) {
    return null;
  }
  const instruction = instructions[0]!;
  return { productHandle: instruction.definitionProductHandle!, matchedName: instruction.attributeName };
}

function namedRefTargetDefinitionForCursor(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  offset: number,
): TemplateDefinitionCursorSelection | null {
  for (const operation of resourceLocalBindingSourceOperations(store, resource)) {
    if (!cursorTouchesSpan(sourceSpanFor(store, operation.sourceAddressHandle), offset)) {
      continue;
    }
    const controller = namedRefTargetController(resource.runtimeAnalysis.runtimeRendering, operation);
    if (controller?.definitionProductHandle != null) {
      return {
        productHandle: controller.definitionProductHandle,
        matchedName: operation.targetName,
      };
    }
  }
  return null;
}

function attributePatternDefinitionForCursor(
  store: KernelStore,
  syntax: AttributeSyntax | null,
  offset: number,
): TemplateDefinitionCursorSelection | null {
  if (
    syntax?.compiledPatternProductHandle == null
    || !syntax.patternLiterals.some((literal) =>
      cursorTouchesSpan(sourceSpanFor(store, literal.sourceAddressHandle), offset)
    )
  ) {
    return null;
  }
  const compiledPattern = store.productDetails.read(
    TemplateProductDetails.CompiledAttributePattern,
    syntax.compiledPatternProductHandle,
  );
  const executable = compiledPattern?.executableProductHandle == null
    ? null
    : store.productDetails.read(
        TemplateProductDetails.AttributePatternExecutable,
        compiledPattern.executableProductHandle,
      );
  return executable?.definitionProductHandle == null
    ? null
    : {
        productHandle: executable.definitionProductHandle,
        matchedName: syntax.pattern?.pattern ?? executable.target?.localName ?? null,
      };
}

function definitionForDeclarationCursor(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  offset: number,
  declarationBindable: TemplateBindableReference | null,
): TemplateDefinitionCursorSelection | null {
  const definition = resource.compilation.definition;
  return definition.productHandle != null
    && (
      declarationBindable != null
      || cursorTouchesSpan(sourceSpanFor(store, definition.nameSourceAddressHandle), offset)
    )
    ? { productHandle: definition.productHandle, matchedName: definition.name }
    : null;
}

function expressionResourceForCursor(
  resource: TemplateResourceRuntimeAnalysisEmission,
  siteKind: TemplateCompletionSiteKind.ExpressionValueConverter | TemplateCompletionSiteKind.ExpressionBindingBehavior,
  expressionResult: ExpressionParseResult | null,
  offset: number,
): TemplateDefinitionCursorSelection | null {
  if (expressionResult == null || !ExpressionParseResultInspector.hasCanonicalAst(expressionResult)) {
    return null;
  }
  const resourceKind = siteKind === TemplateCompletionSiteKind.ExpressionValueConverter
    ? ResourceDefinitionKind.ValueConverter
    : ResourceDefinitionKind.BindingBehavior;
  const occurrence = expressionResourceOccurrences(expressionResult.ast).find((candidate) =>
    candidate.resourceKind === resourceKind
    && expressionSpanContainsOffset(candidate.expression.name.span, offset)
  ) ?? null;
  if (occurrence == null) {
    return null;
  }
  const visible = findVisibleTemplateResource(
    resource.compilation.compilerWorld.resourceScope,
    resourceKind,
    occurrence.expression.name.name,
  );
  const productHandle = visible?.definitionProductHandle
    ?? visible?.resourceProductHandle
    ?? null;
  return productHandle == null
    ? null
    : { productHandle, matchedName: occurrence.expression.name.name };
}

function selectedBindableForCursor(
  classification: AttributeClassification | null,
  valueSite: TemplateValueSite | null,
  multiBindingSegment: MultiBindingSegment | null,
): TemplateBindableReference | null {
  return multiBindingSegment?.bindable
    ?? valueSite?.bindable
    ?? classification?.bindable
    ?? null;
}

function selectedBindableForDeclarationCursor(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  offset: number,
): TemplateBindableReference | null {
  const definition = resource.compilation.definition;
  return templateBindableReferences(
    definition.productHandle,
    definition.sourceAddressHandle,
    definition.bindables,
    false,
  ).find((bindable) => [
    bindable.definition.nameSourceAddressHandle,
    bindable.definition.attributeSourceAddressHandle,
    bindable.definition.callbackSourceAddressHandle,
    bindable.definition.modeSourceAddressHandle,
    bindable.definition.setSourceAddressHandle,
  ].some((addressHandle) =>
    cursorTouchesSpan(sourceSpanFor(store, addressHandle), offset)
  )) ?? null;
}

function definitionForElement(
  store: KernelStore,
  resource: TemplateResourceRuntimeAnalysisEmission,
  activeElement: HtmlElement | null,
): TemplateDefinitionCursorSelection | null {
  if (activeElement == null) {
    return null;
  }
  const instruction = resourceLocalTemplateInstructions(store, resource).find((candidate) =>
    candidate instanceof HydrateElementInstruction
    && candidate.node.productHandle === activeElement.productHandle
  ) ?? null;
  return instruction instanceof HydrateElementInstruction && instruction.definitionProductHandle != null
      ? {
        productHandle: instruction.definitionProductHandle,
        matchedName: instruction.resourceLookupName,
      }
    : null;
}
