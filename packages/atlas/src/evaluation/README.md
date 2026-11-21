# Static evaluation

Atlas interprets ECMAScript source so framework analysis can inspect configuration arrays, helper returns, registrations and effects. The evaluator works with source declarations and lexical environments. The caller supplies module resolution and any modeled intrinsics. [Evaluator](evaluator.ts) · [Module linker](module-graph.ts) · [Framework source resolver](../framework/module-boot.ts)

A function value retains its declaration and captured environment. To compare two method bodies, bind the checker-resolved declaration in its defining environment and evaluate the same call with the same inputs. Identity comparisons need distinct input objects when the question concerns an equal-ID copy.

Unknown calls, mutations and unresolved inputs produce explicit open seams. The effect trace records possible branches for unknown conditions and respects block exits. Use a framework or product run to establish which branch actually executed. [Effect trace](effects.ts) · [Open-seam kinds](seam.ts)
