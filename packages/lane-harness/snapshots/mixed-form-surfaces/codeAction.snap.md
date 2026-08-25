# mixed-form-surfaces codeAction lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/mixed-form-surfaces`
Probe file: `packages/lane-harness/probes/mixed-form-surfaces.probes.json`
Lane: `codeAction`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## weakMetadata-source-owner-type-no-viewmodel-edit

### Probe

```json
{
  "anchor": "weakMetadata.source",
  "at": "source",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:11:46",
  "file": "src/app.html",
  "lspPosition": {
    "character": 45,
    "line": 10
  },
  "occurrence": 1
}
```

### Diagnostic pull

```json
{
  "diagnosticCount": 1,
  "outcome": "full",
  "previousResultIdPresent": false,
  "resultIdPresent": true,
  "uri": "fixtures://pressure/mixed-form-surfaces/src/app.html"
}
```

### codeAction

```json
{
  "outcome": "result",
  "result": null
}
```

### Context diagnostics

```json
{
  "diagnosticCount": 0,
  "diagnostics": []
}
```

### Actions

```json
{
  "actionCount": 0,
  "actions": []
}
```

### In-memory apply

```json
{
  "actions": [],
  "expectedOldTexts": [
    ""
  ]
}
```

### Applied diffs

_No in-memory diff._
