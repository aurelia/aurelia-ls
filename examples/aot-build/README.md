# AOT Build Demo

Demonstrates the `@aurelia-ls/transform` package by showing the before/after of source transformation.

## Running the Demo

```bash
cd examples/aot-build

# Show transformation in console
node demo.mjs

# Also emit output files to dist/
node demo.mjs --emit

# Multi-component demo (with resource resolution)
node demo-multi.mjs           # Show multi-file transformation
node demo-multi.mjs --emit    # Write bundle to dist/
```

## Multi-Component Demo

The `demo-multi.mjs` script demonstrates the full AOT pipeline with resource resolution:

1. **TypeScript Program**: Creates a program from `src/` containing multiple components
2. **Resolution**: Discovers all Aurelia resources (custom elements, value converters)
3. **Compilation**: Compiles each template with the linked ResourceGraph
4. **Transformation**: Transforms each source file with its AOT artifacts

The `src/` folder contains:
- `app.ts` + `app.html` - Root component that uses child resources
- `greeting.ts` + `greeting.html` - Child custom element
- `upper.ts` - Value converter

## Output Files (with --emit)

| File | Description |
|------|-------------|
| `dist/my-component.js` | Bundle-ready JavaScript (no imports, production) |
| `dist/my-component.debug.js` | Same with comments for inspection |
| `dist/artifacts.json` | Raw AOT compilation data |

## What This Shows

**Input:** A TypeScript class with `@customElement` decorator and an HTML template

**Output:** Self-contained JavaScript with pre-compiled definitions:
- No decorator (removed at compile time)
- No template import (inlined in `$au`)
- Pre-parsed expression ASTs
- Pre-built instruction arrays
- Hydration markers in template

## What Happens During Transformation

1. **Template Compilation**: The HTML template is compiled by the AOT compiler
2. **Expression Parsing**: Binding expressions like `${message}` are pre-parsed into ASTs
3. **Instruction Generation**: Hydration instructions are generated for each binding target
4. **Decorator Removal**: The `@customElement` decorator is removed (no longer needed)
5. **Source Transformation**: The transform package injects the compiled artifacts into the TypeScript source
6. **Import Cleanup**: Unused imports are removed for bundle output

## Before/After Comparison

**Before (my-component.ts):**
```typescript
import { customElement } from "aurelia";
import template from "./my-component.html";

@customElement({ name: "my-component", template })
export class MyComponent {
  message = "Hello from AOT!";
  items = ["Server-side rendering", "Client hydration", "AOT compilation"];
}
```

**After (dist/my-component.js):**
```javascript
const myComponent__e = [
  { $kind: "AccessScope", name: "message", ancestor: 0 },
  { $kind: "ForOfStatement", declaration: {...}, iterable: {...} },
  { $kind: "AccessScope", name: "item", ancestor: 0 }
];

const myComponent__def_0 = {
  name: "repeat_0",
  type: "custom-element",
  template: "<li><!--au--> </li>",
  instructions: [[{ type: "ha", from: {...} }]],
  needsCompile: false,
};

const myComponent_$au = {
  type: "custom-element",
  name: "my-component",
  template: "<div class=\"container\">...<!--au-->...</div>",
  instructions: [[...], [...]],
  needsCompile: false,
};

export class MyComponent {
  static $au = myComponent_$au;
  message = "Hello from AOT!";
  items = ["Server-side rendering", "Client hydration", "AOT compilation"];
}
```

## Output Artifacts Explained

### Expression Table (`myComponent__e`)
Pre-parsed AST nodes for each unique expression. Allows sharing across instructions.

### Nested Definitions (`myComponent__def_0`)
Template definitions for template controllers like `repeat.for`. Each repeat iteration uses this definition.

### Main Definition (`myComponent_$au`)
The component's runtime definition with:
- Compiled template HTML with `<!--au-->` hydration markers
- `<!--au-start-->` / `<!--au-end-->` comment markers for template controllers
- Instructions referencing the expression table
- `needsCompile: false` flag (skips runtime compilation)

## Why This Matters

- **No Runtime Compilation**: Template is already compiled, faster startup
- **SSR Ready**: Server can render without browser APIs
- **Hydration Support**: Client can reconnect to server-rendered DOM using the manifest
- **Smaller Runtime**: No need to ship the template compiler to the browser
- **Decorator Removal**: Decorators are processed at build time, not runtime

## Inspecting artifacts.json

The artifacts file contains the raw compilation data:

```bash
# View the compiled template
cat dist/artifacts.json | jq '.template'

# View expression ASTs
cat dist/artifacts.json | jq '.expressions'

# View instruction structure
cat dist/artifacts.json | jq '.definition.instructions'
```

## Related

- `packages/transform/` - The transform package source
- `packages/compiler/` - The AOT compiler that produces AOT artifacts
- `packages/build/` - Vite plugin that runs this transformation automatically
