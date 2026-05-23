import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  typeNodeReferencesImportedExport,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  isParameterProperty,
  readObjectPropertyExpression,
  readPropertyName,
  sourceSiteForNode,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import type {
  AddressHandle,
} from '../kernel/handles.js';
import { issuePublicationWithRecords } from '../kernel/issue-publication.js';
import { localKeyPart } from '../kernel/local-key.js';
import { sourceSpanAddressForSite, type SourceSpanSite } from '../kernel/source-address.js';
import {
  KernelStore,
  KernelStoreBatch,
} from '../kernel/store.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  FetchClientIssueKind,
  FetchClientIssuePhase,
} from './fetch-client-issue.js';
import {
  FetchClientIssuePublisher,
  type FetchClientIssuePublication,
} from './fetch-client-issue-publication.js';
import { FetchClientProductDetails } from './product-details.js';
import { FetchClientFrameworkErrorCode } from './framework-error-code.js';
import { FetchClientSourceIssueProjectResult } from './fetch-client-source-issues.js';

const FETCH_CLIENT_MODULES = new Set([
  '@aurelia/fetch-client',
]);

const FETCH_CLIENT_EXPORTS = new Set([
  'HttpClient',
  'IHttpClient',
  'HttpClientConfiguration',
  'RetryInterceptor',
  'RetryStrategy',
]);

const FETCH_CLIENT_ROOT_EXPORTS = new Set([
  'HttpClient',
  'IHttpClient',
]);

const RETRY_STRATEGY_VALUES = {
  fixed: 0,
  incremental: 1,
  exponential: 2,
  random: 3,
} as const;

type RetryStrategyName = keyof typeof RETRY_STRATEGY_VALUES;

interface FetchClientReadContext {
  readonly project: ProjectBootFrame;
  readonly typeSystem: TypeSystemProject;
  readonly sourcePath: string;
  readonly sourceFileAddressHandle: AddressHandle;
  readonly sourceFile: ts.SourceFile;
  readonly checker: ts.TypeChecker;
  readonly bindings: SourceImportBindings;
  readonly roots: FetchClientRootSet;
  readonly sites: FetchClientIssueSourceSite[];
}

interface FetchClientRootSet {
  readonly clients: ReadonlySet<string>;
  readonly instanceClientMembers: ReadonlySet<string>;
}

interface FetchClientIssueSourceSite extends SourceSpanSite {
  readonly sourcePath: string;
  readonly phase: FetchClientIssuePhase;
  readonly issueKind: FetchClientIssueKind;
  readonly frameworkErrorCode: FetchClientFrameworkErrorCode;
  readonly message: string;
  readonly localName: string | null;
}

interface HttpClientConfigurationAction {
  readonly name: string;
  readonly call: ts.CallExpression;
}

interface RetryInterceptorFact {
  readonly node: ts.Node;
  readonly config: ts.Expression | null;
}

/** Materializes source-backed diagnostics for @aurelia/fetch-client configuration APIs. */
export class FetchClientSourceIssueMaterializer {
  private readonly publisher: FetchClientIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new FetchClientIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): FetchClientSourceIssueProjectResult {
    const sites = readFetchClientIssueSourceSites(project, typeSystem);
    const publications = distinctFetchClientIssueSites(sites)
      .map((site, index) => this.publicationForSite(project, site, index));
    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `fetch-client-source-issues:${project.projectKey}`));
    }
    for (const publication of publications) {
      this.store.productDetails.add(FetchClientProductDetails.Issue, publication.issue.productHandle, publication.issue);
    }
    return new FetchClientSourceIssueProjectResult(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationForSite(
    project: ProjectBootFrame,
    site: FetchClientIssueSourceSite,
    index: number,
  ): FetchClientIssuePublication {
    const local = fetchClientIssueLocalKey(project, site, index);
    const source = sourceSpanAddressForSite(this.store, local, site);
    const publication = this.publisher.publish(
      project.projectKey,
      null,
      site.phase,
      site.issueKind,
      site.message,
      site.frameworkErrorCode,
      source.handle,
      site.localName,
    );
    return issuePublicationWithRecords(publication, source.records);
  }
}

function readFetchClientIssueSourceSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly FetchClientIssueSourceSite[] {
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      return [];
    }
    const bindings = readSourceImportBindings(sourceFile, FETCH_CLIENT_MODULES, FETCH_CLIENT_EXPORTS);
    const context: FetchClientReadContext = {
      project,
      typeSystem,
      sourcePath: source.path,
      sourceFileAddressHandle: source.addressHandle,
      sourceFile,
      checker: typeSystem.checker,
      bindings,
      roots: readFetchClientRoots(sourceFile, bindings),
      sites: [],
    };
    visitFetchClientSourceNode(context, sourceFile);
    return context.sites;
  });
}

function visitFetchClientSourceNode(
  context: FetchClientReadContext,
  node: ts.Node,
): void {
  if (ts.isCallExpression(node)) {
    readHttpClientConfigureIssues(context, node);
  } else if (ts.isNewExpression(node) && expressionCreatesRetryInterceptor(node, context.bindings)) {
    readRetryConfigurationIssues(context, node.arguments?.[0] ?? null, node);
  }
  ts.forEachChild(node, (child) => visitFetchClientSourceNode(context, child));
}

function readFetchClientRoots(
  sourceFile: ts.SourceFile,
  bindings: SourceImportBindings,
): FetchClientRootSet {
  const clients = new Set<string>();
  const instanceClientMembers = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (nodeIsFetchClientTyped(node, bindings) || expressionCreatesFetchClientRoot(node.initializer ?? null, bindings)) {
        clients.add(node.name.text);
      }
    } else if (ts.isPropertyDeclaration(node)) {
      const name = readPropertyName(node.name);
      if (name != null && (nodeIsFetchClientTyped(node, bindings) || expressionCreatesFetchClientRoot(node.initializer ?? null, bindings))) {
        instanceClientMembers.add(name);
      }
    } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      if (nodeIsFetchClientTyped(node, bindings) || expressionCreatesFetchClientRoot(node.initializer ?? null, bindings)) {
        clients.add(node.name.text);
        if (isParameterProperty(node)) {
          instanceClientMembers.add(node.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return {
    clients,
    instanceClientMembers,
  };
}

function readHttpClientConfigureIssues(
  context: FetchClientReadContext,
  call: ts.CallExpression,
): void {
  if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'configure') {
    return;
  }
  if (!expressionIsFetchClientRoot(context, call.expression.expression)) {
    return;
  }
  const config = call.arguments[0] ?? null;
  if (config == null || definitelyInvalidConfigureInput(config)) {
    context.sites.push(sourceSiteForNode(
      context,
      config ?? call.expression.name,
      {
        phase: FetchClientIssuePhase.HttpClientConfiguration,
        issueKind: FetchClientIssueKind.ConfigureInvalidConfig,
        frameworkErrorCode: FetchClientFrameworkErrorCode.ConfigureInvalidConfig,
        message: 'HttpClient.configure(...) received a statically closed value that is neither an object nor a configuration callback.',
        localName: 'configure',
      },
    ));
    return;
  }
  readConfigureObjectIssues(context, config, false);
  readConfigureCallbackIssues(context, config);
}

function readConfigureObjectIssues(
  context: FetchClientReadContext,
  expression: ts.Expression,
  normalizedConfigurationObject: boolean,
): void {
  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return;
  }

  const defaultsExpression = readObjectPropertyExpression(current, 'defaults');
  if (defaultsExpression != null) {
    readDefaultHeaderIssues(context, defaultsExpression, 'defaults.headers');
  }
  if (!normalizedConfigurationObject) {
    readDefaultHeaderIssues(context, current, 'headers');
  }

  const interceptorsExpression = readObjectPropertyExpression(current, 'interceptors');
  if (interceptorsExpression != null) {
    readInterceptorCollectionIssues(context, interceptorsExpression);
  }
}

function readConfigureCallbackIssues(
  context: FetchClientReadContext,
  expression: ts.Expression,
): void {
  const current = unwrapExpression(expression);
  if (!ts.isArrowFunction(current) && !ts.isFunctionExpression(current)) {
    return;
  }
  const configParameterName = current.parameters[0] != null && ts.isIdentifier(current.parameters[0].name)
    ? current.parameters[0].name.text
    : null;

  if (ts.isBlock(current.body)) {
    readConfigureCallbackBlockIssues(context, current.body, configParameterName);
    return;
  }

  readConfigureCallbackReturnIssues(context, current.body);
  if (configParameterName != null) {
    const actions = readHttpClientConfigurationActionChain(current.body, configParameterName);
    if (actions != null) {
      readConfigurationActionIssues(context, actions);
    }
  }
}

function readConfigureCallbackBlockIssues(
  context: FetchClientReadContext,
  body: ts.Block,
  configParameterName: string | null,
): void {
  const actions: HttpClientConfigurationAction[] = [];
  for (const statement of body.statements) {
    if (ts.isReturnStatement(statement) && statement.expression != null) {
      readConfigureCallbackReturnIssues(context, statement.expression);
      if (configParameterName != null) {
        const returnedActions = readHttpClientConfigurationActionChain(statement.expression, configParameterName);
        if (returnedActions != null) {
          actions.push(...returnedActions);
        }
      }
    } else if (configParameterName != null && ts.isExpressionStatement(statement)) {
      const statementActions = readHttpClientConfigurationActionChain(statement.expression, configParameterName);
      if (statementActions != null) {
        actions.push(...statementActions);
      }
    }
  }
  readConfigurationActionIssues(context, actions);
}

function readConfigureCallbackReturnIssues(
  context: FetchClientReadContext,
  expression: ts.Expression,
): void {
  const current = unwrapExpression(expression);
  if (callbackReturnIsAccepted(current)) {
    if (ts.isObjectLiteralExpression(current)) {
      readConfigureObjectIssues(context, current, true);
    }
    return;
  }
  if (callbackReturnIsDefinitelyInvalid(current)) {
    context.sites.push(sourceSiteForNode(
      context,
      current,
      {
        phase: FetchClientIssuePhase.HttpClientConfiguration,
        issueKind: FetchClientIssueKind.ConfigureInvalidReturn,
        frameworkErrorCode: FetchClientFrameworkErrorCode.ConfigureInvalidReturn,
        message: 'HttpClient.configure(...) callback returned a statically closed non-object value.',
        localName: 'configure-return',
      },
    ));
  }
}

function readConfigurationActionIssues(
  context: FetchClientReadContext,
  actions: readonly HttpClientConfigurationAction[],
): void {
  if (actions.length === 0) {
    return;
  }
  const retryFacts: RetryInterceptorFact[] = [];
  for (const action of actions) {
    switch (action.name) {
      case 'withDefaults':
        if (action.call.arguments[0] != null) {
          readDefaultHeaderIssues(context, action.call.arguments[0], 'defaults.headers');
        }
        break;
      case 'withRetry':
        retryFacts.push({
          node: action.call,
          config: action.call.arguments[0] ?? null,
        });
        readRetryConfigurationIssues(context, action.call.arguments[0] ?? null, action.call);
        break;
      case 'withInterceptor': {
        const interceptor = action.call.arguments[0] ?? null;
        if (interceptor != null && expressionCreatesRetryInterceptor(interceptor, context.bindings)) {
          retryFacts.push({
            node: action.call,
            config: retryInterceptorConfig(interceptor),
          });
          readRetryConfigurationIssues(context, retryInterceptorConfig(interceptor), action.call);
        }
        break;
      }
    }
  }
  readRetryInterceptorOrderingIssues(context, retryFacts, actions.length);
}

function readDefaultHeaderIssues(
  context: FetchClientReadContext,
  expression: ts.Expression,
  localName: string,
): void {
  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return;
  }
  const headers = readObjectPropertyExpression(current, 'headers');
  if (headers == null || !expressionCreatesHeadersInstance(headers)) {
    return;
  }
  context.sites.push(sourceSiteForNode(
    context,
    headers,
    {
      phase: FetchClientIssuePhase.HttpClientConfiguration,
      issueKind: FetchClientIssueKind.ConfigureInvalidHeader,
      frameworkErrorCode: FetchClientFrameworkErrorCode.ConfigureInvalidHeader,
      message: 'HttpClient.configure(...) defaults.headers is a Headers instance; Aurelia requires a plain object for default header merging.',
      localName,
    },
  ));
}

function readInterceptorCollectionIssues(
  context: FetchClientReadContext,
  expression: ts.Expression,
): void {
  const current = unwrapExpression(expression);
  if (!ts.isArrayLiteralExpression(current)) {
    return;
  }
  const retryFacts: RetryInterceptorFact[] = [];
  let hasSpread = false;
  for (const element of current.elements) {
    if (ts.isSpreadElement(element)) {
      hasSpread = true;
      continue;
    }
    if (expressionCreatesRetryInterceptor(element, context.bindings)) {
      retryFacts.push({
        node: element,
        config: retryInterceptorConfig(element),
      });
      readRetryConfigurationIssues(context, retryInterceptorConfig(element), element);
    }
  }
  if (!hasSpread) {
    readRetryInterceptorOrderingIssues(context, retryFacts, current.elements.length);
  }
}

function readRetryInterceptorOrderingIssues(
  context: FetchClientReadContext,
  retryFacts: readonly RetryInterceptorFact[],
  interceptorCount: number,
): void {
  if (retryFacts.length > 1) {
    const secondRetry = retryFacts[1]!;
    context.sites.push(sourceSiteForNode(
      context,
      secondRetry.node,
      {
        phase: FetchClientIssuePhase.HttpClientConfiguration,
        issueKind: FetchClientIssueKind.MoreThanOneRetryInterceptor,
        frameworkErrorCode: FetchClientFrameworkErrorCode.MoreThanOneRetryInterceptor,
        message: 'HttpClient.configure(...) statically configures more than one RetryInterceptor.',
        localName: 'interceptors',
      },
    ));
    return;
  }
  const onlyRetry = retryFacts[0] ?? null;
  if (onlyRetry != null) {
    const retryIndex = retryInterceptorIndex(onlyRetry.node);
    if (retryIndex >= 0 && retryIndex !== interceptorCount - 1) {
      context.sites.push(sourceSiteForNode(
        context,
        onlyRetry.node,
        {
          phase: FetchClientIssuePhase.HttpClientConfiguration,
          issueKind: FetchClientIssueKind.RetryInterceptorNotLast,
          frameworkErrorCode: FetchClientFrameworkErrorCode.RetryInterceptorNotLast,
          message: 'HttpClient.configure(...) statically configures a RetryInterceptor before another interceptor.',
          localName: 'interceptors',
        },
      ));
    }
  }
}

function readRetryConfigurationIssues(
  context: FetchClientReadContext,
  config: ts.Expression | null,
  siteNode: ts.Node,
): void {
  const retryConfig = config == null ? null : unwrapExpression(config);
  if (retryConfig != null && !ts.isObjectLiteralExpression(retryConfig)) {
    return;
  }
  const strategy = retryConfig == null
    ? RETRY_STRATEGY_VALUES.fixed
    : staticRetryStrategyValue(context, readObjectPropertyExpression(retryConfig, 'strategy'));
  const interval = retryConfig == null
    ? 1000
    : staticNumberValue(readObjectPropertyExpression(retryConfig, 'interval')) ?? 1000;

  if (strategy === RETRY_STRATEGY_VALUES.exponential && interval <= 1000) {
    const intervalSourceNode = retryConfig == null
      ? siteNode
      : readObjectPropertyExpression(retryConfig, 'interval') ?? siteNode;
    context.sites.push(sourceSiteForNode(
      context,
      intervalSourceNode,
      {
        phase: FetchClientIssuePhase.RetryInterceptorConfiguration,
        issueKind: FetchClientIssueKind.RetryInterceptorInvalidExponentialInterval,
        frameworkErrorCode: FetchClientFrameworkErrorCode.RetryInterceptorInvalidExponentialInterval,
        message: 'RetryInterceptor exponential strategy uses an interval less than or equal to one second.',
        localName: 'retry.interval',
      },
    ));
  }

  if (strategy === 'invalid') {
    const strategySourceNode = retryConfig == null
      ? siteNode
      : readObjectPropertyExpression(retryConfig, 'strategy') ?? siteNode;
    context.sites.push(sourceSiteForNode(
      context,
      strategySourceNode,
      {
        phase: FetchClientIssuePhase.RetryInterceptorConfiguration,
        issueKind: FetchClientIssueKind.RetryInterceptorInvalidStrategy,
        frameworkErrorCode: FetchClientFrameworkErrorCode.RetryInterceptorInvalidStrategy,
        message: 'RetryInterceptor strategy is statically outside Aurelia fetch-client RetryStrategy.',
        localName: 'retry.strategy',
      },
    ));
  }
}

function readHttpClientConfigurationActionChain(
  expression: ts.Expression,
  configParameterName: string,
): readonly HttpClientConfigurationAction[] | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text === configParameterName ? [] : null;
  }
  if (!ts.isCallExpression(current) || !ts.isPropertyAccessExpression(current.expression)) {
    return null;
  }
  const prior = readHttpClientConfigurationActionChain(current.expression.expression, configParameterName);
  return prior == null
    ? null
    : [
      ...prior,
      {
        name: current.expression.name.text,
        call: current,
      },
    ];
}

function expressionIsFetchClientRoot(
  context: FetchClientReadContext,
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  if (expressionCreatesFetchClientRoot(current, context.bindings)) {
    return true;
  }
  if (ts.isIdentifier(current)) {
    return context.roots.clients.has(current.text) || typeLooksLikeFetchClient(context, current);
  }
  if (
    ts.isPropertyAccessExpression(current)
    && current.expression.kind === ts.SyntaxKind.ThisKeyword
  ) {
    return context.roots.instanceClientMembers.has(current.name.text) || typeLooksLikeFetchClient(context, current);
  }
  return typeLooksLikeFetchClient(context, current);
}

function expressionCreatesFetchClientRoot(
  expression: ts.Expression | null,
  bindings: SourceImportBindings,
): boolean {
  if (expression == null) {
    return false;
  }
  const current = unwrapExpression(expression);
  if (
    ts.isNewExpression(current)
    && readImportedExportName(current.expression, bindings, new Set(['HttpClient'])) === 'HttpClient'
  ) {
    return true;
  }
  return ts.isCallExpression(current)
    && current.arguments[0] != null
    && readImportedExportName(current.arguments[0], bindings, FETCH_CLIENT_ROOT_EXPORTS) != null;
}

function expressionCreatesRetryInterceptor(
  expression: ts.Expression,
  bindings: SourceImportBindings,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isNewExpression(current)
    && readImportedExportName(current.expression, bindings, new Set(['RetryInterceptor'])) === 'RetryInterceptor';
}

function retryInterceptorConfig(
  expression: ts.Expression,
): ts.Expression | null {
  const current = unwrapExpression(expression);
  return ts.isNewExpression(current) ? current.arguments?.[0] ?? null : null;
}

function expressionCreatesHeadersInstance(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isNewExpression(current)
    && (
      (ts.isIdentifier(current.expression) && current.expression.text === 'Headers')
      || (ts.isPropertyAccessExpression(current.expression) && current.expression.name.text === 'Headers')
    );
}

function nodeIsFetchClientTyped(
  node: ts.VariableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration,
  bindings: SourceImportBindings,
): boolean {
  return typeNodeReferencesImportedExport(node.type ?? null, bindings, FETCH_CLIENT_ROOT_EXPORTS);
}

function typeLooksLikeFetchClient(
  context: FetchClientReadContext,
  expression: ts.Expression,
): boolean {
  const type = context.checker.getTypeAtLocation(expression);
  const symbolName = type.symbol?.getName() ?? type.aliasSymbol?.getName() ?? null;
  if (symbolName === 'HttpClient' || symbolName === 'IHttpClient') {
    return true;
  }
  return type.getProperty('configure') != null
    && type.getProperty('fetch') != null
    && type.getProperty('interceptors') != null;
}

function definitelyInvalidConfigureInput(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isNumericLiteral(current)
    || ts.isStringLiteralLike(current)
    || current.kind === ts.SyntaxKind.TrueKeyword
    || current.kind === ts.SyntaxKind.FalseKeyword
    || (ts.isIdentifier(current) && current.text === 'undefined');
}

function callbackReturnIsAccepted(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isObjectLiteralExpression(current)
    || current.kind === ts.SyntaxKind.NullKeyword
    || (ts.isIdentifier(current) && current.text === 'undefined');
}

function callbackReturnIsDefinitelyInvalid(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isNumericLiteral(current)
    || ts.isStringLiteralLike(current)
    || current.kind === ts.SyntaxKind.TrueKeyword
    || current.kind === ts.SyntaxKind.FalseKeyword
    || ts.isFunctionExpression(current)
    || ts.isArrowFunction(current)
    || ts.isClassExpression(current);
}

function staticRetryStrategyValue(
  context: FetchClientReadContext,
  expression: ts.Expression | null,
): number | 'invalid' | null {
  if (expression == null) {
    return RETRY_STRATEGY_VALUES.fixed;
  }
  const current = unwrapExpression(expression);
  const numberValue = staticNumberValue(current);
  if (numberValue != null) {
    return retryStrategyNumberIsValid(numberValue) ? numberValue : 'invalid';
  }
  if (ts.isPropertyAccessExpression(current)) {
    const exportName = readImportedExportName(current.expression, context.bindings, new Set(['RetryStrategy']));
    if (exportName === 'RetryStrategy' && current.name.text in RETRY_STRATEGY_VALUES) {
      return RETRY_STRATEGY_VALUES[current.name.text as RetryStrategyName];
    }
  }
  if (
    ts.isStringLiteralLike(current)
    || current.kind === ts.SyntaxKind.TrueKeyword
    || current.kind === ts.SyntaxKind.FalseKeyword
    || ts.isObjectLiteralExpression(current)
    || ts.isArrayLiteralExpression(current)
  ) {
    return 'invalid';
  }
  return null;
}

function retryStrategyNumberIsValid(
  value: number,
): boolean {
  return value === RETRY_STRATEGY_VALUES.fixed
    || value === RETRY_STRATEGY_VALUES.incremental
    || value === RETRY_STRATEGY_VALUES.exponential
    || value === RETRY_STRATEGY_VALUES.random;
}

function staticNumberValue(
  expression: ts.Expression | null,
): number | null {
  if (expression == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (ts.isNumericLiteral(current)) {
    return Number(current.text);
  }
  if (
    ts.isPrefixUnaryExpression(current)
    && ts.isNumericLiteral(current.operand)
    && (current.operator === ts.SyntaxKind.MinusToken || current.operator === ts.SyntaxKind.PlusToken)
  ) {
    const value = Number(current.operand.text);
    return current.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }
  return null;
}

function retryInterceptorIndex(
  node: ts.Node,
): number {
  if (ts.isExpression(node) && ts.isArrayLiteralExpression(node.parent)) {
    return node.parent.elements.indexOf(node as ts.Expression);
  }
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const chain = readHttpClientConfigurationActionChain(node, readLeftmostIdentifier(node.expression.expression) ?? '');
    return chain == null ? -1 : chain.findIndex((action) => action.call === node);
  }
  return -1;
}

function readLeftmostIdentifier(
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
    return readLeftmostIdentifier(current.expression.expression);
  }
  if (ts.isPropertyAccessExpression(current)) {
    return readLeftmostIdentifier(current.expression);
  }
  return null;
}

function fetchClientIssueLocalKey(
  project: ProjectBootFrame,
  site: FetchClientIssueSourceSite,
  index: number,
): string {
  return [
    'fetch-client-issue',
    localKeyPart(project.projectKey),
    localKeyPart(site.issueKind),
    localKeyPart(site.sourcePath),
    `${site.start}`,
    `${site.end}`,
    `${index}`,
  ].join(':');
}

function distinctFetchClientIssueSites(
  sites: readonly FetchClientIssueSourceSite[],
): readonly FetchClientIssueSourceSite[] {
  const seen = new Set<string>();
  const distinct: FetchClientIssueSourceSite[] = [];
  for (const site of sites) {
    const key = [
      site.sourcePath,
      site.start,
      site.end,
      site.issueKind,
      site.frameworkErrorCode,
      site.localName ?? '',
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    distinct.push(site);
  }
  return distinct;
}
