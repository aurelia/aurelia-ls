# aliased-bindable-surfaces references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/aliased-bindable-surfaces`
Probe file: `packages/lane-harness/probes/aliased-bindable-surfaces.probes.json`
Lane: `references`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## bindable-property-labelText-includes-explicit-alias

### Probe

```json
{
  "anchor": "${labelText}",
  "at": "labelText",
  "atOccurrence": 1,
  "displayPosition": "src/product-card.html:3:8",
  "file": "src/product-card.html",
  "lspPosition": {
    "character": 7,
    "line": 2
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
          "character": 17,
          "line": 3
        },
        "start": {
          "character": 4,
          "line": 3
        }
      },
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/app.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 2
        },
        "start": {
          "character": 7,
          "line": 2
        }
      },
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/product-card.html"
    },
    {
      "range": {
        "end": {
          "character": 53,
          "line": 9
        },
        "start": {
          "character": 44,
          "line": 9
        }
      },
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/product-card.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/app.html",
      "range": {
        "end": {
          "character": 17,
          "line": 3
        },
        "start": {
          "character": 4,
          "line": 3
        }
      },
      "rangeText": "display-label",
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/app.html"
    },
    {
      "anomaly": null,
      "file": "src/product-card.html",
      "range": {
        "end": {
          "character": 16,
          "line": 2
        },
        "start": {
          "character": 7,
          "line": 2
        }
      },
      "rangeText": "labelText",
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/product-card.html"
    },
    {
      "anomaly": null,
      "file": "src/product-card.ts",
      "range": {
        "end": {
          "character": 53,
          "line": 9
        },
        "start": {
          "character": 44,
          "line": 9
        }
      },
      "rangeText": "labelText",
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/product-card.ts"
    }
  ]
}
```

## bindable-alias-display-label-top-level

### Probe

```json
{
  "anchor": "display-label.bind=\"aliasLabel\"",
  "at": "display-label",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:4:5",
  "file": "src/app.html",
  "lspPosition": {
    "character": 4,
    "line": 3
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
          "character": 17,
          "line": 3
        },
        "start": {
          "character": 4,
          "line": 3
        }
      },
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/app.html"
    },
    {
      "range": {
        "end": {
          "character": 39,
          "line": 9
        },
        "start": {
          "character": 26,
          "line": 9
        }
      },
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/product-card.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 2,
  "locations": [
    {
      "anomaly": null,
      "file": "src/app.html",
      "range": {
        "end": {
          "character": 17,
          "line": 3
        },
        "start": {
          "character": 4,
          "line": 3
        }
      },
      "rangeText": "display-label",
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/app.html"
    },
    {
      "anomaly": null,
      "file": "src/product-card.ts",
      "range": {
        "end": {
          "character": 39,
          "line": 9
        },
        "start": {
          "character": 26,
          "line": 9
        }
      },
      "rangeText": "display-label",
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/product-card.ts"
    }
  ]
}
```

## bindable-alias-display-label-inline-multi-binding

### Probe

```json
{
  "anchor": "display-hint=\"display-label.bind: aliasLabel",
  "at": "display-label",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:8:26",
  "file": "src/app.html",
  "lspPosition": {
    "character": 25,
    "line": 7
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
          "character": 38,
          "line": 7
        },
        "start": {
          "character": 25,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/app.html"
    },
    {
      "range": {
        "end": {
          "character": 39,
          "line": 6
        },
        "start": {
          "character": 26,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/display-hint.ts"
    }
  ]
}
```

### Resolved locations

```json
{
  "locationCount": 2,
  "locations": [
    {
      "anomaly": null,
      "file": "src/app.html",
      "range": {
        "end": {
          "character": 38,
          "line": 7
        },
        "start": {
          "character": 25,
          "line": 7
        }
      },
      "rangeText": "display-label",
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/app.html"
    },
    {
      "anomaly": null,
      "file": "src/display-hint.ts",
      "range": {
        "end": {
          "character": 39,
          "line": 6
        },
        "start": {
          "character": 26,
          "line": 6
        }
      },
      "rangeText": "display-label",
      "uri": "fixtures://pressure/aliased-bindable-surfaces/src/display-hint.ts"
    }
  ]
}
```
