# runtime-expression-access-uses definition lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/runtime-expression-access-uses`
Probe file: `packages/lane-harness/probes/runtime-expression-access-uses.probes.json`
Lane: `definition`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## callback-local-filter-item

### Probe

```json
{
  "anchor": "filter(item => item.label)",
  "at": "item",
  "atOccurrence": 2,
  "displayPosition": "src/runtime-expression-access-uses-app.html:6:28",
  "file": "src/runtime-expression-access-uses-app.html",
  "lspPosition": {
    "character": 27,
    "line": 5
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 23,
          "line": 5
        },
        "start": {
          "character": 19,
          "line": 5
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 23,
          "line": 5
        },
        "start": {
          "character": 19,
          "line": 5
        }
      },
      "targetUri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.html",
      "range": {
        "end": {
          "character": 23,
          "line": 5
        },
        "start": {
          "character": 19,
          "line": 5
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.html"
    }
  ]
}
```

## form-name-member

### Probe

```json
{
  "anchor": "value.one-time=\"form.name\"",
  "at": "name",
  "atOccurrence": 1,
  "displayPosition": "src/runtime-expression-access-uses-app.html:18:52",
  "file": "src/runtime-expression-access-uses-app.html",
  "lspPosition": {
    "character": 51,
    "line": 17
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 8,
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 8,
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
        }
      },
      "targetUri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 1,
  "locations": [
    {
      "anomaly": null,
      "file": "src/runtime-expression-access-uses-app.ts",
      "range": {
        "end": {
          "character": 8,
          "line": 34
        },
        "start": {
          "character": 4,
          "line": 34
        }
      },
      "rangeText": "name",
      "uri": "fixtures://pressure/runtime-expression-access-uses/src/runtime-expression-access-uses-app.ts"
    }
  ]
}
```
