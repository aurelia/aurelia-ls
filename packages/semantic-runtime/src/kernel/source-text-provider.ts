/** Host-provided source text for editor buffers or other non-filesystem source epochs. */
export interface SemanticRuntimeSourceTextProvider {
  /**
   * Return source text for an absolute or host-facing file path.
   *
   * Return `undefined` when the provider has no opinion and semantic-runtime should fall back to the local filesystem.
   */
  readFile(fileName: string): string | undefined;

  /**
   * Return whether a file exists in the provider's source epoch.
   *
   * Return `undefined` when the provider has no opinion and semantic-runtime should fall back to the local filesystem.
   */
  fileExists?(fileName: string): boolean | undefined;
}
