import { ConfigurationContributionScanner, type ConfigurationContributionScannerState } from './configuration-contribution-scanner.js';
import { ConfigurationContribution } from './configuration-contribution.js';

export interface ConfigurationContributionsState {
  readonly ownerLabel: string;
  readonly allCached: boolean;
  readonly scannerState: ConfigurationContributionScannerState;
}

export class ConfigurationContributions {
  private allValue: readonly ConfigurationContribution[] | null = null;
  readonly ownerLabel: string;

  constructor(
    ownerLabel: string,
    private readonly scannerValue: ConfigurationContributionScanner,
  ) {
    this.ownerLabel = ownerLabel;
  }

  readAll(): readonly ConfigurationContribution[] {
    this.allValue ??= this.scannerValue.scanAll();
    return [...this.allValue];
  }

  findByExportName(
    exportName: string,
  ): readonly ConfigurationContribution[] {
    return this.readAll().filter((current) => current.configuration.sourceExport.name === exportName);
  }

  inspectState(): ConfigurationContributionsState {
    return {
      ownerLabel: this.ownerLabel,
      allCached: this.allValue != null,
      scannerState: this.scannerValue.inspectState(),
    };
  }
}
