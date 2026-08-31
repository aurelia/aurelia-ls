const adjectives = [
  'pretty',
  'large',
  'big',
  'small',
  'tall',
  'short',
  'long',
  'handsome',
  'plain',
  'quaint',
  'clean',
  'elegant',
  'easy',
  'angry',
  'crazy',
  'helpful',
  'mushy',
  'odd',
  'unsightly',
  'adorable',
  'important',
  'inexpensive',
  'cheap',
  'expensive',
  'fancy',
] as const;

const colors = [
  'red',
  'yellow',
  'blue',
  'green',
  'pink',
  'brown',
  'purple',
  'brown',
  'white',
  'black',
  'orange',
] as const;

const nouns = [
  'table',
  'chair',
  'house',
  'bbq',
  'desk',
  'car',
  'pony',
  'cookie',
  'sandwich',
  'burger',
  'pizza',
  'mouse',
  'keyboard',
] as const;

export interface KeyedTableRow {
  readonly id: number;
  label: string;
}

export class KeyedTableApp {
  public rows: KeyedTableRow[] = [];
  public selectedId: number | null = null;

  private nextId = 1;

  public run(): void {
    this.rows = this.buildRows(1_000);
    this.selectedId = null;
  }

  public runLots(): void {
    this.rows = this.buildRows(10_000);
    this.selectedId = null;
  }

  public add(): void {
    this.rows = this.rows.concat(this.buildRows(1_000));
    this.selectedId = null;
  }

  public update(): void {
    for (let index = 0; index < this.rows.length; index += 10) {
      this.rows[index]!.label += ' !!!';
    }
  }

  public clear(): void {
    this.rows = [];
    this.selectedId = null;
  }

  public swapRows(): void {
    if (this.rows.length <= 998) return;

    const rows = this.rows.slice();
    const second = rows[1]!;
    rows[1] = rows[998]!;
    rows[998] = second;
    this.rows = rows;
  }

  public select(id: number): void {
    this.selectedId = id;
  }

  public remove(row: KeyedTableRow): void {
    this.rows = this.rows.filter((candidate) => candidate !== row);
    if (this.selectedId === row.id) this.selectedId = null;
  }

  private buildRows(count: number): KeyedTableRow[] {
    const rows: KeyedTableRow[] = [];
    for (let index = 0; index < count; ++index) {
      rows.push({
        id: this.nextId++,
        label: `${randomMember(adjectives)} ${randomMember(colors)} ${randomMember(nouns)}`,
      });
    }
    return rows;
  }
}

function randomMember<const T>(values: readonly T[]): T {
  return values[Math.round(Math.random() * 1_000) % values.length]!;
}
