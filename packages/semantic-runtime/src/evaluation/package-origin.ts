import path from 'node:path';

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

/** Package provenance for one evaluator module, independent from exact boot ownership/editability. */
export class ResolvedEvaluationModuleOrigin {
  constructor(
    readonly packageInstance: ResolvedPackageInstance,
    readonly packageRelativePath: string,
    readonly sourceScope: ResolvedEvaluationModuleSourceScope,
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
      this.originsByModulePath.set(moduleKey, existing);
      if (!this.preserveSymlinks) {
        this.originsByModulePath.set(physicalKey, existing);
      }
      return existing;
    }
    const origin = new ResolvedEvaluationModuleOrigin(
      packageInstance,
      normalizeModuleKey(path.relative(packageInstance.physicalRootDir, physicalFileName)),
      sourceScope,
    );
    this.originsByModulePath.set(moduleKey, origin);
    if (!this.preserveSymlinks) {
      this.originsByModulePath.set(physicalKey, origin);
    }
    return origin;
  }
}
