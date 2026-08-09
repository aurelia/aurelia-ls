# template-overlay-state-binding-scope diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-overlay-state-binding-scope`
Probe file: `packages/lane-harness/probes/template-overlay-state-binding-scope.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## overlay-state-binding-host-template

### Probe

```json
{
  "file": "src/app.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 0,
  "diagnostics": [],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-overlay-state-binding-scope/src/app.html"
}
```

### textDocument/diagnostic — previousResultId reuse

```json
{
  "diagnosticCount": null,
  "diagnostics": [],
  "matchesPreviousResultId": true,
  "outcome": "unchanged",
  "previousResultIdPresent": true,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-overlay-state-binding-scope/src/app.html"
}
```

## overlay-state-binding-child-template

### Probe

```json
{
  "file": "src/task-list.html"
}
```

### textDocument/diagnostic — full pull

```json
{
  "diagnosticCount": 0,
  "diagnostics": [],
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-overlay-state-binding-scope/src/task-list.html"
}
```

### textDocument/diagnostic — previousResultId reuse

```json
{
  "diagnosticCount": null,
  "diagnostics": [],
  "matchesPreviousResultId": true,
  "outcome": "unchanged",
  "previousResultIdPresent": true,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/template-overlay-state-binding-scope/src/task-list.html"
}
```
