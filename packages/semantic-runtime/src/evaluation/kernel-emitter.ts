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
  EvidenceHandle,
  KernelRecordHandle,
  OpenSeamHandle,
  ProvenanceHandle,
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

export interface EvaluationOpenSeamSource {
  readonly sourceFile: ts.SourceFile;
  readonly sourceFileAddressHandle: AddressHandle;
}

export type EvaluationOpenSeamSourceResolver = (seam: EvaluationOpenSeam) => EvaluationOpenSeamSource;

interface EvaluationOpenSeamHandles {
  readonly spanHandle: AddressHandle;
  readonly evidenceHandle: EvidenceHandle;
  readonly provenanceHandle: ProvenanceHandle;
  readonly openSeamHandle: OpenSeamHandle;
}

/** Emits durable kernel records for evaluator boundary pressure. */
export class EvaluationKernelEmitter {
  constructor(
    /** Hot analysis store that receives evaluator boundary records. */
    readonly store: KernelStore,
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
    const handles = this.evaluationOpenSeamHandles(local);
    return [
      this.sourceSpanForOpenSeam(sourceFile, sourceFileAddressHandle, seam, handles),
      this.evidenceForOpenSeam(seam, handles),
      new ProvenanceRecord(handles.provenanceHandle, [handles.evidenceHandle]),
      new OpenSeam(handles.openSeamHandle, seam.seamKind, seam.summary, handles.spanHandle, handles.evidenceHandle),
    ];
  }

  private evaluationOpenSeamHandles(
    local: string,
  ): EvaluationOpenSeamHandles {
    return {
      spanHandle: this.store.handles.address(`evaluation-span:${local}`),
      evidenceHandle: this.store.handles.evidence(`evaluation-open:${local}`),
      provenanceHandle: this.store.handles.provenance(`evaluation-open:${local}`),
      openSeamHandle: this.store.handles.openSeam(`evaluation-open:${local}`),
    };
  }

  private sourceSpanForOpenSeam(
    sourceFile: ts.SourceFile,
    sourceFileAddressHandle: AddressHandle,
    seam: EvaluationOpenSeam,
    handles: EvaluationOpenSeamHandles,
  ): SourceSpanAddress {
    return new SourceSpanAddress(
      handles.spanHandle,
      sourceFileAddressHandle,
      seam.node.getStart(sourceFile),
      seam.node.end,
      SourceSpanRole.Range,
    );
  }

  private evidenceForOpenSeam(
    seam: EvaluationOpenSeam,
    handles: EvaluationOpenSeamHandles,
  ): EvidenceRecord {
    return new EvidenceRecord(
      handles.evidenceHandle,
      EvidenceKind.SemanticObservation,
      [EvidenceRole.Diagnostic],
      seam.summary,
      handles.spanHandle,
    );
  }
}
