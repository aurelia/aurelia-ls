import { TypeScriptWorldConstructionScanner, type TypeScriptWorldConstructionScannerState } from './typescript-world-construction-scanner.js';
import { TypeScriptWorldConstruction } from './typescript-world-construction.js';

export interface TypeScriptWorldConstructionsState {
  readonly ownerLabel: string;
  readonly allCached: boolean;
  readonly scannerState: TypeScriptWorldConstructionScannerState;
}

export class TypeScriptWorldConstructions {
  private allValue: readonly TypeScriptWorldConstruction[] | null = null;
  readonly ownerLabel: string;

  constructor(
    ownerLabel: string,
    private readonly scannerValue: TypeScriptWorldConstructionScanner,
  ) {
    this.ownerLabel = ownerLabel;
  }

  readAll(): readonly TypeScriptWorldConstruction[] {
    this.allValue ??= this.scannerValue.scanAll();
    return [...this.allValue];
  }

  findByConfigurationExportName(
    exportName: string,
  ): readonly TypeScriptWorldConstruction[] {
    return this.readAll().filter((current) => current.ownerContribution.configuration.sourceExport.name === exportName);
  }

  inspectState(): TypeScriptWorldConstructionsState {
    return {
      ownerLabel: this.ownerLabel,
      allCached: this.allValue != null,
      scannerState: this.scannerValue.inspectState(),
    };
  }
}
