import { getHeapStatistics } from 'node:v8';

/** Process memory sample captured at a semantic-runtime phase boundary. */
export interface SemanticRuntimeMemorySample {
  readonly rssBytes: number;
  readonly heapTotalBytes: number;
  readonly heapUsedBytes: number;
  readonly externalBytes: number;
  readonly arrayBuffersBytes: number;
  /**
   * Process RSS not explained by V8 heapTotal, process external memory, or ArrayBuffers.
   *
   * This is an attribution hint, not a leak verdict: it can include native stacks, code pages, allocator fragmentation,
   * mapped files, and memory that V8/TypeScript has reserved but not promptly returned to the OS.
   */
  readonly rssOtherBytes: number;
  readonly v8HeapPhysicalBytes: number;
  readonly v8HeapAvailableBytes: number;
  readonly v8MallocedMemoryBytes: number;
  readonly v8PeakMallocedMemoryBytes: number;
  readonly v8ExternalMemoryBytes: number;
  readonly v8NativeContextCount: number;
  readonly v8DetachedContextCount: number;
}

/** Difference between two process memory samples. */
export interface SemanticRuntimeMemoryDelta {
  readonly rssBytes: number;
  readonly heapTotalBytes: number;
  readonly heapUsedBytes: number;
  readonly externalBytes: number;
  readonly arrayBuffersBytes: number;
  readonly rssOtherBytes: number;
  readonly v8HeapPhysicalBytes: number;
  readonly v8HeapAvailableBytes: number;
  readonly v8MallocedMemoryBytes: number;
  readonly v8PeakMallocedMemoryBytes: number;
  readonly v8ExternalMemoryBytes: number;
  readonly v8NativeContextCount: number;
  readonly v8DetachedContextCount: number;
}

export function readSemanticRuntimeMemorySample(): SemanticRuntimeMemorySample {
  const memory = process.memoryUsage();
  const heap = getHeapStatistics();
  const rssOtherBytes = memory.rss - memory.heapTotal - memory.external - memory.arrayBuffers;
  return {
    rssBytes: memory.rss,
    heapTotalBytes: memory.heapTotal,
    heapUsedBytes: memory.heapUsed,
    externalBytes: memory.external,
    arrayBuffersBytes: memory.arrayBuffers,
    rssOtherBytes,
    v8HeapPhysicalBytes: heap.total_physical_size,
    v8HeapAvailableBytes: heap.total_available_size,
    v8MallocedMemoryBytes: heap.malloced_memory,
    v8PeakMallocedMemoryBytes: heap.peak_malloced_memory,
    v8ExternalMemoryBytes: heap.external_memory,
    v8NativeContextCount: heap.number_of_native_contexts,
    v8DetachedContextCount: heap.number_of_detached_contexts,
  };
}

export function diffSemanticRuntimeMemorySamples(
  after: SemanticRuntimeMemorySample,
  before: SemanticRuntimeMemorySample,
): SemanticRuntimeMemoryDelta {
  return {
    rssBytes: after.rssBytes - before.rssBytes,
    heapTotalBytes: after.heapTotalBytes - before.heapTotalBytes,
    heapUsedBytes: after.heapUsedBytes - before.heapUsedBytes,
    externalBytes: after.externalBytes - before.externalBytes,
    arrayBuffersBytes: after.arrayBuffersBytes - before.arrayBuffersBytes,
    rssOtherBytes: after.rssOtherBytes - before.rssOtherBytes,
    v8HeapPhysicalBytes: after.v8HeapPhysicalBytes - before.v8HeapPhysicalBytes,
    v8HeapAvailableBytes: after.v8HeapAvailableBytes - before.v8HeapAvailableBytes,
    v8MallocedMemoryBytes: after.v8MallocedMemoryBytes - before.v8MallocedMemoryBytes,
    v8PeakMallocedMemoryBytes: after.v8PeakMallocedMemoryBytes - before.v8PeakMallocedMemoryBytes,
    v8ExternalMemoryBytes: after.v8ExternalMemoryBytes - before.v8ExternalMemoryBytes,
    v8NativeContextCount: after.v8NativeContextCount - before.v8NativeContextCount,
    v8DetachedContextCount: after.v8DetachedContextCount - before.v8DetachedContextCount,
  };
}

export function formatSemanticRuntimeBytes(bytes: number): string {
  const sign = bytes < 0 ? '-' : '';
  const absolute = Math.abs(bytes);
  if (absolute >= 1024 * 1024 * 1024) {
    return `${sign}${(absolute / (1024 * 1024 * 1024)).toFixed(2)}GiB`;
  }
  if (absolute >= 1024 * 1024) {
    return `${sign}${(absolute / (1024 * 1024)).toFixed(1)}MiB`;
  }
  if (absolute >= 1024) {
    return `${sign}${(absolute / 1024).toFixed(1)}KiB`;
  }
  return `${bytes}B`;
}
