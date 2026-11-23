export const INITIAL_CONTEXT_READINESS_TIMEOUT_MS = 15_000;

export async function settlesBeforeDeadline(operation: Promise<unknown>, milliseconds: number): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<false>((resolve) => {
    timeout = setTimeout(() => resolve(false), milliseconds);
  });
  try {
    return await Promise.race([
      operation.then(() => true, () => true),
      deadline,
    ]);
  } finally {
    if (timeout != null) clearTimeout(timeout);
  }
}
