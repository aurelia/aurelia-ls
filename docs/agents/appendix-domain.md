# AGENTS Appendix - Architecture & Pipelines

## 1. High-level architecture

### Packages

- **`packages/domain`**
  Core compiler / analysis pipeline. Pure TS library:
- HTML -> IR -> LinkedSemantics -> ScopeGraph -> Typecheck -> Plan -> Emit.
  - Exposes:
    - `compileTemplateToOverlay` (overlay/ttc pipeline)
    - `compileTemplateToSSR` (SSR skeleton + manifest)
    - `PRELUDE_TS`, `getExpressionParser`, `DEFAULT_SYNTAX`, `VmReflection`.

- **`packages/server`**
  LSP server that:
  - Watches `.html` files.
  - Uses `@aurelia-ls/domain` to build TS overlays.
  - Feeds overlays into a TS Language Service.
  - Maps TS diagnostics back into HTML ranges.

- **`packages/client`**
  VS Code extension:
  - Starts the server (`LanguageClient`).
  - Provides commands (`aurelia.showOverlay`, `aurelia.dumpState`).

- **`packages/shared`**
  Small cross-package utilities shared by client/server.

### Reference docs (read-only runtime specs)

- `docs/expression-language.md` - binding expression grammar/runtime behavior.
- `docs/template-lowering-and-binding.md` - lowering + bind contracts for templates.
- `docs/errors.md` - diagnostic codes/messages.

Use these as authoritative descriptions of current runtime semantics; code and tests should align, and extensions should be additive.

### Quick operating rules (practical)
- **Purity:** phases 10/20/30/40/50/60 remain pure (no I/O, no input mutation).
- **Types:** avoid `any`/`unknown` casts; add guards/helpers instead. Prefer refactoring to strong types over adding local casts/aliases.
- **Design:** keep shared shapes/types in the existing model/type files; avoid scattering local type declarations when a central export fits.
- **Generated vs src:** only edit `packages/**/src` and tests; `packages/**/out` is generated.
- **Tests/build:** `npm run test:spec` runs `tsc -b` then all specs; use it to refresh out/overlay artifacts instead of manual builds.
- **Goldens:** overlay/SSR goldens live under `fixtures/overlays/*` (source HTML + generated `.__au.ttc.overlay.ts`/`.__au.ssr.{html,json}` via `pnpm dump:overlay` / `pnpm dump:ssr`); tests in `packages/domain/test/goldens` and `packages/domain/test/ssr` compare against those files.
- **Where things live:** mapping/query in `compiler/facade.ts`; overlay plan in `phases/50-plan/overlay`; overlay emit in `phases/60-emit/overlay`; typecheck scaffold in `phases/40-typecheck`; SSR plan/emit in `phases/50-plan/ssr` and `phases/60-emit/ssr`.

---

## 2. Compiler pipeline contracts

This section is the main thing Codex should understand before touching compiler code.

### 2.1 Data flow overview

Core types:

- `IrModule` - HTML -> IR (`model/ir.ts`)
- `LinkedSemanticsModule` - IR + Semantics -> linked host info (`20-resolve-host/types.ts`)
- `ScopeModule` - Linked -> scope graph (`model/symbols.ts`)
- `TypecheckModule` - Linked + Scope + VM -> inferred/expected types + AU13xx diags (`40-typecheck/typecheck.ts`)
- `OverlayPlanModule` - Linked + Scope -> overlay plan (`50-plan/types.ts`)
- `SsrPlanModule` - Linked + Scope -> SSR plan (`50-plan/ssr/types.ts`)

Pipeline engine (new):

```ts
// Stage keys (compiler/pipeline/engine.ts)
type StageKey =
  | "10-lower"        // lowerDocument
  | "20-link"         // resolveHost
  | "30-scope"        // bindScopes
  | "40-typecheck"    // typecheck stub
  | "50-plan-overlay" // plan (overlay)
  | "60-emit-overlay" // emitOverlayFile
  | "50-plan-ssr"     // planSsr
  | "60-emit-ssr";    // emitSsr

const engine = new PipelineEngine(createDefaultStageDefinitions());
const session = engine.createSession({
  html,
  templateFilePath,
  vm,
  overlay: { isJs, filename: "<base>.__au.ttc.overlay" },
  ssr: { eol: "\n" },
});
```

Products wire stage DAGs instead of baking orchestration into the facade:

- `products/overlay.ts`: consumes stages up to `60-emit-overlay`, then builds mapping/query.
- `products/ssr.ts`: consumes `50-plan-ssr` + `60-emit-ssr`, then attaches file paths.
- `facade.ts` is now a light wrapper that spins a session and delegates to those products.

**Invariants across stages:**

* Version tags (`version: 'aurelia-ir@1'` / `'aurelia-linked@1'` / `'aurelia-scope@1'`) are stable schema IDs.
* `NodeId` uniqueness is **per `TemplateIR`**.
* `ExprId` is stable per `(file|span|expressionType|code)` (see `ExprTable` in `lower.ts`).
* Later stages **never mutate** earlier stage objects; they build linked/derived views.
* Stage defs carry **version + fingerprint** and are cacheable: engine derives a cache key from stage version + dep artifact hashes + fingerprint (options/parsers/VM/semantics). Default persistent cache lives in `.aurelia-cache/` and can be disabled via `cache.enabled=false` or redirected via `cache.dir`. Supply `fingerprints` in `PipelineOptions` when using custom parsers/semantics/VM reflection to avoid cache collisions.
* Diagnostics use a unified envelope (`code/message/severity/source/span/related`). AU11xx/12xx/13xx codes stay the same but are now tagged with their source stage.

### 2.2 Phase 10 - Lower (HTML -> IR)

Entry:
`packages/domain/src/compiler/phases/10-lower/lower.ts`

Key points:

* Uses `parse5` to build a DOM fragment, then rewrites into:

  * Static DOM tree (`DOMNode`, `TemplateIR`).
  * Instruction rows (`InstructionRow`) per `NodeId`.
  * Expression table (`exprTable: ExprTableEntry[]`).

* Expression parsing:

  * Done via `IExpressionParser` (`parsers/expression-api.ts`).
  * All expressions are recorded in `exprTable` with a stable `ExprId`.
  * Parser failures must **not** crash; they produce `BadExpression` instead.

* Responsibilities (pure, but Semantics-aware for structure):

  * Shape the instruction stream: binding commands, template controllers (repeat/with/promise/if/switch/portal), custom elements/attributes (incl. containerless), primary bindable/multi-binding choices.
  * Leave host target resolution (DOM props, events, AU11xx diags) to Phase 20.
  * Emits:

    * `HydrateTemplateControllerIR` for repeat/with/promise/if/switch/portal.
    * `HydrateLetElementIR` for `<let>`.
    * `HydrateElementIR` / `HydrateAttributeIR` when a resource is known.
    * Bindings (`PropertyBindingIR`, `TextBindingIR`, etc).

If you extend Aurelia syntax (e.g., new attribute shape), this is usually the first phase to touch.

### 2.3 Phase 20 - Resolve host semantics (IR -> LinkedSemantics)

Entry:
`packages/domain/src/compiler/phases/20-resolve-host/resolve.ts`

Input/Output:

```ts
function resolveHost(ir: IrModule, sem: Semantics): LinkedSemanticsModule;
```

Responsibilities:

* Determine **host node** semantics for each row:

  * Custom element vs native DOM vs template vs text/comment.
* Normalize binding targets:

  * Attribute -> property mapping (per tag / global / camelCase fallback).
  * Two-way defaults (`Semantics.twoWayDefaults`) into `effectiveMode`.
* Attach semantic targets:

  * Custom element bindables.
  * Native DOM props.
  * Controller props (repeat/with/promise/if/switch/portal).
* Produce AU11xx diagnostics:

  * Unknown controller, unknown event, unknown target, etc.

Invariants:

* No mutation of `IrModule`.
* `LinkedInstruction` mirrors `InstructionIR` but has additional `target: TargetSem`, `controller: ControllerSem`, etc.
* Attributes with `data-*` / `aria-*` stay attribute-only (never mapped to props).

### 2.4 Phase 30 - Bind (scope graph)

Entry:
`packages/domain/src/compiler/phases/30-bind/bind.ts`

Input/Output:

```ts
function bindScopes(linked: LinkedSemanticsModule): ScopeModule;
```

Responsibilities:

* Build a **frame tree** (`ScopeTemplate.frames: ScopeFrame[]`):

  * `root` frame (component root).
  * `overlay` frames for repeat/with/promise.
  * Reuse-scope controllers (if/switch/portal) reuse the parent frame.
* Attach **overlay bases**:

  * `with`: overlay base is `value`.
  * `promise`: overlay base is `Awaited<value>` per branch (then/catch).
* Introduce locals:

  * `<let>` names.
  * `repeat.for` locals and contextuals (`$index`, `$length`, etc).
  * Promise branch alias (`then="r"`, `catch="e"`).
* Build `exprToFrame` mapping:

  * For every `ExprId`, record **which frame** it is evaluated in.

Invariants:

* Bind never changes linked structures; it only walks them.
* Nested templates from controllers are part of the **same** `ScopeTemplate`; there is one scope template per module root.

### 2.5 Phase 40 - Typecheck

Directory: `packages/domain/src/compiler/phases/40-typecheck/`

Input/Output:

```ts
typecheck({
  linked: LinkedSemanticsModule,
  scope: ScopeModule,
  ir: IrModule,
  rootVmType: string,
}): TypecheckModule;
```

Responsibilities:

* Builds frame-aware environments (shared with Plan) to **infer** expression types per frame.
* Collects **expected** types from binding targets (DOM/custom resources/controllers).
* Emits **AU13xx** diagnostics for obvious mismatches (best-effort string compare; unknown/any suppressed).
* Surfaces `inferredByExpr` + `expectedByExpr` maps for editor features (e.g., `expectedTypeOf`).

Notes:
* Pure and independent of overlay planning/emit.
* Uses authored spans from IR to attach diagnostics; relies on VM reflection for the root type.

### 2.6 Phase 50 - Plan (overlay planning)

Entry:
`packages/domain/src/compiler/phases/50-plan/overlay/plan.ts`

Input/Output:

```ts
function plan(
  linked: LinkedSemanticsModule,
  scope: ScopeModule,
  opts: AnalyzeOptions
): OverlayPlanModule;
```

Responsibilities:

* Build a type-level model per frame:

  * Use `VmReflection` (`opts.vm`) to obtain a root VM type expression (prefers `getQualifiedRootVmTypeExpr()` when provided, otherwise `getRootVmTypeExpr()`; `getSyntheticPrefix()` seeds alias names).
  * Respect overlay base (`with`, `promise`) and `repeat` iterable type.
  * Incorporate locals (`<let>`, repeat locals, contextuals, promise alias).
* Compute **frame overlay type**:

  * Root VM, minus shadowed keys.
  * Overlay base, minus locals.
  * Locals object.
  * `$parent`, `$vm`, `$this` segments.
  * Generate **one lambda per expression occurrence** in that frame:

  * Lambdas look like `o => o.user.name`.
  * Expressions are reconstructed from AST (`ExprTableEntry.ast`).

Invariants:

* Plan is pure: it doesn't depend on TS APIs or file system.
* It must be safe to evaluate on any valid `LinkedSemanticsModule` + `ScopeModule` (even with `BadExpression` entries).

### 2.7 Phase 60 - Emit (overlay TS/JS)

Entry:
`packages/domain/src/compiler/phases/60-emit/overlay/emit.ts`

Key APIs:

```ts
export function emitOverlay(
  plan: OverlayPlanModule,
  opts: { isJs: boolean }
): string;

export function emitOverlayFile(
  plan: OverlayPlanModule,
  opts: EmitOptions & { isJs: boolean }
): EmitResult;
```

Responsibilities:

* Turn overlay plan into concrete TS / JS:

  * **TS**:

    ```ts
    type __AU_TTC_T0_F1 = ...;
    __au$access<__AU_TTC_T0_F1>(o => o.user.name);
    ```

  * **JS (JSDoc)**:

    ```js
    __au$access(
      /** @param {<type expr>} o */
      (o) => o.user.name
    );
    ```

* Emits a named type alias for every frame; root lambdas inline the root type expression for readability.

Invariants:

* Must match `PRELUDE_TS`:

  * `__au$access<T>(fn: (o: T) => unknown): void`
  * `CollectionElement<T>`, `TupleElement<T, I>` helpers.

### 2.8 SSR planning & emit

Entry:
`packages/domain/src/compiler/phases/50-plan/ssr/plan.ts`
`packages/domain/src/compiler/phases/60-emit/ssr/emit.ts`

Responsibilities:

* Build SSR plan (`aurelia-ssr-plan@0`) after bind: collect HIDs per node, map bindings/controllers/lets/text bindings to HIDs, capture branch info for controllers.
* Emit SSR HTML skeleton + JSON manifest (`aurelia-ssr-manifest@0`), inserting HID markers and interpolation markers for text bindings.

Notes:

* Uses the same linked + scoped inputs as overlay planning; pure and deterministic.
* Manifest/HTML are versioned; keep schema stable unless intentionally bumped.

---

## 3. LSP / TS overlay integration (high-level)

### Server (`packages/server/src/main.ts`)

* Builds a `ts.LanguageService` over:

  * Workspace files.
  * In-memory overlays.
  * A prelude file (`PRELUDE_TS` in `.aurelia/__prelude.d.ts`).

* For each `.html` document:

  1. Detect VM type + import specifier from filename (`detectVmSpecifier`, `pascalFromKebab`).
  2. Create a `VmReflection` for that template.
  3. Call `compileTemplateToOverlay` from `@aurelia-ls/domain`.
  4. Insert/update the overlay in the TS LS virtual FS.
  5. Ask TS for diagnostics for the overlay file.
  6. Map overlay span -> HTML span via `CompileOverlayResult.calls`.
  7. Send LSP diagnostics back to the client.

### Client (`packages/client/src/extension.ts`)

* Starts the server as a Node IPC process.
* Provides commands:

  * `aurelia.showOverlay` - fetch overlay text from server and show in a TS editor.
  * `aurelia.dumpState` - debug info from the server side.

---

## 4. Expression parsing contracts

File: `packages/domain/src/parsers/expression-api.ts`

Core interface:

```ts
export interface IExpressionParser {
  parse(expr: string, type: "IsIterator"): ForOfStatement | BadExpression;
  parse(expr: string, type: "Interpolation"): Interpolation;
  parse(expr: string, type: "IsFunction" | "IsProperty"): IsBindingBehavior;
  parse(expr: string, type: "IsCustom"): CustomExpression;
  parse(expr: string, type: ExpressionType): AnyBindingExpression;
}
```

Important:

* The parser is **feature-complete for runtime parity** with the Aurelia expression language; error-tolerant / LSP-only behaviors can be layered later without changing the spec shape.
* The parser should be **re-entrant**: each `parse` call can allocate internal state, but the object itself is safe to reuse across compilations.
* On failure, the lowerer wraps failures in `BadExpression` via `ExprTable` and **never throws**. Iterator headers can also surface `BadExpression` when parsing fails.
* Any change to AST shape must keep the discriminated union `$kind` intact.

---

## 5. How an AI agent should work in this repo

When modifying or adding code:

1. **Stay pipeline-shaped**

   * New features should plug into the existing phases where possible.
   * Avoid adding ad-hoc cross-phase shortcuts; prefer:

     * `IrModule` -> `LinkedSemanticsModule` -> `ScopeModule` -> `OverlayPlanModule`.

2. **Respect purity boundaries**

   * `packages/domain` must not do I/O or access TS/VS Code APIs.
   * LSP logic (`packages/server`, `packages/client`) must treat `@aurelia-ls/domain` as a pure library.

3. **Keep contracts stable**

   * If you change:

     * `IrModule`, `LinkedSemanticsModule`, `ScopeModule`, `OverlayPlanModule`, or `VmReflection`,
     * then also update:

       * Corresponding tests under `packages/domain/test/**`.
       * Any top-level facades (`compiler/facade.ts`, `src/index.ts`).
   * Version tags (`"aurelia-ir@1"`, etc.) must **not** change without a conscious schema bump.

4. **Testing expectations**

   * For compiler changes, run at least:

     * `pnpm test:domain`
   * For focused work on a phase:

     * Lower: `pnpm test:lower`
     * Resolve: `pnpm test:resolve`
     * Bind: `pnpm test:bind`
     * Typecheck-ish flows: `pnpm test:typecheck`
     * SSR: `pnpm test:ssr`
     * Parsers: `pnpm test:parsers`
     * E2E fixtures: `pnpm test:e2e`
   * Tests are in `packages/domain/test/**` and mostly data-driven JSON vectors.
   * Coverage flavors exist for most suites (e.g., `*:cov` scripts in `package.json`); use them when changing parser/phases heavily.
   * For current test layout/prefix conventions for phases 10/20/30, see `docs/agents/appendix-testing.md`.

5. **Safe areas vs. dangerous areas**

   * **Relatively safe to change**:

     * Local helpers inside a single phase file (`lower.ts`, `resolve.ts`, `bind.ts`, `plan.ts`, `overlay.ts`) where types keep you honest.
     * New test vectors / fixtures.
     * New helper functions that don't alter public exports.

   * **Require extra care / human review**:

     * Public APIs in `packages/domain/src/index.ts` and `compiler/facade.ts`.
     * Core models (`model/ir.ts`, `model/symbols.ts`, `language/registry.ts`).
     * LSP server wiring (`packages/server/src/main.ts`), especially TS LS hosting.

---

## 6. If you're adding a new feature

When implementing a new capability (e.g. new template controller, new binding command):

1. Identify the phase(s) you need:

   * Syntax only -> `10-lower` (+ tests under `test/lower`).
   * Semantic mapping -> `20-resolve-host`.
   * Scoping / locals -> `30-bind`.
   * Type overlay -> `50-plan` + `60-emit`.

2. Extend **models first**:

   * Update `model/ir.ts`, `language/registry.ts`, or `model/symbols.ts` as needed.
   * Keep them minimal and strongly typed.

3. Wire phases **in order**:

   * Lowerer produces IR shape.
   * Resolver interprets semantics.
   * Bind materializes scope.
   * Plan/Emit handle overlay typing.

4. Add or extend tests:

   * Prefer JSON vector tests over ad-hoc assertions where possible.
   * If behavior affects overlays, add/update a `typecheck` test.

---

This file is intended for both humans and AI agents.
If a future change makes this inaccurate, please update it alongside the code change.
