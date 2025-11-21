# AGENTS.md -- AI guide to `aurelia-ls`

Audience: AI assistants / codegen tools working on this repo.
Goal: make changes safely, in line with the architectural intent.

---

## TL;DR

- **Phases (pure, no I/O, no input mutation):** 10-lower -> 20-resolve-host -> 30-bind -> 50-plan -> 60-emit. Each returns new objects; never mutate prior-phase data.
- **Style:** Strong types, discriminated unions, TS 5.x; avoid `any`; minimal runtime guards; trust contracts.
- **Packages:** `packages/domain` (compiler, pure), `packages/server` (LSP host + TS LS), `packages/client` (VS Code extension), `packages/shared` (small utilities).
- **Entrypoints:** Overlay/SSR facade in `packages/domain/src/compiler/facade.ts`; public exports in `packages/domain/src/index.ts`; docs under `docs/`.
- **Pipeline engine:** stage DAG lives in `packages/domain/src/compiler/pipeline/` (versioned stages + fingerprints). Supports optional persisted cache (`.aurelia-cache/` by default); products ask for artifacts via the engine.
- **Common tasks -> tests to run:**
  - Syntax/lowering: touch 10-lower; run `pnpm test:lower`.
  - Host semantics: touch 20-resolve-host; run `pnpm test:resolve`.
  - Scoping: touch 30-bind; run `pnpm test:bind`.
  - Overlay typing/emit: touch 50-plan/60-emit; run `pnpm test:typecheck`.
  - Parsers: touch `packages/domain/src/parsers`; run `pnpm test:parsers`.
  - SSR: touch `packages/domain/src/compiler/phases/50-plan/ssr-plan.ts` or `60-emit/ssr.ts`; run `pnpm test:ssr`.
- **Do not edit generated output:** `packages/**/out` is build output; change `src` + tests only.
- **Type hygiene:** eliminate `any`/`unknown` casts. Prefer proper guards/helpers over `as any`; refactor to strong types instead of adding local casts/aliases.
- **Design patterns:** keep types/shared shapes in the existing model/type files; avoid sprinkling local type declarations when a central export makes sense.
- **Building/tests:** `npm run test:spec` auto-builds (tsc -b) then runs all specs. If build output is stale, rerun tests instead of hand-invoking the build.
- **Navigation:** mapping/query live in `packages/domain/src/compiler/facade.ts`; overlay planning in `phases/50-plan`; emit in `phases/60-emit`; typecheck scaffolding in `phases/40-typecheck`. SSR plan/emit under `phases/50-plan/ssr-*.ts` and `60-emit/ssr.ts`.

---

## 1. House rules

These are **hard constraints**:

- **Strongly-typed contracts**
  - Prefer explicit interfaces and discriminated unions.
  - Avoid `any` unless it's genuinely "unknown" and cannot be expressed better.

- **Minimal defensive programming**
  - Code may assume callers respect contracts.
  - Prefer clear types + invariants over runtime guards.

- **Pure compiler phases**
  - `10-lower`, `20-resolve-host`, `30-bind`, `50-plan`, `60-emit` are all **pure**:
    - No global state.
    - No I/O.
    - No mutation of their input data structures.
  - They return **new** objects instead of mutating arguments.

- **Modern TypeScript**
  - Target TS 5.x idioms.
  - No legacy `namespace` or ambient junk.

When in doubt, copy the style of the phase you're touching.

---

## 2. Quick map (skim)

- **Packages:** `packages/domain` (pure compiler), `packages/server` (LSP host + TS LS), `packages/client` (VS Code extension), `packages/shared` (shared utilities).
- **Entrypoints:** `packages/domain/src/compiler/facade.ts` (overlay/SSR), public exports in `packages/domain/src/index.ts`, LSP wiring in `packages/server/src/main.ts`, VS Code activation in `packages/client/src/extension.ts`.
- **Reference docs:** `docs/expression-language.md`, `docs/template-lowering-and-binding.md`, `docs/errors.md`.
- **Changes stay in `src`:** treat `packages/**/out` as generated.

---

## 3. Appendices (full detail)

- Architecture, pipeline, parser contracts, LSP flow, and task playbooks: see `docs/agents/appendix-domain.md`.
- If you add new workflows or extend syntax, update both this TL;DR and the appendix to keep them in sync.
