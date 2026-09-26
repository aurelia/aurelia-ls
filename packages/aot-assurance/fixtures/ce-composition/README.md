# Static custom-element composition

This is a finite browser parity fixture, curated from the dashboard `activate(model)` pattern and
`content-projection-topology`'s declaring/receiving same-name resource scopes. Neither source pressure fixture is
replaced or weakened. Every `au-compose component` value here is a literal resource name.

The native precedent is `aurelia/packages/__tests__/src/3-runtime-html/au-compose.spec.ts`: named-resource resolution,
local registry isolation, projected caller bindings, pass-through bindables and host attributes, and model-only
updates without reconstruction. `id.bind` deliberately targets the chart's host but the inventory's bindable; both
also receive `message.bind` and a static host class. The two widgets occupy separate static sites: this is not a
runtime component-switching test.

The caller projects a live input into the chart. Separately, a supplied shell projection resolves the declaring
`scoped-compose-widget`, while shell fallback resolves a different same-named definition from its own dependencies.
Both same-named sites capture a bound host title, forcing runtime spread lookup to spend the distinct compiled target
identities. The supplied title follows the caller's changing message; the fallback title retains its receiving-scope value.
Four checkpoints cover initial rendering, parent/captured updates, projected writeback, and model replacement while
retaining the composed hosts. Teardown must detach those hosts and empty the application.

The AOT lane requires compiler-final definitions, replaced runtime configuration and exact renderer leaves. It retains
`DefaultResources` intentionally: compiler-only capture plans do not yet include rendered expression-resource lifecycle
demand for safe behavior/converter pruning. This is not a real compiler/parser fallback or a size-optimized resource claim.

Dynamic component values, arbitrary templates, promises, CE instances and component switching remain covered by
the original analysis-pressure fixtures, not certified by this compiler-free browser corridor.
