# template-expression-resource-combinators documentHighlight lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-expression-resource-combinators`
Probe file: `packages/lane-harness/probes/template-expression-resource-combinators.probes.json`
Lane: `documentHighlight`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## converter-behind-missing-behavior

### Probe

```json
{
  "anchor": "${count | numberText:prefix & missingBehavior}",
  "at": "numberText",
  "atOccurrence": 1,
  "displayPosition": "src/resource-combinator-gallery.html:15:58",
  "file": "src/resource-combinator-gallery.html",
  "lspPosition": {
    "character": 57,
    "line": 14
  },
  "occurrence": 1
}
```

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 55,
          "line": 1
        },
        "start": {
          "character": 45,
          "line": 1
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 60,
          "line": 3
        },
        "start": {
          "character": 50,
          "line": 3
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 61,
          "line": 5
        },
        "start": {
          "character": 51,
          "line": 5
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 85,
          "line": 6
        },
        "start": {
          "character": 75,
          "line": 6
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 67,
          "line": 14
        },
        "start": {
          "character": 57,
          "line": 14
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 70,
          "line": 17
        },
        "start": {
          "character": 60,
          "line": 17
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 6,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 55,
          "line": 1
        },
        "start": {
          "character": 45,
          "line": 1
        }
      },
      "rangeText": "numberText"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 60,
          "line": 3
        },
        "start": {
          "character": 50,
          "line": 3
        }
      },
      "rangeText": "numberText"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 61,
          "line": 5
        },
        "start": {
          "character": 51,
          "line": 5
        }
      },
      "rangeText": "numberText"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 85,
          "line": 6
        },
        "start": {
          "character": 75,
          "line": 6
        }
      },
      "rangeText": "numberText"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 67,
          "line": 14
        },
        "start": {
          "character": 57,
          "line": 14
        }
      },
      "rangeText": "numberText"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 70,
          "line": 17
        },
        "start": {
          "character": 60,
          "line": 17
        }
      },
      "rangeText": "numberText"
    }
  ]
}
```
