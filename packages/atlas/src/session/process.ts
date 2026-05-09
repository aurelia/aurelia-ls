/** Return true when a process id still appears to be alive. */
export function isProcessAlive(
  /** Process id to probe. */
  pid: number,
): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
