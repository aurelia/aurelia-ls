import type { DeclarationExport } from '../declaration-world.js';
import type { ExportClassification, ExportSurface } from './contracts.js';
import type { ExportValueSurface } from './export-value-surface.js';

export interface ExportReaders {
  readonly readSurface: (current: Export) => ExportSurface;
  readonly readValueSurface: (current: Export) => ExportValueSurface;
  readonly readClassification: (current: Export) => ExportClassification;
}

export class Export {
  constructor(
    readonly id: string,
    private readonly recordValue: DeclarationExport,
    private readonly readers: ExportReaders,
  ) {}

  get name(): string {
    return this.recordValue.name;
  }

  get symbol() {
    return this.recordValue.symbol;
  }

  get sourceFile() {
    return this.recordValue.sourceFile;
  }

  readRecord(): DeclarationExport {
    return this.recordValue;
  }

  readSurface(): ExportSurface {
    return this.readers.readSurface(this);
  }

  readValueSurface(): ExportValueSurface {
    return this.readers.readValueSurface(this);
  }

  readClassification(): ExportClassification {
    return this.readers.readClassification(this);
  }
}
