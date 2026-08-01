# app-pattern-routed-catalog-storefront references lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront`
Probe file: `packages/lane-harness/probes/app-pattern-routed-catalog-storefront.probes.json`
Lane: `references`

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

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 33,
          "line": 15
        },
        "start": {
          "character": 23,
          "line": 15
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
    },
    {
      "range": {
        "end": {
          "character": 63,
          "line": 7
        },
        "start": {
          "character": 53,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
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
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 63,
          "line": 7
        },
        "start": {
          "character": 53,
          "line": 7
        }
      },
      "rangeText": "searchText",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
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
    },
    {
      "anomaly": null,
      "file": "src/state/catalog-state.ts",
      "range": {
        "end": {
          "character": 33,
          "line": 15
        },
        "start": {
          "character": 23,
          "line": 15
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

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 27,
          "line": 18
        },
        "start": {
          "character": 16,
          "line": 18
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
    },
    {
      "range": {
        "end": {
          "character": 68,
          "line": 10
        },
        "start": {
          "character": 57,
          "line": 10
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
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
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 68,
          "line": 10
        },
        "start": {
          "character": 57,
          "line": 10
        }
      },
      "rangeText": "onlyInStock",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
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
    },
    {
      "anomaly": null,
      "file": "src/state/catalog-state.ts",
      "range": {
        "end": {
          "character": 27,
          "line": 18
        },
        "start": {
          "character": 16,
          "line": 18
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

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 28,
          "line": 28
        },
        "start": {
          "character": 16,
          "line": 28
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
    },
    {
      "range": {
        "end": {
          "character": 56,
          "line": 24
        },
        "start": {
          "character": 44,
          "line": 24
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
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
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/state/catalog-state.ts"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 56,
          "line": 24
        },
        "start": {
          "character": 44,
          "line": 24
        }
      },
      "rangeText": "visibleItems",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
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
    },
    {
      "anomaly": null,
      "file": "src/state/catalog-state.ts",
      "range": {
        "end": {
          "character": 28,
          "line": 28
        },
        "start": {
          "character": 16,
          "line": 28
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

### references

```json
{
  "outcome": "result",
  "result": [
    {
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
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 36,
          "line": 25
        },
        "start": {
          "character": 32,
          "line": 25
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 2,
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
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 36,
          "line": 25
        },
        "start": {
          "character": 32,
          "line": 25
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    }
  ]
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

### references

```json
{
  "outcome": "result",
  "result": [
    {
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
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 25,
          "line": 4
        },
        "start": {
          "character": 21,
          "line": 4
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 14,
          "line": 5
        },
        "start": {
          "character": 10,
          "line": 5
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 13,
          "line": 6
        },
        "start": {
          "character": 9,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 9
        },
        "start": {
          "character": 12,
          "line": 9
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 11
        },
        "start": {
          "character": 12,
          "line": 11
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 13
        },
        "start": {
          "character": 12,
          "line": 13
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 15
        },
        "start": {
          "character": 12,
          "line": 15
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 17
        },
        "start": {
          "character": 12,
          "line": 17
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 62,
          "line": 21
        },
        "start": {
          "character": 58,
          "line": 21
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 88,
          "line": 21
        },
        "start": {
          "character": 84,
          "line": 21
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 11,
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
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 25,
          "line": 4
        },
        "start": {
          "character": 21,
          "line": 4
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 14,
          "line": 5
        },
        "start": {
          "character": 10,
          "line": 5
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 13,
          "line": 6
        },
        "start": {
          "character": 9,
          "line": 6
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 16,
          "line": 9
        },
        "start": {
          "character": 12,
          "line": 9
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 16,
          "line": 11
        },
        "start": {
          "character": 12,
          "line": 11
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 16,
          "line": 13
        },
        "start": {
          "character": 12,
          "line": 13
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 16,
          "line": 15
        },
        "start": {
          "character": 12,
          "line": 15
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 16,
          "line": 17
        },
        "start": {
          "character": 12,
          "line": 17
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 62,
          "line": 21
        },
        "start": {
          "character": 58,
          "line": 21
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 88,
          "line": 21
        },
        "start": {
          "character": 84,
          "line": 21
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

### references

```json
{
  "outcome": "result",
  "result": [
    {
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
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 25,
          "line": 4
        },
        "start": {
          "character": 21,
          "line": 4
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 14,
          "line": 5
        },
        "start": {
          "character": 10,
          "line": 5
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 13,
          "line": 6
        },
        "start": {
          "character": 9,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 9
        },
        "start": {
          "character": 12,
          "line": 9
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 11
        },
        "start": {
          "character": 12,
          "line": 11
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 13
        },
        "start": {
          "character": 12,
          "line": 13
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 15
        },
        "start": {
          "character": 12,
          "line": 15
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 16,
          "line": 17
        },
        "start": {
          "character": 12,
          "line": 17
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 62,
          "line": 21
        },
        "start": {
          "character": 58,
          "line": 21
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "range": {
        "end": {
          "character": 88,
          "line": 21
        },
        "start": {
          "character": 84,
          "line": 21
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 11,
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
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 25,
          "line": 4
        },
        "start": {
          "character": 21,
          "line": 4
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 14,
          "line": 5
        },
        "start": {
          "character": 10,
          "line": 5
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 13,
          "line": 6
        },
        "start": {
          "character": 9,
          "line": 6
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 16,
          "line": 9
        },
        "start": {
          "character": 12,
          "line": 9
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 16,
          "line": 11
        },
        "start": {
          "character": 12,
          "line": 11
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 16,
          "line": 13
        },
        "start": {
          "character": 12,
          "line": 13
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 16,
          "line": 15
        },
        "start": {
          "character": 12,
          "line": 15
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 16,
          "line": 17
        },
        "start": {
          "character": 12,
          "line": 17
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 62,
          "line": 21
        },
        "start": {
          "character": 58,
          "line": 21
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-detail-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-detail-route.html",
      "range": {
        "end": {
          "character": 88,
          "line": 21
        },
        "start": {
          "character": 84,
          "line": 21
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

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 23,
          "line": 0
        },
        "start": {
          "character": 19,
          "line": 0
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 45,
          "line": 1
        },
        "start": {
          "character": 41,
          "line": 1
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 76,
          "line": 1
        },
        "start": {
          "character": 72,
          "line": 1
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 111,
          "line": 1
        },
        "start": {
          "character": 107,
          "line": 1
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 149,
          "line": 1
        },
        "start": {
          "character": 145,
          "line": 1
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 14,
          "line": 2
        },
        "start": {
          "character": 10,
          "line": 2
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 13,
          "line": 3
        },
        "start": {
          "character": 9,
          "line": 3
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 13,
          "line": 4
        },
        "start": {
          "character": 9,
          "line": 4
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 13,
          "line": 5
        },
        "start": {
          "character": 9,
          "line": 5
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 31,
          "line": 6
        },
        "start": {
          "character": 27,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 34,
          "line": 11
        },
        "start": {
          "character": 30,
          "line": 11
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 62,
          "line": 12
        },
        "start": {
          "character": 58,
          "line": 12
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "range": {
        "end": {
          "character": 88,
          "line": 12
        },
        "start": {
          "character": 84,
          "line": 12
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
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
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.ts"
    },
    {
      "range": {
        "end": {
          "character": 25,
          "line": 25
        },
        "start": {
          "character": 21,
          "line": 25
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 15,
  "locations": [
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 23,
          "line": 0
        },
        "start": {
          "character": 19,
          "line": 0
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 45,
          "line": 1
        },
        "start": {
          "character": 41,
          "line": 1
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 76,
          "line": 1
        },
        "start": {
          "character": 72,
          "line": 1
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 111,
          "line": 1
        },
        "start": {
          "character": 107,
          "line": 1
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 149,
          "line": 1
        },
        "start": {
          "character": 145,
          "line": 1
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 14,
          "line": 2
        },
        "start": {
          "character": 10,
          "line": 2
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 13,
          "line": 3
        },
        "start": {
          "character": 9,
          "line": 3
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 13,
          "line": 4
        },
        "start": {
          "character": 9,
          "line": 4
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 13,
          "line": 5
        },
        "start": {
          "character": 9,
          "line": 5
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 31,
          "line": 6
        },
        "start": {
          "character": 27,
          "line": 6
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 34,
          "line": 11
        },
        "start": {
          "character": 30,
          "line": 11
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 62,
          "line": 12
        },
        "start": {
          "character": 58,
          "line": 12
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
    {
      "anomaly": null,
      "file": "src/components/item-card.html",
      "range": {
        "end": {
          "character": 88,
          "line": 12
        },
        "start": {
          "character": 84,
          "line": 12
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.html"
    },
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
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 25,
          "line": 25
        },
        "start": {
          "character": 21,
          "line": 25
        }
      },
      "rangeText": "item",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
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

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 18,
          "line": 6
        },
        "start": {
          "character": 9,
          "line": 6
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.ts"
    },
    {
      "range": {
        "end": {
          "character": 20,
          "line": 25
        },
        "start": {
          "character": 11,
          "line": 25
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 49,
          "line": 25
        },
        "start": {
          "character": 40,
          "line": 25
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/components/item-card.ts",
      "range": {
        "end": {
          "character": 18,
          "line": 6
        },
        "start": {
          "character": 9,
          "line": 6
        }
      },
      "rangeText": "item-card",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/components/item-card.ts"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 20,
          "line": 25
        },
        "start": {
          "character": 11,
          "line": 25
        }
      },
      "rangeText": "item-card",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 49,
          "line": 25
        },
        "start": {
          "character": 40,
          "line": 25
        }
      },
      "rangeText": "item-card",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    }
  ]
}
```

## repeat-local-badge-three-sites

### Probe

```json
{
  "anchor": "repeat.for=\"badge of state.items.badgeFilters\"",
  "at": "badge",
  "atOccurrence": 1,
  "displayPosition": "src/routes/item-list-route.html:17:31",
  "file": "src/routes/item-list-route.html",
  "lspPosition": {
    "character": 30,
    "line": 16
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
          "character": 35,
          "line": 16
        },
        "start": {
          "character": 30,
          "line": 16
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 82,
          "line": 16
        },
        "start": {
          "character": 77,
          "line": 16
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 91,
          "line": 16
        },
        "start": {
          "character": 86,
          "line": 16
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 3,
  "locations": [
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 35,
          "line": 16
        },
        "start": {
          "character": 30,
          "line": 16
        }
      },
      "rangeText": "badge",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 82,
          "line": 16
        },
        "start": {
          "character": 77,
          "line": 16
        }
      },
      "rangeText": "badge",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 91,
          "line": 16
        },
        "start": {
          "character": 86,
          "line": 16
        }
      },
      "rangeText": "badge",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
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

### references

```json
{
  "outcome": "result",
  "result": [
    {
      "range": {
        "end": {
          "character": 16,
          "line": 11
        },
        "start": {
          "character": 11,
          "line": 11
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.ts"
    },
    {
      "range": {
        "end": {
          "character": 19,
          "line": 2
        },
        "start": {
          "character": 14,
          "line": 2
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 46,
          "line": 7
        },
        "start": {
          "character": 41,
          "line": 7
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 50,
          "line": 10
        },
        "start": {
          "character": 45,
          "line": 10
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 33,
          "line": 15
        },
        "start": {
          "character": 28,
          "line": 15
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 44,
          "line": 16
        },
        "start": {
          "character": 39,
          "line": 16
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 22,
          "line": 20
        },
        "start": {
          "character": 17,
          "line": 20
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 24,
          "line": 22
        },
        "start": {
          "character": 19,
          "line": 22
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 24,
          "line": 23
        },
        "start": {
          "character": 19,
          "line": 23
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "range": {
        "end": {
          "character": 37,
          "line": 24
        },
        "start": {
          "character": 32,
          "line": 24
        }
      },
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    }
  ]
}
```

### Notifications

```json
{
  "notificationCount": 0,
  "notifications": []
}
```

### Resolved locations

```json
{
  "locationCount": 10,
  "locations": [
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 19,
          "line": 2
        },
        "start": {
          "character": 14,
          "line": 2
        }
      },
      "rangeText": "state",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 46,
          "line": 7
        },
        "start": {
          "character": 41,
          "line": 7
        }
      },
      "rangeText": "state",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 50,
          "line": 10
        },
        "start": {
          "character": 45,
          "line": 10
        }
      },
      "rangeText": "state",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 33,
          "line": 15
        },
        "start": {
          "character": 28,
          "line": 15
        }
      },
      "rangeText": "state",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 44,
          "line": 16
        },
        "start": {
          "character": 39,
          "line": 16
        }
      },
      "rangeText": "state",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 22,
          "line": 20
        },
        "start": {
          "character": 17,
          "line": 20
        }
      },
      "rangeText": "state",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 24,
          "line": 22
        },
        "start": {
          "character": 19,
          "line": 22
        }
      },
      "rangeText": "state",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 24,
          "line": 23
        },
        "start": {
          "character": 19,
          "line": 23
        }
      },
      "rangeText": "state",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.html",
      "range": {
        "end": {
          "character": 37,
          "line": 24
        },
        "start": {
          "character": 32,
          "line": 24
        }
      },
      "rangeText": "state",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.html"
    },
    {
      "anomaly": null,
      "file": "src/routes/item-list-route.ts",
      "range": {
        "end": {
          "character": 16,
          "line": 11
        },
        "start": {
          "character": 11,
          "line": 11
        }
      },
      "rangeText": "state",
      "uri": "fixtures://pressure/app-pattern-routed-catalog-storefront/src/routes/item-list-route.ts"
    }
  ]
}
```
