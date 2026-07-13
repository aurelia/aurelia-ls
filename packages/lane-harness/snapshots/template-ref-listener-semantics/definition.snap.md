# template-ref-listener-semantics definition lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-ref-listener-semantics`
Probe file: `packages/lane-harness/probes/template-ref-listener-semantics.probes.json`
Lane: `definition`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## named-custom-attribute-ref-target

### Probe

```json
{
  "anchor": "focus-ring.ref=\"focusRingController\"",
  "at": "focus-ring",
  "atOccurrence": 1,
  "displayPosition": "src/template-ref-listener-semantics-app.html:9:3",
  "file": "src/template-ref-listener-semantics-app.html",
  "lspPosition": {
    "character": 2,
    "line": 8
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
          "character": 22,
          "line": 7
        },
        "start": {
          "character": 13,
          "line": 7
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 22,
          "line": 7
        },
        "start": {
          "character": 13,
          "line": 7
        }
      },
      "targetUri": "fixtures://pressure/template-ref-listener-semantics/src/focus-ring.ts"
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
      "file": "src/focus-ring.ts",
      "range": {
        "end": {
          "character": 22,
          "line": 7
        },
        "start": {
          "character": 13,
          "line": 7
        }
      },
      "rangeText": "FocusRing",
      "uri": "fixtures://pressure/template-ref-listener-semantics/src/focus-ring.ts"
    }
  ]
}
```
