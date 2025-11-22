# Aurelia Template Lowering & Binding Spec

This document is the normative contract for Aurelia’s template flow: how DOM is lowered into instruction IR, how resources are resolved at hydration, and how scopes/bindings are constructed.

## Normative Phases
The runtime performs three conceptual phases. Each phase below is normative for an AOT/LSP implementation.

### Lowering (HTML -> Instruction IR)
- Input: HTML template + resource catalog (custom elements/attributes, binding commands, attribute patterns).
- Walk DOM depth-first, producing ordered instruction rows aligned to hydration targets (elements or markers). Text nodes with interpolation become text-binding rows.
- Attribute processing per element:
  - Normalize `as-element` names; recognize `containerless`.
  - Resolve binding commands; override commands bypass other checks and consume the attribute.
  - Custom element bindables take precedence over same-named custom attributes.
  - Custom attributes: single value targets primary bindable; multi-value mode when allowed and inline bindings exist.
  - Template controllers become `HydrateTemplateController` instructions; nested TCs wrap inner templates right-to-left.
  - Plain attributes: interpolation -> `Interpolation`; literals -> `SetAttribute`/`SetClassAttribute`/`SetStyleAttribute`.
  - Capture: when an element definition opts into capture, non-bindable/non-TC/allowed spreads are removed from the element and recorded on `HydrateElement.captures`.
  - Spread: `...$attrs` emits `SpreadTransferedBinding`; spreads against custom-element bindables emit `SpreadValueBinding`/`SpreadElementPropBinding`; reserved/invalid spreads throw.
  - Order-sensitive inputs may reorder `checked` vs `value|model|matcher` instructions.
- Element instruction list is `[HydrateElement?] + [HydrateAttribute*] + [binding/plain attr*]`. Surrogates mirror rules with forbidden attributes and disallow template controllers. Markers are inserted when needed (containerless or template controller wrapping) so hydration can target rows.
- Slots/projections: slotted children extracted into synthetic templates compiled into `HydrateElement.projections`.
- `<let>` produces `HydrateLetElement` row; no new scope is created during lowering.

### Resolve-Host (Linking Resources to Definitions)
- Inputs: Instruction IR + DI container/resource registry available at hydration time.
- `HydrateElement/Attribute/TemplateController` `res` values:
  - If string: resolve to a registered definition by name; missing entries are errors.
  - If definition/object: use directly; string vs definition choice is transparent to later phases.
- Attribute aliases on custom attributes record the used alias for resolution equivalence.
- Template controllers choose container strategy (`reuse` or `new`) for their view factories; this affects child container creation but not instruction identity.
- Refs map to controllers keyed by resource definitions; ref resolution targets element/attribute/element-name/controller/component names.
- Spread/instruction tables are fixed by `InstructionType`; renderer lookup is by `instruction.type`.

### Bind (Scope Graph Construction)
- Root custom element creates a boundary scope with its view-model as binding context; custom attributes reuse parent scope (not boundaries). Synthetic views must be given a scope.
- Scope resolution rules:
  - `AccessScope(name, ancestor)` walks parent scopes until a boundary or a match in binding/override context; `$host` must exist when requested.
  - `AccessThis(ancestor)` hops ancestors explicitly without boundary checks.
  - `AccessBoundary` jumps to nearest boundary binding context.
- Scope creation per resource:
  - `with` creates `Scope.fromParent(parent, value||{})` (child scope, no boundary).
  - `repeat` creates child scopes per item: binding context holds the local (or destructured locals); override context carries `$index/$length/$odd/$even/$first/$middle/$last` and optional `$previous/__items__` when `contextual` true.
  - `promise` creates one child scope `{}` for pending/fulfilled/rejected views; settlement values are passed as activation args, not as scope context.
  - `switch` and `case` activate views with the parent scope.
  - `if/else` activate chosen view with the parent scope.
  - `portal` activates with the parent scope regardless of DOM relocation.
  - `au-slot`: if projected content exists, overlay outer scope with a child scope whose binding context equals the outer binding context, override context sets `$host = expose ?? host`; otherwise use parent scope.
  - `au-compose`: template-only composition uses `scopeBehavior` (`auto` -> child of parent scope with component as binding context; `scoped` -> new boundary scope with component as binding context). Composed custom elements use their own boundary scope.
  - `<let>` adds properties to binding or override context of the current scope; no new scope instance.
- Bind phase installs bindings in traversal order per instruction rows, honoring renderer-specific targets (view-model vs host/style/attribute/class).

## Terms and Data Shapes
- **Row** – `IInstruction[][]` arranged in DOM depth-first order. Each row belongs to exactly one target node/marker.
- **AttrSyntax** – result of parsing an attribute: `{ target, command|null, rawValue, parts? }`.
- **Binding command** – resource implementing `BindingCommandInstance` that builds one or more instructions from an `AttrSyntax`.
- **Instruction inventory** (type -> payload):
  - `HydrateElement` `{res, props[], projections|null, containerless, captures?, data}`.
  - `HydrateAttribute` `{res, alias?, props[]}`.
  - `HydrateTemplateController` `{def, res, alias?, props[]}`.
  - `HydrateLetElement` `{instructions: LetBindingInstruction[], toBindingContext}`.
  - `PropertyBinding` `{from, to, mode}`; modes follow `BindingMode`.
  - `Interpolation` `{from: string|InterpolationAST, to}`.
  - `TextBinding` `{from}` (created for text-node interpolations).
  - `ListenerBinding` `{from, to, capture, modifier}`.
  - `AttributeBinding` `{attr, from, to}`.
  - `StylePropertyBinding` `{from, to}`.
  - `SetProperty` `{value, to}`.
  - `SetAttribute` `{value, to}`; class/style variants have dedicated instructions.
  - `IteratorBinding` `{forOf, to, props?: MultiAttrInstruction[]}` where `props` holds semicolon options.
  - `RefBinding` `{from, to}`.
  - Spread helpers: `SpreadTransferedBinding`, `SpreadElementPropBinding {instruction}`, `SpreadValueBinding {target: '$bindables'|'$element', from}`.

## Traversal Overview
1. Starting from the compiled element's template (string is first converted to a `<template>` via `ITemplateElementFactory`), walk nodes depth-first.
2. For each node type, run the corresponding lowering rule set (Element, Text, DocumentFragment, `<let>`).
3. When a lowering rule produces instructions for a node, the node is marked as a hydration target (or replaced by a marker if containerless/template-controller rules require it) and the composed instruction list is appended as a new row.

## Element Lowering
### Element identity
1. Compute the effective element name: `as-element` attribute when present, otherwise the lower-cased tag name.
2. Resolve a custom-element definition for that name (via the resource resolver). If found, treat the element as a custom element; otherwise treat it as a plain element.

### Attribute pass (single left-to-right scan)
Let `attrSyntax = AttrParser.parse(name, value)` with `target`, `command`, `rawValue`.
1. Skip removal-only attributes: `as-element`, `containerless`.
2. **Capture** (when the resolved element definition configures `capture`): attributes that are not bindables, not template controllers, not `slot`/`au-slot`, and not spread markers are appended to `HydrateElement.captures` and removed.
3. **Spread markers**:
   - `...$attrs` emits `SpreadTransferedBindingInstruction`; remove.
   - `...X` on a custom element where `X !== '$element'` yields `SpreadValueBindingInstruction` to `$bindables`, with `from = (X === '$bindables') ? rawValue : X`; remove. Any other spread name throws.
4. **Override binding commands** (`command.ignoreAttr === true`, e.g. `trigger`, `capture`, `attr`, `class`, `style`, `ref`): build the command instruction and remove the attribute, bypassing other checks.
5. **Bindable on custom element** (determined by the resolved element definition's bindables):
   - No command: parse `rawValue` as interpolation; emit `Interpolation` when interpolated, otherwise `SetProperty(value, bindable.name)`. Remove.
   - With command: run command with bindable context; remove.
   - `$bindables` special-case: with command, emit the command result (expected `SpreadValueBindingInstruction`); without command, ignore (dev warning); remove.
6. **Custom attribute** (resolved by name via the resource resolver):
   - Multi-binding mode is allowed when the definition allows multi-bindings, no command is present, and the value text contains an unescaped `:` before any `${...}`. In that mode split on unescaped semicolons/colons to emit per-bindable `SetProperty`/`Interpolation`/command instructions.
   - Otherwise pick the primary bindable, then:
     - No command: interpolation -> `Interpolation`, literal -> `SetProperty` (empty literal yields no instruction).
     - With command: run command with bindable context.
   - If the definition is a template controller, produce `HydrateTemplateController` (definition filled later); otherwise produce `HydrateAttribute`. In both cases remove the source attribute. Record the used alias when it matches an attribute alias.
7. **Plain attribute** (no custom attr, no bindable):
   - No command: interpolation ⇒ `Interpolation(targetMapped, expr)` where `targetMapped = attrMapper.map(...) ?? camelCase(target)`; remove. Pure literals stay on the element and produce no instruction.
   - Command present: emit the command instruction; remove.
8. After scanning all attributes, optional reorder is applied for `input[type=checkbox|radio]` and `select multiple` so that `checked` follows `value|model|matcher` bindings.

### Composing element instructions
1. If an element definition was resolved, emit `HydrateElement` that references the definition itself (when resolving resources) or its name (when not resolving). Include collected bindable instructions, projections (initially null), containerless flag, and captured attributes. `data` carries `processContent` metadata when provided.
2. Combine instructions for this element as `[HydrateElement?] + [HydrateAttribute*] + [plainAttrInstruction*]` (empty groups are skipped). The order of each group is the DOM attribute order.
3. If any instructions exist, mark or replace the element with a marker (when `containerless` applies) so the row can be matched at runtime.

### Template controllers
When one or more `HydrateTemplateController` were collected:
1. The compiler hoists the element into an inner `<template>` (or clones if the target is already a `<template>`), preserving the element instructions as the first row of a child compilation context.
2. The innermost template is compiled normally to produce `def` for the rightmost template controller.
3. Remaining controllers are wrapped right-to-left: each creates a fresh template containing only a marker and location comments; its `def.instructions` is a single row containing the previously built controller.
4. The outermost controller is emitted as a single-row entry in the parent context. The original element is replaced by a marker.

### Child content and projections
- If the element is custom and either the element definition declares `containerless` or a `containerless` attribute is set, children are skipped.
- Otherwise, children are compiled depth-first unless `processContent` returns `false`.
- Slot projection: when compiling children of a custom element, any descendant with `au-slot` (or any child when there is no shadow DOM) is moved into a synthetic template keyed by the slot name (default `'default'`). Each slot template is compiled into an `IElementComponentDefinition` recorded on `HydrateElement.projections[slotName]`.

## Text Node Lowering
1. Parse the text content as an interpolation.
2. If no interpolation is present, keep the text node and produce no instruction.
3. For each expression part, insert a marker + placeholder text node before the original text node and emit `TextBindingInstruction` for the corresponding expression. Remove the original text node. The number of emitted rows equals the number of expressions in the interpolation.

## `<let>` Element Lowering
1. Attributes other than `to-binding-context` are parsed as `AttrSyntax`.
2. Only the `bind` command is allowed; otherwise an error is thrown.
3. No command: interpolation -> `LetBindingInstruction(expr, camelCase(target))`; literal -> `LetBindingInstruction(PrimitiveLiteralExpression(value), camelCase(target))` with a dev warning for raw strings.
4. `to-binding-context` toggles `HydrateLetElement.toBindingContext`.
5. Emit a row `[HydrateLetElementInstruction(letInstructions, toBindingContext)]` and mark the `<let>` as the target.

## Surrogate Attributes (template root)
For a `<template>` root, `surrogates` are built by running the same attribute lowering as an element, with additional constraints: attributes `id`, `name`, `au-slot`, and `as-element` are invalid. Surrogates never produce `HydrateElement` and are stored separately from normal rows. Template controllers on surrogates are invalid.

## Spread Compilation API
`compileSpread(requestor, attrSyntaxes, container, target, targetDef?)` reuses the attribute rules above but always lowers to instructions (`SetAttribute`, `SetClassAttribute`, `SetStyleAttribute` are emitted for literals so that static values survive spreading). Bindable hits on a custom element are wrapped in `SpreadElementPropBindingInstruction`.

## Binding Command Semantics
Commands implement `build(info, parser, mapper)`; the table below states the resulting instruction and field derivation. `value` is `attr.rawValue === '' ? camelCase(attr.target) : attr.rawValue`.

| Command | Result |
| --- | --- |
| `bind` | `PropertyBinding(parse(value, IsProperty), target, mode)`; `mode` defaults to two-way when `attrMapper.isTwoWay(node,target)` is true, otherwise to-view. When bound to a custom bindable, `mode` falls back to the bindable’s `mode` or the attribute definition’s `defaultBindingMode`. |
| `one-time` | `PropertyBinding(..., InternalBindingMode.oneTime)` |
| `to-view` | `PropertyBinding(..., InternalBindingMode.toView)` |
| `from-view` | `PropertyBinding(..., InternalBindingMode.fromView)` |
| `two-way` | `PropertyBinding(..., InternalBindingMode.twoWay)` |
| `for` | `IteratorBinding(parse(rawValue, IsIterator), target, props)` where `props` is a list of `MultiAttrInstruction(value,to,command)` parsed from semicolon-separated `key:value` pairs after the iterator expression. |
| `trigger` | `ListenerBinding(parse(rawValue, IsFunction), target, capture=false, modifier=attribute-modifier)` (override command). |
| `capture` | Same as `trigger` with `capture=true` (override command). |
| `attr` | `AttributeBinding(attr.target, parse(value, IsProperty), attr.target)` (override). |
| `style` | `AttributeBinding('style', parse(rawValue, IsProperty), attr.target)` (override). |
| `class` | `AttributeBinding('class', parse(rawValue, IsProperty), normalizedTarget)` where `normalizedTarget` joins comma-separated class names; throws on empty. Override command. |
| `ref` | `RefBinding(parse(rawValue, IsProperty), attr.target)` (override). |
| `spread` | `SpreadValueBinding(target as '$bindables'|'$element', rawValue)`; not override. |

The *override* commands set `ignoreAttr = true`, meaning the normal custom-element/custom-attribute/plain-attribute routing is skipped and the attribute is always removed after the command builds its output.

## Additional behaviors cross-checked with template-compiler specs
- **Bindable vs custom attribute precedence** – when a custom element has a bindable name equal to a custom attribute name, the bindable wins (custom attribute is skipped) with a dev warning (`template-compiler.spec.ts`).
- **Primary bindable** – single-value custom attributes target their primary bindable (first marked `primary` or first declared) and emit no instruction when the literal value is an empty string (surrogate and normal attributes).
- **Attr-to-command patterns** – attribute-patterns may synthesize `AttrSyntax` that already contain a command/custom-attribute result; lowering treats them like user-authored commands (see tests that assert pattern-produced commands/interpolations).
- **Ref positioning** – `ref` works before/after template controllers and after spread/custom-attributes, producing `RefBindingInstruction` as parsed, including in surrogates.
- **Containerless ordering** – containerless attributes may appear before/after other binding-producing attributes; lowering still removes the attribute and emits `HydrateElement.containerless=true`.
- **Surrogates** – surrogate lowering mirrors element rules, forbids `id/name/au-slot/as-element`, and rejects template controllers on the surrogate.

## Ordering Guarantees
- Rows are emitted following DOM depth-first traversal.
- Within a row: `HydrateElement` (if any) -> `HydrateAttribute*` -> plain/binding instructions, each group preserving the source attribute order after the optional reorder rule.
- Template controllers collapse nested rows so the outermost controller appears as the sole instruction in its row, with nested controller definitions captured in `def.instructions`.

Implementations can treat this document as the normative contract for lowering runtime templates into the renderer instruction stream. Any deviation will change runtime hydration behavior and therefore must be explicit.

## Runtime Resolution & Binding Semantics (renderer/controller/resources)
The runtime in `@aurelia/runtime-html` uses the renderers in `renderer.ts` to turn lowered instructions into live bindings/controllers. These rules matter for semantic analysis beyond lowering:
- **Resource resolution** – `HydrateElement/Attribute/TemplateController` resolve string `res` via `CustomElement.find` / `CustomAttribute.find` in the current container; missing resources throw. Definitions passed directly are used as-is.
- **Containerless** – `HydrateElement.containerless` triggers `convertToRenderLocation` and hydration against the created comment location.
- **Controller containers** – element hydration builds a child container with resolvers for `IController`, `IInstruction`, `IRenderLocation`, `IViewFactory`, and `IAuSlotsInfo` (when projections exist). Template controllers respect `containerStrategy: 'new'|'reuse'` from the attribute definition when constructing the view factory container.
- **Bindable rendering** – `HydrateElement/Attribute/TemplateController.props` are rendered in order using the renderer table. `SetProperty` writes through observers when present; `PropertyBinding/InterpolationBinding` target the view-model unless the target is already a view-model. `StylePropertyBinding` binds against `element.style` (dev warnings for ambiguous numeric values). Attribute/class bindings use `ICssClassMapping` when present to map class names.
- **Refs** – `RefBinding` resolves `to` as: `element`->host node, `controller`->nearest element controller, `component`->controller.viewModel, custom attribute name->that controller, custom element name->its controller, otherwise throws. Template controllers store refs on the render location. Refs are set/unset with lifecycle, unless user overwrote the property.
- **Let** – `HydrateLetElement` removes the `<let>` node and adds `LetBinding`s to the current controller, binding to either binding-context or override-context per `toBindingContext`.
- **Spread** - `SpreadTransferedBinding` creates `SpreadBinding`s using the active `ITemplateCompiler` and `IRendering`; `SpreadValueBinding` only accepts `$bindables` and otherwise throws at render time.
- **Class/style literals** - `SetClassAttribute` splits whitespace and adds tokens; `SetStyleAttribute` appends cssText (no dedupe).
- **Refs/bookkeeping** - `CustomAttributeRenderer`/`TemplateControllerRenderer` store controllers in `refs` keyed by resource key; `CustomElementRenderer` likewise registers host node and attaches child controller to parent.

## Scope Semantics (for LSP overlay frames)
- **Scope resolution** – `Scope.getContext` walks parent scopes until a property is found or a boundary is reached. `AccessThis` honors ancestor hops; `AccessBoundary` stops at the first `scope.isBoundary`. `$host` must exist or errors.
- **Boundaries** – Custom elements create `Scope.create(instance, null, true)` during hydration, making the element a boundary for lookups. Custom attributes reuse their parent's scope (no boundary). Synthetic views require an explicit scope.
- **Let** – `<let>` bindings add to either the binding context (`to-binding-context=true`) or the override context of the current scope; they do not create a new scope.
- **if/else, switch/case, portal** – These template controllers activate their views with the parent controller's scope; no new binding context or boundary is introduced.
- **with** – Creates a new child scope `Scope.fromParent(parentScope, value||{})` so the binding context is the `with` value while still inheriting up the chain.
- **repeat** – Each iteration gets `Scope.fromParent(parentScope, BindingContext(local,item), RepeatOverrideContext)`. Destructured locals are assigned into a fresh `BindingContext`. The override context carries `$index/$length/$odd/$even/$first/$middle/$last` and, when `contextual` is true (default), `$previous`/`__items__` metadata. The scope is not a boundary; lookups can traverse to parents.
- **promise** – Outer `promise` controller activates its internal view with a child scope `Scope.fromParent(parentScope,{})`. Pending/fulfilled/rejected template controllers share that child scope; they do not add their own scopes. The provided settlement value is passed as activation arg, but scope inheritance remains intact.
- **switch/case** – The `switch` view is activated with the parent scope; each `case` view is activated with the same scope.
- **portal** – Moves the rendered view to a different DOM location but binds with the current controller scope; no scope change.
- **au-slot** – If projected content exists, it overlays the outer scope by creating `Scope.fromParent(outerScope, outerScope.bindingContext)` and setting `$host` in the override context to `expose ?? host`. Without projection, it uses the parent scope.
- **au-compose** – For template-only composition, scope comes from `scopeBehavior`: `auto` uses `Scope.fromParent(parent.scope, comp)` (inherits parent) and `scoped` uses `Scope.create(comp)` (new root boundary with no parent). Custom-element composition uses the composed element's own boundary scope as usual.



































