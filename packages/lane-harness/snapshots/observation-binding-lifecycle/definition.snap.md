# observation-binding-lifecycle definition lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/observation-binding-lifecycle`
Probe file: `packages/lane-harness/probes/observation-binding-lifecycle.probes.json`
Lane: `definition`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## inert-attribute-source-member

### Probe

```json
{
  "anchor": "data-lifecycle.attr=\"attributeFromView & fromView\"",
  "at": "attributeFromView",
  "atOccurrence": 1,
  "displayPosition": "src/observation-binding-lifecycle-app.html:8:61",
  "file": "src/observation-binding-lifecycle-app.html",
  "lspPosition": {
    "character": 60,
    "line": 7
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
          "character": 19,
          "line": 32
        },
        "start": {
          "character": 2,
          "line": 32
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 19,
          "line": 32
        },
        "start": {
          "character": 2,
          "line": 32
        }
      },
      "targetUri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.ts"
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
      "file": "src/observation-binding-lifecycle-app.ts",
      "range": {
        "end": {
          "character": 19,
          "line": 32
        },
        "start": {
          "character": 2,
          "line": 32
        }
      },
      "rangeText": "attributeFromView",
      "uri": "fixtures://pressure/observation-binding-lifecycle/src/observation-binding-lifecycle-app.ts"
    }
  ]
}
```
