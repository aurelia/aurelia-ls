import type ts from 'typescript';
import {
  SourceSpanAddress,
  SourceSpanRole,
} from '../kernel/address.js';
import {
  OpenSeam,
} from '../kernel/open-seam.js';
import {
  EvidenceKind,
  EvidenceRecord,
  EvidenceRole,
} from '../kernel/evidence.js';
import type {
  AddressHandle,
  KernelRecordHandle,
} from '../kernel/handles.js';
import {
  ProvenanceRecord,
} from '../kernel/provenance.js';
import {
  KernelStoreBatch,
  type KernelStore,
  type KernelStoreRecord,
} from '../kernel/store.js';
import type { StaticModuleEvaluationResult } from './evaluator.js';
import { EvaluationOpenSeam } from './seams.js';

/** Emits durable kernel records for evaluator boundary pressure. */
export class EvaluationKernelEmitter {
  constructor(
    /** Hot analysis store that receives evaluator boundary records. */
    readonly store: KernelStore,
  ) {}

  /** Emit source spans, evidence, provenance, and open seams for one module evaluation result. */
  emitOpenSeams(
    sourceFile: ts.SourceFile,
    sourceFileAddressHandle: AddressHandle,
    result: StaticModuleEvaluationResult,
  ): void {
    const records: KernelStoreRecord[] = [];
    result.openSeams.forEach((seam, index) => {
      records.push(...this.recordsForOpenSeam(sourceFile, sourceFileAddressHandle, result.moduleKey, seam, index));
    });
    const newRecords = records.filter((record) => this.store.read(record.handle as KernelRecordHandle) == null);
    if (newRecords.length === 0) {
      return;
    }
    this.store.commit(new KernelStoreBatch(newRecords, `evaluation-open-seams:${result.moduleKey}`));
  }

  private recordsForOpenSeam(
    sourceFile: ts.SourceFile,
    sourceFileAddressHandle: AddressHandle,
    moduleKey: string,
    seam: EvaluationOpenSeam,
    index: number,
  ): readonly KernelStoreRecord[] {
    const local = `${moduleKey}:${seam.seamKind}:${seam.node.getStart(sourceFile)}:${seam.node.end}:${index}`;
    const spanHandle = this.store.handles.address(`evaluation-span:${local}`);
    const evidenceHandle = this.store.handles.evidence(`evaluation-open:${local}`);
    const provenanceHandle = this.store.handles.provenance(`evaluation-open:${local}`);
    const openSeamHandle = this.store.handles.openSeam(`evaluation-open:${local}`);
    const span = new SourceSpanAddress(
      spanHandle,
      sourceFileAddressHandle,
      seam.node.getStart(sourceFile),
      seam.node.end,
      SourceSpanRole.Range,
    );
    const evidence = new EvidenceRecord(
      evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.Diagnostic],
      seam.summary,
      spanHandle,
    );
    const provenance = new ProvenanceRecord(
      provenanceHandle,
      [evidenceHandle],
    );
    const openSeam = new OpenSeam(
      openSeamHandle,
      seam.seamKind,
      seam.summary,
      spanHandle,
      evidenceHandle,
    );
    return [span, evidence, provenance, openSeam];
  }
}
