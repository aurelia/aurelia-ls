# VS Code Tests

Goal: keep the VS Code client tests aligned with concrete product owners:
workspace sessions, the typed LSP facade, feature-owned contributions, and
native VS Code presentation primitives.

Structure:
- `core/`: workspace/session ownership, protocol routing, lifecycle, and logging units
- `features/`: feature modules and command flows
- `integration/`: activation smoke (VS Code runner) + bundled server smoke
- `extension-host/`: opt-in VS Code Extension Development Host reliability tests
- `helpers/`: VS Code API stubs and test utilities

Guidelines:
- Tests import compiled output (`packages/vscode/out`) to match runtime shape;
  use the root `test:vscode` scripts, which build that output first.
- Custom protocol calls go through the typed `ctx.lsp` facade. Long-lived
  presenters own their own latest-wins sequencing rather than a generic query
  cache.
- Product contributions register once for the extension lifetime. Session
  changes update their request-time ownership and visible state; they do not
  dispose and recreate commands, providers, or views.
- Avoid real filesystem/network; use stubs.
- Activation test runs under `@vscode/test-electron` (set `VSCODE_RUNNER=1`).
- Extension-host reliability tests launch real VS Code against a disposable
  multi-root workspace containing `fixtures/hello-world` and an unowned plain
  TypeScript project. `pnpm test:vscode:extension-host` serially launches three
  fresh current-stable processes under the shipping Worker transport: Worker
  lifecycle, rename/reliability, and product/support. Its explicit `:worker` and
  `:current-stable` entry points are aliases. Use
  `pnpm test:vscode:extension-host:minimum` for the same three shards on the
  exact declared floor, VS Code 1.91.0. Use
  `pnpm test:vscode:extension-host:ipc` only for the focused current-stable
  product/support control. Every process reports and asserts its actual VS Code
  version, selected transport, and shard before loading the journey.
  Keep this suite focused on client-boundary behavior that Vitest stubs cannot
  observe, such as multi-file edit application,
  lazy code-action resolution, undo/redo grouping, dirty state, diagnostics
  after rollback, native-provider pass-through, live resource/definition projection,
  quiet configuration defaults, command/view activation, and workspace-root
  retirement. Set `AURELIA_LS_EXTENSION_HOST_GREP` to a Mocha grep pattern when
  iterating on one host journey, or pass
  `--shard=worker-lifecycle|rename-reliability|product-support` directly to the
  package runner after building and bundling.
- Host-inclusive tail measurement is a separate opt-in product/support lane,
  never another acceptance shard or required CI job. Run
  `pnpm -w build` and `pnpm --filter aurelia-2 bundle` once, then run
  `pnpm measure:ide:host-tails -- --cohort=<safe-name>` from a clean tracked
  tree to collect the fixed current-stable and exact-1.91.0 Worker cohorts.
  The collector uses the medium routed-storefront fixture, one fresh isolated
  host/profile per observation, and alternating diagnostics/completion pair
  order. It retains raw reports, stdout, stderr, and process metadata under
  `.temp/stage4-extension-host-tails/`. Each launch uses a deterministic short
  sequence directory (`s01` through `s50`) with `w`, `u`, and `e` workspace,
  user-data, and extensions paths; the full lane/pair/position/journey name is
  retained in process and cohort metadata rather than repeated in the Windows
  filesystem path. Before any VS Code resolution or launch on Windows, the
  collector projects the required own Client-log path and fails closed if it
  exceeds the 259-character legacy spdlog budget. The current Stage 4D cohort
  names and short layout also leave room for the longer optional server output
  log, but that descriptive output log is not a structural validity artifact.
  Each copied `w` fixture also gets a platform-appropriate `node_modules` link
  to `packages/semantic-runtime/node_modules` (a junction on Windows and a
  directory symbolic link elsewhere). The collector resolves the output,
  sample, workspace, and link target paths, rejects layouts that escape the
  isolated output tree or point anywhere except that exact dependency target,
  and requires both `aurelia` and `@aurelia/router` to resolve identically from
  the copied workspace before Electron launches. Process/cohort v5 evidence
  records the link strategy, exact target, and both resolved modules; the
  dedicated suite emits sample v4 and `--plan` emits plan v3.
  Any invalid preregistered sample aborts
  the cohort without retry, replacement, or exclusion. Use `--plan` for a
  zero-launch plan or `--smoke` for one explicitly discarded sample per
  journey. Smoke evidence is never authoritative. The authoritative measure is
  the fresh-host first-target-provider tail under automatic admission:
  launch-to-receipt remains primary. Shipping `workspaceContains` eagerly
  activates the extension before test execution on both supported VS Code
  lanes. The suite refuses to activate an inactive extension, requires
  `activationMode=auto`, an unopened and unshown target, and zero open
  workspace-owned documents in served language IDs, then awaits the already
  active API only as a readiness check. Provider observations are claimed only
  from test-entry listener attachment through receipt; the cold argument does
  not claim visibility into earlier events. Instead it combines that observed
  `zeroObservedDocumentProviderRequestsBeforeTrigger` canary, reconfirmed
  immediately before the journey trigger, with the causal unopened/unshown/open-document
  preconditions. After exit, the collector also requires one `exthost.log` and
  exactly one Aurelia `startup:true` activation record from either accepted
  package-manifest `workspaceContains` event; `api`, `onLanguage`, non-startup,
  missing, and duplicate activation evidence invalidate the cohort. VS Code may
  natively cancel and reschedule diagnostics pulls as open/focus state settles.
  Sample v4 therefore requires one suite trigger with no suite retry and accepts
  any finite serialized sequence of request/authenticated-Canceled-failure pairs
  followed by exactly one request/full-response pair in the same host. Every
  attempt must retain one globally unique correlated ID, the same target URI and
  document version, no previous result ID, and no overlap; each canceled attempt
  must carry client-token or server-retrigger evidence, and the final response
  must be full, uncanceled, and carry a result ID. The 25-second receipt timeout
  starts before the sole suite trigger and ends at the full response, while
  request-local timing spans the first provider request through that final
  response and the host-inclusive guard remains strictly below 30 seconds. Plan
  v3 preregisters this policy. Cohort v5 reports each lane's diagnostic
  cancellation-count acquisition order and distribution as descriptive evidence
  with no post-hoc acceptance threshold. Raw child stderr is retained and hashed as
  descriptive VS Code evidence, while structural Worker health comes from the
  exact isolated workspace start/stop and Worker-fault markers in the
  extension's own Client log. Complete structurally valid authoritative
  cohorts are adjudicated separately against the collector's preregistered
  host-local review guards for this repository-and-machine baseline (these are
  not universal product SLOs): current-stable uses median and nearest-rank p95
  request/provider-start guards, minimum uses the corresponding medians only,
  and both lanes use strict 30-second host-inclusive maxima. A failed latency
  adjudication remains
  fully retained but makes the measurement command exit nonzero; smoke and
  incomplete/invalid cohorts are never latency-adjudicated.
- Extension-host E2E is the low-volume third layer of the IDE campaign. The
  semantic conformance matrix owns high-volume query truth and lane-harness
  owns medium-volume LSP projection, so do not reproduce either corpus here.
  Add a host journey when the expected result depends on VS Code state or API
  spending rather than on a single semantic answer.
- The VSIX release gate is package-once, attest-once, and exact-byte reuse.
  `pnpm package:ide:vsix` lets the pinned package-local VSCE 3.9.2 invocation
  run the minified prepublish lifecycle exactly once, validates raw ZIP
  structure plus JSZip CRCs and the exact local release inventory, and writes
  a commit-addressed `.release/aurelia-2-<version>-<head12>.vsix` with an
  immutable manifest and SHA-256 sidecar. `pnpm verify:ide:vsix` only revalidates those existing bytes,
  their clean Git HEAD and inputs; it never packages again. Archive contract
  tests use synthetic in-memory ZIPs and dependency-injected lifecycle seams,
  so they perform no packaging, download, network request, or Electron launch.
