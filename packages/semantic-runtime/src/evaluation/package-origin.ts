import path from 'node:path';
import type ts from 'typescript';

import { isHostPathWithin } from '../boot/host-files.js';
import { projectModuleHostPathKey } from '../project-analysis/package-identity.js';
import type { ResolvedPackageInstance } from '../project-analysis/package-identity.js';
import { normalizeModuleKey } from './module-graph.js';

export { ResolvedPackageInstance, ResolvedPackageOwner } from '../project-analysis/package-identity.js';

/** Relationship of one resolved package module to the current semantic project source world. */
export const enum ResolvedEvaluationModuleSourceScope {
  AuthoredProject = 'authored-project',
  ExternalDependency = 'external-dependency',
}

/** Exact package export-condition bridge retained when declaration, authored source, and runtime modules diverge. */
export class ResolvedEvaluationModuleBuildLink {
  constructor(
    readonly containingFile: string,
    readonly moduleSpecifier: string,
    readonly resolutionMode: ts.ResolutionMode | null,
    readonly logicalDeclarationPath: string,
    readonly physicalDeclarationPath: string,
    readonly logicalSourcePath: string,
    readonly physicalSourcePath: string,
    readonly logicalRuntimePath: string,
    readonly physicalRuntimePath: string,
  ) {}
}

/** Package provenance for one evaluator module, independent from exact boot ownership/editability. */
export class ResolvedEvaluationModuleOrigin {
  constructor(
    readonly packageInstance: ResolvedPackageInstance,
    readonly packageRelativePath: string,
    readonly sourceScope: ResolvedEvaluationModuleSourceScope,
    readonly buildLinks: readonly ResolvedEvaluationModuleBuildLink[] = [],
  ) {}
}

/** Case-aware absolute host key shared by evaluator origin production and downstream lookup. */
export function evaluationModuleHostPathKey(fileName: string): string {
  return projectModuleHostPathKey(fileName);
}

export function evaluationModuleKey(rootDir: string, modulePath: string): string {
  const absolute = path.isAbsolute(modulePath) ? modulePath : path.resolve(rootDir, modulePath);
  return evaluationModuleHostPathKey(absolute);
}

/** Identity-mode-aware origin index scoped to one exact evaluator/input generation. */
export class EvaluationPackageOriginIndex {
  private readonly originsByModulePath = new Map<string, ResolvedEvaluationModuleOrigin>();

  constructor(
    private readonly rootDir: string,
    private readonly preserveSymlinks: boolean,
  ) {}

  read(modulePath: string): ResolvedEvaluationModuleOrigin | null {
    return this.originsByModulePath.get(evaluationModuleKey(this.rootDir, modulePath)) ?? null;
  }

  remember(
    moduleFileName: string,
    physicalFileName: string,
    packageInstance: ResolvedPackageInstance,
    sourceScope: ResolvedEvaluationModuleSourceScope,
    buildLink: ResolvedEvaluationModuleBuildLink | null = null,
  ): ResolvedEvaluationModuleOrigin {
    if (!isHostPathWithin(physicalFileName, packageInstance.physicalRootDir)) {
      throw new Error(
        `Resolved package module '${physicalFileName}' is outside package root '${packageInstance.physicalRootDir}'.`,
      );
    }
    const moduleKey = evaluationModuleKey(this.rootDir, moduleFileName);
    const physicalKey = evaluationModuleKey(this.rootDir, physicalFileName);
    const existing = this.originsByModulePath.get(moduleKey)
      ?? (this.preserveSymlinks ? undefined : this.originsByModulePath.get(physicalKey));
    if (existing != null) {
      if (existing.packageInstance.instanceKey !== packageInstance.instanceKey) {
        throw new Error(
          `Evaluation module '${moduleFileName}' resolved through conflicting package instances `
          + `'${existing.packageInstance.instanceKey}' and '${packageInstance.instanceKey}'.`,
        );
      }
      if (existing.sourceScope !== sourceScope) {
        throw new Error(
          `Evaluation module '${moduleFileName}' resolved with conflicting package source scopes `
          + `'${existing.sourceScope}' and '${sourceScope}'.`,
        );
      }
      const buildLinks = retainEvaluationModuleBuildLink(existing.buildLinks, buildLink);
      const retained = buildLinks === existing.buildLinks
        ? existing
        : new ResolvedEvaluationModuleOrigin(
            existing.packageInstance,
            existing.packageRelativePath,
            existing.sourceScope,
            buildLinks,
          );
      this.originsByModulePath.set(moduleKey, retained);
      if (!this.preserveSymlinks) {
        this.originsByModulePath.set(physicalKey, retained);
      }
      return retained;
    }
    const origin = new ResolvedEvaluationModuleOrigin(
      packageInstance,
      normalizeModuleKey(path.relative(packageInstance.physicalRootDir, physicalFileName)),
      sourceScope,
      buildLink == null ? [] : [buildLink],
    );
    this.originsByModulePath.set(moduleKey, origin);
    if (!this.preserveSymlinks) {
      this.originsByModulePath.set(physicalKey, origin);
    }
    return origin;
  }
}

function retainEvaluationModuleBuildLink(
  links: readonly ResolvedEvaluationModuleBuildLink[],
  link: ResolvedEvaluationModuleBuildLink | null,
): readonly ResolvedEvaluationModuleBuildLink[] {
  if (link == null || links.some((candidate) => evaluationModuleBuildLinkKey(candidate) === evaluationModuleBuildLinkKey(link))) {
    return links;
  }
  return [...links, link];
}

function evaluationModuleBuildLinkKey(link: ResolvedEvaluationModuleBuildLink): string {
  return [
    projectModuleHostPathKey(link.containingFile),
    link.moduleSpecifier,
    link.resolutionMode ?? 'none',
    projectModuleHostPathKey(link.logicalDeclarationPath),
    projectModuleHostPathKey(link.physicalDeclarationPath),
    projectModuleHostPathKey(link.logicalSourcePath),
    projectModuleHostPathKey(link.physicalSourcePath),
    projectModuleHostPathKey(link.logicalRuntimePath),
    projectModuleHostPathKey(link.physicalRuntimePath),
  ].join('\0');
}
