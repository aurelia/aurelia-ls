# template-expression-resource-combinators definition lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/template-expression-resource-combinators`
Probe file: `packages/lane-harness/probes/template-expression-resource-combinators.probes.json`
Lane: `definition`

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

### definition

```json
{
  "outcome": "result",
  "result": [
    {
      "targetRange": {
        "end": {
          "character": 30,
          "line": 32
        },
        "start": {
          "character": 0,
          "line": 32
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 28,
          "line": 32
        },
        "start": {
          "character": 18,
          "line": 32
        }
      },
      "targetUri": "fixtures://pressure/template-expression-resource-combinators/src/expression-resources.ts"
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
    }
  ]
}
```

## nested-arrow-current-context

### Probe

```json
{
  "anchor": "group.items.map(item => $this.heading).join(', ')",
  "at": "heading",
  "atOccurrence": 1,
  "displayPosition": "src/scope-path-gallery.html:5:93",
  "file": "src/scope-path-gallery.html",
  "lspPosition": {
    "character": 92,
    "line": 4
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
          "character": 18,
          "line": 6
        },
        "start": {
          "character": 11,
          "line": 6
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 18,
          "line": 6
        },
        "start": {
          "character": 11,
          "line": 6
        }
      },
      "targetUri": "fixtures://pressure/template-expression-resource-combinators/src/scope-path-gallery.ts"
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
      "file": "src/scope-path-gallery.ts",
      "range": {
        "end": {
          "character": 18,
          "line": 6
        },
        "start": {
          "character": 11,
          "line": 6
        }
      },
      "rangeText": "heading",
      "uri": "fixtures://pressure/template-expression-resource-combinators/src/scope-path-gallery.ts"
    }
  ]
}
```
