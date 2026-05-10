import {
  SourceProjectMemo,
  type SourceProject,
} from "../../source/index.js";
import {
  readFrameworkPackageNames,
  readFrameworkPublicExportSurface,
} from "./framework-package-exports.js";

export interface FrameworkSymbolPackageIdentity {
  readonly packageId: string;
  readonly packageName: string;
}

const frameworkSymbolPackageIndexMemo = new SourceProjectMemo<
  ReadonlyMap<string, readonly FrameworkSymbolPackageIdentity[]>
>();

export function uniqueFrameworkSymbolPackageIdentity(
  sourceProject: SourceProject,
  symbolName: string | null,
): FrameworkSymbolPackageIdentity | null {
  if (symbolName === null) {
    return null;
  }
  const identities = frameworkSymbolPackageIndex(sourceProject).get(symbolName) ?? [];
  return identities.length === 1 ? identities[0]! : null;
}

function frameworkSymbolPackageIndex(
  sourceProject: SourceProject,
): ReadonlyMap<string, readonly FrameworkSymbolPackageIdentity[]> {
  return frameworkSymbolPackageIndexMemo.read(sourceProject, () => {
    const byName = new Map<string, FrameworkSymbolPackageIdentity[]>();
    for (const [packageId, packageName] of readFrameworkPackageNames(sourceProject)) {
      if (packageId === "aurelia") {
        continue;
      }
      const surface = readFrameworkPublicExportSurface(sourceProject, packageId);
      for (const exportName of surface.exportsByName.keys()) {
        const identities = byName.get(exportName);
        const identity = { packageId, packageName };
        if (identities === undefined) {
          byName.set(exportName, [identity]);
        } else {
          identities.push(identity);
        }
      }
    }
    return new Map(
      [...byName.entries()].map(([name, identities]) => [
        name,
        identities.sort((left, right) =>
          left.packageId.localeCompare(right.packageId),
        ),
      ]),
    );
  });
}
