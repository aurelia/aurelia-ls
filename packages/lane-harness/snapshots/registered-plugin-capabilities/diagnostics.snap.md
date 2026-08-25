# registered-plugin-capabilities diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/registered-plugin-capabilities`
Probe file: `packages/lane-harness/probes/registered-plugin-capabilities.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## registered-plugin-state-store-template

### Probe

```json
{
  "file": "src/registered-plugin-capabilities-app.html"
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
  "uri": "fixtures://pressure/registered-plugin-capabilities/src/registered-plugin-capabilities-app.html"
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
  "uri": "fixtures://pressure/registered-plugin-capabilities/src/registered-plugin-capabilities-app.html"
}
```
