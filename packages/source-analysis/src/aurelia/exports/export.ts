import type { DeclarationExport } from '../declaration-world.js';
import type { ExportClassification, ExportSurface } from './contracts.js';
import type { ExportValueSurface } from './export-value-surface.js';
import type { Exports } from './exports.js';

export class Export {
  constructor(
    readonly id: string,
    private readonly ownerValue: Exports,
    private readonly recordValue: DeclarationExport,
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
    return this.ownerValue.readSurface(this);
  }

  readValueSurface(): ExportValueSurface {
    return this.ownerValue.readValueSurface(this);
  }

  readClassification(): ExportClassification {
    return this.ownerValue.readClassification(this);
  }
}
