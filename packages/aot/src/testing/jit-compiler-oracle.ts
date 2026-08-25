import { DI, type IContainer, noop, Registration } from "@aurelia/kernel";
import { BrowserPlatform } from "@aurelia/platform-browser";
import { IPlatform, StandardConfiguration } from "@aurelia/runtime-html";
import {
  type AttrSyntax,
  type IInstruction,
  ITemplateCompiler,
  type ICompiledElementComponentDefinition,
  type IElementComponentDefinition,
} from "@aurelia/template-compiler";
import { JSDOM } from "jsdom";
import { performance } from "node:perf_hooks";
import type { BatchCaseExecution } from "./batch-runner.js";

/** Stage timings from one isolated framework JIT compilation. */
export type JitCompiledDefinition = Omit<ICompiledElementComponentDefinition, "surrogates"> & {
  readonly surrogates: readonly IInstruction[];
};

export interface JitCompilerExecution extends BatchCaseExecution {
  readonly compiled: JitCompiledDefinition;
  readonly stages: {
    readonly "jit.container": number;
    readonly "jit.compile": number;
    readonly "jit.cleanup": number;
  };
}

/** Unchanged entry result for null-template and needsCompile=false bypass contracts. */
export interface JitCompilerBypassExecution extends BatchCaseExecution {
  readonly definition: IElementComponentDefinition;
  readonly stages: JitCompilerExecution["stages"];
}

/** Stage timings and instruction output from one isolated runtime spread compilation. */
export interface JitCompilerSpreadExecution extends BatchCaseExecution {
  readonly instructions: readonly IInstruction[];
  readonly stages: {
    readonly "jit.container": number;
    readonly "jit.compile-spread": number;
    readonly "jit.cleanup": number;
  };
}

interface JitCompilerWorldRequest {
  readonly definition: IElementComponentDefinition;
  readonly rootRegistrationsBefore?: readonly unknown[];
  readonly rootRegistrationsAfter?: readonly unknown[];
  readonly localRegistrations?: readonly unknown[];
  readonly debug?: boolean;
  readonly resolveResources?: boolean;
}

/** Exact container/compiler inputs for one isolated JIT compilation. */
export type JitCompilerRequest = JitCompilerWorldRequest;

/** Exact inputs for one isolated `ITemplateCompiler.compileSpread(...)` call. */
export interface JitCompilerSpreadRequest extends JitCompilerWorldRequest {
  readonly attributes: readonly AttrSyntax[];
  readonly target: globalThis.Element;
  readonly targetDefinition?: IElementComponentDefinition;
}

/** Distinguishes a framework compiler rejection from container/setup/oracle infrastructure failure. */
export class JitCompilerInvocationError extends Error {
  public constructor(readonly frameworkError: unknown) {
    super(
      `Framework template compiler threw: ${frameworkError instanceof Error ? frameworkError.message : String(frameworkError)}`,
    );
    this.name = "JitCompilerInvocationError";
  }
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
    let compiled: JitCompiledDefinition | undefined;
    let compileMs = 0;
    const failure: CapturedSynchronousFailure = { threw: false, error: undefined };
    const compileStartedAt = performance.now();
    try {
      const compiler = compilation.get(ITemplateCompiler);
      compiler.debug = request.debug ?? false;
      compiler.resolveResources = request.resolveResources ?? false;
      try {
        compiled = compiler.compile(request.definition, compilation);
      } catch (error) {
        throw new JitCompilerInvocationError(error);
      }
      compileMs = performance.now() - compileStartedAt;
    } catch (error) {
      failure.threw = true;
      failure.error = error;
    }
    compileMs ||= performance.now() - compileStartedAt;
    const cleanupMs = disposeCompilerContainers(compilation, root, failure, "JIT compile");
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

  public bypass(request: JitCompilerRequest): JitCompilerBypassExecution {
    if (this.#disposed) {
      throw new Error("Cannot evaluate a compiler bypass with a disposed JIT compiler oracle.");
    }
    if (request.definition.template != null && request.definition.needsCompile !== false) {
      throw new Error("A compiler bypass case must provide a null template or needsCompile=false.");
    }

    const containerStartedAt = performance.now();
    const { root, compilation } = createCompilerContainers(this.#platform, request);
    const containerMs = performance.now() - containerStartedAt;
    let definition: IElementComponentDefinition | undefined;
    let compileMs = 0;
    const failure: CapturedSynchronousFailure = { threw: false, error: undefined };
    const compileStartedAt = performance.now();
    try {
      const compiler = compilation.get(ITemplateCompiler);
      compiler.debug = request.debug ?? false;
      compiler.resolveResources = request.resolveResources ?? false;
      definition = compiler.compile(request.definition, compilation);
      compileMs = performance.now() - compileStartedAt;
    } catch (error) {
      failure.threw = true;
      failure.error = error;
    }
    compileMs ||= performance.now() - compileStartedAt;
    const cleanupMs = disposeCompilerContainers(compilation, root, failure, "JIT bypass");
    if (definition !== request.definition) {
      throw new Error("The JIT compiler did not preserve the bypassed definition identity.");
    }
    return {
      definition,
      stages: {
        "jit.container": containerMs,
        "jit.compile": compileMs,
        "jit.cleanup": cleanupMs,
      },
    };
  }

  public compileSpread(request: JitCompilerSpreadRequest): JitCompilerSpreadExecution {
    if (this.#disposed) {
      throw new Error("Cannot compile spread attributes with a disposed JIT compiler oracle.");
    }

    const containerStartedAt = performance.now();
    const { root, compilation } = createCompilerContainers(this.#platform, request);
    const containerMs = performance.now() - containerStartedAt;
    let instructions: readonly IInstruction[] | undefined;
    let compileMs = 0;
    const failure: CapturedSynchronousFailure = { threw: false, error: undefined };
    const compileStartedAt = performance.now();
    try {
      const compiler = compilation.get(ITemplateCompiler);
      compiler.debug = request.debug ?? false;
      compiler.resolveResources = request.resolveResources ?? false;
      try {
        instructions = compiler.compileSpread(
          request.definition,
          [...request.attributes],
          compilation,
          request.target,
          request.targetDefinition,
        );
      } catch (error) {
        throw new JitCompilerInvocationError(error);
      }
      compileMs = performance.now() - compileStartedAt;
    } catch (error) {
      failure.threw = true;
      failure.error = error;
    }
    compileMs ||= performance.now() - compileStartedAt;
    const cleanupMs = disposeCompilerContainers(compilation, root, failure, "JIT compileSpread");
    if (instructions == null) {
      throw new Error("The JIT compiler did not return spread instructions.");
    }
    return {
      instructions,
      stages: {
        "jit.container": containerMs,
        "jit.compile-spread": compileMs,
        "jit.cleanup": cleanupMs,
      },
    };
  }

  public createElement(tagName: string): globalThis.Element {
    if (this.#disposed) {
      throw new Error("Cannot create a spread target with a disposed JIT compiler oracle.");
    }
    return this.#platform.document.createElement(tagName);
  }

  public createTemplate(markup: string): globalThis.HTMLTemplateElement {
    if (this.#disposed) {
      throw new Error("Cannot create a template input with a disposed JIT compiler oracle.");
    }
    const template = this.#platform.document.createElement("template");
    template.innerHTML = markup;
    return template;
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

interface CapturedSynchronousFailure {
  threw: boolean;
  error: unknown;
}

function disposeCompilerContainers(
  compilation: IContainer,
  root: IContainer,
  failure: CapturedSynchronousFailure,
  operation: string,
): number {
  const startedAt = performance.now();
  const cleanupErrors: unknown[] = [];
  try {
    compilation.dispose();
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    root.dispose();
  } catch (error) {
    cleanupErrors.push(error);
  }
  const durationMs = performance.now() - startedAt;
  if (failure.threw) {
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [failure.error, ...cleanupErrors],
        `${operation} failed and compiler-container disposal also failed.`,
      );
    }
    throw failure.error;
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, `${operation} compiler-container disposal failed.`);
  }
  return durationMs;
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

function createCompilerContainers(platform: BrowserPlatform, request: JitCompilerWorldRequest): JitCompilerContainers {
  const root = DI.createContainer().register(Registration.instance(IPlatform, platform));
  try {
    root.register(...(request.rootRegistrationsBefore ?? []));
    root.register(StandardConfiguration);
    root.register(...(request.rootRegistrationsAfter ?? []));

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
