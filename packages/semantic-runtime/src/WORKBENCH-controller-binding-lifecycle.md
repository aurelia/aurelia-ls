# Controller Binding Lifecycle Notes

## Why This Exists

The current semantic-runtime model has framework-shaped classes for controllers,
bindings, renderers, and observers, but some semantic behavior is still owned by
materializer passes. That made the recent observer-locator work useful, but it
also pulled us toward custom product-layer names and pass-shaped logic instead
of Aurelia-shaped behavior.

This pass should reduce that drift.

## Current Diagnosis

- `PropertyBinding`, `InterpolationBinding`, and `AttributeBinding` already have
  `auLink` anchors, but they are too record-like.
- `RuntimeControllerBindMaterializer` now records Controller.bind output, but it
  should stay a lifecycle/provenance pass rather than the place where binding
  semantics accumulate.
- The missing bridge is the controller lifecycle: renderers add bindings to
  controllers, then controller bind activates those bindings with scope.
- Observer-locator lookup belongs most directly to `PropertyBinding.bind`.
- `InterpolationBinding` accessor setup is constructor/renderer shaped in
  Aurelia, not identical to property binding bind-time lookup.
- `AttributeBinding` class/style/attribute behavior is direct target update
  behavior, not just another observer-locator lookup.
- Template controllers need a durable semantic place for cardinality, branch
  exclusivity, synthetic view scope, iteration, and narrowing.

## Intended Direction

1. Keep materializers as commit/provenance wrappers.
2. Move target access and target operation intent onto framework-shaped binding
   classes.
3. Add a controller-bind semantic layer that walks rendered controller bindings
   and asks each binding for its bind-time contribution.
4. Preserve the existing API counters and target-access rows while making the
   source of truth more Aurelia-shaped.
5. Use this pressure to reveal whether target access is too narrow for
   class/style/attribute semantics and whether we need a sibling product shape.

Hydration/lifecycle note: semantic-runtime is already emulating hydration
through compiled-template render targets, runtime Rendering dispatch, controller
creation, child containers, and `Controller.addBinding` / `Controller.addChild`.
The open boundary is not "do hydration later"; it is recursive/runtime-state
dependent hydration, where controller semantics and TypeChecker-backed state
projection need to stand in for branches that cannot be statically executed.

## Do Not Lose

- External `aurelia` and `aurelia2-plugins` are read-only unless explicitly
  requested.
- Build check is `pnpm --filter @aurelia-ls/semantic-runtime build`.
- Avoid growing `runtime.ts` to compensate for missing semantic products.
- Prefer direct framework names with `auLink` over emulator/custom suffix sprawl.

## Current Landed Shape

- `RuntimeControllerFrame.bind(...)` walks controller-owned bindings, and
  `PropertyBinding`, `AttributeBinding`, and `InterpolationBinding` publish
  their own bind-time target-access or target-operation intent.
- `RuntimeControllerBindMaterializer` records bind products and provenance but
  should not become the owner of binding semantics.
- Template-controller semantics carry child-view cardinality and control-flow
  roles. Scope materialization consumes those profiles instead of hard-coded
  string checks for `if`, `else`, `then`, `catch`, and similar controllers.
- Direct target operations are distinct from target access. `.class`, `.style`,
  ordinary attribute writes, text interpolation, listener subscription, ref
  assignment, and renderer-owned static host transfers publish operations rather
  than pretending every target effect is an observer/accessor lookup.
- Observer-locator target closure no longer guesses custom elements from
  dash-cased tag names. Renderer target selection decides whether a binding
  targets a child controller view-model or a host node; unknown node tags fall
  through DOM tag maps to `HTMLElement` / `SVGElement`.
- SVG element/attribute observer data is generated from Aurelia
  `runtime-html` `SVGAnalyzer` and is only used for authored SVG-namespace
  nodes.

## Remaining Pressure

- Recursive/runtime-state-dependent hydration now has a finite aggregate boundary
  for self-recursive or mutually recursive custom-element definitions: the child
  controller records a `recursive-hydration-boundary` lifecycle step and API rows
  expose `childViewRenderingState=recursive-boundary` instead of an open seam.
  Per-instance expansion, lifecycle-sensitive activation, and runtime-state
  termination policy remain future controller semantics.
- Recursive rendering can still create multiple runtime controller frames from
  one compiled instruction product. Any scope, synthetic-view, or branch-link
  handoff that starts from an instruction handle must carry the active parent
  controller context; a global lookup can silently bind only one instance and
  leave repeated/nested controller frames unscoped or unlinked.
- Captured attributes and spread instructions have a first scope bridge, not a
  complete instance-specific recursive rendering model.
- Event-to-expression invocation flow, value-converter `fromView`, setter body
  tracing, matcher-specific comparison, and richer coercion/strictness policy
  remain outside the closed binding data-flow slice.
