import {
  configuredAureliaEntrypointFile,
  type ConfiguredAureliaEntrypointFileModel,
} from '../source-plan/aurelia-entrypoint-source-plan.js';
import {
  sourcePlanWithAureliaProjectTooling,
  SourcePlanBuildToolPolicy,
} from '../source-plan/package-tooling.js';
import {
  SourcePlan,
  SourcePlanAssembly,
  SourcePlanConflictPolicy,
  type SourcePlanFile,
  type SourcePlanFileArtifact,
  SourcePlanFormattingPolicy,
  SourcePlanPackageToolingPolicy,
  SourcePlanPolicy,
  SourcePlanTextAuthority,
  type SourcePattern,
} from '../source-plan/source-plan.js';

export interface AppBuilderSourcePlanAssemblyModel {
  readonly rootDir: string;
  readonly appName: string;
  readonly dependencySpecifiers?: readonly string[];
}

/** App-builder source-plan transaction carrying generated-text authority, edit policy, entrypoint admission, and project tooling. */
export class AppBuilderSourcePlanAssembly {
  private readonly assembly: SourcePlanAssembly;
  private readonly generatedFileTextsByPath = new Map<string, string | null>();
  private entrypointPath: string | null = null;
  private rootElementName: string | null = null;

  public constructor(
    private readonly model: AppBuilderSourcePlanAssemblyModel,
  ) {
    this.assembly = new SourcePlanAssembly(
      model.rootDir,
      new SourcePlanPolicy(
        SourcePlanConflictPolicy.MustNotExist,
        SourcePlanFormattingPolicy.AppBuilderBaseline,
        SourcePlanPackageToolingPolicy.AppBuilderBaseline,
      ),
      SourcePlanTextAuthority.AppBuilderGenerated,
    );
  }

  public addConfiguredEntrypoint(
    model: Omit<ConfiguredAureliaEntrypointFileModel, 'textAuthority'> & {
      readonly rootElementName?: string | null;
    },
  ): this {
    this.entrypointPath = model.entrypointPath;
    this.rootElementName = model.rootElementName ?? null;
    this.assembly.addSourcePlanFile(configuredAureliaEntrypointFile({
      ...model,
      textAuthority: SourcePlanTextAuthority.AppBuilderGenerated,
    }));
    return this;
  }

  public addFile(
    artifact: SourcePlanFileArtifact,
  ): this {
    const existingText = this.generatedFileTextsByPath.get(artifact.path);
    if (existingText !== undefined) {
      if (existingText !== artifact.text) {
        throw new Error(`App-builder SourcePlan attempted to emit conflicting generated text for '${artifact.path}'.`);
      }
      return this;
    }
    this.generatedFileTextsByPath.set(artifact.path, artifact.text);
    this.assembly.addFile(artifact);
    return this;
  }

  public addSourcePlanFile(
    file: SourcePlanFile,
  ): this {
    this.assembly.addSourcePlanFile(file);
    return this;
  }

  public build(
    pattern: SourcePattern | null = null,
  ): SourcePlan {
    return sourcePlanWithAureliaProjectTooling(
      this.assembly.build(null, pattern),
      {
        appName: this.model.appName,
        dependencySpecifiers: this.model.dependencySpecifiers,
        buildToolPolicy: SourcePlanBuildToolPolicy.AppBuilderBaseline,
        entrypointPath: this.entrypointPath,
        rootElementName: this.rootElementName,
        textAuthority: SourcePlanTextAuthority.AppBuilderGenerated,
      },
    );
  }
}
