# Browser recovery assurance

This runnable fixture deliberately contains invalid HTML. Do not format the table
children or paragraph descendants into their browser-correct locations: recovery
before compilation is the behavior under test.

High-signal cases are mined from the independent Chromium cases in
`packages/aot/src/testing/browser-tree-oracle-cases.ts` and JIT interactions in
`jit-oracle-browser-interaction-cases.ts`: foster-parented bound targets, paragraph
closure changing template-controller topology, first-wins duplicate binding
attributes, SVG/MathML HTML integration points, and template carrier selection.
The framework authorities are `TemplateElementFactory.createTemplate`,
`TemplateCompiler._compileNode/_compileElement`, and the native-slot/carrier cases
in `packages/__tests__/src/3-runtime-html/template-compiler.spec.ts` and
`template-element-factory.spec.ts` in the pinned Aurelia checkout.

The browser journey asserts the concrete DOM consequence independently for both
JIT and AOT, then compares the same transcript. The input drives two-way writeback
through the surviving duplicate attribute. Toggling and mutating exercise the
recovered controller topology instead of only checking the initial DOM.
