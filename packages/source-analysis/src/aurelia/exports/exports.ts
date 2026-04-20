import { ExportClassification, ExportSurface, type ExportsState } from './contracts.js';
import { Export } from './export.js';
import { ExportScanner } from './export-scanner.js';
import { ExportValueSurface } from './export-value-surface.js';

export class Exports {
  private allValue: readonly Export[] | null = null;
  private readonly classifications = new Map<string, ExportClassification>();
  private readonly valueSurfaces = new Map<string, ExportValueSurface>();
  readonly ownerLabel: string;

  constructor(
    ownerLabel: string,
    private readonly scannerValue: ExportScanner,
  ) {
    this.ownerLabel = ownerLabel;
  }

  readAll(): readonly Export[] {
    if (this.allValue == null) {
      const records = this.scannerValue.scanAll();
      this.allValue = records.map(
        (record, index) => new Export(`${this.ownerLabel}:export:${record.name}:${index}`, this, record),
      );
    }

    return [...this.allValue];
  }

  readNames(): readonly string[] {
    return this.readAll()
      .map((current) => current.name)
      .sort((left, right) => left.localeCompare(right));
  }

  find(
    name: string,
  ): readonly Export[] {
    return this.readAll().filter((current) => current.name === name);
  }

  readSurface(
    current: Export,
  ): ExportSurface {
    const record = current.readRecord();
    return new ExportSurface(
      record.name,
      record.symbol?.name ?? null,
      record.sourceFile?.path ?? null,
    );
  }

  readValueSurface(
    current: Export,
  ): ExportValueSurface {
    const cached = this.valueSurfaces.get(current.id);
    if (cached != null) {
      return cached;
    }

    const surface = this.scannerValue.readValueSurface(current);
    this.valueSurfaces.set(current.id, surface);
    return surface;
  }

  readClassification(
    current: Export,
  ): ExportClassification {
    const cached = this.classifications.get(current.id);
    if (cached != null) {
      return cached;
    }

    const classification = this.scannerValue.classify(current);
    this.classifications.set(current.id, classification);
    return classification;
  }

  inspectState(): ExportsState {
    return {
      ownerLabel: this.ownerLabel,
      allCached: this.allValue != null,
      valueSurfacesCached: this.valueSurfaces.size,
      classificationsCached: this.classifications.size,
    };
  }
}
