import ts from 'typescript';

import type { ProjectBootFrame } from '../boot/frames.js';
import {
  readDiResolveCallSites,
  type DiResolveActiveContainerExpectation,
  type DiResolveEnclosingMemberKind,
  type DiResolveExecutionContextKind,
  type DiResolveKeyDeclarationKind,
  type DiResolveKeyImportKind,
  type DiResolveNullishKeyArgument,
  type DiResolveCallSite,
} from '../di/resolve-call-recognition.js';
import type { TypeSystemProject } from '../type-system/project.js';
import {
  readApplicationServiceInteractionSites,
  type ApplicationServiceClassTarget,
  type ApplicationServiceInteractionSite,
} from './service-interaction.js';
import {
  applicationSupportSourceRoleIndex,
  type ApplicationSupportSourceRole,
  type ApplicationSupportSourceRoleIndex,
} from './support-source-role.js';

export interface ApplicationServiceTopology {
  readonly services: readonly ApplicationServiceClassSite[];
  readonly injections: readonly ApplicationServiceInjectionSite[];
  readonly interactions: readonly ApplicationServiceInteractionSite[];
}

/** Source-backed class-bearing service/state/model file admitted into application topology. */
export interface ApplicationServiceClassSite extends ApplicationServiceClassTarget {
  readonly path: string;
  readonly role: ApplicationSupportSourceRole;
  readonly className: string;
  readonly isExported: boolean;
  readonly resolveCallCount: number;
}

/** Import-aware source site for Aurelia's ambient `resolve(...)` API after app-level role projection. */
export interface ApplicationServiceInjectionSite {
  readonly sourcePath: string;
  readonly start: number;
  readonly end: number;
  readonly keyExpressionText: string | null;
  readonly argumentCount: number;
  readonly nullishKeyArguments: readonly DiResolveNullishKeyArgument[];
  readonly enclosingClassName: string | null;
  readonly enclosingMemberName: string | null;
  readonly enclosingMemberKind: DiResolveEnclosingMemberKind;
  readonly enclosingMemberStatic: boolean;
  readonly executionContextKind: DiResolveExecutionContextKind;
  readonly activeContainerExpectation: DiResolveActiveContainerExpectation;
  readonly keyName: string | null;
  readonly keyDeclarationKind: DiResolveKeyDeclarationKind;
  readonly keyDeclarationName: string | null;
  readonly keyDeclarationSourcePath: string | null;
  readonly keyDeclarationRole: ApplicationSupportSourceRole | null;
  readonly keyImportModuleSpecifier: string | null;
  readonly keyImportName: string | null;
  readonly keyImportKind: DiResolveKeyImportKind;
}

export function readApplicationServiceTopology(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): ApplicationServiceTopology {
  const resolveSites = readDiResolveCallSites(project, typeSystem);
  const supportRoles = applicationSupportSourceRoleIndex(project, resolveSites);
  const injections = applicationServiceInjectionSitesFromResolveSites(resolveSites, supportRoles);
  const services = readApplicationServiceClassSites(project, typeSystem, injections, supportRoles);
  const interactions = readApplicationServiceInteractionSites(project, typeSystem, services, injections);
  return {
    services,
    injections,
    interactions,
  };
}

export function readApplicationServiceClassSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
  injections: readonly ApplicationServiceInjectionSite[],
  supportRoles: ApplicationSupportSourceRoleIndex = applicationSupportSourceRoleIndex(project, []),
): readonly ApplicationServiceClassSite[] {
  const resolveCallCountsByDeclarationPath = diResolveCallCountsByDeclarationSourcePath(injections);
  return project.sourceFiles.flatMap((source) => {
    const sourceFile = typeSystem.readProgramSourceFileByPath(source.path);
    const classes = sourceFile == null ? [] : topLevelClasses(sourceFile);
    return classes.flatMap((entry) => {
      const role = supportRoles.roleForDeclaration(source.path, entry.className);
      return role == null
        ? []
        : [{
          path: source.path,
          sourcePath: source.path,
          role,
          className: entry.className,
          isExported: entry.isExported,
          resolveCallCount: resolveCallCountsByDeclarationPath.get(source.path)?.get(entry.className) ?? 0,
        }];
    });
  }).sort((left, right) =>
    left.role.localeCompare(right.role)
    || left.path.localeCompare(right.path)
    || left.className.localeCompare(right.className)
  );
}

export function readApplicationServiceInjectionSites(
  project: ProjectBootFrame,
  typeSystem: TypeSystemProject,
): readonly ApplicationServiceInjectionSite[] {
  const resolveSites = readDiResolveCallSites(project, typeSystem);
  return applicationServiceInjectionSitesFromResolveSites(
    resolveSites,
    applicationSupportSourceRoleIndex(project, resolveSites),
  );
}

function applicationServiceInjectionSitesFromResolveSites(
  resolveSites: readonly DiResolveCallSite[],
  supportRoles: ApplicationSupportSourceRoleIndex,
): readonly ApplicationServiceInjectionSite[] {
  return resolveSites.map((site) => ({
    sourcePath: site.sourcePath,
    start: site.start,
    end: site.end,
    keyExpressionText: site.keyExpressionText,
    argumentCount: site.argumentCount,
    nullishKeyArguments: site.nullishKeyArguments,
    enclosingClassName: site.enclosingClassName,
    enclosingMemberName: site.enclosingMemberName,
    enclosingMemberKind: site.enclosingMemberKind,
    enclosingMemberStatic: site.enclosingMemberStatic,
    executionContextKind: site.executionContextKind,
    activeContainerExpectation: site.activeContainerExpectation,
    keyName: site.keyName,
    keyDeclarationKind: site.keyDeclarationKind,
    keyDeclarationName: site.keyDeclarationName,
    keyDeclarationSourcePath: site.keyDeclarationSourcePath,
    keyDeclarationRole: site.keyDeclarationSourcePath == null
      ? null
      : supportRoles.roleForDeclaration(site.keyDeclarationSourcePath, site.keyDeclarationName ?? ''),
    keyImportModuleSpecifier: site.keyImportModuleSpecifier,
    keyImportName: site.keyImportName,
    keyImportKind: site.keyImportKind,
  }));
}

function diResolveCallCountsByDeclarationSourcePath(
  injections: readonly ApplicationServiceInjectionSite[],
): ReadonlyMap<string, ReadonlyMap<string, number>> {
  const countsByPath = new Map<string, Map<string, number>>();
  for (const injection of injections) {
    if (injection.keyDeclarationSourcePath == null || injection.keyDeclarationName == null) {
      continue;
    }
    const counts = countsByPath.get(injection.keyDeclarationSourcePath) ?? new Map<string, number>();
    counts.set(injection.keyDeclarationName, (counts.get(injection.keyDeclarationName) ?? 0) + 1);
    countsByPath.set(injection.keyDeclarationSourcePath, counts);
  }
  return countsByPath;
}

function topLevelClasses(
  sourceFile: ts.SourceFile,
): readonly { readonly className: string; readonly isExported: boolean }[] {
  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isClassDeclaration(statement) || statement.name == null) {
      return [];
    }
    return [{
      className: statement.name.text,
      isExported: isExportedClassDeclaration(statement),
    }];
  });
}

function isExportedClassDeclaration(
  declaration: ts.ClassDeclaration,
): boolean {
  return (ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Export) !== 0;
}
