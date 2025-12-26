# Architecture

This document provides a high-level overview of how the AOT compiler works.

## The Problem

Aurelia 2 compiles templates at runtime in the browser. This works well but has tradeoffs:

- **Startup cost** — Templates must be parsed and compiled before rendering
- **No SSR** — Server-side rendering requires a browser environment
- **Limited IDE support** — The editor can't understand template semantics

## The Solution

Compile templates ahead of time. The AOT compiler runs at build time and produces:

1. **Pre-compiled definitions** — Templates become static `$au` properties with instruction arrays
2. **Hydration markers** — Comment nodes that let the client reconnect to server-rendered DOM
3. **Type overlays** — `.d.ts` files that give the IDE type information for templates

## Compiler Pipeline

```
HTML Template
     │
     ▼
┌─────────────────────────────────────────┐
│              ANALYSIS                    │
│  Parse → Resolve → Bind → Type Check    │
└─────────────────────────────────────────┘
     │
     ├──────────────────┬──────────────────┐
     ▼                  ▼                  ▼
  Overlays          Instructions        Template
  (.d.ts)           (for runtime)       (with markers)
```

### Analysis Stages

1. **Parse (10-lower)** — HTML → intermediate representation with binding expressions extracted
2. **Resolve (20-resolve)** — Link elements and attributes to Aurelia semantics (custom elements, template controllers, etc.)
3. **Bind (30-bind)** — Analyze scopes and variable references
4. **Type Check (40-typecheck)** — Validate expressions against TypeScript types

### Synthesis Outputs

- **Overlay synthesis** — Produces `.d.ts` files for IDE integration
- **AOT synthesis** — Produces runtime instructions and marked-up template HTML

## Package Responsibilities

```
┌─────────────┐     ┌─────────────┐
│ Resolution  │     │  Compiler   │
│ (discovery) │     │ (templates) │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 ▼
          ┌─────────────┐
          │  Transform  │
          │  (inject)   │
          └──────┬──────┘
                 ▼
          ┌─────────────┐
          │    Build    │
          │ (SSR/Vite)  │
          └─────────────┘
```

- **Resolution** — Discovers Aurelia resources (custom elements, value converters, etc.) from TypeScript source files
- **Compiler** — Compiles HTML templates through the analysis pipeline
- **Transform** — Injects compiled artifacts into TypeScript source as `static $au` properties
- **Build** — Provides SSR rendering and Vite plugin integration

## SSR Model

Aurelia's SSR uses a hybrid approach:

1. **Server** — Renders components using JSDOM, records a manifest of node locations
2. **Client** — Receives HTML + manifest, hydrates by locating nodes (no re-render)

This differs from virtual DOM frameworks (React, Vue) which diff and patch. Aurelia's manifest approach is more like Qwik's resumability concept.

## IDE Integration

The language server (`@aurelia-ls/server`) uses the compiler's analysis stages to provide:

- **Completions** — Suggests bindables, custom elements, expressions
- **Diagnostics** — Reports binding errors, unknown elements
- **Go to Definition** — Jumps from template usage to component class
- **Hover** — Shows type information for expressions

The compiler produces `.d.ts` overlay files that augment TypeScript's view of the project, enabling type checking inside templates.
