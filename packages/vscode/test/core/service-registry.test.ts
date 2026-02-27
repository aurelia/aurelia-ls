import { describe, test, expect, vi } from "vitest";
import { ServiceRegistry, createServiceToken } from "../../out/core/service-registry.js";

describe("ServiceRegistry", () => {
  test("registers and retrieves services", () => {
    const registry = new ServiceRegistry();
    const token = createServiceToken<{ value: number }>("test.service");
    registry.register(token, { value: 42 });

    expect(registry.has(token)).toBe(true);
    expect(registry.get(token).value).toBe(42);
    expect(registry.tryGet(token)?.value).toBe(42);
  });

  test("unregister disposes registered services", () => {
    const registry = new ServiceRegistry();
    const token = createServiceToken<{ value: number }>("test.service");
    const dispose = vi.fn();
    registry.register(token, { value: 1 }, { dispose });

    registry.unregister(token);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(registry.has(token)).toBe(false);
  });

  test("override replaces existing service", () => {
    const registry = new ServiceRegistry();
    const token = createServiceToken<{ value: number }>("test.service");
    const disposeA = vi.fn();
    const disposeB = vi.fn();

    registry.register(token, { value: 1 }, { dispose: disposeA });
    registry.register(token, { value: 2 }, { dispose: disposeB, override: true });

    expect(disposeA).toHaveBeenCalledTimes(1);
    expect(registry.get(token).value).toBe(2);
    registry.dispose();
    expect(disposeB).toHaveBeenCalledTimes(1);
  });
});
