import type ts from 'typescript';
import {
  EvidenceRole,
} from '../kernel/evidence.js';
import type { AddressHandle } from '../kernel/handles.js';
import {
  KernelPublicationPlan,
  type KernelPublicationContext,
} from '../kernel/publication.js';
import { recordsForSourceOpenSeam } from '../kernel/source-open-seam.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import type { StaticModuleEvaluationResult } from './module-evaluation-result.js';
import {
  evaluationOpenSeamDefaultReasonKinds,
  type EvaluationOpenSeam,
} from './seams.js';

export interface EvaluationOpenSeamSource {
  readonly sourceFile: ts.SourceFile;
  readonly sourceFileAddressHandle: AddressHandle;
}

export type EvaluationOpenSeamSourceResolver = (seam: EvaluationOpenSeam) => EvaluationOpenSeamSource;

/** Emits durable kernel records for evaluator boundary pressure. */
export class EvaluationKernelEmitter {
  constructor(
    /** Store that owns stable handles and committed upstream records. */
    readonly store: KernelStore,
    /** Immediate or staged owner of evaluator boundary records. */
    readonly publication: KernelPublicationContext,
  ) {}

  /** Emit source spans, evidence, provenance, and open seams for one module evaluation result. */
  emitOpenSeams(
    result: StaticModuleEvaluationResult,
    resolveSource: EvaluationOpenSeamSourceResolver,
  ): void {
    const records: KernelStoreRecord[] = [];
    result.openSeams.forEach((seam, index) => {
      const source = resolveSource(seam);
      records.push(...this.recordsForOpenSeam(source.sourceFile, source.sourceFileAddressHandle, result.moduleKey, seam, index));
    });
    const newRecords = records.filter((record) => this.publication.read(record.handle) == null);
    if (newRecords.length === 0) {
      return;
    }
    this.publication.publish(new KernelPublicationPlan(
      new KernelStoreBatch(newRecords, `evaluation-open-seams:${result.moduleKey}`),
    ));
  }

  private recordsForOpenSeam(
    sourceFile: ts.SourceFile,
    sourceFileAddressHandle: AddressHandle,
    moduleKey: string,
    seam: EvaluationOpenSeam,
    index: number,
  ): readonly KernelStoreRecord[] {
    const local = `${moduleKey}:${seam.seamKind}:${seam.node.getStart(sourceFile)}:${seam.node.end}:${index}`;
    return recordsForSourceOpenSeam(this.store, {
      localKey: `evaluation-open:${local}`,
      sourceFileAddressHandle,
      start: seam.node.getStart(sourceFile),
      end: seam.node.end,
      openKind: seam.seamKind,
      summary: seam.summary,
      evidenceRoles: [EvidenceRole.Diagnostic],
      reasonKinds: seam.reasonKinds.length === 0
        ? evaluationOpenSeamDefaultReasonKinds(seam.seamKind)
        : seam.reasonKinds,
    }).records;
  }
}
