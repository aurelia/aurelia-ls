import type ts from 'typescript';
import { StaticEvaluationExpressionReader } from '../evaluation/expression-reader.js';
import type { StaticModuleEvaluationResult } from '../evaluation/evaluator.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { TypeSystemProject } from '../type-system/project.js';
import { normalizeConfigurationSourceFileName } from './source-file-names.js';

/** Inputs shared by configuration recognizers for one evaluated source module. */
export class ConfigurationRecognitionContext {
  /** Generic TypeScript expression reader for this module evaluation. */
  readonly expressionReader: StaticEvaluationExpressionReader;

  constructor(
    /** Parsed source file being inspected. */
    readonly sourceFile: ts.SourceFile,
    /** Module key used by the static evaluator and kernel local handles. */
    readonly moduleKey: string,
    /** Project frame whose app-world emission owns this recognition pass. */
    readonly projectKey: string,
    /** Source-file address admitted by boot or host setup. */
    readonly sourceFileAddressHandle: AddressHandle,
    /** Static evaluator result for the same source file. */
    readonly evaluation: StaticModuleEvaluationResult,
    /** Shared TypeChecker epoch for source-level shape checks that evaluation cannot close. */
    readonly typeSystem: TypeSystemProject | null = null,
    /** Source-file addresses for other project modules reachable through the evaluator. */
    private readonly sourceFileAddressHandlesByFileName: ReadonlyMap<string, AddressHandle> = new Map([
      [normalizeConfigurationSourceFileName(sourceFile.fileName), sourceFileAddressHandle],
    ]),
  ) {
    this.expressionReader = new StaticEvaluationExpressionReader(
      evaluation.environment,
      moduleKey,
      evaluation.policy,
      evaluation.runtimeHost,
    );
  }

  sourceFileAddressHandleForNode(node: ts.Node): AddressHandle | null {
    return this.sourceFileAddressHandlesByFileName.get(
      normalizeConfigurationSourceFileName(node.getSourceFile().fileName),
    ) ?? null;
  }
}
