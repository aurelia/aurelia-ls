# Changelog

Core packages changelog for `@aurelia-ls/*` (compiler, resolution, transform, build, language-server).

For VS Code extension changelog, see [`packages/vscode/CHANGELOG.md`](packages/vscode/CHANGELOG.md).

---

## 0.2.0

*Compiler hardening: config-driven template controllers and Elm-style error handling.*

### @aurelia-ls/compiler

**Config-driven template controllers:**
- Unified `ControllerConfig` type with 6 orthogonal axes (trigger, scope, cardinality, relationship, placement, injection)
- All TC behavior derives from configuration instead of name-based switch statements
- Custom TCs from `@templateController` receive identical treatment to built-ins
- Pattern-based frame origins for type inference (works for custom TCs automatically)
- Consolidated AOT transform: 10 separate functions → single `transformController`

**Elm-style error handling:**
- `Diagnosed<T>` monad for accumulating diagnostics while producing values
- `StubMarker` for marking degraded values from error recovery
- Stub propagation through resolve, bind, and typecheck phases
- Cascade suppression: stubbed inputs don't generate new diagnostics

**New diagnostics:**
- `AU0101`: Binding behavior not found
- `AU0102`: Duplicate binding behavior
- `AU0103`: Value converter not found
- `AU0106`: Assignment to `$host`
- `AU0704`: Invalid `<let>` command
- `AU0810`: `[else]` without preceding `[if]`
- `AU0813`: `[then]/[catch]/[pending]` without parent `[promise]`
- `AU0815`: `[case]/[default-case]` without parent `[switch]`
- `AU0816`: Multiple `[default-case]` in same switch
- `AU1102`: Unknown custom element
- `AU9996`: Conflicting rate-limiters (throttle + debounce)

**Expression utilities:**
- `tryToInterpIR()` for proper interpolation detection
- Unified expression walkers with `forEachExprChild` pattern
- Switch/case branch metadata in IR (symmetric with promise)

### Test Coverage

~2,000 tests passing across all packages, 124 new tests added:
- 15 Elm-style error propagation tests
- 11 typecheck integration tests at LS layer
- 67 typecheck config tests (presets, coercion rules)
- 31 edge case tests across analysis stages

---

## 0.1.0

*Initial release of the Aurelia language services core packages.*

### @aurelia-ls/compiler

AOT template compiler with 4-stage analysis pipeline:

- **10-lower**: HTML parsing to Template IR via parse5
- **20-resolve**: Semantic resolution (custom elements, attributes, binding targets, events)
- **30-bind**: Scope analysis, local variable tracking, expression binding
- **40-typecheck**: TypeScript integration, type diagnostics

Synthesis targets:
- **AOT emit**: Pre-compiled instructions, template HTML with markers, expression tables
- **Overlay emit**: TypeScript `.d.ts` overlays for LSP integration

Expression parser with full Aurelia syntax support:
- Binding behaviors and value converters
- For-of iteration with destructuring
- Arrow functions, optional chaining, nullish coalescing
- All binary/unary operators

### @aurelia-ls/resolution

Resource discovery and dependency analysis:

- All declaration forms: `@customElement`, `@customAttribute`, `@valueConverter`, `@bindingBehavior`, `@bindingCommand`
- Convention-based detection (class name → element/attribute name)
- Bindables extraction from decorators and conventions
- Dependencies extraction from decorator config
- ResourceGraph for scope-aware resource availability
- TypeScript program integration

### @aurelia-ls/transform

AOT code transformation:

- Decorator removal (`@customElement` → `static $au`)
- Bindables injection into class body
- Dependencies array generation
- Entry point transformation (`main.ts` → AOT configuration)
- Source location preservation

### @aurelia-ls/build

SSR rendering and Vite integration:

- Server-side rendering with manifest recording
- Tree-based `ISSRScope` for template controller state
- Client hydration via manifest replay
- Template controller support: `if`, `else`, `repeat`, `with`, `switch`, `case`, `promise`
- Router SSR with `au-viewport` rendering
- Vite plugin for dev server integration

### @aurelia-ls/language-server

LSP server for IDE integration:

- Type-aware diagnostics for binding expressions
- Unknown element/attribute/event detection
- Hover information with types
- Go-to-definition via overlay projection
- Find references across templates
- Semantic tokens for syntax highlighting
- Debounced document synchronization
- Error boundaries on all handlers

### Diagnostics

Compiler diagnostics implemented:
- `AU1101`: Unknown template controller
- `AU1103`: Unknown event
- `AU1104`: Property target not found
- `AU1106`: Unknown repeat option
- `AU1201`: Invalid repeat destructuring
- `AU1202`: Duplicate local name
- `AU1203`: Invalid expression
- `AU1301`: Type mismatch

### Test Coverage

~1,850 tests passing across all packages:
- Vector-based tests for compiler stages
- Integration tests for resolution pipeline
- SSR rendering and hydration tests
- Language server handler tests

---

## Versioning Policy

Core packages (`@aurelia-ls/compiler`, `@aurelia-ls/resolution`, `@aurelia-ls/transform`, `@aurelia-ls/build`, `@aurelia-ls/language-server`) share a unified version number. They are tightly coupled and changes typically cascade across packages.

The VS Code extension (`aurelia-2`) has an independent version and release cycle. See its [changelog](packages/vscode/CHANGELOG.md) for extension-specific changes.
