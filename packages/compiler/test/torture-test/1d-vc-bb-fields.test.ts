/**
 * Tier 1D: VC/BB Behavioral Characterization (7 entries)
 *
 * Identity fields (name, className) are tier B.
 * Behavioral fields (toType, fromType, hasFromView, signals, isFactory)
 * are tier B+C (TypeScript type analysis).
 */

import { describe, it } from "vitest";
import { runInterpreter, assertClaim } from "./harness.js";

describe("1D: VC fields", () => {
  it("#1D.1 VC minimal — identity only", () => {
    const result = runInterpreter({
      "/src/vc-minimal.ts": `
        import { valueConverter } from 'aurelia';

        @valueConverter('vcMinimal')
        export class VcMinimal {
          toView(value: unknown): unknown { return value; }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "vcMinimal",
      className: "VcMinimal",
      form: "decorator",
    });
  });

  it("#1D.2 VC toView return type extraction", () => {
    const result = runInterpreter({
      "/src/vc-to-view.ts": `
        import { valueConverter } from 'aurelia';

        @valueConverter('vcToView')
        export class VcToView {
          toView(value: Date): string {
            return value.toISOString();
          }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "vcToView",
      className: "VcToView",
      form: "decorator",
    });
  });

  it("#1D.3 VC fromView detection + return type", () => {
    const result = runInterpreter({
      "/src/vc-from-view.ts": `
        import { valueConverter } from 'aurelia';

        @valueConverter('vcFromView')
        export class VcFromView {
          toView(value: number): string {
            return value.toString();
          }

          fromView(value: string): number {
            return parseInt(value, 10);
          }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "vcFromView",
      className: "VcFromView",
      form: "decorator",
    });
  });

  it("#1D.4 VC signals from static property", () => {
    const result = runInterpreter({
      "/src/vc-signals.ts": `
        import { valueConverter } from 'aurelia';

        @valueConverter('vcSignals')
        export class VcSignals {
          static signals = ['locale-changed', 'theme-changed'];

          toView(value: unknown): string {
            return String(value);
          }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "vcSignals",
      className: "VcSignals",
      form: "decorator",
    });
  });

  it("#1D.5 VC full behavioral — all fields", () => {
    const result = runInterpreter({
      "/src/vc-full.ts": `
        import { valueConverter } from 'aurelia';

        @valueConverter({ name: 'vcFull', aliases: ['vcComplete'] })
        export class VcFull {
          static signals = ['data-refresh'];

          toView(value: Date, format: string = 'iso'): string {
            return format === 'iso' ? value.toISOString() : value.toLocaleDateString();
          }

          fromView(value: string): Date {
            return new Date(value);
          }
        }
      `,
    });

    assertClaim(result, {
      kind: "value-converter",
      name: "vcFull",
      className: "VcFull",
      form: "decorator",
      fields: {
        aliases: ["vcComplete"],
      },
    });
  });
});

describe("1D: BB fields", () => {
  it("#1D.6 BB minimal — identity only", () => {
    const result = runInterpreter({
      "/src/bb-minimal.ts": `
        import { bindingBehavior } from 'aurelia';

        @bindingBehavior('bbMinimal')
        export class BbMinimal {}
      `,
    });

    assertClaim(result, {
      kind: "binding-behavior",
      name: "bbMinimal",
      className: "BbMinimal",
      form: "decorator",
    });
  });

  it("#1D.7 BB factory pattern detection", () => {
    const result = runInterpreter({
      "/src/bb-factory.ts": `
        import { bindingBehavior } from 'aurelia';

        @bindingBehavior('bbFactory')
        export class BbFactory {
          getBinding(binding: any): any {
            return binding;
          }
        }
      `,
    });

    assertClaim(result, {
      kind: "binding-behavior",
      name: "bbFactory",
      className: "BbFactory",
      form: "decorator",
    });
  });
});
