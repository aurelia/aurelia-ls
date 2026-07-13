# template-expression-resource-combinators references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-expression-resource-combinators`
Probe file: `packages/lane-harness/probes/template-expression-resource-combinators.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## inner-behavior-behind-missing-outer

### Probe

```json
{
  "anchor": "${item.label & innerAudit:'inner' & missingBehavior}",
  "at": "innerAudit",
  "atOccurrence": 1,
  "displayPosition": "src/resource-combinator-gallery.html:14:65",
  "file": "src/resource-combinator-gallery.html",
  "lspPosition": {
    "character": 64,
    "line": 13
  },
  "occurrence": 1
}
```

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 28,
          "line": 32
        },
        "start": {
          "character": 18,
          "line": 32
        }
      },
      "uri": "fixtures://pressure/template-expression-resource-combinators/src/expression-resources.ts"
    },
    {
      "range": {
        "end": {
          "character": 59,
          "line": 11
        },
        "start": {
          "character": 49,
          "line": 11
        }
      },
      "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
    },
    {
      "range": {
        "end": {
          "character": 57,
          "line": 12
        },
        "start": {
          "character": 47,
          "line": 12
        }
      },
      "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
    },
    {
      "range": {
        "end": {
          "character": 78,
          "line": 12
        },
        "start": {
          "character": 68,
          "line": 12
        }
      },
      "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
    },
    {
      "range": {
        "end": {
          "character": 74,
          "line": 13
        },
        "start": {
          "character": 64,
          "line": 13
        }
      },
      "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 5,
  "locations": [
    {
      "anomaly": null,
      "file": "src/expression-resources.ts",
      "range": {
        "end": {
          "character": 28,
          "line": 32
        },
        "start": {
          "character": 18,
          "line": 32
        }
      },
      "rangeText": "innerAudit",
      "uri": "fixtures://pressure/template-expression-resource-combinators/src/expression-resources.ts"
    },
    {
      "anomaly": null,
      "file": "src/resource-combinator-gallery.html",
      "range": {
        "end": {
          "character": 59,
          "line": 11
        },
        "start": {
          "character": 49,
          "line": 11
        }
      },
      "rangeText": "innerAudit",
      "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-combinator-gallery.html",
      "range": {
        "end": {
          "character": 57,
          "line": 12
        },
        "start": {
          "character": 47,
          "line": 12
        }
      },
      "rangeText": "innerAudit",
      "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-combinator-gallery.html",
      "range": {
        "end": {
          "character": 78,
          "line": 12
        },
        "start": {
          "character": 68,
          "line": 12
        }
      },
      "rangeText": "innerAudit",
      "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
    },
    {
      "anomaly": null,
      "file": "src/resource-combinator-gallery.html",
      "range": {
        "end": {
          "character": 74,
          "line": 13
        },
        "start": {
          "character": 64,
          "line": 13
        }
      },
      "rangeText": "innerAudit",
      "uri": "fixtures://pressure/template-expression-resource-combinators/src/resource-combinator-gallery.html"
    }
  ]
}
```
