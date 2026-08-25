import { DI, type IContainer, noop, Registration } from "@aurelia/kernel";
import { BrowserPlatform } from "@aurelia/platform-browser";
import { IPlatform, StandardConfiguration } from "@aurelia/runtime-html";
import {
  ITemplateCompiler,
  type ICompiledElementComponentDefinition,
  type IElementComponentDefinition,
} from "@aurelia/template-compiler";
import { JSDOM } from "jsdom";
import { performance } from "node:perf_hooks";
import type { BatchCaseExecution } from "./batch-runner.js";

/** Stage timings from one isolated framework JIT compilation. */
export interface JitCompilerExecution extends BatchCaseExecution {
  readonly compiled: ICompiledElementComponentDefinition;
  readonly stages: {
    readonly "jit.container": number;
    readonly "jit.compile": number;
    readonly "jit.cleanup": number;
  };
}

/** Exact container/compiler inputs for one isolated JIT compilation. */
export interface JitCompilerRequest {
  readonly definition: IElementComponentDefinition;
  readonly rootRegistrations?: readonly unknown[];
  readonly rootRegistrationPosition?: "before-standard-configuration" | "after-standard-configuration";
  readonly localRegistrations?: readonly unknown[];
  readonly resolveResources?: boolean;
}

/** Lifecycle owner for real JIT compilation over one process-lifetime DOM platform. */
export class JitCompilerOracle {
  readonly #platform: BrowserPlatform;
  #disposed = false;

  public constructor() {
    this.#platform = ProcessJitPlatformHost.current.platform;
  }

  public compile(request: JitCompilerRequest): JitCompilerExecution {
    if (this.#disposed) {
      throw new Error("Cannot compile with a disposed JIT compiler oracle.");
    }
    if (request.definition.template == null || request.definition.needsCompile === false) {
      throw new Error("A JIT compiler case must provide a compileable template with needsCompile enabled.");
    }

    const containerStartedAt = performance.now();
    const { root, compilation } = createCompilerContainers(this.#platform, request);
    const containerMs = performance.now() - containerStartedAt;
    let compiled: ICompiledElementComponentDefinition | undefined;
    let compileMs = 0;
    let cleanupMs = 0;
    const compileStartedAt = performance.now();
    try {
      const compiler = compilation.get(ITemplateCompiler);
      compiler.resolveResources = request.resolveResources ?? false;
      compiled = compiler.compile(request.definition, compilation);
      compileMs = performance.now() - compileStartedAt;
    } finally {
      compileMs ||= performance.now() - compileStartedAt;
      const cleanupStartedAt = performance.now();
      compilation.dispose();
      root.dispose();
      cleanupMs = performance.now() - cleanupStartedAt;
    }
    if (compiled == null || compiled === request.definition || compiled.needsCompile !== false) {
      throw new Error("The JIT compiler did not produce a fresh compiled definition.");
    }
    return {
      compiled,
      stages: {
        "jit.container": containerMs,
        "jit.compile": compileMs,
        "jit.cleanup": cleanupMs,
      },
    };
  }

  public dispose(): void {
    this.#disposed = true;
  }
}

/** Create the real framework JIT oracle used by batched differential tests. */
export function createJitCompilerOracle(): JitCompilerOracle {
  return new JitCompilerOracle();
}

interface JitCompilerContainers {
  readonly root: IContainer;
  readonly compilation: IContainer;
}

class ProcessJitPlatformHost {
  static #current: ProcessJitPlatformHost | undefined;

  public static get current(): ProcessJitPlatformHost {
    if (this.#current == null) {
      this.#current = new ProcessJitPlatformHost();
    }
    return this.#current;
  }

  public readonly platform: BrowserPlatform;

  private constructor() {
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
      pretendToBeVisual: true,
    });
    const browserGlobal = dom.window as unknown as typeof globalThis;
    const platform = new BrowserPlatform(browserGlobal, {
      fetch: noop as unknown as typeof browserGlobal.fetch,
      queueMicrotask: globalThis.queueMicrotask.bind(globalThis),
    });
    this.platform = platform;
    process.once("exit", () => { dom.window.close(); });
  }
}

function createCompilerContainers(platform: BrowserPlatform, request: JitCompilerRequest): JitCompilerContainers {
  const root = DI.createContainer().register(Registration.instance(IPlatform, platform));
  try {
    const rootRegistrations = request.rootRegistrations ?? [];
    if (request.rootRegistrationPosition === "before-standard-configuration") {
      root.register(...rootRegistrations);
    }
    root.register(StandardConfiguration);
    if (request.rootRegistrationPosition !== "before-standard-configuration") {
      root.register(...rootRegistrations);
    }

    const compilation = root.createChild();
    try {
      compilation.register(...(request.definition.dependencies ?? []));
      compilation.register(...(request.localRegistrations ?? []));
      return { root, compilation };
    } catch (error) {
      compilation.dispose();
      throw error;
    }
  } catch (error) {
    root.dispose();
    throw error;
  }
}
