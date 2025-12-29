# Changelog

Core packages changelog for `@aurelia-ls/*` (compiler, resolution, transform, build, language-server).

For VS Code extension changelog, see [`packages/vscode/CHANGELOG.md`](packages/vscode/CHANGELOG.md).

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
