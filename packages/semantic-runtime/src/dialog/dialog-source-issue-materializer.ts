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
  DialogIssueKind,
  DialogIssuePhase,
} from './dialog-issue.js';
import {
  DialogIssuePublisher,
  type DialogIssuePublication,
} from './dialog-issue-publication.js';
import { DialogProductDetails } from './product-details.js';
import { DialogFrameworkErrorCode } from './framework-error-code.js';
import { DialogSourceIssueProjectResult } from './dialog-source-issues.js';

const DIALOG_MODULES = new Set([
  '@aurelia/dialog',
]);

const KERNEL_MODULES = new Set([
  '@aurelia/kernel',
  'aurelia',
]);

const DIALOG_EXPORTS = new Set([
  'DialogConfiguration',
  'DialogConfigurationStandard',
  'DialogConfigurationClassic',
  'DialogService',
  'IDialogService',
  'createDialogConfiguration',
]);

const DIALOG_SERVICE_EXPORTS = new Set([
  'DialogService',
  'IDialogService',
]);

const BARE_DIALOG_CONFIGURATION_EXPORTS = new Set([
  'DialogConfiguration',
]);

const DIALOG_CONFIGURATION_EXPORTS = new Set([
  'DialogConfiguration',
  'DialogConfigurationStandard',
  'DialogConfigurationClassic',
  'createDialogConfiguration',
]);

const KERNEL_RESOLVER_EXPORTS = new Set([
  'inject',
  'resolve',
]);

type DialogSettingsPropertyValue =
  | ts.Expression
  | 'dynamic'
  | null;

type StaticDialogChildKey =
  | string
  | 'dynamic';

/** Static merge-layer state visible for a DialogService receiver before per-call open settings are applied. */
enum DialogServiceBaseSettingsState {
  /** Root/default service path where global settings cannot provide component/template and no base settings are visible. */
  RootNoBase = 'root-no-base',
  /** Base settings are statically known to provide component or template. */
  ValidBaseSettings = 'valid-base-settings',
  /** Base settings are statically known to provide neither component nor template. */
  InvalidBaseSettings = 'invalid-base-settings',
  /** Receiver/base settings are dialog-shaped but not statically closed enough for a positive AUR0903 claim. */
  Unknown = 'unknown',
}

interface DialogSourceRead {
  readonly source: ProjectBootFrame['sourceFiles'][number];
  readonly sourceFile: ts.SourceFile;
  readonly bindings: SourceImportBindings;
  readonly kernelBindings: SourceImportBindings;
}

interface DialogReadContext {
  readonly project: ProjectBootFrame;
  readonly typeSystem: TypeSystemProject;
  readonly sourcePath: string;
  readonly sourceFileAddressHandle: AddressHandle;
  readonly sourceFile: ts.SourceFile;
  readonly checker: ts.TypeChecker;
  readonly bindings: SourceImportBindings;
  readonly kernelBindings: SourceImportBindings;
  readonly roots: DialogServiceRootSet;
  readonly childSettingsStates: ReadonlyMap<string, DialogServiceBaseSettingsState>;
  readonly sites: DialogIssueSourceSite[];
}

interface DialogServiceRootSet {
  readonly services: ReadonlyMap<string, DialogServiceBaseSettingsState>;
  readonly instanceServiceMembers: ReadonlyMap<string, DialogServiceBaseSettingsState>;
}

interface DialogIssueSourceSite extends SourceSpanSite {
  readonly sourcePath: string;
  readonly phase: DialogIssuePhase;
  readonly issueKind: DialogIssueKind;
  readonly frameworkErrorCode: DialogFrameworkErrorCode;
  readonly message: string;
  readonly localName: string | null;
}

/** Materializes source-backed diagnostics for @aurelia/dialog configuration and service APIs. */
export class DialogSourceIssueMaterializer {
  private readonly publisher: DialogIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new DialogIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
  ): DialogSourceIssueProjectResult {
    const sites = readDialogIssueSourceSites(project, typeSystem);
    const publications = distinctDialogIssueSites(sites)
      .map((site, index) => this.publicationForSite(project, site, index));
    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `dialog-source-issues:${project.projectKey}`));
    }
    for (const publication of publications) {
      this.store.productDetails.add(DialogProductDetails.Issue, publication.issue.productHandle, publication.issue);
    }
    return new DialogSourceIssueProjectResult(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationForSite(
    project: ProjectBootFrame,
    site: DialogIssueSourceSite,
    index: number,
  ): DialogIssuePublication {
    const local = dialogIssueLocalKey(project, site, index);
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

function readDialogIssueSourceSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly DialogIssueSourceSite[] {
  const reads = project.sourceFiles.flatMap((source): DialogSourceRead[] => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      return [];
    }
    const bindings = readSourceImportBindings(sourceFile, DIALOG_MODULES, DIALOG_EXPORTS);
    const kernelBindings = readSourceImportBindings(sourceFile, KERNEL_MODULES, KERNEL_RESOLVER_EXPORTS);
    return [{
      source,
      sourceFile,
      bindings,
      kernelBindings,
    }];
  });
  const childSettingsStates = readDialogChildSettingsStates(reads);
  return reads.flatMap((read) => {
    const context: DialogReadContext = {
      project,
      typeSystem,
      sourcePath: read.source.path,
      sourceFileAddressHandle: read.source.addressHandle,
      sourceFile: read.sourceFile,
      checker: typeSystem.checker,
      bindings: read.bindings,
      kernelBindings: read.kernelBindings,
      roots: readDialogServiceRoots(read.sourceFile, read.bindings, childSettingsStates),
      childSettingsStates,
      sites: [],
    };
    visitDialogSourceNode(context, read.sourceFile);
    return context.sites;
  });
}

function visitDialogSourceNode(
  context: DialogReadContext,
  node: ts.Node,
): void {
  if (ts.isCallExpression(node)) {
    readBareDialogConfigurationRegistrationIssue(context, node);
    readDialogChildSettingsIssues(context, node);
    readDialogServiceOpenIssues(context, node);
  }
  ts.forEachChild(node, (child) => visitDialogSourceNode(context, child));
}

function readBareDialogConfigurationRegistrationIssue(
  context: DialogReadContext,
  call: ts.CallExpression,
): void {
  if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'register') {
    return;
  }
  const receiver = call.expression.expression;
  if (dialogConfigurationExpressionIsEmptyDefault(receiver, context.bindings)) {
    context.sites.push(sourceSiteForNode(
      context,
      receiver,
      {
        phase: DialogIssuePhase.ConfigurationRegistration,
        issueKind: DialogIssueKind.NoEmptyDefaultConfiguration,
        frameworkErrorCode: DialogFrameworkErrorCode.NoEmptyDefaultConfiguration,
        message: 'Bare DialogConfiguration was registered without a renderer-providing customize(...) call; Aurelia throws when the settings-provider AppTask runs.',
        localName: 'DialogConfiguration',
      },
    ));
    return;
  }
  for (const argument of call.arguments) {
    if (dialogConfigurationExpressionIsEmptyDefault(argument, context.bindings)) {
      context.sites.push(sourceSiteForNode(
        context,
        argument,
        {
          phase: DialogIssuePhase.ConfigurationRegistration,
          issueKind: DialogIssueKind.NoEmptyDefaultConfiguration,
          frameworkErrorCode: DialogFrameworkErrorCode.NoEmptyDefaultConfiguration,
          message: 'Bare DialogConfiguration was registered without a renderer-providing customize(...) call; Aurelia throws when the settings-provider AppTask runs.',
          localName: 'DialogConfiguration',
        },
      ));
    }
  }
}

function readDialogChildSettingsIssues(
  context: DialogReadContext,
  call: ts.CallExpression,
): void {
  if (!callIsDialogChildResolverAdmission(context, call)) {
    return;
  }
  for (const argument of call.arguments) {
    const childCall = readDialogChildResolverCall(argument, context.bindings);
    if (childCall == null) {
      continue;
    }
    const keyExpression = childCall.arguments[0] ?? null;
    const key = readStaticDialogChildKey(keyExpression);
    if (key === 'dynamic' || context.childSettingsStates.has(key)) {
      continue;
    }
    context.sites.push(sourceSiteForNode(
      context,
      keyExpression ?? childCall,
      {
        phase: DialogIssuePhase.ChildServiceResolution,
        issueKind: DialogIssueKind.ChildSettingsNotFound,
        frameworkErrorCode: DialogFrameworkErrorCode.ChildSettingsNotFound,
        message: 'Dialog child service resolver key has no matching DialogConfiguration.withChild(...) settings registration in the visible app source.',
        localName: `child:${key}`,
      },
    ));
  }
}

function readDialogServiceOpenIssues(
  context: DialogReadContext,
  call: ts.CallExpression,
): void {
  if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'open') {
    return;
  }
  const receiverBaseState = readDialogServiceBaseSettingsState(context, call.expression.expression);
  if (receiverBaseState == null) {
    return;
  }
  const settings = call.arguments[0] ?? null;
  if (settings == null || !dialogSettingsObjectIsStaticallyInvalid(settings)) {
    return;
  }
  if (
    receiverBaseState === DialogServiceBaseSettingsState.ValidBaseSettings
    || receiverBaseState === DialogServiceBaseSettingsState.Unknown
  ) {
    return;
  }
  context.sites.push(sourceSiteForNode(
    context,
    settings,
    {
      phase: DialogIssuePhase.ServiceOpen,
      issueKind: DialogIssueKind.SettingsInvalid,
      frameworkErrorCode: DialogFrameworkErrorCode.SettingsInvalid,
      message: 'DialogService.open(...) settings statically provide neither component nor template.',
      localName: 'open.settings',
    },
  ));
}

function readDialogServiceRoots(
  sourceFile: ts.SourceFile,
  bindings: SourceImportBindings,
  childSettingsStates: ReadonlyMap<string, DialogServiceBaseSettingsState>,
): DialogServiceRootSet {
  const services = new Map<string, DialogServiceBaseSettingsState>();
  const instanceServiceMembers = new Map<string, DialogServiceBaseSettingsState>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const initializerState = expressionDialogServiceBaseSettingsState(node.initializer ?? null, bindings, childSettingsStates);
      if (initializerState != null) {
        services.set(node.name.text, initializerState);
      } else if (nodeIsDialogServiceTyped(node, bindings)) {
        services.set(node.name.text, DialogServiceBaseSettingsState.Unknown);
      }
    } else if (ts.isPropertyDeclaration(node)) {
      const name = readPropertyName(node.name);
      const initializerState = expressionDialogServiceBaseSettingsState(node.initializer ?? null, bindings, childSettingsStates);
      if (name != null && initializerState != null) {
        instanceServiceMembers.set(name, initializerState);
      } else if (name != null && nodeIsDialogServiceTyped(node, bindings)) {
        instanceServiceMembers.set(name, DialogServiceBaseSettingsState.Unknown);
      }
    } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      const initializerState = expressionDialogServiceBaseSettingsState(node.initializer ?? null, bindings, childSettingsStates);
      if (initializerState != null || nodeIsDialogServiceTyped(node, bindings)) {
        services.set(node.name.text, initializerState ?? DialogServiceBaseSettingsState.Unknown);
        if (isParameterProperty(node)) {
          instanceServiceMembers.set(node.name.text, initializerState ?? DialogServiceBaseSettingsState.Unknown);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return {
    services,
    instanceServiceMembers,
  };
}

function readDialogServiceBaseSettingsState(
  context: DialogReadContext,
  expression: ts.Expression,
): DialogServiceBaseSettingsState | null {
  const current = unwrapExpression(expression);
  const created = expressionDialogServiceBaseSettingsState(current, context.bindings, context.childSettingsStates);
  if (created != null) {
    return created;
  }
  if (ts.isIdentifier(current)) {
    return context.roots.services.get(current.text)
      ?? (typeLooksLikeDialogService(context, current) ? DialogServiceBaseSettingsState.Unknown : null);
  }
  if (
    ts.isPropertyAccessExpression(current)
    && current.expression.kind === ts.SyntaxKind.ThisKeyword
  ) {
    return context.roots.instanceServiceMembers.get(current.name.text)
      ?? (typeLooksLikeDialogService(context, current) ? DialogServiceBaseSettingsState.Unknown : null);
  }
  return typeLooksLikeDialogService(context, current) ? DialogServiceBaseSettingsState.Unknown : null;
}

function expressionDialogServiceBaseSettingsState(
  expression: ts.Expression | null,
  bindings: SourceImportBindings,
  childSettingsStates: ReadonlyMap<string, DialogServiceBaseSettingsState>,
): DialogServiceBaseSettingsState | null {
  if (expression == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (
    ts.isNewExpression(current)
    && readImportedExportName(current.expression, bindings, new Set(['DialogService'])) === 'DialogService'
  ) {
    return readDialogServiceConstructorBaseSettingsState(current);
  }
  if (!ts.isCallExpression(current)) {
    return null;
  }
  const childResolver = current.arguments[0] == null
    ? null
    : readDialogChildResolverCall(current.arguments[0], bindings);
  if (childResolver != null) {
    const key = readStaticDialogChildKey(childResolver.arguments[0] ?? null);
    return key === 'dynamic'
      ? DialogServiceBaseSettingsState.Unknown
      : childSettingsStates.get(key) ?? DialogServiceBaseSettingsState.Unknown;
  }
  if (current.arguments[0] != null && readImportedExportName(current.arguments[0], bindings, DIALOG_SERVICE_EXPORTS) != null) {
    return DialogServiceBaseSettingsState.RootNoBase;
  }
  if (ts.isPropertyAccessExpression(current.expression) && current.expression.name.text === 'createChild') {
    return dialogSettingsExpressionBaseState(current.arguments[0] ?? null);
  }
  return null;
}

function readDialogServiceConstructorBaseSettingsState(
  expression: ts.NewExpression,
): DialogServiceBaseSettingsState {
  return expression.arguments?.[2] == null
    ? DialogServiceBaseSettingsState.RootNoBase
    : dialogSettingsExpressionBaseState(expression.arguments[2]);
}

function dialogSettingsExpressionBaseState(
  expression: ts.Expression | null,
): DialogServiceBaseSettingsState {
  if (expression == null) {
    return DialogServiceBaseSettingsState.InvalidBaseSettings;
  }
  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return DialogServiceBaseSettingsState.Unknown;
  }
  return dialogSettingsObjectIsStaticallyInvalid(current)
    ? DialogServiceBaseSettingsState.InvalidBaseSettings
    : DialogServiceBaseSettingsState.ValidBaseSettings;
}

function nodeIsDialogServiceTyped(
  node: ts.VariableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration,
  bindings: SourceImportBindings,
): boolean {
  return typeNodeReferencesImportedExport(node.type ?? null, bindings, DIALOG_SERVICE_EXPORTS);
}

function typeLooksLikeDialogService(
  context: DialogReadContext,
  expression: ts.Expression,
): boolean {
  const type = context.typeSystem.readProgramTypeAtLocation(expression);
  if (type == null) {
    return false;
  }
  const symbolName = type.symbol?.getName() ?? type.aliasSymbol?.getName() ?? null;
  if (symbolName === 'DialogService' || symbolName === 'IDialogService') {
    return true;
  }
  return type.getProperty('open') != null
    && type.getProperty('closeAll') != null
    && type.getProperty('createChild') != null;
}

function dialogConfigurationExpressionIsEmptyDefault(
  expression: ts.Expression,
  bindings: SourceImportBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (readImportedExportName(current, bindings, BARE_DIALOG_CONFIGURATION_EXPORTS) === 'DialogConfiguration') {
    return true;
  }
  if (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
    if (current.expression.name.text === 'customize') {
      return false;
    }
    if (current.expression.name.text === 'withChild') {
      return dialogConfigurationExpressionIsEmptyDefault(current.expression.expression, bindings);
    }
  }
  return false;
}

function readDialogChildSettingsStates(
  reads: readonly DialogSourceRead[],
): ReadonlyMap<string, DialogServiceBaseSettingsState> {
  const states = new Map<string, DialogServiceBaseSettingsState>();
  for (const read of reads) {
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node)
        && ts.isPropertyAccessExpression(node.expression)
        && node.expression.name.text === 'withChild'
        && dialogConfigurationExpressionIsKnown(node.expression.expression, read.bindings)
      ) {
        const key = readStaticDialogChildKey(node.arguments[0] ?? null);
        if (key !== 'dynamic') {
          mergeDialogChildSettingsState(
            states,
            key,
            readDialogChildSettingsBaseState(node.arguments[1] ?? null),
          );
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(read.sourceFile);
  }
  return states;
}

function mergeDialogChildSettingsState(
  states: Map<string, DialogServiceBaseSettingsState>,
  key: string,
  next: DialogServiceBaseSettingsState,
): void {
  const current = states.get(key);
  if (current == null || current === next) {
    states.set(key, next);
    return;
  }
  if (
    current === DialogServiceBaseSettingsState.ValidBaseSettings
    || next === DialogServiceBaseSettingsState.ValidBaseSettings
  ) {
    states.set(key, DialogServiceBaseSettingsState.ValidBaseSettings);
    return;
  }
  if (
    current === DialogServiceBaseSettingsState.Unknown
    || next === DialogServiceBaseSettingsState.Unknown
  ) {
    states.set(key, DialogServiceBaseSettingsState.Unknown);
    return;
  }
  states.set(key, DialogServiceBaseSettingsState.InvalidBaseSettings);
}

function readDialogChildSettingsBaseState(
  expression: ts.Expression | null,
): DialogServiceBaseSettingsState {
  const returned = readDialogSettingsProviderReturnExpression(expression);
  return returned == null
    ? DialogServiceBaseSettingsState.Unknown
    : dialogSettingsExpressionBaseState(returned);
}

function readDialogSettingsProviderReturnExpression(
  expression: ts.Expression | null,
): ts.Expression | null {
  if (expression == null) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (ts.isArrowFunction(current)) {
    if (ts.isBlock(current.body)) {
      return readSingleReturnedExpression(current.body);
    }
    return current.body;
  }
  if (ts.isFunctionExpression(current)) {
    return readSingleReturnedExpression(current.body);
  }
  return null;
}

function readSingleReturnedExpression(
  block: ts.Block,
): ts.Expression | null {
  const returns = block.statements.filter(ts.isReturnStatement);
  return returns.length === 1 ? returns[0]?.expression ?? null : null;
}

function dialogConfigurationExpressionIsKnown(
  expression: ts.Expression,
  bindings: SourceImportBindings,
): boolean {
  const current = unwrapExpression(expression);
  const imported = readImportedExportName(current, bindings, DIALOG_CONFIGURATION_EXPORTS);
  if (imported != null) {
    return true;
  }
  if (ts.isCallExpression(current)) {
    if (readImportedExportName(current.expression, bindings, new Set(['createDialogConfiguration'])) === 'createDialogConfiguration') {
      return true;
    }
    if (
      ts.isPropertyAccessExpression(current.expression)
      && (current.expression.name.text === 'customize' || current.expression.name.text === 'withChild')
    ) {
      return dialogConfigurationExpressionIsKnown(current.expression.expression, bindings);
    }
  }
  return false;
}

function callIsDialogChildResolverAdmission(
  context: DialogReadContext,
  call: ts.CallExpression,
): boolean {
  if (!call.arguments.some((argument) => readDialogChildResolverCall(argument, context.bindings) != null)) {
    return false;
  }
  if (readImportedExportName(call.expression, context.kernelBindings, KERNEL_RESOLVER_EXPORTS) != null) {
    return true;
  }
  return ts.isPropertyAccessExpression(call.expression)
    && (call.expression.name.text === 'get' || call.expression.name.text === 'getResolver');
}

function readDialogChildResolverCall(
  expression: ts.Expression,
  bindings: SourceImportBindings,
): ts.CallExpression | null {
  const current = unwrapExpression(expression);
  if (
    ts.isCallExpression(current)
    && ts.isPropertyAccessExpression(current.expression)
    && current.expression.name.text === 'child'
    && readImportedExportName(current.expression.expression, bindings, DIALOG_SERVICE_EXPORTS) != null
  ) {
    return current;
  }
  return null;
}

function readStaticDialogChildKey(
  expression: ts.Expression | null,
): StaticDialogChildKey {
  if (expression == null) {
    return 'undefined';
  }
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) {
    return `string:${current.text}`;
  }
  if (ts.isNumericLiteral(current)) {
    return `number:${current.text}`;
  }
  if (
    ts.isPrefixUnaryExpression(current)
    && current.operator === ts.SyntaxKind.MinusToken
    && ts.isNumericLiteral(current.operand)
  ) {
    return `number:-${current.operand.text}`;
  }
  if (current.kind === ts.SyntaxKind.TrueKeyword) {
    return 'boolean:true';
  }
  if (current.kind === ts.SyntaxKind.FalseKeyword) {
    return 'boolean:false';
  }
  if (current.kind === ts.SyntaxKind.NullKeyword) {
    return 'null';
  }
  if (ts.isIdentifier(current) && current.text === 'undefined') {
    return 'undefined';
  }
  return 'dynamic';
}

function dialogSettingsObjectIsStaticallyInvalid(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  if (!ts.isObjectLiteralExpression(current)) {
    return false;
  }
  const component = readDialogSettingsPropertyValue(current, 'component');
  const template = readDialogSettingsPropertyValue(current, 'template');
  return dialogSettingsPropertyIsAbsentOrNullish(component)
    && dialogSettingsPropertyIsAbsentOrNullish(template);
}

function readDialogSettingsPropertyValue(
  object: ts.ObjectLiteralExpression,
  propertyName: string,
): DialogSettingsPropertyValue {
  let value: DialogSettingsPropertyValue = null;
  for (const property of object.properties) {
    if (ts.isSpreadAssignment(property)) {
      return 'dynamic';
    }
    const name = ts.isPropertyAssignment(property)
      || ts.isShorthandPropertyAssignment(property)
      || ts.isMethodDeclaration(property)
      || ts.isGetAccessorDeclaration(property)
      || ts.isSetAccessorDeclaration(property)
      ? readPropertyName(property.name)
      : null;
    if (name !== propertyName) {
      continue;
    }
    if (!ts.isPropertyAssignment(property)) {
      return 'dynamic';
    }
    value = property.initializer;
  }
  return value;
}

function dialogSettingsPropertyIsAbsentOrNullish(
  value: DialogSettingsPropertyValue,
): boolean {
  if (value == null) {
    return true;
  }
  if (value === 'dynamic') {
    return false;
  }
  const current = unwrapExpression(value);
  return current.kind === ts.SyntaxKind.NullKeyword
    || (ts.isIdentifier(current) && current.text === 'undefined')
    || ts.isVoidExpression(current);
}

function dialogIssueLocalKey(
  project: ProjectBootFrame,
  site: DialogIssueSourceSite,
  index: number,
): string {
  return [
    'dialog-issue',
    localKeyPart(project.projectKey),
    localKeyPart(site.issueKind),
    localKeyPart(site.sourcePath),
    `${site.start}`,
    `${site.end}`,
    `${index}`,
  ].join(':');
}

function distinctDialogIssueSites(
  sites: readonly DialogIssueSourceSite[],
): readonly DialogIssueSourceSite[] {
  const seen = new Set<string>();
  const distinct: DialogIssueSourceSite[] = [];
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
