# Evaluation Substrate

Static evaluation is an ECMAScript-shaped source reader for framework source analysis. It exists because the Aurelia
framework code was not written as a self-describing static contract surface, so some module-scoped declarations,
resource definitions, registrations, and world-construction paths have to be interpreted from source.

## Responsibilities

- Evaluate literals, arrays, objects, property reads, simple operators, conditionals, and local function returns.
- Build module-local environments from imports, functions, classes, enums, variable declarations, and simple binding
  patterns that preserve exported local names.
- Provide reusable module graph/evaluator primitives that callers can link with their own resolver policy.
- Represent calm ECMAScript host primitives that framework source uses as declaration machinery, currently
  `Symbol.for(...)`, `Object.freeze(...)`/package-local freeze aliases, and object-binding exports.
- Preserve unsupported syntax, unresolved identifiers, dynamic calls, mutation pressure, and branch uncertainty as open seams.
- In static invocation/effect tracing, treat `return`, `throw`, `break`, and `continue` as block-exit completions so
  framework effect rows do not pretend later statements in the same block still execute. Branch conditions can still
  remain dynamic and report both branch bodies as potential effects.
- In static invocation/effect tracing, bind destructured variable, parameter, callback, and for-of names as lexical flow
  facts with destructured paths instead of emitting unsupported binding-pattern seams for ordinary object/array
  destructuring.
- Offer an intrinsic hook for known pure helper calls without importing the target package.
- Stay framework-neutral at the core: Aurelia resource, registration, DI, and materialization readers sit above this layer.

## Non-Responsibilities

- Executing constructors, class bodies, getters, setters, async functions, generators, or arbitrary user code.
- Analyzing the internal product packages when explicit types and TypeChecker projection can carry the contract.
- Guessing semantic meaning from helper names alone.
- Owning TypeChecker projection, call hierarchy, reference search, or carrier-flow analysis.
- Serializing evaluator-local values as durable semantic truth.

## Pressure

This layer should publish its expression set, statement set, budgets, and open-seam categories. Framework-specific
substrates can add small intrinsics or readers that declare a helper call as pure within a named model; the evaluator
itself should not grow private Aurelia semantics, and internal repo semantics should be shaped so the TypeChecker is
enough.

The generic module graph intentionally does not know how `@aurelia/*` should resolve. Framework package source booting
lives in `framework/module-boot.ts`, where package imports are resolved to the Aurelia submodule `src/` files. Keep that
boundary: linked ECMAScript evaluation is generic machinery, while "framework packages must boot from source, not
`.d.ts`" is Aurelia framework policy.
