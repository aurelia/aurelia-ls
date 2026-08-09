# template-overlay-bound-controller diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-overlay-bound-controller`
Probe file: `packages/lane-harness/probes/template-overlay-bound-controller.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## overlay-bound-controller-host-template

### Probe

```json
{
  "file": "src/template-overlay-bound-controller-app.html"
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
  "uri": "fixtures://pressure/template-overlay-bound-controller/src/template-overlay-bound-controller-app.html"
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
  "uri": "fixtures://pressure/template-overlay-bound-controller/src/template-overlay-bound-controller-app.html"
}
```

## overlay-bound-controller-child-template

### Probe

```json
{
  "file": "src/callback-panel.html"
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
  "uri": "fixtures://pressure/template-overlay-bound-controller/src/callback-panel.html"
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
  "uri": "fixtures://pressure/template-overlay-bound-controller/src/callback-panel.html"
}
```
