# app-pattern-routed-catalog-storefront diagnostics lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront`
Probe file: `packages/lane-harness/probes/app-pattern-routed-catalog-storefront.probes.json`
Lane: `diagnostics`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## clean-item-list-route-template

### Probe

```json
{
  "file": "src/routes/item-list-route.html"
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
  "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
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
  "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
}
```
