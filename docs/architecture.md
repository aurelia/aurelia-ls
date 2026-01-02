# Architecture

This document explains how the Aurelia AOT compiler and language tooling work.

## The Problem

Aurelia 2 compiles templates at runtime in the browser. This works well but has tradeoffs:

- **Startup cost** — Templates must be parsed and compiled before rendering
- **No SSR** — Server-side rendering requires a browser environment
- **Limited IDE support** — The editor can't understand template semantics

## The Solution

Compile templates ahead of time. The AOT compiler runs at build time and produces:

1. **Pre-compiled definitions** — Templates become static `$au` properties with instruction arrays
2. **Hydration markers** — Comment nodes that let the client reconnect to server-rendered DOM
3. **Type overlays** — Virtual `.d.ts` content that gives the IDE type information for templates

## Package Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         vite-plugin                             │
│                    (user-facing entry point)                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   resolution  │   │   compiler    │   │   transform   │
│  (discovery)  │   │  (templates)  │   │   (inject)    │
└───────┬───────┘   └───────┬───────┘   └───────────────┘
        │                   │
        │           ┌───────┴───────┐
        │           ▼               ▼
        │   ┌─────────────┐ ┌─────────────┐
        │   │     ssr     │ │ language-   │
        │   │  (render)   │ │   server    │
        │   └──────┬──────┘ └─────────────┘
        │          │
        └────┬─────┘
             ▼
     ┌─────────────┐
     │     ssg     │
     │  (static)   │
     └─────────────┘
```

| Package | Purpose |
|---------|---------|
| **compiler** | Template analysis and code generation (the core) |
| **resolution** | Resource discovery from TypeScript sources |
| **transform** | Injects compiled artifacts into source files |
| **vite-plugin** | Vite integration for dev server and builds |
| **ssr** | Server-side rendering with jsdom |
| **ssg** | Static site generation for pre-rendering routes |
| **language-server** | LSP implementation for IDE features |

## Compiler Pipeline

The compiler transforms HTML templates through four analysis stages, then synthesizes output for either IDE tooling or production builds.

```
                         HTML Template
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                         ANALYSIS                                  │
│                                                                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐  │
│  │ 10-lower │ → │20-resolve│ → │ 30-bind  │ → │ 40-typecheck │  │
│  │  (parse) │   │ (link)   │   │ (scopes) │   │   (types)    │  │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────┘  │
│                                                                   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       ┌───────────────┐               ┌───────────────┐
       │    Overlay    │               │      AOT      │
       │  (for IDE)    │               │ (for runtime) │
       └───────────────┘               └───────────────┘
```

### Stage 10: Lower (HTML → IR)

Parses the HTML template into an intermediate representation:
- DOM tree with source locations and node IDs
- Instruction rows (bindings, property setters, controllers)
- Expression table with identity keys for later lookup

### Stage 20: Resolve (IR → Linked Semantics)

Links template elements to Aurelia semantics:
- Resolves custom elements and attributes from the resource graph
- Normalizes attribute-to-property mapping
- Computes effective binding modes (one-way, two-way, etc.)
- Identifies template controllers (repeat, if, with, etc.)

### Stage 21: Hoist

Lifts controller metadata (used by ssr for processing nested controllers).

### Stage 30: Bind (Linked Semantics → Scope Module)

Maps expressions to their evaluation context:
- Creates scope frames for template controllers
- Materializes local variables (`<let>`, iterator declarations, contextuals)
- Tracks variable provenance for type checking

### Stage 40: Typecheck (Scope Module → Typecheck Module)

Validates expressions against TypeScript types:
- Extracts types for component bindables
- Reports type mismatches, missing properties, method arity errors
- Configurable severity (error, warning, info)

### Synthesis: Two Output Paths

**Overlay synthesis** (for IDE):
- Generates virtual TypeScript definitions
- Maps expressions to types for hover, completions, diagnostics
- Never written to disk—injected into TypeScript's module resolution

**AOT synthesis** (for production):
- Serializes instructions as JavaScript
- Generates `$au` static property with template definition
- Injected into component source by the transform package

## Resolution Pipeline

The resolution package discovers Aurelia resources in a project. It runs a four-layer pipeline:

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: EXTRACTION                                             │
│ Parse TypeScript AST → SourceFacts (decorators, $au, exports)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: INFERENCE                                              │
│ 3-resolver priority: decorators > static $au > conventions      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: REGISTRATION                                           │
│ Analyze import graph → RegistrationIntents                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: SCOPE                                                  │
│ Build ResourceGraph with per-module scoping                     │
└─────────────────────────────────────────────────────────────────┘
```

**Key outputs:**
- `ResourceGraph` — Registry of all discovered resources with scope information
- `TemplateInfo[]` — Convention-based template file mappings (e.g., `foo.ts` → `foo.html`)
- `RouteTree` — Application routing structure (used by SSG)
- `Semantics` — Combined view of resources available to the compiler

## SSR & Hydration

Aurelia's SSR uses a manifest-based hydration approach:

1. **Server** — Renders components using jsdom, records a manifest of DOM node locations
2. **Client** — Receives HTML + manifest, reconnects to existing DOM without re-rendering

This differs from virtual DOM frameworks which diff and patch. The manifest approach enables true resumability—the client picks up exactly where the server left off.

```
Server                              Client
──────                              ──────
Component + Template                HTML + Manifest
       │                                  │
       ▼                                  ▼
┌─────────────┐                    ┌─────────────┐
│ jsdom render│                    │   hydrate   │
│ + manifest  │   ──── HTTP ────▶  │  (no diff)  │
│  recording  │                    │             │
└─────────────┘                    └─────────────┘
```

## IDE Integration

The language server uses the compiler's analysis stages to provide IDE features:

| Feature | How it works |
|---------|--------------|
| **Completions** | Query semantics for available bindables, elements, expressions |
| **Diagnostics** | Run typecheck stage, report errors |
| **Hover** | Map cursor position to expression, look up type |
| **Go to Definition** | Follow resource references to source locations |
| **Find References** | Search for usages across templates |

### Virtual Overlay Filesystem

The language server doesn't write overlay files to disk. Instead, it intercepts TypeScript's module resolution to inject virtual `.d.ts` content. This enables real-time type feedback as you edit templates.

```
Template Edit → Recompile → Update Overlay → TypeScript Sees New Types
```

## Key Architectural Decisions

### Data-Driven Template Controllers

Template controllers (repeat, if, with, promise, etc.) aren't hardcoded. They're defined by `ControllerConfig` objects that describe:
- What scope variables they introduce
- How they transform the DOM
- What expressions they evaluate

This means custom template controllers get full IDE support automatically if they follow the same patterns.

### Pure, Cacheable Stages

Each analysis stage is pure and deterministic:
- Same input always produces same output
- Stages can be cached independently
- Tests can inject seed values to skip earlier stages

### Expression Identity

Expressions are tracked by `ExprId` keys in a table. This enables:
- Efficient lookup for tooling (hover, semantic tokens)
- Deduplication of repeated expressions
- Stable references across compilation stages

### Instrumentation

The codebase uses a span-based tracing system:
- `CompileTrace` API for performance tracking
- Pluggable exporters (console, JSON, collecting)
- Debug channels for targeted logging

## Data Flow Examples

### Dev Server Request

```
HTTP Request
    │
    ▼
Vite Middleware
    │
    ├─→ createResolutionContext (parse project, discover resources)
    │
    ├─→ compileWithAot (run 4-stage pipeline + AOT synthesis)
    │
    ├─→ createSSRHandler (setup jsdom platform)
    │
    ├─→ render (execute component, record manifest)
    │
    └─→ processSSROutput (clean HTML)
           │
           ▼
      HTTP Response (HTML + hydration script)
```

### IDE Hover

```
User hovers over ${expression}
    │
    ▼
Language Server
    │
    ├─→ Find template in workspace
    │
    ├─→ compileTemplate (run analysis pipeline)
    │
    ├─→ Query expression table by cursor position
    │
    ├─→ Look up type from overlay
    │
    └─→ Format hover response
           │
           ▼
      Editor shows type information
```

### Production Build

```
Source Files
    │
    ▼
Vite Build
    │
    ├─→ Resolution (discover all resources)
    │
    ├─→ For each component:
    │      ├─→ Compile template (analysis + AOT synthesis)
    │      └─→ Transform source (inject $au property)
    │
    └─→ Bundle
           │
           ▼
      Optimized output (no runtime compilation needed)
```

## Directory Structure

```
packages/
├── compiler/           # Template compilation core
│   ├── analysis/       # 4-stage pipeline (10-lower through 40-typecheck)
│   ├── synthesis/      # Overlay and AOT code generation
│   ├── parsing/        # HTML, attribute, expression parsers
│   ├── model/          # IR data structures
│   ├── language/       # Semantics, resource definitions
│   ├── pipeline/       # Caching engine, session management
│   └── shared/         # Tracing, diagnostics, utilities
├── resolution/         # Resource discovery
│   ├── extraction/     # TypeScript AST analysis
│   ├── inference/      # Resource type inference
│   ├── registration/   # Import graph analysis
│   ├── scope/          # Resource graph construction
│   ├── conventions/    # Naming conventions (foo.ts → foo.html)
│   └── routes/         # Route tree extraction for SSG
├── transform/          # Source code injection
├── vite-plugin/        # Vite integration
├── ssr/                # Server-side rendering
├── ssg/                # Static site generation
├── language-server/    # LSP implementation
└── vscode/             # VS Code extension
```
