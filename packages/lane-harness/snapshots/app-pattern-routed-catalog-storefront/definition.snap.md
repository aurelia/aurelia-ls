# app-pattern-routed-catalog-storefront definition lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront`
Probe file: `packages/lane-harness/probes/app-pattern-routed-catalog-storefront.probes.json`
Lane: `definition`

This snapshot records observed language-server behavior. Operator verdicts live in the probe data.

## template-member-searchText

### Probe

```json
{
  "anchor": "state.items.searchText",
  "at": "searchText",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:8:54",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 53,
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
          "character": 12,
          "line": 7
        },
        "start": {
          "character": 2,
          "line": 7
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 12,
          "line": 7
        },
        "start": {
          "character": 2,
          "line": 7
        }
      },
      "targetUri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
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
      "file": "src/state/catalog-state.ts",
      "range": {
        "end": {
          "character": 12,
          "line": 7
        },
        "start": {
          "character": 2,
          "line": 7
        }
      },
      "rangeText": "searchText",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
    }
  ]
}
```

## template-member-onlyInStock

### Probe

```json
{
  "anchor": "checked.bind=\"state.items.onlyInStock\"",
  "at": "onlyInStock",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:11:58",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 57,
    "line": 10
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
          "character": 13,
          "line": 8
        },
        "start": {
          "character": 2,
          "line": 8
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 13,
          "line": 8
        },
        "start": {
          "character": 2,
          "line": 8
        }
      },
      "targetUri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
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
      "file": "src/state/catalog-state.ts",
      "range": {
        "end": {
          "character": 13,
          "line": 8
        },
        "start": {
          "character": 2,
          "line": 8
        }
      },
      "rangeText": "onlyInStock",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
    }
  ]
}
```

## template-getter-visibleItems

### Probe

```json
{
  "anchor": "repeat.for=\"item of state.items.visibleItems\"",
  "at": "visibleItems",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:25:45",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 44,
    "line": 24
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
          "line": 14
        },
        "start": {
          "character": 6,
          "line": 14
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 18,
          "line": 14
        },
        "start": {
          "character": 6,
          "line": 14
        }
      },
      "targetUri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
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
      "file": "src/state/catalog-state.ts",
      "range": {
        "end": {
          "character": 18,
          "line": 14
        },
        "start": {
          "character": 6,
          "line": 14
        }
      },
      "rangeText": "visibleItems",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
    }
  ]
}
```

## repeat-local-item

### Probe

```json
{
  "anchor": "repeat.for=\"item of state.items.visibleItems\"",
  "at": "item",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:25:25",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 24,
    "line": 24
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
          "character": 28,
          "line": 24
        },
        "start": {
          "character": 24,
          "line": 24
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 28,
          "line": 24
        },
        "start": {
          "character": 24,
          "line": 24
        }
      },
      "targetUri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
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
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 28,
          "line": 24
        },
        "start": {
          "character": 24,
          "line": 24
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    }
  ]
}
```

## template-controller-repeat

### Probe

```json
{
  "anchor": "repeat.for=\"item of state.items.visibleItems\"",
  "at": "repeat",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:25:13",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 12,
    "line": 24
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": null
}
```

### Resolved locations

```json
{
  "locationCount": 0,
  "locations": []
}
```

## let-local-item-target

### Probe

```json
{
  "anchor": "<let item.bind=\"state.items.readItem(routeParams.itemId)\">",
  "at": "item.bind",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-detail-route.html:4:8",
  "file": "src/routes/item-detail-route.html",
  "lspPosition": {
    "character": 7,
    "line": 3
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
          "character": 11,
          "line": 3
        },
        "start": {
          "character": 7,
          "line": 3
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 11,
          "line": 3
        },
        "start": {
          "character": 7,
          "line": 3
        }
      },
      "targetUri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
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
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 11,
          "line": 3
        },
        "start": {
          "character": 7,
          "line": 3
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    }
  ]
}
```

## let-local-item-usage

### Probe

```json
{
  "anchor": "${item.name}",
  "at": "item",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-detail-route.html:6:11",
  "file": "src/routes/item-detail-route.html",
  "lspPosition": {
    "character": 10,
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
          "character": 11,
          "line": 3
        },
        "start": {
          "character": 7,
          "line": 3
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 11,
          "line": 3
        },
        "start": {
          "character": 7,
          "line": 3
        }
      },
      "targetUri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
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
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 11,
          "line": 3
        },
        "start": {
          "character": 7,
          "line": 3
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    }
  ]
}
```

## bindable-attr-item

### Probe

```json
{
  "anchor": "<item-card item.bind=\"item\">",
  "at": "item.bind",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:26:22",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 21,
    "line": 25
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
          "character": 16,
          "line": 12
        },
        "start": {
          "character": 12,
          "line": 12
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 16,
          "line": 12
        },
        "start": {
          "character": 12,
          "line": 12
        }
      },
      "targetUri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.ts"
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
      "file": "src/components/item-card.ts",
      "range": {
        "end": {
          "character": 16,
          "line": 12
        },
        "start": {
          "character": 12,
          "line": 12
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.ts"
    }
  ]
}
```

## resource-element-item-card

### Probe

```json
{
  "anchor": "<item-card item.bind=\"item\">",
  "at": "item-card",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:26:12",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 11,
    "line": 25
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
          "character": 21,
          "line": 9
        },
        "start": {
          "character": 13,
          "line": 9
        }
      },
      "targetSelectionRange": {
        "end": {
          "character": 21,
          "line": 9
        },
        "start": {
          "character": 13,
          "line": 9
        }
      },
      "targetUri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.ts"
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
      "file": "src/components/item-card.ts",
      "range": {
        "end": {
          "character": 21,
          "line": 9
        },
        "start": {
          "character": 13,
          "line": 9
        }
      },
      "rangeText": "ItemCard",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.ts"
    }
  ]
}
```

## ts-property-state

### Probe

```json
{
  "anchor": "readonly state = resolve(CatalogState)",
  "at": "state",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.ts:12:12",
  "file": "src/routes/item-list-route.ts",
  "lspPosition": {
    "character": 11,
    "line": 11
  },
  "occurrence": 1
}
```

### definition

```json
{
  "outcome": "result",
  "result": null
}
```

### Resolved locations

```json
{
  "locationCount": 0,
  "locations": []
}
```
