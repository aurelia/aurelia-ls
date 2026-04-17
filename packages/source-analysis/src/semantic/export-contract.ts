export type ExportFaceKind =
  | 'type-alias'
  | 'interface'
  | 'class'
  | 'const'
  | 'function'
  | 'enum'
  | 'namespace'
  | 'variable'
  | 'unknown';

export type ExportChainKind =
  | 'local-declaration'
  | 'local-export'
  | 'import-alias'
  | 'named-reexport'
  | 'star-reexport'
  | 'namespace-reexport'
  | 'fallback';

export interface ExportChainStep {
  file: string;
  line: number;
  kind: ExportChainKind;
  exported_name: string;
  original_name?: string;
  specifier?: string;
  target_file?: string;
  type_only?: boolean;
}
