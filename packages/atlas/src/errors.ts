/** Convert an unknown thrown value into a compact message. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
