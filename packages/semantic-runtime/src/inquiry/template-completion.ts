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
} from '../expression/parse-result-inspection.js';
import { expressionSpanContainsOffset } from '../expression/source-span.js';
import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';
import { SourceSpanAddress } from '../kernel/address.js';
import type { MaterializedProduct } from '../kernel/materialization.js';
import type { KernelStore } from '../kernel/store.js';
import { ResourceProductDetails } from '../resources/product-details.js';
import type { FullResourceDefinition } from '../resources/resource-definition.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
import { ConfigurationProductDetails } from '../configuration/product-details.js';
import {
  BindingContextKind,
  BindingContextSlot,
  BindingScope,
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
} from '../type-system/type-shape.js';
import {
  checkerTypeMemberVisibilityKind,
} from '../type-system/checker-member-surface.js';
import { checkerTypeMemberSourceAddressHandle } from '../type-system/checker-type-member-source.js';
import { readOrProjectCheckerTypeMembers } from '../type-system/checker-type-member-surface.js';
import {
  RouteConfigKind,
  type RouteConfigModel,
} from '../router/model.js';
import { RouterProductDetails } from '../router/product-details.js';
import { I18nProductDetails } from '../i18n/product-details.js';
import type { I18nTranslationKey } from '../i18n/model.js';
import {
  TemplateResourceScope,
} from '../template/compiler-world.js';
import {
  TemplateVisibleResource,
  type TemplateBindableReference,
} from '../template/compiler-world-reference.js';
import type { TemplateResourceRuntimeAnalysisEmission } from '../template/template-compilation-project-pass.js';
import type {
  TemplateExpressionParse,
  TemplateValueSite,
} from '../template/value-site.js';
import { TemplateValueSiteKind } from '../template/value-site.js';
import type { TemplateSource } from '../template/compilation-unit.js';
import type { AttributeClassification, AttributeSyntax } from '../template/attribute-syntax.js';
import {
  HtmlAttribute,
  HtmlElement,
  type HtmlIrNode,
} from '../template/html-ir.js';
import {
  BuiltInTemplateControllerValueDomainKind,
  frameworkTemplateControllerSemanticsForName,
} from '../template/template-controller-semantics.js';
import {
  bindingSourceContextProjectionForTemplateExpressionParseAtOffset,
  bindingScopeForTemplateExpressionParse,
  templateExpressionParsesForResource,
  templateScopeRangeAddressHandle,
  templateValueSitesForResource,
} from '../template/template-expression-selection.js';
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
  /** Member name matches a custom-element/controller lifecycle hook such as attached or binding. */
  ComponentLifecycle = 'component-lifecycle',
  /** Member name matches a router viewport/component hook such as canLoad or load. */
  RouterLifecycle = 'router-lifecycle',
  /** Member name matches an app-task phase hook such as hydrating or activated. */
  AppTaskLifecycle = 'app-task-lifecycle',
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
    /** Aurelia hook category for known framework hook names, if this member name matches one. */
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
  /** Static i18n translation keys visible to the app/template context. */
  readonly i18nTranslationKeyProductHandles?: readonly ProductHandle[];
  /** Hot expression-evaluation world shared by broader cursor/file scans. */
  readonly expressionWorld?: CheckerExpressionTypeWorld;
}

export class TemplateCompletionCursorContext {
  constructor(
    /** Product-handle query ready for `answerTemplateCompletion`. */
    readonly query: TemplateCompletionQuery,
    /** HTML node under the cursor, when one could be selected. */
    readonly htmlNodeProductHandle: ProductHandle | null,
    /** HTML attribute under the cursor, when one could be selected. */
    readonly htmlAttributeProductHandle: ProductHandle | null,
    /** Value-site product under the cursor, when expression/value parsing owns the site. */
    readonly valueSiteProductHandle: ProductHandle | null,
    /** Bindable selected by the cursor's classification or active value site, when one exists. */
    readonly selectedBindable: TemplateBindableReference | null,
    /** Closed member token selected by the cursor, when the cursor is on an authored member name. */
    readonly selectedMemberName: string | null,
    /** Parser frontier under the cursor, when the cursor selected an expression parse. */
    readonly expressionFrontier: TemplateExpressionCompletionFrontier | null,
    /** Evaluator-owned subject for an open member-owner type, when narrower than the selected member token. */
    readonly memberOwnerTypeOpenSubject: CheckerExpressionTypeOpenSubject | null,
    /** Source route that produced the member-owner value type, when narrower than the reusable type product. */
    readonly memberOwnerTypeSourceAddressHandle: AddressHandle | null,
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
      ?? input.resource.runtimeAnalysis.expressionWorld
      ?? new CheckerExpressionTypeWorld(store);
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
        this.input.i18nTranslationKeyProductHandles ?? [],
      ),
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
    const valueSite = this.valueSiteForOffset(offset);
    const expressionParse = this.expressionParseForValueSite(valueSite);
    const expressionResult = expressionParse == null
      ? null
      : cursorFocusedExpressionResult(this.store, expressionParse, offset);
    const syntax = this.syntaxForCursorAttribute(htmlAttribute);
    const classification = this.classificationForCursorSyntax(syntax);
    const activeElement = elementForCursorContext(this.input.resource.compilation.html.nodes, htmlNode, classification);
    const siteKind = this.siteKindForCursor(offset, htmlNode, activeElement, htmlAttribute, syntax, valueSite, expressionResult);
    const bindingScope = bindingScopeForCursor(
      this.store,
      this.input.resource,
      this.expressionWorld,
      offset,
      expressionParse,
    );
    const selectedDefinitionProductHandle = selectedDefinitionForCursor(this.input.resource, activeElement, classification);
    const selectedBindable = selectedBindableForCursor(classification, valueSite);
    const missingInputs: string[] = [];
    const memberOwnerType = this.memberOwnerType(
      offset,
      siteKind,
      expressionParse,
      expressionResult,
      bindingScope,
      valueSite,
      missingInputs,
    );
    const selectedMemberName = selectedMemberNameForCursor(siteKind, expressionResult, offset);

    return new TemplateCompletionCursorContext(
      new TemplateCompletionQuery(
        this.input.locus,
        siteKind,
        this.page,
        bindingScope?.productHandle ?? null,
        this.input.resource.compilation.compilerWorld.resourceScope.productHandle,
        selectedDefinitionProductHandle,
        siteKindUsesExpressionParse(siteKind) ? expressionParse?.productHandle ?? null : null,
        memberOwnerType.productHandle,
        valueSite?.productHandle ?? null,
        this.projection,
        this.input.routeConfigProductHandles ?? [],
        this.input.i18nTranslationKeyProductHandles ?? [],
      ),
      htmlNode?.productHandle ?? null,
      htmlAttribute?.productHandle ?? null,
      valueSite?.productHandle ?? null,
      selectedBindable,
      selectedMemberName,
      expressionResult == null ? null : expressionCompletionFrontier(expressionResult),
      memberOwnerType.openSubject,
      memberOwnerType.sourceAddressHandle,
      uniqueValues(missingInputs),
    );
  }

  private htmlNodeForOffset(offset: number): HtmlIrNode | null {
    return smallestContaining(
      this.input.resource.compilation.html.nodes,
      offset,
      (node) => sourceSpanFor(this.store, node.sourceAddressHandle),
    );
  }

  private htmlAttributeForOffset(offset: number): HtmlAttribute | null {
    return smallestContaining(
      this.input.resource.compilation.html.attributes,
      offset,
      (attribute) => sourceSpanFor(this.store, attribute.sourceAddressHandle),
    );
  }

  private valueSiteForOffset(offset: number): TemplateValueSite | null {
    return smallestContaining(
      templateValueSitesForResource(this.input.resource),
      offset,
      (site) => sourceSpanFor(this.store, site.sourceAddressHandle),
    );
  }

  private expressionParseForValueSite(valueSite: TemplateValueSite | null): TemplateExpressionParse | null {
    return valueSite == null
      ? null
      : templateExpressionParsesForResource(this.input.resource)
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
    return siteKind === TemplateCompletionSiteKind.ExpressionMember
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
        valueSite == null ? null : bindableTypeMember(this.store, valueSite)?.valueType ?? null,
        this.expressionWorld,
        missingInputs,
      )
      : missingDerivedMemberOwnerType();
  }
}

function selectedMemberNameForCursor(
  siteKind: TemplateCompletionSiteKind,
  expressionResult: ExpressionParseResult | null,
  offset: number,
): string | null {
  return siteKind === TemplateCompletionSiteKind.ExpressionMember && expressionResult != null
    ? ExpressionParseResultInspector.memberNameAtOffset(expressionResult, offset)
    : null;
}

/** Answer template and expression completion candidates from already-materialized product details. */
export function answerTemplateCompletion(
  store: KernelStore,
  query: TemplateCompletionQuery,
): InquiryAnswer<TemplateCompletionResult, TemplateCompletionQuery> {
  const frame = createTemplateCompletionAnswerFrame(store, query);
  collectTemplateCompletionCandidates(frame);
  const uniqueCandidates = uniqueCandidatesByKey(frame.candidates);
  const page = pageCandidates(uniqueCandidates, query.page);
  return templateCompletionAnswer(frame, uniqueCandidates, page);
}

function createTemplateCompletionAnswerFrame(
  store: KernelStore,
  query: TemplateCompletionQuery,
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
  const needsBindingScope = shouldReadBindingScope(query.siteKind, expressionFrontier);
  const needsResourceScope = shouldReadResourceScope(query.siteKind, expressionFrontier);
  const bindingScope = needsBindingScope
    ? readBindingScope(store, query.bindingScopeProductHandle, missingInputs)
    : null;
  const resourceScope = needsResourceScope
    ? readResourceScope(store, query.resourceScopeProductHandle, missingInputs)
    : null;
  return {
    store,
    query,
    expressionWorld: new CheckerExpressionTypeWorld(store),
    missingInputs,
    candidates: [],
    expressionParse,
    expressionResult,
    expressionFrontier,
    bindingScope,
    resourceScope,
    memberOwnerTypeProductHandle: query.memberOwnerTypeProductHandle,
  };
}

function collectTemplateCompletionCandidates(
  frame: TemplateCompletionAnswerFrame,
): void {
  collectBindingScopeCandidates(frame);
  collectResourceScopeCandidates(frame);
  collectBindableCandidates(frame);
  collectExpressionMemberCandidates(frame);
  collectAttributeValueDomainCandidates(frame);
}

function collectBindingScopeCandidates(
  frame: TemplateCompletionAnswerFrame,
): void {
  if (!shouldReadBindingScope(frame.query.siteKind, frame.expressionFrontier) || frame.bindingScope == null) {
    return;
  }
  frame.candidates.push(...scopeCandidates(frame.store, frame.bindingScope));
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
  const members = readTypeMembers(frame.store, frame.memberOwnerTypeProductHandle, frame.missingInputs);
  if (members != null) {
    frame.candidates.push(...typeMemberCandidates(frame.store, members));
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
    site,
    frame.query.routeConfigProductHandles,
    frame.query.i18nTranslationKeyProductHandles,
  );
  if (candidates.length > 0) {
    frame.candidates.push(...candidates);
    return;
  }
  const reason = attributeValueCompletionMissingInput(frame.store, site);
  if (reason != null) {
    frame.missingInputs.push(reason);
  }
}

function templateCompletionAnswer(
  frame: TemplateCompletionAnswerFrame,
  uniqueCandidates: readonly TemplateCompletionCandidate[],
  page: TemplateCompletionCandidatePage,
): InquiryAnswer<TemplateCompletionResult, TemplateCompletionQuery> {
  const products = completionCandidateProducts(frame.store, page.rows);
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
): readonly MaterializedProduct[] {
  return uniqueValues(
    rows
      .map((candidate) => candidate.productHandle)
      .filter((handle): handle is ProductHandle => handle != null),
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
  const members = readOrProjectCheckerTypeMembers(store, detail, productHandle);
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
  site: TemplateValueSite,
): string | null {
  switch (site.siteKind) {
    case TemplateValueSiteKind.BindingCommandValue:
      if (i18nTranslationValueHasOpenEndedDomain(site)) {
        return null;
      }
      return `attribute-value-domain:binding-command:${site.bindingCommand?.name ?? 'unknown'}`;
    case TemplateValueSiteKind.BindableValue:
      if (bindableValueHasOpenEndedScalarDomain(store, site)) {
        return null;
      }
      return `attribute-value-domain:bindable:${site.bindable?.reference.attribute ?? 'unknown'}`;
    case TemplateValueSiteKind.CustomAttributeValue:
      if (routerResourcePrimaryValueHasOpenEndedDomain(site)) {
        return null;
      }
      if (site.bindable != null) {
        if (bindableValueHasOpenEndedScalarDomain(store, site)) {
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
  site: TemplateValueSite,
): boolean {
  const member = bindableTypeMember(store, site);
  const carrier = member?.carrier;
  return carrier?.valueType == null ? false : isOpenEndedScalarType(carrier.checker, carrier.valueType);
}

function attributeValueDomainCandidates(
  store: KernelStore,
  site: TemplateValueSite,
  routeConfigProductHandles: readonly ProductHandle[],
  i18nTranslationKeyProductHandles: readonly ProductHandle[],
): readonly TemplateCompletionCandidate[] {
  return [
    ...routerResourceRouteCandidates(store, site, routeConfigProductHandles),
    ...i18nTranslationKeyCandidates(store, site, i18nTranslationKeyProductHandles),
    ...inlineMultiBindingTargetCandidates(store, site),
    ...(site.bindable == null ? [] : bindableAttributeValueCandidates(store, site)),
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
  const values = [
    routeConfig.id,
    ...routeConfig.paths.filter((path) => path.length > 0),
  ].filter((value): value is string => value != null && value.length > 0);
  return uniqueValues(values).map((value) => new TemplateCompletionCandidate(
    TemplateCompletionCandidateKind.RouterRoute,
    value,
    TemplateCompletionCandidateSourceKind.Router,
    routeConfig.productHandle,
    routeConfig.identityHandle,
    routeConfig.id === value ? routeConfig.sourceAddressHandle : routeConfig.pathSourceAddressHandle ?? routeConfig.sourceAddressHandle,
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
  site: TemplateValueSite,
): readonly TemplateCompletionCandidate[] {
  const member = bindableTypeMember(store, site);
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
    : readOrProjectCheckerTypeMembers(store, targetType, targetTypeProductHandle);
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
  const evaluation = result != null && 'ast' in result
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
  if ('frontierKind' in result) {
    return new TemplateExpressionCompletionFrontier(
      result.frontierKind,
      result.expectedContinuationClasses,
    );
  }
  if ('activeHole' in result) {
    return new TemplateExpressionCompletionFrontier(
      result.activeHole.frontierKind,
      result.activeHole.expectedContinuationClasses,
    );
  }
  return null;
}

function shouldReadBindingScope(
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
      return siteKind === TemplateCompletionSiteKind.BindingCommandName
        || siteKind === TemplateCompletionSiteKind.AttributeName
        ? TemplateCompletionCandidateKind.BindingCommand
        : null;
    case ResourceDefinitionKind.AttributePattern:
      return siteKind === TemplateCompletionSiteKind.AttributeName
        ? TemplateCompletionCandidateKind.AttributePattern
        : null;
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
  store: KernelStore,
  members: readonly CheckerTypeMember[],
): readonly TemplateCompletionCandidate[] {
  return members.map((member) => new TemplateCompletionCandidate(
    TemplateCompletionCandidateKind.TypeMember,
    member.name,
    TemplateCompletionCandidateSourceKind.TypeSystem,
    member.productHandle,
    checkerTypeMemberReachableIdentityHandle(member),
    checkerTypeMemberSourceAddressHandle(store, member),
    `Member visible on checker-projected type.`,
    member.valueType,
    new TemplateCompletionTypeMemberFacts(
      member.memberKind,
      checkerTypeMemberVisibilityKind(member),
      member.isOptional,
      member.isReadonly,
      aureliaHookKindForMemberName(member.name),
    ),
  ));
}

function aureliaHookKindForMemberName(
  name: string,
): TemplateCompletionAureliaHookKind | null {
  if (COMPONENT_LIFECYCLE_HOOK_NAMES.has(name)) {
    return TemplateCompletionAureliaHookKind.ComponentLifecycle;
  }
  if (ROUTER_LIFECYCLE_HOOK_NAMES.has(name)) {
    return TemplateCompletionAureliaHookKind.RouterLifecycle;
  }
  if (APP_TASK_LIFECYCLE_HOOK_NAMES.has(name)) {
    return TemplateCompletionAureliaHookKind.AppTaskLifecycle;
  }
  return null;
}

const COMPONENT_LIFECYCLE_HOOK_NAMES = new Set([
  'created',
  'binding',
  'bound',
  'attaching',
  'attached',
  'detaching',
  'detached',
  'unbinding',
  'unbound',
  'dispose',
]);

const ROUTER_LIFECYCLE_HOOK_NAMES = new Set([
  'canLoad',
  'loading',
  'load',
  'canUnload',
  'unloading',
  'unload',
]);

const APP_TASK_LIFECYCLE_HOOK_NAMES = new Set([
  'creating',
  'hydrating',
  'hydrated',
  'activating',
  'activated',
  'deactivating',
  'deactivated',
]);

function scopeCandidates(
  store: KernelStore,
  scope: BindingScope,
): readonly TemplateCompletionCandidate[] {
  const candidates: TemplateCompletionCandidate[] = [];
  let current: BindingScope | null = scope;
  let depth = 0;

  while (current != null) {
    for (const slot of current.overrideContext.slots) {
      candidates.push(scopeSlotCandidate(store, slot, current, depth, BindingContextKind.Override));
    }
    for (const slot of current.bindingContext.slots) {
      candidates.push(scopeSlotCandidate(store, slot, current, depth, current.bindingContext.contextKind));
    }
    if (current.isBoundary) {
      break;
    }
    current = current.parent;
    depth++;
  }

  if (scope.parent != null) {
    candidates.push(new TemplateCompletionCandidate(
      TemplateCompletionCandidateKind.ScopeKeyword,
      '$parent',
      TemplateCompletionCandidateSourceKind.BindingScope,
      scope.parent.productHandle,
      scope.parent.identityHandle,
      scope.parent.sourceAddressHandle,
      'Runtime scope parent traversal keyword.',
    ));
  }

  return candidates;
}

function scopeSlotCandidate(
  store: KernelStore,
  slot: BindingContextSlot,
  scope: BindingScope,
  depth: number,
  contextKind: BindingContextKind,
): TemplateCompletionCandidate {
  const typeMemberFacts = typeMemberFactsForSlot(store, slot);
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
  store: KernelStore,
  slot: BindingContextSlot,
): TemplateCompletionTypeMemberFacts | null {
  const member = slot.targetProductHandle == null
    ? null
    : store.hotDetails.read(TypeSystemHotDetails.TypeMember, slot.targetProductHandle);
  return member == null
    ? null
    : new TemplateCompletionTypeMemberFacts(
      member.memberKind,
      checkerTypeMemberVisibilityKind(member),
      member.isOptional,
      member.isReadonly,
      aureliaHookKindForMemberName(member.name),
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
  let best: { readonly value: TValue; readonly span: SourceSpanAddress } | null = null;
  for (const value of values) {
    const span = readSpan(value);
    if (!cursorTouchesSpan(span, offset) || span == null) {
      continue;
    }
    if (best == null || spanLength(span) < spanLength(best.span)) {
      best = { value, span };
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
  if (htmlAttribute != null && cursorTouchesSpan(sourceSpanFor(store, htmlAttribute.nameAddressHandle), offset)) {
    return isBindingCommandNameOffset(store, offset, htmlAttribute, syntax)
      ? TemplateCompletionSiteKind.BindingCommandName
      : TemplateCompletionSiteKind.AttributeName;
  }

  if (valueSite != null) {
    if (expressionResult == null) {
      return TemplateCompletionSiteKind.AttributeValue;
    }
    if (!valueSiteOwnsExpressionOffset(store, valueSite, expressionResult, offset)) {
      return valueSite.attribute == null
        ? TemplateCompletionSiteKind.Unknown
        : TemplateCompletionSiteKind.AttributeValue;
    }
    return completionSiteForExpressionOffset(expressionResult, offset);
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
  if (frontier?.frontierKind === ExpressionFrontierKind.AwaitingMemberName) {
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
  return expressionTailCompletionSiteForOffset(expressionResult, offset)
    ?? completionSiteForExpressionResult(expressionResult);
}

function expressionTailCompletionSiteForOffset(
  result: ExpressionParseResult,
  offset: number,
): TemplateCompletionSiteKind | null {
  if ('ast' in result) {
    return expressionTailCompletionSiteForNodeOffset(result.ast, offset);
  }
  if ('activeHole' in result) {
    return expressionTailCompletionSiteForNodeRefs(result.activeHole.closedSubtreeRefs, offset);
  }
  if ('closedSubtreeRefs' in result) {
    return expressionTailCompletionSiteForNodeRefs(result.closedSubtreeRefs, offset);
  }
  return null;
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
  attribute: HtmlAttribute,
  syntax: AttributeSyntax | null,
): boolean {
  if (syntax?.command == null) {
    return false;
  }
  const span = sourceSpanFor(store, attribute.nameAddressHandle);
  if (span == null) {
    return false;
  }
  const commandStart = attribute.rawName.lastIndexOf(syntax.command);
  return commandStart >= 0
    && span.start + commandStart <= offset
    && offset <= span.start + attribute.rawName.length;
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

  const root = resource.runtimeAnalysis.scopes.rootScope;
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
  return best?.scope ?? root;
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
  let depth = 0;
  let current = scope.parent;
  while (current != null) {
    depth++;
    current = current.parent;
  }
  return depth;
}

function selectedDefinitionForCursor(
  resource: TemplateResourceRuntimeAnalysisEmission,
  activeElement: HtmlElement | null,
  classification: AttributeClassification | null,
): ProductHandle | null {
  return classification?.bindable?.reference.ownerDefinitionProductHandle
    ?? classification?.resource?.definitionProductHandle
    ?? definitionForElement(resource, activeElement);
}

function selectedBindableForCursor(
  classification: AttributeClassification | null,
  valueSite: TemplateValueSite | null,
): TemplateBindableReference | null {
  return valueSite?.bindable
    ?? classification?.bindable
    ?? null;
}

function definitionForElement(
  resource: TemplateResourceRuntimeAnalysisEmission,
  activeElement: HtmlElement | null,
): ProductHandle | null {
  if (activeElement == null) {
    return null;
  }
  const lookup = activeElement.tagName.toLowerCase();
  const resourceRow = resource.compilation.compilerWorld.resourceScope.resources.find((candidate) =>
    candidate.resourceKind === ResourceDefinitionKind.CustomElement
    && (
      candidate.name.toLowerCase() === lookup
      || candidate.aliases.some((alias) => alias.toLowerCase() === lookup)
    )
  ) ?? null;
  return resourceRow?.definitionProductHandle ?? resourceRow?.resourceProductHandle ?? null;
}
