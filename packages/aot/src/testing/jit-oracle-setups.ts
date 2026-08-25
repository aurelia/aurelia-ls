import type { CompilerSetupFactory } from "./compiler-case.js";
import type { JitCompilerSetupMaterializer } from "./jit-compiler-case-executor.js";

/** Neutral setup factories admitted by the current declarative corpus. */
export const JIT_ORACLE_SETUP_FACTORIES: readonly CompilerSetupFactory[] = [];

/** JIT setup materializers admitted by the current declarative corpus. */
export const JIT_ORACLE_SETUP_MATERIALIZERS: readonly JitCompilerSetupMaterializer[] = [];
