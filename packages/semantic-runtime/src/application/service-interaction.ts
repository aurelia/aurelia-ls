import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import { isAssignmentOperator, unwrapExpression } from '../evaluation/ts-syntax.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  normalizeTypeSystemSourceFileName,
  typeSystemSourcePathIndex,
} from '../type-system/source-path-index.js';
import {
  classElementName,
  isClassMemberWithExpressionChildren,
} from '../type-system/ts-class-member.js';
import type { ApplicationSupportSourceRole } from './support-source-role.js';

export type ApplicationServiceInteractionOperationKind = 'call' | 'read' | 'write';

export interface ApplicationServiceClassTarget {
  readonly sourcePath: string;
  readonly role: ApplicationSupportSourceRole;
  readonly className: string;
}

export interface ApplicationServiceInjectionTarget {
  readonly sourcePath: string;
  readonly enclosingClassName: string | null;
  readonly enclosingMemberName: string | null;
  readonly keyDeclarationSourcePath: string | null;
  readonly keyDeclarationName: string | null;
  readonly keyDeclarationRole: ApplicationSupportSourceRole | null;
}

/** Source-backed operation from app code into a topology service/state/model class. */
export class ApplicationServiceInteractionSite {
  readonly kind = 'application-service-interaction-site' as const;

  constructor(
    readonly operationKind: ApplicationServiceInteractionOperationKind,
    readonly sourcePath: string,
    readonly start: number,
    readonly end: number,
    readonly consumerClassName: string | null,
    readonly consumerMemberName: string | null,
    readonly targetSourcePath: string,
    readonly targetRole: ApplicationSupportSourceRole,
    readonly targetClassName: string,
    readonly memberName: string,
    readonly argumentCount: number,
    readonly isSelfInteraction: boolean,
  ) {}
}

export function readApplicationServiceInteractionSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  targets: readonly ApplicationServiceClassTarget[],
  injections: readonly ApplicationServiceInjectionTarget[],
): readonly ApplicationServiceInteractionSite[] {
  const sourcePathByFileName = typeSystemSourcePathIndex(project, typeSystem);
  const targetBySourceAndClass = serviceTargetsBySourceAndClass(targets);
  const injectedMemberTargets = serviceTargetsByInjectedMember(injections, targetBySourceAndClass);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    return sourceFile == null
      ? []
      : readSourceFileServiceInteractionSites(
        source.path,
        sourceFile,
        typeSystem,
        sourcePathByFileName,
        targetBySourceAndClass,
        injectedMemberTargets,
      );
  });
}

function readSourceFileServiceInteractionSites(
  sourcePath: string,
  sourceFile: ts.SourceFile,
  typeSystem: TypeSystemProject,
  sourcePathByFileName: ReadonlyMap<string, string>,
  targetBySourceAndClass: ReadonlyMap<string, ApplicationServiceClassTarget>,
  injectedMemberTargets: ReadonlyMap<string, ApplicationServiceClassTarget>,
): readonly ApplicationServiceInteractionSite[] {
  const context: ServiceInteractionReadContext = {
    sourcePath,
    sourceFile,
    typeSystem,
    checker: typeSystem.checker,
    sourcePathByFileName,
    targetBySourceAndClass,
    injectedMemberTargets,
    sites: [],
  };
  visitServiceInteractionChildren(context, sourceFile, null, null);
  return context.sites;
}

interface ServiceInteractionReadContext {
  readonly sourcePath: string;
  readonly sourceFile: ts.SourceFile;
  readonly typeSystem: TypeSystemProject;
  readonly checker: ts.TypeChecker;
  readonly sourcePathByFileName: ReadonlyMap<string, string>;
  readonly targetBySourceAndClass: ReadonlyMap<string, ApplicationServiceClassTarget>;
  readonly injectedMemberTargets: ReadonlyMap<string, ApplicationServiceClassTarget>;
  readonly sites: ApplicationServiceInteractionSite[];
}

function visitSourceFileServiceInteractionNode(
  context: ServiceInteractionReadContext,
  node: ts.Node,
  enclosingClassName: string | null,
  enclosingMemberName: string | null,
): void {
  if (ts.isClassDeclaration(node) && node.name != null) {
    visitServiceInteractionChildren(context, node, node.name.text, null);
    return;
  }
  if (isClassMemberWithExpressionChildren(node)) {
    visitServiceInteractionChildren(context, node, enclosingClassName, classElementName(node, context.sourceFile));
    return;
  }
  recordCallServiceInteraction(context, node, enclosingClassName, enclosingMemberName);
  recordPropertyServiceInteraction(context, node, enclosingClassName, enclosingMemberName);
  visitServiceInteractionChildren(context, node, enclosingClassName, enclosingMemberName);
}

function visitServiceInteractionChildren(
  context: ServiceInteractionReadContext,
  node: ts.Node,
  enclosingClassName: string | null,
  enclosingMemberName: string | null,
): void {
  ts.forEachChild(node, (child) =>
    visitSourceFileServiceInteractionNode(context, child, enclosingClassName, enclosingMemberName)
  );
}

function recordCallServiceInteraction(
  context: ServiceInteractionReadContext,
  node: ts.Node,
  enclosingClassName: string | null,
  enclosingMemberName: string | null,
): void {
  if (!ts.isCallExpression(node)) {
    return;
  }
  const target = serviceInteractionTarget(context, node.expression, enclosingClassName);
  if (target != null) {
    pushServiceInteractionSite(context, node, enclosingClassName, enclosingMemberName, 'call', target, node.arguments.length);
  }
}

function recordPropertyServiceInteraction(
  context: ServiceInteractionReadContext,
  node: ts.Node,
  enclosingClassName: string | null,
  enclosingMemberName: string | null,
): void {
  if (!ts.isPropertyAccessExpression(node)) {
    return;
  }
  const operationKind = propertyAccessOperationKind(node);
  const target = operationKind == null ? null : serviceInteractionTarget(context, node, enclosingClassName);
  if (operationKind != null && target != null) {
    pushServiceInteractionSite(context, node, enclosingClassName, enclosingMemberName, operationKind, target, 0);
  }
}

function pushServiceInteractionSite(
  context: ServiceInteractionReadContext,
  node: ts.Node,
  enclosingClassName: string | null,
  enclosingMemberName: string | null,
  operationKind: ApplicationServiceInteractionOperationKind,
  target: ApplicationServiceInteractionTarget,
  argumentCount: number,
): void {
  context.sites.push(new ApplicationServiceInteractionSite(
    operationKind,
    context.sourcePath,
    node.getStart(context.sourceFile),
    node.end,
    enclosingClassName,
    enclosingMemberName,
    target.service.sourcePath,
    target.service.role,
    target.service.className,
    target.memberName,
    argumentCount,
    isSelfInteraction(context.sourcePath, enclosingClassName, target.service),
  ));
}

interface ApplicationServiceInteractionTarget {
  readonly service: ApplicationServiceClassTarget;
  readonly memberName: string;
}

function serviceInteractionTarget(
  context: ServiceInteractionReadContext,
  expression: ts.Expression,
  enclosingClassName: string | null,
): ApplicationServiceInteractionTarget | null {
  if (!ts.isPropertyAccessExpression(expression)) {
    return null;
  }
  const service = serviceClassForReceiver(
    context,
    expression.expression,
    enclosingClassName,
  );
  return service == null
    ? null
    : {
      service,
      memberName: expression.name.text,
    };
}

function serviceClassForReceiver(
  context: ServiceInteractionReadContext,
  receiver: ts.Expression,
  enclosingClassName: string | null,
): ApplicationServiceClassTarget | null {
  const injectedService = serviceTargetForInjectedMember(
    receiver,
    context.sourcePath,
    enclosingClassName,
    context.injectedMemberTargets,
  );
  if (injectedService != null) {
    return injectedService;
  }
  const type = context.typeSystem.readProgramTypeAtLocation(receiver);
  if (type == null) {
    return null;
  }
  const symbol = type.aliasSymbol ?? type.getSymbol() ?? null;
  if (symbol == null) {
    return null;
  }
  const declaration = symbol?.declarations?.[0] ?? null;
  if (declaration == null || !ts.isClassDeclaration(declaration)) {
    return null;
  }
  const className = declaration.name?.text ?? symbol.getName();
  const targetSourcePath = context.sourcePathByFileName.get(
    normalizeTypeSystemSourceFileName(declaration.getSourceFile().fileName),
  ) ?? null;
  return targetSourcePath == null
    ? null
    : context.targetBySourceAndClass.get(serviceTargetKey(targetSourcePath, className)) ?? null;
}

function serviceTargetsBySourceAndClass(
  targets: readonly ApplicationServiceClassTarget[],
): ReadonlyMap<string, ApplicationServiceClassTarget> {
  return new Map(targets.map((target) => [serviceTargetKey(target.sourcePath, target.className), target]));
}

function serviceTargetsByInjectedMember(
  injections: readonly ApplicationServiceInjectionTarget[],
  targetBySourceAndClass: ReadonlyMap<string, ApplicationServiceClassTarget>,
): ReadonlyMap<string, ApplicationServiceClassTarget> {
  const targets = new Map<string, ApplicationServiceClassTarget>();
  for (const injection of injections) {
    if (
      injection.enclosingClassName == null
      || injection.enclosingMemberName == null
      || injection.keyDeclarationSourcePath == null
      || injection.keyDeclarationName == null
    ) {
      continue;
    }
    const target = targetBySourceAndClass.get(
      serviceTargetKey(injection.keyDeclarationSourcePath, injection.keyDeclarationName),
    ) ?? null;
    if (target != null) {
      targets.set(
        injectedMemberTargetKey(
          injection.sourcePath,
          injection.enclosingClassName,
          injection.enclosingMemberName,
        ),
        target,
      );
    }
  }
  return targets;
}

function serviceTargetKey(sourcePath: string, className: string): string {
  return `${sourcePath}\0${className}`;
}

function serviceTargetForInjectedMember(
  receiver: ts.Expression,
  sourcePath: string,
  enclosingClassName: string | null,
  injectedMemberTargets: ReadonlyMap<string, ApplicationServiceClassTarget>,
): ApplicationServiceClassTarget | null {
  const memberName = thisPropertyAccessMemberName(receiver);
  return enclosingClassName == null || memberName == null
    ? null
    : injectedMemberTargets.get(injectedMemberTargetKey(sourcePath, enclosingClassName, memberName)) ?? null;
}

function injectedMemberTargetKey(
  sourcePath: string,
  className: string,
  memberName: string,
): string {
  return `${sourcePath}\0${className}\0${memberName}`;
}

function thisPropertyAccessMemberName(expression: ts.Expression): string | null {
  const current = unwrapExpression(expression);
  return ts.isPropertyAccessExpression(current)
    && unwrapExpression(current.expression).kind === ts.SyntaxKind.ThisKeyword
    ? current.name.text
    : null;
}

function isSelfInteraction(
  sourcePath: string,
  enclosingClassName: string | null,
  target: ApplicationServiceClassTarget,
): boolean {
  return sourcePath === target.sourcePath && enclosingClassName === target.className;
}

function propertyAccessOperationKind(
  node: ts.PropertyAccessExpression,
): Exclude<ApplicationServiceInteractionOperationKind, 'call'> | null {
  const parent = node.parent;
  if (ts.isCallExpression(parent) && parent.expression === node) {
    return null;
  }
  return isWriteAccess(node) ? 'write' : 'read';
}

function isWriteAccess(
  node: ts.PropertyAccessExpression,
): boolean {
  const parent = node.parent;
  if (
    ts.isBinaryExpression(parent)
    && parent.left === node
    && isAssignmentOperator(parent.operatorToken.kind)
  ) {
    return true;
  }
  if (
    (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent))
    && parent.operand === node
    && (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken)
  ) {
    return true;
  }
  return false;
}
