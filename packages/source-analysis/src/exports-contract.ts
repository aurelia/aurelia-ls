import type {
  SnapshotFrontierEvidence,
  SnapshotProfileProvenance,
} from './snapshots.js';
import type {
  ExportChainStep,
  ExportFaceKind,
} from './semantic/export-contract.js';

export type {
  ExportChainKind,
  ExportChainStep,
  ExportFaceKind,
} from './semantic/export-contract.js';

export interface PackageExportRecord {
  package_name: string;
  package_dir: string;
  analysis_basis: 'source' | 'types';
  analysis_entrypoint: string;
  exported_name: string;
  original_name: string;
  declaration_name: string;
  source_module: string | null;
  declaration_file: string | null;
  declaration_line: number | null;
  type_only: boolean;
  type_exported: boolean;
  value_exported: boolean;
  face_kind: ExportFaceKind | 'merged';
  face_kinds: ExportFaceKind[];
  namespace_export: boolean;
  chain: ExportChainStep[];
}

export interface PackageExportsSummary {
  package_name: string;
  package_dir: string;
  package_revision: string;
  analysis_basis: 'source' | 'types';
  analysis_entrypoint: string;
  source_entrypoint: string | null;
  public_types_entrypoint: string | null;
  export_count: number;
  type_only_export_count: number;
  value_export_count: number;
  merged_export_count: number;
}

export interface ExportsOutput {
  root: string;
  generated_at: string;
  source_commit: string;
  analyzer_commit: string;
  /** Profile and exclusion regime used to derive this snapshot. */
  profile: SnapshotProfileProvenance;
  /** Explicit frontier evidence named during snapshot generation. */
  frontiers: SnapshotFrontierEvidence;
  summary: {
    packages_analyzed: number;
    exports: number;
    type_only_exports: number;
    value_exports: number;
    merged_exports: number;
  };
  packages: PackageExportsSummary[];
  exports: PackageExportRecord[];
}
