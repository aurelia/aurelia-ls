import {
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  type InterpolationActiveHoleCompanion,
  ExpressionParseResultKind,
  type ExpressionParseResult,
} from '../expression/parse-result-algebra.js';
import { ExpressionParser } from '../expression/expression-parser.js';
import type { ExpressionAstNode } from '../expression/ast.js';
import type {
  AccessMemberExpression,
  CallMemberExpression,
} from '../expression/ast.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import { SourceSpanAddress } from '../kernel/address.js';
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
import { TypeSystemProductDetails } from '../type-system/product-details.js';
import {
  CheckerExpressionTypeEvaluator,
  CheckerExpressionTypeEvaluationResultKind,
} from '../type-system/expression-type-evaluator.js';
import { CheckerTypeProjector } from '../type-system/checker-projector.js';
import type {
  CheckerTypeMember,
  CheckerTypeReference,
} from '../type-system/type-shape.js';
import {
  TemplateResourceScope,
  TemplateVisibleResource,
} from '../template/compiler-world.js';
import type { TemplateResourceCompilationEmission } from '../template/template-compilation-project-pass.js';
import type {
  TemplateExpressionParse,
  TemplateValueSite,
} from '../template/value-site.js';
import type { TemplateSource } from '../template/compilation-unit.js';
import type { AttributeClassification, AttributeSyntax } from '../template/attribute-syntax.js';
import {
  HtmlAttribute,
  HtmlElement,
  type HtmlIrNode,
} from '../template/html-ir.js';
import { type TemplateInstruction } from '../template/instruction-ir.js';
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
import { InquiryLocusKind, type InquiryLocus } from './locus.js';
import type { SourceCursorInquiryLocus } from './locus.js';
import { InquiryIntents, type InquiryIntent } from './ontology.js';
import {
  InquiryPageInfo,
  InquiryPageRequest,
} from './page.js';

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
    /** Projection requested by the caller. */
    readonly projection: InquiryProjection = new InquiryProjection(InquiryProjectionKind.Compact),
    /** Consumer-neutral answer intent for this query. */
    readonly intent: InquiryIntent = completionIntentForSite(siteKind),
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
      this.projection,
      this.intent,
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
      this.projection,
      this.intent,
    );
  }
}

export class TemplateCompletionCursorContextInput {
  constructor(
    /** Concrete source cursor inside a materialized template compilation emission. */
    readonly locus: SourceCursorInquiryLocus,
    /** Horizontal template compilation emission that owns HTML, syntax, value, render, and scope products. */
    readonly resource: TemplateResourceCompilationEmission,
    /** Page request copied into the resulting completion query. */
    readonly page: InquiryPageRequest = new InquiryPageRequest(),
    /** Projection copied into the resulting completion query. */
    readonly projection: InquiryProjection = new InquiryProjection(InquiryProjectionKind.Compact),
  ) {}
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
    /** Extra context gaps found while turning a cursor into product handles. */
    readonly missingInputs: readonly string[] = [],
  ) {}
}

/** Resolve a materialized template cursor into the product-handle completion query shape. */
export function templateCompletionQueryForCursor(
  store: KernelStore,
  input: TemplateCompletionCursorContextInput,
): TemplateCompletionCursorContext {
  const offset = input.locus.cursor.offset;
  if (offset == null) {
    return new TemplateCompletionCursorContext(
      new TemplateCompletionQuery(
        input.locus,
        TemplateCompletionSiteKind.Unknown,
        input.page,
        null,
        input.resource.compilerWorld.resourceScope.productHandle,
        null,
        null,
        null,
        input.projection,
      ),
      null,
      null,
      null,
      ['source-offset'],
    );
  }

  const htmlNode = smallestContaining(
    input.resource.html.nodes,
    offset,
    (node) => sourceSpanFor(store, node.sourceAddressHandle),
  );
  const htmlAttribute = smallestContaining(
    input.resource.html.attributes,
    offset,
    (attribute) => sourceSpanFor(store, attribute.sourceAddressHandle),
  );
  const valueSites = templateValueSitesForCursor(input.resource);
  const expressionParses = templateExpressionParsesForCursor(input.resource);
  const valueSite = smallestContaining(
    valueSites,
    offset,
    (site) => sourceSpanFor(store, site.sourceAddressHandle),
  );
  const expressionParse = valueSite == null
    ? null
    : expressionParses.find((parse) => parse.site.productHandle === valueSite.productHandle) ?? null;
  const expressionResult = expressionParse == null
    ? null
    : cursorFocusedExpressionResult(store, expressionParse, offset);
  const syntax = htmlAttribute == null
    ? null
    : syntaxForAttribute(input.resource.attributeSyntax.syntaxes, htmlAttribute);
  const classification = syntax == null
    ? null
    : classificationForSyntax(input.resource.attributeClassification.classifications, syntax);
  const activeElement = elementForCursorContext(input.resource.html.nodes, htmlNode, classification);
  const siteKind = classifyTemplateCompletionSite(
    store,
    offset,
    input.resource.unit.templateSource.markup,
    input.resource.unit.templateSource.sourceAddressHandle,
    input.resource.unit.templateSource.sourceMap,
    htmlNode,
    activeElement,
    htmlAttribute,
    syntax,
    valueSite,
    expressionResult,
  );
  const bindingScope = bindingScopeForCursor(store, input.resource, offset, expressionParse);
  const selectedDefinitionProductHandle = selectedDefinitionForCursor(input.resource, activeElement, classification);
  const missingInputs: string[] = [];
  const memberOwnerExpression = expressionResult == null
    ? null
    : memberOwnerExpressionForOffset(expressionResult, offset);
  const memberOwnerTypeProductHandle = siteKind === TemplateCompletionSiteKind.ExpressionMember && memberOwnerExpression != null && bindingScope != null
    ? deriveMemberOwnerTypeProductHandleForExpression(
      store,
      input.locus.key,
      memberOwnerExpression,
      expressionParse!.sourceAddressHandle,
      bindingScope,
      input.resource.compilerWorld.resourceScope,
      missingInputs,
    )
    : null;

  return new TemplateCompletionCursorContext(
    new TemplateCompletionQuery(
      input.locus,
      siteKind,
      input.page,
      bindingScope?.productHandle ?? null,
      input.resource.compilerWorld.resourceScope.productHandle,
      selectedDefinitionProductHandle,
      siteKindUsesExpressionParse(siteKind) ? expressionParse?.productHandle ?? null : null,
      memberOwnerTypeProductHandle,
      input.projection,
    ),
    htmlNode?.productHandle ?? null,
    htmlAttribute?.productHandle ?? null,
    valueSite?.productHandle ?? null,
    unique(missingInputs),
  );
}

/** Answer template and expression completion candidates from already-materialized product details. */
export function answerTemplateCompletion(
  store: KernelStore,
  query: TemplateCompletionQuery,
): InquiryAnswer<TemplateCompletionResult, TemplateCompletionQuery> {
  const missingInputs: string[] = [];
  const candidates: TemplateCompletionCandidate[] = [];
  const expressionParse = siteKindUsesExpressionParse(query.siteKind)
    ? readExpressionParse(store, query.expressionParseProductHandle, missingInputs)
    : null;
  const expressionResult = siteKindUsesExpressionParse(query.siteKind)
    ? focusedExpressionResultForQuery(store, query, expressionParse)
    : null;
  const expressionFrontier = expressionResult == null
    ? null
    : expressionCompletionFrontier(expressionResult);
  const needsMemberOwnerType = shouldDeriveMemberOwnerType(query, expressionResult);
  const needsBindingScope = shouldReadBindingScope(query.siteKind, expressionFrontier)
    || needsMemberOwnerType;
  const needsResourceScope = shouldReadResourceScope(query.siteKind, expressionFrontier)
    || shouldReadResourceScopeForMemberOwner(needsMemberOwnerType, expressionResult);
  const bindingScope = needsBindingScope
    ? readBindingScope(store, query.bindingScopeProductHandle, missingInputs)
    : null;
  const resourceScope = needsResourceScope
    ? readResourceScope(store, query.resourceScopeProductHandle, missingInputs)
    : null;
  let memberOwnerTypeProductHandle = query.memberOwnerTypeProductHandle;

  if (shouldReadBindingScope(query.siteKind, expressionFrontier)) {
    if (bindingScope != null) {
      candidates.push(...scopeCandidates(bindingScope));
    }
  }

  if (shouldReadResourceScope(query.siteKind, expressionFrontier)) {
    if (resourceScope != null) {
      candidates.push(...resourceScopeCandidates(resourceScope, query.siteKind, expressionFrontier));
    }
  }

  if (shouldOfferBindableCandidates(query.siteKind)) {
    const selectedDefinition = readSelectedDefinition(store, query.selectedDefinitionProductHandle, missingInputs);
    if (selectedDefinition != null) {
      candidates.push(...bindableCandidates(selectedDefinition));
    }
  }

  if (query.siteKind === TemplateCompletionSiteKind.ExpressionMember) {
    memberOwnerTypeProductHandle ??= deriveMemberOwnerTypeProductHandle(store, query, expressionParse, bindingScope, resourceScope, missingInputs);
    const members = readTypeMembers(store, memberOwnerTypeProductHandle, missingInputs);
    if (members != null) {
      candidates.push(...typeMemberCandidates(members));
    }
  }

  const uniqueCandidates = uniqueCandidatesByKey(candidates);
  const page = pageCandidates(uniqueCandidates, query.page);
  const result = new TemplateCompletionResult(
    query.siteKind,
    page.rows,
    expressionFrontier,
    unique(missingInputs),
  );
  const candidateProductHandles = unique(
    page.rows
      .map((candidate) => candidate.productHandle)
      .filter((handle): handle is ProductHandle => handle != null),
  );
  const products = candidateProductHandles
    .map((handle) => store.readProduct(handle))
    .filter((product): product is NonNullable<typeof product> => product != null);
  const claimHandles = unique(products.flatMap((product) => [
    ...product.claimHandles,
    ...store.readClaimsForSubject(product.handle),
    ...store.readClaimsForObject(product.handle),
  ]));
  const provenanceHandles = unique(products.map((product) => product.provenanceHandle));
  const continuations = page.info.nextCursor == null
    ? []
    : [
      new InquiryContinuation(
        InquiryContinuationKind.NextPage,
        'Read the next page of completion candidates.',
        query.withPage(new InquiryPageRequest(page.info.size, page.info.nextCursor)),
      ),
    ];
  const projection = new InquiryProjection(
    query.projection.projectionKind,
    [
      new InquiryExpansion(
        InquiryExpansionKind.ProductDetail,
        [],
        [
          query.bindingScopeProductHandle,
          query.resourceScopeProductHandle,
          query.selectedDefinitionProductHandle,
          query.expressionParseProductHandle,
          memberOwnerTypeProductHandle,
        ].filter((handle): handle is ProductHandle => handle != null),
        'Completion answer read typed product details supplied by parser, resource, and scope materializers.',
      ),
    ],
  );

  return new InquiryAnswer(
    outcomeForCompletion(page.rows, uniqueCandidates, unique(missingInputs)),
    query.locus,
    summaryForCompletion(page.rows.length, uniqueCandidates.length, unique(missingInputs)),
    KernelExactBasis,
    result,
    [],
    provenanceHandles,
    claimHandles,
    [],
    continuations,
    page.info,
    projection,
    query.intent,
  );
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
  const detail = store.productDetails.read(TemplateProductDetails.ExpressionParse, productHandle);
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
  return detail.members;
}

function shouldDeriveMemberOwnerType(
  query: TemplateCompletionQuery,
  expressionResult: ExpressionParseResult | null,
): boolean {
  return query.siteKind === TemplateCompletionSiteKind.ExpressionMember
    && query.memberOwnerTypeProductHandle == null
    && expressionResult != null;
}

function shouldReadResourceScopeForMemberOwner(
  needsMemberOwnerType: boolean,
  expressionResult: ExpressionParseResult | null,
): boolean {
  if (!needsMemberOwnerType || expressionResult == null) {
    return false;
  }
  const owner = memberOwnerExpression(expressionResult);
  return owner != null && expressionContainsValueConverter(owner);
}

function deriveMemberOwnerTypeProductHandle(
  store: KernelStore,
  query: TemplateCompletionQuery,
  expressionParse: TemplateExpressionParse | null,
  bindingScope: BindingScope | null,
  resourceScope: TemplateResourceScope | null,
  missingInputs: string[],
): ProductHandle | null {
  if (expressionParse == null || bindingScope == null) {
    return null;
  }

  const expressionResult = focusedExpressionResultForQuery(store, query, expressionParse);
  const owner = expressionResult == null
    ? null
    : memberOwnerExpression(expressionResult);
  if (owner == null) {
    missingInputs.push('expression-member-owner');
    return null;
  }

  const evaluation = new CheckerExpressionTypeEvaluator(
    store,
    new CheckerTypeProjector(store),
    resourceScope,
  );
  return deriveMemberOwnerTypeProductHandleFromEvaluation(
    evaluation.evaluateWithScope(
      owner,
      bindingScope,
      `template-completion:${query.locus.key}:member-owner`,
      expressionParse.sourceAddressHandle,
    ),
    missingInputs,
  );
}

function deriveMemberOwnerTypeProductHandleForExpression(
  store: KernelStore,
  locusKey: string,
  owner: ExpressionAstNode,
  sourceAddressHandle: AddressHandle | null,
  bindingScope: BindingScope,
  resourceScope: TemplateResourceScope | null,
  missingInputs: string[],
): ProductHandle | null {
  const evaluation = new CheckerExpressionTypeEvaluator(
    store,
    new CheckerTypeProjector(store),
    resourceScope,
  ).evaluateWithScope(
    owner,
    bindingScope,
    `template-completion:${locusKey}:member-owner`,
    sourceAddressHandle,
  );

  return deriveMemberOwnerTypeProductHandleFromEvaluation(evaluation, missingInputs);
}

function deriveMemberOwnerTypeProductHandleFromEvaluation(
  evaluation: ReturnType<CheckerExpressionTypeEvaluator['evaluateWithScope']>,
  missingInputs: string[],
): ProductHandle | null {
  if (evaluation.kind === CheckerExpressionTypeEvaluationResultKind.Type) {
    return evaluation.typeReference.productHandle;
  }

  missingInputs.push(`expression-member-owner-type:${evaluation.openKind}`);
  return null;
}

function expressionContainsValueConverter(expression: ExpressionAstNode): boolean {
  switch (expression.$kind) {
    case 'ValueConverter':
      return true;
    case 'BindingBehavior':
      return expressionContainsValueConverter(expression.expression)
        || expression.args.some(expressionContainsValueConverter);
    case 'Paren':
    case 'Unary':
      return expressionContainsValueConverter(expression.expression);
    case 'AccessMember':
      return expressionContainsValueConverter(expression.object);
    case 'AccessKeyed':
      return expressionContainsValueConverter(expression.object)
        || expressionContainsValueConverter(expression.key);
    case 'CallMember':
      return expressionContainsValueConverter(expression.object)
        || expression.args.some(expressionContainsValueConverter);
    case 'CallFunction':
      return expressionContainsValueConverter(expression.func)
        || expression.args.some(expressionContainsValueConverter);
    case 'CallScope':
    case 'CallGlobal':
      return expression.args.some(expressionContainsValueConverter);
    case 'New':
      return expressionContainsValueConverter(expression.func)
        || expression.args.some(expressionContainsValueConverter);
    case 'TaggedTemplate':
      return expressionContainsValueConverter(expression.func)
        || expression.expressions.some(expressionContainsValueConverter);
    case 'Binary':
      return expressionContainsValueConverter(expression.left)
        || expressionContainsValueConverter(expression.right);
    case 'Conditional':
      return expressionContainsValueConverter(expression.condition)
        || expressionContainsValueConverter(expression.yes)
        || expressionContainsValueConverter(expression.no);
    case 'Assign':
      return expressionContainsValueConverter(expression.target)
        || expressionContainsValueConverter(expression.value);
    case 'ArrowFunction':
      return expressionContainsValueConverter(expression.body);
    case 'ArrayLiteral':
      return expression.elements.some(expressionContainsValueConverter);
    case 'ObjectLiteral':
      return expression.values.some(expressionContainsValueConverter);
    case 'Template':
    case 'Interpolation':
      return expression.expressions.some(expressionContainsValueConverter);
    case 'ForOfStatement':
      return expressionContainsValueConverter(expression.iterable);
    case 'AccessThis':
    case 'AccessBoundary':
    case 'AccessScope':
    case 'AccessGlobal':
    case 'PrimitiveLiteral':
    case 'Identifier':
    case 'BindingIdentifier':
      return false;
    case 'BindingPatternDefault':
      return expressionContainsValueConverter(expression.target)
        || expressionContainsValueConverter(expression.default);
    case 'BindingPatternHole':
      return false;
    case 'ArrayBindingPattern':
      return expression.elements.some(expressionContainsValueConverter)
        || (expression.rest != null && expressionContainsValueConverter(expression.rest));
    case 'ObjectBindingPattern':
      return expression.properties.some((property) => expressionContainsValueConverter(property.value))
        || (expression.rest != null && expressionContainsValueConverter(expression.rest));
    case 'DestructuringAssignment':
      return expressionContainsValueConverter(expression.pattern)
        || expressionContainsValueConverter(expression.source);
    case 'Custom':
      return false;
  }
}

function memberOwnerExpression(result: ExpressionParseResult): ExpressionAstNode | null {
  if (
    'frontierKind' in result
    && 'closedSubtreeRefs' in result
    && result.frontierKind === ExpressionFrontierKind.AwaitingMemberName
  ) {
    return result.closedSubtreeRefs.at(-1)?.node ?? null;
  }

  if (
    'activeHole' in result
    && result.activeHole.frontierKind === ExpressionFrontierKind.AwaitingMemberName
  ) {
    return result.activeHole.closedSubtreeRefs.at(-1)?.node ?? null;
  }

  if ('ast' in result && result.ast.$kind === 'AccessMember') {
    return result.ast.object;
  }

  if ('ast' in result) {
    return firstMemberOwnerExpression(result.ast);
  }

  return null;
}

function memberOwnerExpressionForOffset(
  result: ExpressionParseResult,
  offset: number,
): ExpressionAstNode | null {
  if ('ast' in result) {
    return memberOwnerExpressionForNodeOffset(result.ast, offset);
  }
  if (
    'activeHole' in result
    && result.activeHole.frontierKind === ExpressionFrontierKind.AwaitingMemberName
  ) {
    return result.activeHole.closedSubtreeRefs.at(-1)?.node ?? null;
  }
  if (
    'frontierKind' in result
    && 'closedSubtreeRefs' in result
    && result.frontierKind === ExpressionFrontierKind.AwaitingMemberName
  ) {
    return result.closedSubtreeRefs.at(-1)?.node ?? null;
  }
  return null;
}

function firstMemberOwnerExpression(expression: ExpressionAstNode): ExpressionAstNode | null {
  switch (expression.$kind) {
    case 'AccessMember':
    case 'CallMember':
      return expression.object;
    case 'Paren':
    case 'Unary':
      return firstMemberOwnerExpression(expression.expression);
    case 'AccessKeyed':
      return firstMemberOwnerExpression(expression.object)
        ?? firstMemberOwnerExpression(expression.key);
    case 'CallFunction':
      return firstMemberOwnerExpression(expression.func)
        ?? firstMemberOwnerExpressionInList(expression.args);
    case 'CallScope':
    case 'CallGlobal':
      return firstMemberOwnerExpressionInList(expression.args);
    case 'New':
      return firstMemberOwnerExpression(expression.func)
        ?? firstMemberOwnerExpressionInList(expression.args);
    case 'TaggedTemplate':
      return firstMemberOwnerExpression(expression.func)
        ?? firstMemberOwnerExpressionInList(expression.expressions);
    case 'Binary':
      return firstMemberOwnerExpression(expression.left)
        ?? firstMemberOwnerExpression(expression.right);
    case 'Conditional':
      return firstMemberOwnerExpression(expression.condition)
        ?? firstMemberOwnerExpression(expression.yes)
        ?? firstMemberOwnerExpression(expression.no);
    case 'Assign':
      return firstMemberOwnerExpression(expression.target)
        ?? firstMemberOwnerExpression(expression.value);
    case 'ArrowFunction':
      return firstMemberOwnerExpression(expression.body);
    case 'ArrayLiteral':
      return firstMemberOwnerExpressionInList(expression.elements);
    case 'ObjectLiteral':
      return firstMemberOwnerExpressionInList(expression.values);
    case 'Template':
    case 'Interpolation':
      return firstMemberOwnerExpressionInList(expression.expressions);
    case 'ForOfStatement':
      return firstMemberOwnerExpression(expression.iterable);
    case 'BindingPatternDefault':
      return firstMemberOwnerExpression(expression.target)
        ?? firstMemberOwnerExpression(expression.default);
    case 'ArrayBindingPattern':
      return firstMemberOwnerExpressionInList(expression.elements)
        ?? (expression.rest == null ? null : firstMemberOwnerExpression(expression.rest));
    case 'ObjectBindingPattern':
      return firstMemberOwnerExpressionInList(expression.properties.map((property) => property.value))
        ?? (expression.rest == null ? null : firstMemberOwnerExpression(expression.rest));
    case 'DestructuringAssignment':
      return firstMemberOwnerExpression(expression.pattern)
        ?? firstMemberOwnerExpression(expression.source);
    case 'AccessThis':
    case 'AccessBoundary':
    case 'AccessScope':
    case 'AccessGlobal':
    case 'PrimitiveLiteral':
    case 'Identifier':
    case 'BindingIdentifier':
    case 'BindingPatternHole':
    case 'Custom':
      return null;
  }
  return null;
}

function firstMemberOwnerExpressionInList(
  expressions: readonly ExpressionAstNode[],
): ExpressionAstNode | null {
  for (const expression of expressions) {
    const owner = firstMemberOwnerExpression(expression);
    if (owner != null) {
      return owner;
    }
  }
  return null;
}

function memberOwnerExpressionForNodeOffset(
  expression: ExpressionAstNode,
  offset: number,
): ExpressionAstNode | null {
  switch (expression.$kind) {
    case 'AccessMember':
      return isMemberNameOffset(expression, offset)
        ? expression.object
        : memberOwnerExpressionForNodeOffset(expression.object, offset);
    case 'CallMember':
      return isMemberNameOffset(expression, offset)
        ? expression.object
        : memberOwnerExpressionForNodeOffset(expression.object, offset)
          ?? memberOwnerExpressionForNodeOffsetInList(expression.args, offset);
    case 'Paren':
    case 'Unary':
      return memberOwnerExpressionForNodeOffset(expression.expression, offset);
    case 'AccessKeyed':
      return memberOwnerExpressionForNodeOffset(expression.object, offset)
        ?? memberOwnerExpressionForNodeOffset(expression.key, offset);
    case 'CallFunction':
      return memberOwnerExpressionForNodeOffset(expression.func, offset)
        ?? memberOwnerExpressionForNodeOffsetInList(expression.args, offset);
    case 'CallScope':
    case 'CallGlobal':
      return memberOwnerExpressionForNodeOffsetInList(expression.args, offset);
    case 'New':
      return memberOwnerExpressionForNodeOffset(expression.func, offset)
        ?? memberOwnerExpressionForNodeOffsetInList(expression.args, offset);
    case 'TaggedTemplate':
      return memberOwnerExpressionForNodeOffset(expression.func, offset)
        ?? memberOwnerExpressionForNodeOffsetInList(expression.expressions, offset);
    case 'Binary':
      return memberOwnerExpressionForNodeOffset(expression.left, offset)
        ?? memberOwnerExpressionForNodeOffset(expression.right, offset);
    case 'Conditional':
      return memberOwnerExpressionForNodeOffset(expression.condition, offset)
        ?? memberOwnerExpressionForNodeOffset(expression.yes, offset)
        ?? memberOwnerExpressionForNodeOffset(expression.no, offset);
    case 'Assign':
      return memberOwnerExpressionForNodeOffset(expression.target, offset)
        ?? memberOwnerExpressionForNodeOffset(expression.value, offset);
    case 'ArrowFunction':
      return memberOwnerExpressionForNodeOffset(expression.body, offset);
    case 'ArrayLiteral':
      return memberOwnerExpressionForNodeOffsetInList(expression.elements, offset);
    case 'ObjectLiteral':
      return memberOwnerExpressionForNodeOffsetInList(expression.values, offset);
    case 'Template':
    case 'Interpolation':
      return memberOwnerExpressionForNodeOffsetInList(expression.expressions, offset);
    case 'ForOfStatement':
      return memberOwnerExpressionForNodeOffset(expression.iterable, offset);
    case 'BindingPatternDefault':
      return memberOwnerExpressionForNodeOffset(expression.target, offset)
        ?? memberOwnerExpressionForNodeOffset(expression.default, offset);
    case 'ArrayBindingPattern':
      return memberOwnerExpressionForNodeOffsetInList(expression.elements, offset)
        ?? (expression.rest == null ? null : memberOwnerExpressionForNodeOffset(expression.rest, offset));
    case 'ObjectBindingPattern':
      return memberOwnerExpressionForNodeOffsetInList(expression.properties.map((property) => property.value), offset)
        ?? (expression.rest == null ? null : memberOwnerExpressionForNodeOffset(expression.rest, offset));
    case 'DestructuringAssignment':
      return memberOwnerExpressionForNodeOffset(expression.pattern, offset)
        ?? memberOwnerExpressionForNodeOffset(expression.source, offset);
    case 'AccessThis':
    case 'AccessBoundary':
    case 'AccessScope':
    case 'AccessGlobal':
    case 'PrimitiveLiteral':
    case 'Identifier':
    case 'BindingIdentifier':
    case 'BindingPatternHole':
    case 'Custom':
      return null;
  }
  return null;
}

function memberOwnerExpressionForNodeOffsetInList(
  expressions: readonly ExpressionAstNode[],
  offset: number,
): ExpressionAstNode | null {
  for (const expression of expressions) {
    if (!spanContainsOffset(expression.span, offset)) {
      continue;
    }
    const owner = memberOwnerExpressionForNodeOffset(expression, offset);
    if (owner != null) {
      return owner;
    }
  }
  return null;
}

function isMemberNameOffset(
  expression: AccessMemberExpression | CallMemberExpression,
  offset: number,
): boolean {
  return offset >= expression.object.span.end
    && offset <= expression.name.span.end;
}

function spanContainsOffset(
  span: ExpressionAstNode['span'],
  offset: number,
): boolean {
  return offset >= span.start && offset <= span.end;
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
  members: readonly CheckerTypeMember[],
): readonly TemplateCompletionCandidate[] {
  return members.map((member) => new TemplateCompletionCandidate(
    TemplateCompletionCandidateKind.TypeMember,
    member.name,
    TemplateCompletionCandidateSourceKind.TypeSystem,
    member.productHandle,
    member.identityHandle,
    member.sourceAddressHandle,
    `Member visible on checker-projected type.`,
    member.valueType,
  ));
}

function scopeCandidates(scope: BindingScope): readonly TemplateCompletionCandidate[] {
  const candidates: TemplateCompletionCandidate[] = [];
  let current: BindingScope | null = scope;
  let depth = 0;

  while (current != null) {
    for (const slot of current.overrideContext.slots) {
      candidates.push(scopeSlotCandidate(slot, current, depth, BindingContextKind.Override));
    }
    for (const slot of current.bindingContext.slots) {
      candidates.push(scopeSlotCandidate(slot, current, depth, current.bindingContext.contextKind));
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
  slot: BindingContextSlot,
  scope: BindingScope,
  depth: number,
  contextKind: BindingContextKind,
): TemplateCompletionCandidate {
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
  const size = Math.max(1, request.size);
  const start = request.cursor == null
    ? 0
    : Math.max(0, candidates.findIndex((candidate) => candidate.key === request.cursor) + 1);
  const rows = candidates.slice(start, start + size);
  const nextCursor = start + size < candidates.length
    ? rows[rows.length - 1]?.key ?? null
    : null;
  return {
    rows,
    info: new InquiryPageInfo(size, request.cursor, nextCursor, rows.length, candidates.length),
  };
}

function outcomeForCompletion(
  pageRows: readonly TemplateCompletionCandidate[],
  allRows: readonly TemplateCompletionCandidate[],
  missingInputs: readonly string[],
): InquiryOutcomeKind {
  if (pageRows.length > 0) {
    return missingInputs.length === 0 ? InquiryOutcomeKind.Hit : InquiryOutcomeKind.Partial;
  }
  if (allRows.length > 0) {
    return InquiryOutcomeKind.Hit;
  }
  return missingInputs.length === 0 ? InquiryOutcomeKind.Miss : InquiryOutcomeKind.Partial;
}

function summaryForCompletion(
  pageCount: number,
  totalCount: number,
  missingInputs: readonly string[],
): string {
  const base = totalCount === 0
    ? 'No completion candidates were available from the supplied product details.'
    : `Returned ${pageCount} of ${totalCount} completion candidates.`;
  return missingInputs.length === 0
    ? base
    : `${base} Missing inputs: ${missingInputs.join(', ')}.`;
}

function completionIntentForSite(siteKind: TemplateCompletionSiteKind): InquiryIntent {
  switch (siteKind) {
    case TemplateCompletionSiteKind.Expression:
    case TemplateCompletionSiteKind.ExpressionMember:
    case TemplateCompletionSiteKind.ExpressionValueConverter:
    case TemplateCompletionSiteKind.ExpressionBindingBehavior:
      return InquiryIntents.ExpressionCompletion;
    default:
      return InquiryIntents.TemplateCompletion;
  }
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
  if (valueSite != null) {
    if (expressionResult == null) {
      return TemplateCompletionSiteKind.AttributeValue;
    }
    if (!valueSiteOwnsExpressionOffset(store, valueSite, expressionResult, offset)) {
      return valueSite.attribute == null
        ? TemplateCompletionSiteKind.Unknown
        : TemplateCompletionSiteKind.AttributeValue;
    }
    return memberOwnerExpressionForOffset(expressionResult, offset) == null
      ? completionSiteForExpressionResult(expressionResult)
      : TemplateCompletionSiteKind.ExpressionMember;
  }

  if (htmlAttribute != null) {
    if (cursorTouchesSpan(sourceSpanFor(store, htmlAttribute.nameAddressHandle), offset)) {
      return isBindingCommandNameOffset(store, offset, htmlAttribute, syntax)
        ? TemplateCompletionSiteKind.BindingCommandName
        : TemplateCompletionSiteKind.AttributeName;
    }
    if (cursorTouchesSpan(sourceSpanFor(store, htmlAttribute.valueAddressHandle), offset)) {
      if (expressionResult == null) {
        return TemplateCompletionSiteKind.AttributeValue;
      }
      return memberOwnerExpressionForOffset(expressionResult, offset) == null
        ? completionSiteForExpressionResult(expressionResult)
        : TemplateCompletionSiteKind.ExpressionMember;
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
      return result.ast.expressions.some((expression) => spanContainsOffset(expression.span, offset));
    case ExpressionParseResultKind.InterpolationDegradedPublication:
    case ExpressionParseResultKind.InterpolationFrontierPublication:
      return interpolationActiveHoleContainsOffset(result.activeHole, offset)
        || result.closedHoles.some((hole) => spanContainsOffset(hole.span, offset));
    case ExpressionParseResultKind.CompleteInputParseError:
      return result.primarySpan != null && spanContainsOffset(result.primarySpan, offset);
    default:
      return cursorTouchesSpan(sourceSpanFor(store, site.sourceAddressHandle), offset);
  }
}

function interpolationActiveHoleContainsOffset(
  activeHole: InterpolationActiveHoleCompanion,
  offset: number,
): boolean {
  if (spanContainsOffset(activeHole.holeSpan, offset)) {
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

function templateValueSitesForCursor(
  resource: TemplateResourceCompilationEmission,
): readonly TemplateValueSite[] {
  return [
    ...resource.bindingCommandLowering.valueSites,
    ...resource.valueSites.sites,
  ];
}

function templateExpressionParsesForCursor(
  resource: TemplateResourceCompilationEmission,
): readonly TemplateExpressionParse[] {
  return [
    ...resource.bindingCommandLowering.expressionParses,
    ...resource.valueSites.parses,
  ];
}

function bindingScopeForCursor(
  store: KernelStore,
  resource: TemplateResourceCompilationEmission,
  offset: number,
  expressionParse: TemplateExpressionParse | null,
): BindingScope | null {
  const instructionScope = expressionParse == null
    ? null
    : bindingScopeForExpressionParse(resource, expressionParse);
  if (instructionScope != null) {
    return instructionScope;
  }

  const root = resource.scopes.rootScope;
  let best: { readonly scope: BindingScope; readonly span: SourceSpanAddress } | null = null;
  for (const scope of resource.scopes.readScopes()) {
    const span = sourceSpanFor(store, scopeRangeAddressHandle(resource, scope));
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

function bindingScopeForExpressionParse(
  resource: TemplateResourceCompilationEmission,
  expressionParse: TemplateExpressionParse,
): BindingScope | null {
  const instruction = resource.compiledTemplate.instructions.find((candidate) =>
    expressionProductHandlesForInstruction(candidate).includes(expressionParse.productHandle)
  ) ?? null;
  if (instruction == null) {
    return null;
  }
  return resource.scopes.instructionScopes.find((candidate) =>
    candidate.instructionProductHandle === instruction.productHandle
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

function scopeRangeAddressHandle(
  resource: TemplateResourceCompilationEmission,
  scope: BindingScope,
): AddressHandle | null {
  const ownerProductHandle = scope.bindingContext.ownerProductHandle;
  if (ownerProductHandle == null) {
    return scope.sourceAddressHandle;
  }

  const effect = resource.runtimeRendering.scopeEffects.find((candidate) =>
    candidate.productHandle === ownerProductHandle
  ) ?? null;
  const controller = resource.runtimeRendering.controllers.find((candidate) =>
    candidate.productHandle === ownerProductHandle
  ) ?? null;
  const instructionProductHandle = effect?.ownerInstructionProductHandle
    ?? controller?.instructionProductHandle
    ?? null;
  if (instructionProductHandle == null) {
    return scope.sourceAddressHandle;
  }
  const instruction = resource.compiledTemplate.instructions.find((candidate) =>
    candidate.productHandle === instructionProductHandle
  ) ?? null;
  const nodeProductHandle = instruction == null ? null : instructionNodeProductHandle(instruction);
  const node = nodeProductHandle == null
    ? null
    : resource.html.nodes.find((candidate) => candidate.productHandle === nodeProductHandle) ?? null;
  return node?.sourceAddressHandle ?? scope.sourceAddressHandle;
}

function instructionNodeProductHandle(
  instruction: TemplateInstruction,
): ProductHandle | null {
  return 'node' in instruction ? instruction.node.productHandle : null;
}

function expressionProductHandlesForInstruction(
  instruction: TemplateInstruction,
): readonly ProductHandle[] {
  const handles: ProductHandle[] = [];
  if ('expressionProductHandle' in instruction && instruction.expressionProductHandle != null) {
    handles.push(instruction.expressionProductHandle);
  }
  if ('expressionProductHandles' in instruction) {
    handles.push(...instruction.expressionProductHandles);
  }
  if ('iterableExpressionProductHandle' in instruction && instruction.iterableExpressionProductHandle != null) {
    handles.push(instruction.iterableExpressionProductHandle);
  }
  return handles;
}

function selectedDefinitionForCursor(
  resource: TemplateResourceCompilationEmission,
  activeElement: HtmlElement | null,
  classification: AttributeClassification | null,
): ProductHandle | null {
  return classification?.bindable?.reference.ownerDefinitionProductHandle
    ?? classification?.resource?.definitionProductHandle
    ?? definitionForElement(resource, activeElement);
}

function definitionForElement(
  resource: TemplateResourceCompilationEmission,
  activeElement: HtmlElement | null,
): ProductHandle | null {
  if (activeElement == null) {
    return null;
  }
  const lookup = activeElement.tagName.toLowerCase();
  const resourceRow = resource.compilerWorld.resourceScope.resources.find((candidate) =>
    candidate.resourceKind === ResourceDefinitionKind.CustomElement
    && (
      candidate.name.toLowerCase() === lookup
      || candidate.aliases.some((alias) => alias.toLowerCase() === lookup)
    )
  ) ?? null;
  return resourceRow?.definitionProductHandle ?? resourceRow?.resourceProductHandle ?? null;
}

function unique<TValue>(values: readonly TValue[]): readonly TValue[] {
  return [...new Set(values)];
}
