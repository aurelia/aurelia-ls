/** Normalize a TypeScript source file name before using it as a configuration-recognition lookup key. */
export function normalizeConfigurationSourceFileName(fileName: string): string {
  return fileName.replace(/\\/g, '/');
}
