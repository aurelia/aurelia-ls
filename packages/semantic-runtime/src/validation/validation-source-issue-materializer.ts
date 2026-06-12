import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import type { ConfigurationRecognitionProjectResult } from '../configuration/configuration-recognition-project-pass.js';
import {
  ConfigurationOptionValueKind,
} from '../configuration/configuration-option.js';
import {
  readImportedExportName,
  readSourceImportBindings,
  type SourceImportBindings,
} from '../evaluation/import-bindings.js';
import {
  AureliaSourceApiRootFacts,
  expressionCreatesFrameworkServiceRoot,
  sourceRootSymbolForMemberName,
  sourceRootSymbolForName,
  sourceRootSymbolForPropertyName,
} from '../framework/source-api-root-recognition.js';
import {
  isParameterProperty,
  readObjectPropertyExpression,
  readPropertyName,
  sourceSiteForNode,
  unwrapExpression,
} from '../evaluation/ts-syntax.js';
import { issuePublicationWithRecords } from '../kernel/issue-publication.js';
import type { IdentityHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import { sourceSpanAddressForSite, type SourceSpanSite } from '../kernel/source-address.js';
import {
  KernelStore,
  KernelStoreBatch,
} from '../kernel/store.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { symbolForExpression } from '../type-system/checker-node-helpers.js';
import {
  type FrameworkDeclarationSourcePathIndex,
  typeMatchesFrameworkDeclarationSource,
} from '../type-system/framework-declaration-source.js';
import { typeSystemSourcePathIndex } from '../type-system/source-path-index.js';
import { ValidationFrameworkErrorCode } from './framework-error-code.js';
import { ValidationProductDetails } from './product-details.js';
import {
  ValidationIssueKind,
  ValidationIssuePhase,
} from './validation-issue.js';
import {
  ValidationIssuePublisher,
  type ValidationIssuePublication,
} from './validation-issue-publication.js';
import { ValidationSourceIssueProjectResult } from './validation-source-issues.js';

const VALIDATION_MODULES = new Set([
  'aurelia',
  '@aurelia/validation',
  '@aurelia/validation-html',
]);

const VALIDATION_EXPORTS = new Set([
  'IValidationRules',
  'ModelBasedRule',
  'ModelValidationExpressionHydrator',
  'ValidationDeserializer',
  'ValidationRules',
  'parsePropertyName',
]);

const VALIDATION_RULES_EXPORTS = new Set([
  'IValidationRules',
  'ValidationRules',
]);

const VALIDATION_DECLARATION_SOURCE_FRAGMENTS = [
  '/aurelia/packages/validation/src/',
  '/@aurelia/validation/',
  '/@aurelia+validation',
] as const;

const VALIDATION_RULES_DECLARATIONS = {
  names: VALIDATION_RULES_EXPORTS,
  sourcePathFragments: VALIDATION_DECLARATION_SOURCE_FRAGMENTS,
} as const;

const VALIDATION_PROPERTY_RULE_DECLARATIONS = {
  names: new Set(['PropertyRule']),
  sourcePathFragments: VALIDATION_DECLARATION_SOURCE_FRAGMENTS,
} as const;

const PROPERTY_RULE_RESET_METHODS = new Set([
  'ensure',
  'ensureObject',
]);

const PROPERTY_RULE_ADD_METHODS = new Set([
  'required',
  'matches',
  'email',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'min',
  'max',
  'range',
  'between',
  'equals',
  'satisfiesState',
  'satisfies',
  'satisfiesRule',
]);

const PROPERTY_RULE_MODIFIER_METHODS = new Set([
  'withMessageKey',
  'withMessage',
  'when',
  'tag',
]);

const MODEL_RULE_NAMES = new Set([
  'required',
  'regex',
  'maxLength',
  'minLength',
  'maxItems',
  'minItems',
  'range',
  'between',
  'equals',
]);

interface ValidationIssueSourceSite extends SourceSpanSite {
  readonly sourcePath: string;
  readonly ownerIdentityHandle?: IdentityHandle | null;
  readonly phase: ValidationIssuePhase;
  readonly issueKind: ValidationIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: ValidationFrameworkErrorCode;
  readonly localName: string | null;
}

interface ValidationReadContext {
  readonly project: ProjectBootFrame;
  readonly typeSystem: TypeSystemProject;
  readonly sourcePath: string;
  readonly sourceFileAddressHandle: ProjectBootFrame['sourceFiles'][number]['addressHandle'];
  readonly sourceFile: ts.SourceFile;
  readonly checker: ts.TypeChecker;
  readonly sourcePathByFileName: FrameworkDeclarationSourcePathIndex;
  readonly bindings: SourceImportBindings;
  readonly sourceApiRoots: AureliaSourceApiRootFacts;
  readonly validationRulesRoots: ValidationRulesRootSet;
  readonly defaultModelHydratorActive: boolean;
  readonly sites: ValidationIssueSourceSite[];
}

interface ValidationRulesRootSet {
  readonly locals: ReadonlySet<ts.Symbol>;
  readonly instanceMembers: ReadonlySet<ts.Symbol>;
}

interface ValidationCallChainMethod {
  readonly name: string;
  readonly call: ts.CallExpression;
}

type LatestRuleState =
  | 'unknown'
  | 'present'
  | 'absent'
  | 'blocked';

/** Materializes source-backed diagnostics for validation rule DSL and model-rule hydration sites. */
export class ValidationSourceIssueMaterializer {
  private readonly publisher: ValidationIssuePublisher;

  constructor(
    readonly store: KernelStore,
  ) {
    this.publisher = new ValidationIssuePublisher(store);
  }

  materializeAndEmit(
    project: ProjectBootFrame,
    typeSystem: TypeSystemProject,
    configuration: ConfigurationRecognitionProjectResult,
    sourceApiRoots: AureliaSourceApiRootFacts,
  ): ValidationSourceIssueProjectResult {
    const sites = readValidationIssueSourceSites(project, typeSystem, configuration, sourceApiRoots);
    const publications = distinctValidationIssueSites(sites)
      .map((site, index) => this.publicationForSite(project, site, index));
    const records = publications.flatMap((publication) => publication.records);
    if (records.length > 0) {
      this.store.commit(new KernelStoreBatch(records, `validation-source-issues:${project.projectKey}`));
    }
    for (const publication of publications) {
      this.store.productDetails.add(ValidationProductDetails.Issue, publication.issue.productHandle, publication.issue);
    }
    return new ValidationSourceIssueProjectResult(
      publications.map((publication) => publication.issue),
      records,
    );
  }

  private publicationForSite(
    project: ProjectBootFrame,
    site: ValidationIssueSourceSite,
    index: number,
  ): ValidationIssuePublication {
    const local = validationIssueLocalKey(project, site, index);
    const source = sourceSpanAddressForSite(this.store, local, site);
    const publication = this.publisher.publish(
      project.projectKey,
      site.ownerIdentityHandle ?? null,
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

function readValidationIssueSourceSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  configuration: ConfigurationRecognitionProjectResult,
  sourceApiRoots: AureliaSourceApiRootFacts,
): readonly ValidationIssueSourceSite[] {
  const defaultModelHydratorActive = validationDefaultModelHydratorActive(configuration);
  const sourcePathByFileName = typeSystemSourcePathIndex(project, typeSystem);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    if (sourceFile == null) {
      return [];
    }
    const bindings = readSourceImportBindings(sourceFile, VALIDATION_MODULES, VALIDATION_EXPORTS);
    const context: ValidationReadContext = {
      project,
      typeSystem,
      sourcePath: source.path,
      sourceFileAddressHandle: source.addressHandle,
      sourceFile,
      checker: typeSystem.checker,
      sourcePathByFileName,
      bindings,
      sourceApiRoots,
      validationRulesRoots: readValidationRulesRoots(typeSystem, source.path, sourceFile, bindings, sourceApiRoots),
      defaultModelHydratorActive,
      sites: [],
    };
    visitValidationSourceNode(context, sourceFile);
    return context.sites;
  });
}

function visitValidationSourceNode(
  context: ValidationReadContext,
  node: ts.Node,
): void {
  if (ts.isCallExpression(node)) {
    readValidationCallIssues(context, node);
  } else if (ts.isNewExpression(node)) {
    readModelBasedRuleIssues(context, node);
  }

  ts.forEachChild(node, (child) => visitValidationSourceNode(context, child));
}

function readValidationRulesRoots(
  typeSystem: TypeSystemProject,
  sourcePath: string,
  sourceFile: ts.SourceFile,
  bindings: SourceImportBindings,
  sourceApiRoots: AureliaSourceApiRootFacts,
): ValidationRulesRootSet {
  const locals = new Set<ts.Symbol>();
  const instanceMembers = new Set<ts.Symbol>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (nodeIsValidationRulesTyped(node, bindings) || expressionCreatesValidationRulesRoot(sourcePath, sourceFile, node.initializer ?? null, bindings, sourceApiRoots)) {
        addValidationRulesRoot(locals, typeSystem, node.name);
      }
    } else if (ts.isPropertyDeclaration(node)) {
      if (nodeIsValidationRulesTyped(node, bindings) || expressionCreatesValidationRulesRoot(sourcePath, sourceFile, node.initializer ?? null, bindings, sourceApiRoots)) {
        addValidationRulesPropertyRoot(instanceMembers, typeSystem, node.name);
      }
    } else if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      if (
        nodeIsValidationRulesTyped(node, bindings)
        || expressionCreatesValidationRulesRoot(sourcePath, sourceFile, node.initializer ?? null, bindings, sourceApiRoots)
        || sourceApiRoots.parameterIsAppTaskDeclaredServiceRoot(sourcePath, sourceFile, node.name, bindings, VALIDATION_RULES_EXPORTS)
      ) {
        addValidationRulesRoot(locals, typeSystem, node.name);
        if (isParameterProperty(node)) {
          addValidationRulesRoot(instanceMembers, typeSystem, node.name);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return {
    locals,
    instanceMembers,
  };
}

function addValidationRulesRoot(
  roots: Set<ts.Symbol>,
  typeSystem: TypeSystemProject,
  name: ts.Identifier,
): void {
  const symbol = sourceRootSymbolForName(typeSystem, name);
  if (symbol != null) {
    roots.add(symbol);
  }
}

function addValidationRulesPropertyRoot(
  roots: Set<ts.Symbol>,
  typeSystem: TypeSystemProject,
  name: ts.PropertyName,
): void {
  const symbol = sourceRootSymbolForPropertyName(typeSystem, name);
  if (symbol != null) {
    roots.add(symbol);
  }
}

function nodeIsValidationRulesTyped(
  node: { readonly type?: ts.TypeNode },
  bindings: SourceImportBindings,
): boolean {
  return node.type != null && typeNodeReferencesImportedValidationRules(node.type, bindings);
}

function typeNodeReferencesImportedValidationRules(
  type: ts.TypeNode,
  bindings: SourceImportBindings,
): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      ts.isTypeReferenceNode(node)
      && importedValidationRulesTypeName(node.typeName, bindings)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(type);
  return found;
}

function importedValidationRulesTypeName(
  name: ts.EntityName,
  bindings: SourceImportBindings,
): boolean {
  if (ts.isIdentifier(name)) {
    const exportedName = bindings.locals.get(name.text);
    return exportedName === 'IValidationRules' || exportedName === 'ValidationRules';
  }
  return ts.isIdentifier(name.left)
    && bindings.namespaces.has(name.left.text)
    && (name.right.text === 'IValidationRules' || name.right.text === 'ValidationRules');
}

function expressionCreatesValidationRulesRoot(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  expression: ts.Expression | null,
  bindings: SourceImportBindings,
  sourceApiRoots: AureliaSourceApiRootFacts,
): boolean {
  return expressionCreatesFrameworkServiceRoot(
    sourceApiRoots,
    sourcePath,
    sourceFile,
    expression,
    bindings,
    VALIDATION_RULES_EXPORTS,
  );
}

function readValidationCallIssues(
  context: ValidationReadContext,
  call: ts.CallExpression,
): void {
  readFluentRuleModifierIssue(context, call);
  readValidationAccessorIssues(context, call);
  readValidationGroupRuleResultIssues(context, call);
}

function readFluentRuleModifierIssue(
  context: ValidationReadContext,
  call: ts.CallExpression,
): void {
  const callee = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(callee) || !PROPERTY_RULE_MODIFIER_METHODS.has(callee.name.text)) {
    return;
  }
  if (!isPropertyRuleLikeExpression(context, callee.expression)) {
    return;
  }
  const state = latestRuleStateBeforeModifier(callee.expression);
  if (state !== 'absent') {
    return;
  }
  context.sites.push(sourceSiteForNode(
    context,
    call,
    {
      phase: ValidationIssuePhase.FluentRuleConstruction,
      issueKind: ValidationIssueKind.RuleProviderNoRuleFound,
      frameworkErrorCode: ValidationFrameworkErrorCode.RuleProviderNoRuleFound,
      message: `${callee.name.text}(...) is called before this PropertyRule chain has added a validation rule.`,
      localName: callee.name.text,
      ownerIdentityHandle: validationRulesRootOwnerIdentity(context, callee.expression),
    },
  ));
}

function latestRuleStateBeforeModifier(
  receiver: ts.Expression,
): LatestRuleState {
  const methods = validationCallChainMethods(receiver);
  let state: LatestRuleState = 'unknown';
  for (const method of methods) {
    if (PROPERTY_RULE_MODIFIER_METHODS.has(method.name) && state === 'absent') {
      return 'blocked';
    }
    if (PROPERTY_RULE_RESET_METHODS.has(method.name)) {
      state = 'absent';
      continue;
    }
    if (PROPERTY_RULE_ADD_METHODS.has(method.name)) {
      state = 'present';
    }
  }
  return state;
}

function validationCallChainMethods(
  expression: ts.Expression,
): readonly ValidationCallChainMethod[] {
  const methods: ValidationCallChainMethod[] = [];
  let current = unwrapExpression(expression);
  while (ts.isCallExpression(current)) {
    const callee = unwrapExpression(current.expression);
    if (!ts.isPropertyAccessExpression(callee)) {
      break;
    }
    methods.unshift({
      name: callee.name.text,
      call: current,
    });
    current = unwrapExpression(callee.expression);
  }
  return methods;
}

function readValidationAccessorIssues(
  context: ValidationReadContext,
  call: ts.CallExpression,
): void {
  const callee = unwrapExpression(call.expression);
  if (ts.isPropertyAccessExpression(callee)) {
    const methodName = callee.name.text;
    if (methodName === 'ensure' && isValidationRulesOrPropertyRuleExpression(context, callee.expression)) {
      readPropertyAccessorArgumentIssue(context, call.arguments[0] ?? null, validationRulesRootOwnerIdentity(context, callee.expression));
      return;
    }
    if (methodName === 'ensureGroup' && isValidationRulesOrPropertyRuleExpression(context, callee.expression)) {
      readEnsureGroupPropertyAccessorIssues(context, call, validationRulesRootOwnerIdentity(context, callee.expression));
      return;
    }
  }

  if (readImportedExportName(callee, context.bindings, new Set(['parsePropertyName'])) === 'parsePropertyName') {
    readPropertyAccessorArgumentIssue(context, call.arguments[0] ?? null, null);
  }
}

function readPropertyAccessorArgumentIssue(
  context: ValidationReadContext,
  argument: ts.Expression | null,
  ownerIdentityHandle: IdentityHandle | null,
): void {
  if (argument == null || ts.isSpreadElement(argument)) {
    return;
  }
  const reason = validationPropertyAccessorFailure(context, argument);
  if (reason == null) {
    return;
  }
  context.sites.push(sourceSiteForNode(
    context,
    argument,
    {
      phase: ValidationIssuePhase.AccessorParsing,
      issueKind: ValidationIssueKind.UnableToParseAccessorFunction,
      frameworkErrorCode: ValidationFrameworkErrorCode.UnableToParseAccessorFunction,
      message: reason,
      localName: 'property-accessor',
      ownerIdentityHandle,
    },
  ));
}

function readEnsureGroupPropertyAccessorIssues(
  context: ValidationReadContext,
  call: ts.CallExpression,
  ownerIdentityHandle: IdentityHandle | null,
): void {
  const properties = unwrapExpression(call.arguments[0] ?? call);
  if (!ts.isArrayLiteralExpression(properties)) {
    return;
  }
  for (const element of properties.elements) {
    if (ts.isSpreadElement(element)) {
      continue;
    }
    readPropertyAccessorArgumentIssue(context, element, ownerIdentityHandle);
  }
}

function validationPropertyAccessorFailure(
  context: ValidationReadContext,
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) {
    return null;
  }
  const fn = resolveFunctionLikeExpression(context.checker, current);
  if (fn == null) {
    return definitelyInvalidPropertyAccessor(current)
      ? 'Validation property accessors must be strings or simple property accessor functions.'
      : null;
  }
  return propertyPathFromAccessorFunction(fn) == null
    ? 'Validation accessor functions must return a direct property/keyed access path rooted at their single parameter.'
    : null;
}

function readValidationGroupRuleResultIssues(
  context: ValidationReadContext,
  call: ts.CallExpression,
): void {
  const callee = unwrapExpression(call.expression);
  if (
    !ts.isPropertyAccessExpression(callee)
    || callee.name.text !== 'ensureGroup'
    || !isValidationRulesOrPropertyRuleExpression(context, callee.expression)
  ) {
    return;
  }
  const groupProperties = closedEnsureGroupProperties(context, call.arguments[0] ?? null);
  if (groupProperties == null) {
    return;
  }
  const callback = call.arguments[1] == null || ts.isSpreadElement(call.arguments[1])
    ? null
    : resolveFunctionLikeExpression(context.checker, unwrapExpression(call.arguments[1]));
  if (callback == null) {
    return;
  }
  for (const result of closedGroupRuleResultObjects(callback)) {
    const property = readObjectPropertyExpression(result, 'property');
    if (property == null) {
      context.sites.push(sourceSiteForNode(
        context,
        result,
        {
          phase: ValidationIssuePhase.GroupRuleExecution,
          issueKind: ValidationIssueKind.GroupRuleInvalidExecutionResult,
          frameworkErrorCode: ValidationFrameworkErrorCode.GroupRuleInvalidExecutionResult,
          message: 'Group rule result object does not contain a property name.',
          localName: 'group-rule-result',
          ownerIdentityHandle: validationRulesRootOwnerIdentity(context, callee.expression),
        },
      ));
      continue;
    }
    const propertyName = staticStringValue(property);
    if (propertyName == null) {
      continue;
    }
    if (!groupProperties.has(propertyName)) {
      context.sites.push(sourceSiteForNode(
        context,
        property,
        {
          phase: ValidationIssuePhase.GroupRuleExecution,
          issueKind: ValidationIssueKind.GroupRuleInvalidExecutionResult,
          frameworkErrorCode: ValidationFrameworkErrorCode.GroupRuleInvalidExecutionResult,
          message: `Group rule result targets "${propertyName}", but that property is not part of the group.`,
          localName: propertyName,
          ownerIdentityHandle: validationRulesRootOwnerIdentity(context, callee.expression),
        },
      ));
    }
  }
}

function closedEnsureGroupProperties(
  context: ValidationReadContext,
  expression: ts.Expression | null,
): ReadonlySet<string> | null {
  if (expression == null || ts.isSpreadElement(expression)) {
    return null;
  }
  const current = unwrapExpression(expression);
  if (!ts.isArrayLiteralExpression(current)) {
    return null;
  }
  const properties = new Set<string>();
  for (const element of current.elements) {
    if (ts.isSpreadElement(element)) {
      return null;
    }
    const property = validationPropertyName(context, element);
    if (property == null) {
      return null;
    }
    properties.add(property);
  }
  return properties;
}

function validationPropertyName(
  context: ValidationReadContext,
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) {
    return current.text;
  }
  const fn = resolveFunctionLikeExpression(context.checker, current);
  return fn == null ? null : propertyPathFromAccessorFunction(fn);
}

function closedGroupRuleResultObjects(
  fn: ts.FunctionLikeDeclaration,
): readonly ts.ObjectLiteralExpression[] {
  const body = fn.body;
  if (body == null) {
    return [];
  }
  if (ts.isBlock(body)) {
    const objects: ts.ObjectLiteralExpression[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isReturnStatement(node) && node.expression != null) {
        const expression = unwrapExpression(node.expression);
        if (ts.isObjectLiteralExpression(expression)) {
          objects.push(expression);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(body);
    return objects;
  }
  const expression = unwrapExpression(body);
  return ts.isObjectLiteralExpression(expression) ? [expression] : [];
}

function readModelBasedRuleIssues(
  context: ValidationReadContext,
  expression: ts.NewExpression,
): void {
  if (
    !context.defaultModelHydratorActive
    || readImportedExportName(expression.expression, context.bindings, new Set(['ModelBasedRule'])) !== 'ModelBasedRule'
  ) {
    return;
  }
  const ruleset = expression.arguments?.[0] ?? null;
  const current = ruleset == null || ts.isSpreadElement(ruleset)
    ? null
    : unwrapExpression(ruleset);
  if (current == null || !ts.isObjectLiteralExpression(current)) {
    return;
  }
  readModelRuleObjectIssues(context, current, []);
}

function readModelRuleObjectIssues(
  context: ValidationReadContext,
  object: ts.ObjectLiteralExpression,
  path: readonly string[],
): void {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    const propertyName = readPropertyName(property.name);
    const value = unwrapExpression(property.initializer);
    if (propertyName == null || !ts.isObjectLiteralExpression(value)) {
      continue;
    }
    const currentPath = [...path, propertyName];
    if (isModelPropertyRule(value)) {
      readModelPropertyRuleIssues(context, property, value, currentPath);
      continue;
    }
    readModelRuleObjectIssues(context, value, currentPath);
  }
}

function readModelPropertyRuleIssues(
  context: ValidationReadContext,
  property: ts.PropertyAssignment,
  ruleObject: ts.ObjectLiteralExpression,
  path: readonly string[],
): void {
  const propertyPath = modelPropertyPath(path);
  if (propertyPath.length === 0) {
    context.sites.push(sourceSiteForNode(
      context,
      property.name,
      {
        phase: ValidationIssuePhase.ModelRuleHydration,
        issueKind: ValidationIssueKind.HydrateRuleInvalidName,
        frameworkErrorCode: ValidationFrameworkErrorCode.HydrateRuleInvalidName,
        message: 'Model-based validation property names must be non-empty strings.',
        localName: propertyPath,
      },
    ));
  }
  const rules = readObjectPropertyExpression(ruleObject, 'rules');
  const currentRules = rules == null ? null : unwrapExpression(rules);
  if (currentRules == null || !ts.isArrayLiteralExpression(currentRules)) {
    return;
  }
  for (const ruleset of currentRules.elements) {
    if (ts.isSpreadElement(ruleset)) {
      continue;
    }
    const currentRuleset = unwrapExpression(ruleset);
    if (!ts.isObjectLiteralExpression(currentRuleset)) {
      continue;
    }
    for (const rule of currentRuleset.properties) {
      if (!ts.isPropertyAssignment(rule)) {
        continue;
      }
      const ruleName = readPropertyName(rule.name);
      if (ruleName == null || MODEL_RULE_NAMES.has(ruleName)) {
        continue;
      }
      context.sites.push(sourceSiteForNode(
        context,
        rule.name,
        {
          phase: ValidationIssuePhase.ModelRuleHydration,
          issueKind: ValidationIssueKind.HydrateRuleUnsupported,
          frameworkErrorCode: ValidationFrameworkErrorCode.HydrateRuleUnsupported,
          message: `The default validation model-rule hydrator does not support rule "${ruleName}".`,
          localName: ruleName,
        },
      ));
    }
  }
}

function isModelPropertyRule(
  object: ts.ObjectLiteralExpression,
): boolean {
  return readObjectPropertyExpression(object, 'rules') != null;
}

function modelPropertyPath(
  segments: readonly string[],
): string {
  let path = '';
  for (const segment of segments) {
    path = path === '' ? segment : `${path}.${segment}`;
  }
  return path;
}

function validationDefaultModelHydratorActive(
  configuration: ConfigurationRecognitionProjectResult,
): boolean {
  const contributions = configuration.readConfiguration().optionContributions.filter((contribution) =>
    (contribution.configurationKind === FrameworkRegistrationKind.ValidationConfiguration
      || contribution.configurationKind === FrameworkRegistrationKind.ValidationHtmlConfiguration)
    && contribution.optionPath[contribution.optionPath.length - 1] === 'HydratorType'
  );
  if (contributions.length === 0) {
    return true;
  }
  return contributions.every((contribution) =>
    contribution.value.valueKind === ConfigurationOptionValueKind.Identity
    && contribution.value.localName === 'ModelValidationExpressionHydrator'
  );
}

function isValidationRulesOrPropertyRuleExpression(
  context: ValidationReadContext,
  expression: ts.Expression,
): boolean {
  return isValidationRulesLikeExpression(context, expression)
    || isPropertyRuleLikeExpression(context, expression);
}

function isValidationRulesLikeExpression(
  context: ValidationReadContext,
  expression: ts.Expression,
): boolean {
  if (expressionIsValidationRulesRoot(context, expression)) {
    return true;
  }
  const root = validationCallChainRulesRoot(context, expression);
  if (root != null && root !== unwrapExpression(expression)) {
    return true;
  }
  const type = context.typeSystem.readProgramTypeAtLocation(expression);
  return typeMatchesFrameworkDeclarationSource(
    type,
    context.checker,
    context.sourcePathByFileName,
    VALIDATION_RULES_DECLARATIONS,
  );
}

function isPropertyRuleLikeExpression(
  context: ValidationReadContext,
  expression: ts.Expression,
): boolean {
  if (validationCallChainRulesRoot(context, expression) != null) {
    return true;
  }
  const type = context.typeSystem.readProgramTypeAtLocation(expression);
  return typeMatchesFrameworkDeclarationSource(
    type,
    context.checker,
    context.sourcePathByFileName,
    VALIDATION_PROPERTY_RULE_DECLARATIONS,
  );
}

function validationCallChainRulesRoot(
  context: ValidationReadContext,
  expression: ts.Expression,
): ts.Expression | null {
  let current = unwrapExpression(expression);
  if (expressionIsValidationRulesRoot(context, current)) {
    return current;
  }
  while (ts.isCallExpression(current)) {
    const callee = unwrapExpression(current.expression);
    if (!ts.isPropertyAccessExpression(callee)) {
      return null;
    }
    const receiver = unwrapExpression(callee.expression);
    if (expressionIsValidationRulesRoot(context, receiver)) {
      return receiver;
    }
    current = receiver;
  }
  return expressionIsValidationRulesRoot(context, current) ? current : null;
}

function validationRulesRootOwnerIdentity(
  context: ValidationReadContext,
  expression: ts.Expression,
): IdentityHandle | null {
  const root = validationCallChainRulesRoot(context, expression);
  return root == null
    ? null
    : context.sourceApiRoots.serviceRootIdentityForExpression(
      context.sourcePath,
      context.sourceFile,
      root,
      VALIDATION_RULES_EXPORTS,
    )?.identityHandle ?? null;
}

function expressionIsValidationRulesRoot(
  context: ValidationReadContext,
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  if (expressionCreatesValidationRulesRoot(context.sourcePath, context.sourceFile, current, context.bindings, context.sourceApiRoots)) {
    return true;
  }
  if (context.sourceApiRoots.expressionIsAppTaskDeclaredServiceRoot(
    context.sourcePath,
    context.sourceFile,
    current,
    context.bindings,
    VALIDATION_RULES_EXPORTS,
  )) {
    return true;
  }
  if (ts.isIdentifier(current)) {
    const symbol = sourceRootSymbolForName(context.typeSystem, current);
    return symbol != null && context.validationRulesRoots.locals.has(symbol);
  }
  if (
    ts.isPropertyAccessExpression(current)
    && current.expression.kind === ts.SyntaxKind.ThisKeyword
  ) {
    const symbol = sourceRootSymbolForMemberName(context.typeSystem, current.name);
    return symbol != null && context.validationRulesRoots.instanceMembers.has(symbol);
  }
  return false;
}

function resolveFunctionLikeExpression(
  checker: ts.TypeChecker,
  expression: ts.Expression,
): ts.FunctionLikeDeclaration | null {
  const current = unwrapExpression(expression);
  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
    return current;
  }
  if (!ts.isIdentifier(current)) {
    return null;
  }
  const symbol = symbolForExpression(checker, current);
  const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? null;
  if (declaration == null) {
    return null;
  }
  if (ts.isFunctionDeclaration(declaration)) {
    return declaration;
  }
  if (
    ts.isVariableDeclaration(declaration)
    && declaration.initializer != null
    && (ts.isArrowFunction(unwrapExpression(declaration.initializer)) || ts.isFunctionExpression(unwrapExpression(declaration.initializer)))
  ) {
    return unwrapExpression(declaration.initializer) as ts.ArrowFunction | ts.FunctionExpression;
  }
  return null;
}

function propertyPathFromAccessorFunction(
  fn: ts.FunctionLikeDeclaration,
): string | null {
  const parameter = fn.parameters[0];
  if (parameter == null || fn.parameters.length !== 1 || !ts.isIdentifier(parameter.name)) {
    return null;
  }
  const body = fn.body;
  if (body == null) {
    return null;
  }
  if (ts.isBlock(body)) {
    const returns = body.statements.filter(ts.isReturnStatement);
    const statement = returns[0] ?? null;
    const path = returns.length === 1 && statement?.expression != null
      ? propertyPathFromExpression(unwrapExpression(statement.expression), parameter.name.text)
      : null;
    return path === '' ? null : path;
  }
  const path = propertyPathFromExpression(unwrapExpression(body), parameter.name.text);
  return path === '' ? null : path;
}

function propertyPathFromExpression(
  expression: ts.Expression,
  parameterName: string,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text === parameterName ? '' : null;
  }
  if (ts.isPropertyAccessExpression(current)) {
    const parent = propertyPathFromExpression(current.expression, parameterName);
    return parent == null ? null : appendPropertyPathSegment(parent, current.name.text);
  }
  if (ts.isElementAccessExpression(current) && current.argumentExpression != null) {
    const parent = propertyPathFromExpression(current.expression, parameterName);
    const segment = staticStringValue(current.argumentExpression);
    return parent == null || segment == null ? null : appendPropertyPathSegment(parent, `[${segment}]`);
  }
  return null;
}

function appendPropertyPathSegment(
  parent: string,
  segment: string,
): string | null {
  if (parent === '' && segment.startsWith('[')) {
    return segment;
  }
  return segment.startsWith('[')
    ? `${parent}${segment}`
    : parent === ''
      ? segment
      : `${parent}.${segment}`;
}

function definitelyInvalidPropertyAccessor(
  expression: ts.Expression,
): boolean {
  const current = unwrapExpression(expression);
  return ts.isNumericLiteral(current)
    || current.kind === ts.SyntaxKind.TrueKeyword
    || current.kind === ts.SyntaxKind.FalseKeyword
    || current.kind === ts.SyntaxKind.NullKeyword
    || ts.isObjectLiteralExpression(current)
    || ts.isArrayLiteralExpression(current);
}

function staticStringValue(
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current) || ts.isNumericLiteral(current)) {
    return current.text;
  }
  if (
    current.kind === ts.SyntaxKind.NullKeyword
    || (ts.isIdentifier(current) && current.text === 'undefined')
  ) {
    return '';
  }
  return null;
}

function distinctValidationIssueSites(
  sites: readonly ValidationIssueSourceSite[],
): readonly ValidationIssueSourceSite[] {
  const seen = new Set<string>();
  const distinct: ValidationIssueSourceSite[] = [];
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

function validationIssueLocalKey(
  project: ProjectBootFrame,
  site: ValidationIssueSourceSite,
  index: number,
): string {
  return [
    'validation-source-issue',
    site.issueKind,
    localKeyPart(project.projectKey),
    localKeyPart(site.sourcePath),
    site.start,
    site.end,
    index,
  ].join(':');
}
