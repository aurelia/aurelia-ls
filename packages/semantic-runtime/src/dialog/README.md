# Dialog

This folder owns semantic-runtime products for source-backed `@aurelia/dialog` diagnostics.

The first admitted lane is the static subset that can be proven from TypeScript source before dialog activation: bare
configuration registration, closed `DialogService.open(...)` settings, and visible child dialog resolver keys. It
publishes `DialogIssue` products and app diagnostics linked to exact Aurelia framework error codes.

## Claimed Authorities

- `AUR0903` / `dialog_settings_invalid`: `DialogService.open(...)` receives a static object literal settings value whose
  `component` and `template` properties are both absent or nullish.
- `AUR0904` / `dialog_no_empty_default_configuration`: bare `DialogConfiguration` is registered without a
  renderer-providing `customize(...)` call.
- `AUR0910` / `dialog_child_settings_not_found`: a `DialogService.child(...)` or `IDialogService.child(...)` resolver
  is admitted through DI with a static key that has no visible matching `DialogConfiguration*.withChild(...)`
  registration.

## Boundaries

Dialog lifecycle, activation, deactivation, renderer visibility, and child-service lookup failures remain intentionally
outside this lane unless the failing key can be proven from visible source. That includes `AUR0901` and
`AUR0905`-`AUR0909`. `AUR0099` is dormant in the framework source.

This lane is diagnostic substrate, not an authoring recommendation. It exists so real apps and pressure fixtures can
surface framework-faithful dialog pressure while authoring recipes continue to prefer valid configured dialog usage.
