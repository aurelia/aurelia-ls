import { describe, expect, test } from 'vitest';
import { observeSemanticRuntimePhase, observeSemanticRuntimePhases, measureSemanticRuntimePhase } from '../src/telemetry/phase.js';
import { normalizeSemanticRuntimeTelemetryOptions } from '../src/telemetry/options.js';
import type { KernelTelemetryReadView } from '../src/kernel/store.js';

describe('semantic phase observers', () => {
  test('observes entry before synchronous work and preserves nested failures', () => {
    const events: string[] = [];
    const stop = observeSemanticRuntimePhases((name, status) => { events.push(`${name}:${status}`); });
    const stopBroken = observeSemanticRuntimePhases(() => { throw new Error('observer failure'); });
    const failure = new Error('semantic failure');
    try {
      expect(() => observeSemanticRuntimePhase('static-evaluation', () => {
        expect(events).toEqual(['static-evaluation:started']);
        return measureSemanticRuntimePhase([], 'nested', {} as KernelTelemetryReadView,
          normalizeSemanticRuntimeTelemetryOptions(null, 'fixture'), () => { throw failure; });
      })).toThrow(failure);
      expect(events).toEqual(['static-evaluation:started', 'nested:started', 'nested:failed', 'static-evaluation:failed']);
    } finally {
      stopBroken();
      stop();
    }
    expect(observeSemanticRuntimePhase('retired', () => 42)).toBe(42);
    expect(events).toHaveLength(4);
  });
});
