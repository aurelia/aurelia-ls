import type {
  AotBuildReceipt,
  AotReceiptArtifact,
  AotReceiptChunk,
  AotReceiptGraphModule,
} from "./contracts.js";

export interface ReceiptGraphModuleInput {
  readonly id: string;
  readonly isEntry: boolean;
  readonly importedIds: readonly string[];
  readonly dynamicallyImportedIds: readonly string[];
  readonly importers: readonly string[];
  readonly dynamicImporters: readonly string[];
}

export interface ReceiptRenderedModuleInput {
  readonly id: string;
  readonly renderedLength: number;
  readonly renderedExports?: readonly string[];
}

export interface ReceiptChunkInput {
  readonly fileName: string;
  readonly isEntry: boolean;
  readonly imports: readonly string[];
  readonly dynamicImports: readonly string[];
  readonly modules: readonly ReceiptRenderedModuleInput[];
}

export interface BuildReceiptInput {
  readonly environmentName: string;
  readonly artifacts: Iterable<AotReceiptArtifact>;
  readonly graph: Iterable<ReceiptGraphModuleInput>;
  readonly chunks: Iterable<ReceiptChunkInput>;
}

export function createAotBuildReceipt(input: BuildReceiptInput): AotBuildReceipt {
  const artifacts = Array.from(input.artifacts, (artifact) => ({
    sourcePath: artifact.sourcePath,
    virtualId: artifact.virtualId,
    digest: artifact.digest,
  })).sort(compareSourcePath);

  const graph: AotReceiptGraphModule[] = Array.from(input.graph, (module) => ({
    id: module.id,
    isEntry: module.isEntry,
    importedIds: sorted(module.importedIds),
    dynamicallyImportedIds: sorted(module.dynamicallyImportedIds),
    importers: sorted(module.importers),
    dynamicImporters: sorted(module.dynamicImporters),
  })).sort(compareId);

  const chunks: AotReceiptChunk[] = Array.from(input.chunks, (chunk) => ({
    fileName: chunk.fileName,
    isEntry: chunk.isEntry,
    imports: sorted(chunk.imports),
    dynamicImports: sorted(chunk.dynamicImports),
    modules: Array.from(chunk.modules, (module) => ({
      id: module.id,
      renderedLength: module.renderedLength,
      renderedExports: sorted(module.renderedExports ?? []),
    })).sort(compareId),
  })).sort((left, right) => left.fileName.localeCompare(right.fileName));

  return {
    version: 1,
    environmentName: input.environmentName,
    artifacts,
    graph,
    chunks,
  };
}

function sorted(values: readonly string[]): string[] {
  return Array.from(values).sort((left, right) => left.localeCompare(right));
}

function compareId(left: { readonly id: string }, right: { readonly id: string }): number {
  return left.id.localeCompare(right.id);
}

function compareSourcePath(
  left: { readonly sourcePath: string },
  right: { readonly sourcePath: string },
): number {
  return left.sourcePath.localeCompare(right.sourcePath);
}
