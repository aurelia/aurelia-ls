export interface PackageRef {
  readonly name: string;
  readonly dir: string;
  readonly analysisEntrypoint: string;
}

export interface SymbolLocation {
  readonly name: string | null;
  readonly file: string | null;
  readonly line: number | null;
}
