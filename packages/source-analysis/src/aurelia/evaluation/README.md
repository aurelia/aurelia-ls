# Static Evaluation Substrate

See [../README.md](../README.md) for the folder-wide rebuild map and MCP co-evolution rule.

Static evaluation is the ECMAScript-shaped substrate between boot admission and Aurelia-specific producers.
It builds module records, imports/exports, environment records, evaluator-local values, completions, and explicit
open seams without executing user code.

The evaluator is intentionally not an Aurelia recognizer. Resource, DI, template, and configuration producers
consume evaluator results and decide which kernel claims or materialized products are warranted.

## Responsibilities

- Parse TypeScript source files as ECMAScript modules with imports, exports, and top-level bindings.
- Build module environment records with declared, initialized, imported, function, class, and open bindings.
- Evaluate conservative expression shapes such as literals, arrays, object literals, property access, simple
  operators, conditionals, and simple function returns.
- Traverse a deliberate statement set with explicit unsupported cases for statements that can affect evaluation.
- Preserve unresolved syntax, dynamic calls, dynamic imports, unknown references, and unsupported effects as open
  seams.
- Provide generic expression/value readers over evaluated module environments so producers do not instantiate
  private evaluators or duplicate object/string/target projection helpers.
- Emit kernel records only for durable boundary facts such as source spans, evidence, provenance, and open seams.

## Non-Responsibilities

- Recognizing Aurelia resources, DI registrations, template semantics, or framework APIs.
- Treating evaluator-local values as durable kernel products.
- Running arbitrary user code, getters, setters, async functions, generators, constructors, or class bodies.
- Ranking answers for IDE, MCP, AI, diagnostics, AOT, or refactoring consumers.

## Design Pressure

The evaluator should look close enough to ECMAScript that missing behavior has a named place to land. Unsupported
syntax is not a placeholder; it is an observed seam that later producers and queries can inspect.

Kernel emission stays narrow. Internal values can keep TypeScript nodes, source files, and mutable maps because
they are current-run evaluator machinery. The kernel receives normalized links and explanation records.

`expression-reader.ts` is the producer-facing read surface for evaluated TypeScript expressions. It may expose
generic object, string, array, and target reads, but it must not learn Aurelia resource, DI, template, or
configuration vocabulary.

## Watchpoints

- Import bindings start as evaluator-local unknown values. They should become seams only when a producer or
  expression actually depends on the imported value and module linking cannot close it.
- `EvaluationKernelBridge` currently maps evaluator seam kinds onto general `KernelVocabulary.Evaluation` keys.
  Keep this bridge narrow: it translates evaluator-local seams to product-owned seam vocabulary, but it must not
  learn Aurelia resource, configuration, registration, template, or DI semantics.
- Evaluator guardrails exist only to prevent runaway interpretation of arbitrary source. They are not query
  pagination, ranking, or consumer policy.
