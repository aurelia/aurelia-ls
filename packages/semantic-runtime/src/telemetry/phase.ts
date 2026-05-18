import { performance } from 'node:perf_hooks';

import type {
  SemanticRuntimeCountRow,
  SemanticRuntimeDetailDensityRow,
  SemanticRuntimeKernelCountSnapshot,
} from './kernel-density.js';
import {
  diffSemanticRuntimeKernelCounts,
} from './kernel-density.js';
import type {
  SemanticRuntimeMemoryDelta,
  SemanticRuntimeMemorySample,
} from './memory.js';
import {
  diffSemanticRuntimeMemorySamples,
  readSemanticRuntimeMemorySample,
} from './memory.js';
import type { KernelStore } from '../kernel/store.js';
import type { NormalizedSemanticRuntimeTelemetryOptions } from './options.js';

export interface SemanticRuntimePhaseSink {
  readonly phases: SemanticRuntimePhaseTiming<string>[];
  readonly telemetry: NormalizedSemanticRuntimeTelemetryOptions;
}

export interface SemanticRuntimePhaseMemoryProfile {
  readonly before: SemanticRuntimeMemorySample;
  readonly after: SemanticRuntimeMemorySample;
  readonly delta: SemanticRuntimeMemoryDelta;
}

export interface SemanticRuntimePhaseKernelProfile {
  readonly before: SemanticRuntimeKernelCountSnapshot;
  readonly after: SemanticRuntimeKernelCountSnapshot;
  readonly delta: SemanticRuntimeKernelCountSnapshot;
  readonly recordKinds?: readonly SemanticRuntimeCountRow[];
  readonly sourceSpanRoles?: readonly SemanticRuntimeCountRow[];
  readonly productKinds?: readonly SemanticRuntimeCountRow[];
  readonly productDetailKinds?: readonly SemanticRuntimeCountRow[];
  readonly hotDetailKinds?: readonly SemanticRuntimeCountRow[];
  readonly productDetailDensityDelta?: readonly SemanticRuntimeDetailDensityRow[];
  readonly hotDetailDensityDelta?: readonly SemanticRuntimeDetailDensityRow[];
}

export interface SemanticRuntimePhaseTiming<TName extends string = string> {
  readonly name: TName;
  readonly milliseconds: number;
  /** Time spent in this phase after subtracting nested semantic-runtime phases measured on the same sink. */
  readonly exclusiveMilliseconds?: number;
  /** Time spent in nested semantic-runtime phases measured on the same sink. */
  readonly childMilliseconds?: number;
  readonly memory?: SemanticRuntimePhaseMemoryProfile;
  readonly kernel?: SemanticRuntimePhaseKernelProfile;
}

interface SemanticRuntimePhaseStackFrame {
  childMilliseconds: number;
}

const phaseStacks = new WeakMap<SemanticRuntimePhaseTiming<string>[], SemanticRuntimePhaseStackFrame[]>();

/** Measure a named semantic-runtime phase, optionally sampling memory and kernel density at its boundary. */
export function measureSemanticRuntimePhase<TName extends string, TValue>(
  phases: SemanticRuntimePhaseTiming<TName>[],
  name: TName,
  store: KernelStore,
  telemetry: NormalizedSemanticRuntimeTelemetryOptions,
  read: () => TValue,
): TValue {
  const stack = phaseStackFor(phases as SemanticRuntimePhaseTiming<string>[]);
  const frame: SemanticRuntimePhaseStackFrame = { childMilliseconds: 0 };
  const memoryBefore = telemetry.capturePhaseMemory
    ? readSemanticRuntimeMemorySample()
    : null;
  const kernelMarker = telemetry.capturePhaseKernelBreakdowns || telemetry.capturePhaseDetailDensity
    ? store.mark()
    : null;
  const kernelBefore = telemetry.capturePhaseKernel
    ? store.readTelemetrySnapshot({
      includeBreakdowns: false,
    }) as SemanticRuntimeKernelCountSnapshot
    : null;
  stack.push(frame);
  const started = performance.now();
  try {
    const value = read();
    const memoryAfter = telemetry.capturePhaseMemory
      ? readSemanticRuntimeMemorySample()
      : null;
    const kernelAfter = telemetry.capturePhaseKernel
      ? store.readTelemetrySnapshot({
        includeBreakdowns: false,
      }) as SemanticRuntimeKernelCountSnapshot
      : null;
    const density = kernelMarker == null || !telemetry.capturePhaseKernelBreakdowns
      ? null
      : store.readDensitySince(kernelMarker);
    const detailDensity = kernelMarker == null || !telemetry.capturePhaseDetailDensity
      ? null
      : store.readDetailDensitySince(kernelMarker);
    const milliseconds = performance.now() - started;
    stack.pop();
    const parent = stack[stack.length - 1] ?? null;
    if (parent != null) {
      parent.childMilliseconds += milliseconds;
    }
    phases.push({
      name,
      milliseconds,
      exclusiveMilliseconds: Math.max(0, milliseconds - frame.childMilliseconds),
      childMilliseconds: frame.childMilliseconds,
      ...(memoryBefore == null || memoryAfter == null
        ? {}
        : {
          memory: {
            before: memoryBefore,
            after: memoryAfter,
            delta: diffSemanticRuntimeMemorySamples(memoryAfter, memoryBefore),
          },
        }),
      ...(kernelBefore == null || kernelAfter == null
        ? {}
        : {
          kernel: {
            before: kernelBefore,
            after: kernelAfter,
            delta: diffSemanticRuntimeKernelCounts(kernelAfter, kernelBefore),
            ...(density == null
              ? {}
              : {
                recordKinds: density.recordKinds,
                sourceSpanRoles: density.sourceSpanRoles,
                productKinds: density.productKinds,
                productDetailKinds: density.productDetailKinds,
                hotDetailKinds: density.hotDetailKinds,
              }),
            ...(detailDensity == null
              ? {}
              : {
                productDetailDensityDelta: detailDensity.productDetailDensity,
                hotDetailDensityDelta: detailDensity.hotDetailDensity,
              }),
          },
        }),
    });
    return value;
  } catch (error) {
    stack.pop();
    throw error;
  }
}

function phaseStackFor(phases: SemanticRuntimePhaseTiming<string>[]): SemanticRuntimePhaseStackFrame[] {
  let stack = phaseStacks.get(phases);
  if (stack != null) {
    return stack;
  }
  stack = [];
  phaseStacks.set(phases, stack);
  return stack;
}
