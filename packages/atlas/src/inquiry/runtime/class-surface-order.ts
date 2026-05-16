export interface ClassSurfaceOrderRow {
  readonly filePath: string;
  readonly lineCount: number;
  readonly methodCount: number;
  readonly propertyCount: number;
  readonly name: string;
}

export function orderClassSurfaceRows<Row extends ClassSurfaceOrderRow>(
  rows: readonly Row[],
  orderBy: string | undefined,
): readonly Row[] {
  switch (orderBy) {
    case "size":
    case "lineCount":
      return [...rows].sort(compareClassSurfaceSize);
    case "methodCount":
      return [...rows].sort((left, right) =>
        right.methodCount - left.methodCount ||
        compareClassSurfaceSize(left, right),
      );
    case "propertyCount":
      return [...rows].sort((left, right) =>
        right.propertyCount - left.propertyCount ||
        compareClassSurfaceSize(left, right),
      );
    case undefined:
    case "source":
    default:
      return rows;
  }
}

function compareClassSurfaceSize<Row extends ClassSurfaceOrderRow>(
  left: Row,
  right: Row,
): number {
  return right.lineCount - left.lineCount ||
    left.filePath.localeCompare(right.filePath) ||
    left.name.localeCompare(right.name);
}
