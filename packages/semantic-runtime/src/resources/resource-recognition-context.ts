import type ts from 'typescript';
import { normalizeModuleKey } from '../evaluation/module-graph.js';
import { StaticEvaluationExpressionReader } from '../evaluation/expression-reader.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { StaticModuleEvaluationResult } from '../evaluation/evaluator.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { SourceFileAdmission } from '../boot/frames.js';

/** Source-local recognition contexts for graph-linked modules inside one project pass. */
export class ResourceRecognitionContextIndex {
  private readonly byModuleKey = new Map<string, ResourceRecognitionContext>();
  private readonly bySourceFileName = new Map<string, ResourceRecognitionContext>();

  /** Admit one evaluated source context into the lookup index. */
  add(context: ResourceRecognitionContext): void {
    this.byModuleKey.set(normalizeModuleKey(context.moduleKey), context);
    this.bySourceFileName.set(normalizeModuleKey(context.sourceFile.fileName), context);
  }

  /** Read the context that owns a parsed source file. */
  readSourceFileContext(sourceFile: ts.SourceFile): ResourceRecognitionContext | null {
    return this.bySourceFileName.get(normalizeModuleKey(sourceFile.fileName)) ?? null;
  }

  /** Read the context that owns an arbitrary syntax node. */
  readNodeContext(node: ts.Node | null | undefined): ResourceRecognitionContext | null {
    return node == null ? null : this.readSourceFileContext(node.getSourceFile());
  }

  /** Read a context by evaluator module key. */
  readModuleContext(moduleKey: string): ResourceRecognitionContext | null {
    return this.byModuleKey.get(normalizeModuleKey(moduleKey)) ?? null;
  }
}

/** Inputs shared by resource recognizers for one evaluated source module. */
export class ResourceRecognitionContext {
  /** Generic TypeScript expression reader for this module evaluation. */
  readonly expressionReader: StaticEvaluationExpressionReader;

  constructor(
    /** Parsed source file being inspected. */
    readonly sourceFile: ts.SourceFile,
    /** Module key used by the static evaluator and kernel local handles. */
    readonly moduleKey: string,
    /** Source-file address admitted by boot or host setup. */
    readonly sourceFileAddressHandle: AddressHandle,
    /** Boot project frame that owns the admitted source address. */
    readonly projectKey: string,
    /** Static evaluator result for the same source file. */
    readonly evaluation: StaticModuleEvaluationResult,
    /** Current TypeChecker epoch for the project, when the caller needs runtime target types. */
    readonly typeSystem: TypeSystemProject | null = null,
    /** Project root used when a semantic read needs to join back to admitted non-TS assets. */
    readonly projectRootDir: string | null = null,
    /** Boot-admitted source files for this project, including HTML/CSS assets not parsed by TS evaluation. */
    readonly sourceFiles: readonly SourceFileAdmission[] = [],
    /** Source-local contexts for graph-linked modules reached by the same project pass. */
    readonly contextIndex: ResourceRecognitionContextIndex | null = null,
  ) {
    this.expressionReader = new StaticEvaluationExpressionReader(
      evaluation.environment,
      moduleKey,
      evaluation.policy,
      evaluation.runtimeHost,
    );
  }

  /** Use the owner module environment for a syntax node, falling back to this context when not indexed. */
  readNodeContext(node: ts.Node | null | undefined): ResourceRecognitionContext {
    return this.contextIndex?.readNodeContext(node) ?? this;
  }
}
