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
  readonly childSettingsKeys: ReadonlySet<string>;
  readonly sites: DialogIssueSourceSite[];
}

interface DialogServiceRootSet {
  readonly services: ReadonlySet<string>;
  readonly instanceServiceMembers: ReadonlySet<string>;
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
    const sourceFile = typeSystem.readSourceFileByPath(source.path);
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
  const childSettingsKeys = readDialogChildSettingsKeys(reads);
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
      roots: readDialogServiceRoots(read.sourceFile, read.bindings),
      childSettingsKeys,
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
    if (key === 'dynamic' || context.childSettingsKeys.has(key)) {
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
  if (!expressionIsDialogServiceRoot(context, call.expression.expression)) {
    return;
  }
  const settings = call.arguments[0] ?? null;
  if (settings == null || !dialogSettingsObjectIsStaticallyInvalid(settings)) {
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
): DialogServiceRootSet {
  const services = new Set<string>();
  const instanceServiceMembers = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (nodeIsDialogServiceTyped(node, bindings) || expressionCreatesDialogServiceRoot(node.initializer ?? null, bindings)) {
        services.add(node.name.text);
      }
    } else if (ts.isPropertyDeclaration(node)) {
      const name = readPropertyName(node.name);
      if (name != null && (nodeIsDialogServiceTyped(node, bindings) || expressionCreatesDialogServiceRoot(node.initializer ?? null, bindings))) {
        instanceServiceMembers.add(name);
      }
    } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      if (nodeIsDialogServiceTyped(node, bindings) || expressionCreatesDialogServiceRoot(node.initializer ?? null, bindings)) {
        services.add(node.name.text);
        if (isParameterProperty(node)) {
          instanceServiceMembers.add(node.name.text);
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

function expressionIsDialogServiceRoot(
  context: DialogReadContext,
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  if (expressionCreatesDialogServiceRoot(current, context.bindings)) {
    return true;
  }
  if (ts.isIdentifier(current)) {
    return context.roots.services.has(current.text) || typeLooksLikeDialogService(context, current);
  }
  if (
    ts.isPropertyAccessExpression(current)
    && current.expression.kind === ts.SyntaxKind.ThisKeyword
  ) {
    return context.roots.instanceServiceMembers.has(current.name.text) || typeLooksLikeDialogService(context, current);
  }
  return typeLooksLikeDialogService(context, current);
}

function expressionCreatesDialogServiceRoot(
  expression: ts.Expression | null,
  bindings: SourceImportBindings,
): boolean {
  if (expression == null) {
    return false;
  }
  const current = unwrapExpression(expression);
  if (
    ts.isNewExpression(current)
    && readImportedExportName(current.expression, bindings, new Set(['DialogService'])) === 'DialogService'
  ) {
    return true;
  }
  return ts.isCallExpression(current)
    && current.arguments[0] != null
    && readImportedExportName(current.arguments[0], bindings, DIALOG_SERVICE_EXPORTS) != null;
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
  const type = context.checker.getTypeAtLocation(expression);
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

function readDialogChildSettingsKeys(
  reads: readonly DialogSourceRead[],
): ReadonlySet<string> {
  const keys = new Set<string>();
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
          keys.add(key);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(read.sourceFile);
  }
  return keys;
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
