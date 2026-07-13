# app-pattern-routed-catalog-storefront documentHighlight lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront`
Probe file: `packages/lane-harness/probes/app-pattern-routed-catalog-storefront.probes.json`
Lane: `documentHighlight`

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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 63,
          "line": 7
        },
        "start": {
          "character": 53,
          "line": 7
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 1,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "searchText"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 68,
          "line": 10
        },
        "start": {
          "character": 57,
          "line": 10
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 1,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "onlyInStock"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 56,
          "line": 24
        },
        "start": {
          "character": 44,
          "line": 24
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 1,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "visibleItems"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 28,
          "line": 24
        },
        "start": {
          "character": 24,
          "line": 24
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 36,
          "line": 25
        },
        "start": {
          "character": 32,
          "line": 25
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 2,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 24,
          "line": 16
        },
        "start": {
          "character": 18,
          "line": 16
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 18,
          "line": 24
        },
        "start": {
          "character": 12,
          "line": 24
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 2,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 24,
          "line": 16
        },
        "start": {
          "character": 18,
          "line": 16
        }
      },
      "rangeText": "repeat"
    },
    {
      "anomaly": null,
      "kind": "text",
      "range": {
        "end": {
          "character": 18,
          "line": 24
        },
        "start": {
          "character": 12,
          "line": 24
        }
      },
      "rangeText": "repeat"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 11,
          "line": 3
        },
        "start": {
          "character": 7,
          "line": 3
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 25,
          "line": 4
        },
        "start": {
          "character": 21,
          "line": 4
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 14,
          "line": 5
        },
        "start": {
          "character": 10,
          "line": 5
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 13,
          "line": 6
        },
        "start": {
          "character": 9,
          "line": 6
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 16,
          "line": 9
        },
        "start": {
          "character": 12,
          "line": 9
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 16,
          "line": 11
        },
        "start": {
          "character": 12,
          "line": 11
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 16,
          "line": 13
        },
        "start": {
          "character": 12,
          "line": 13
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 16,
          "line": 15
        },
        "start": {
          "character": 12,
          "line": 15
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 16,
          "line": 17
        },
        "start": {
          "character": 12,
          "line": 17
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 62,
          "line": 21
        },
        "start": {
          "character": 58,
          "line": 21
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 88,
          "line": 21
        },
        "start": {
          "character": 84,
          "line": 21
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 11,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 11,
          "line": 3
        },
        "start": {
          "character": 7,
          "line": 3
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 25,
          "line": 4
        },
        "start": {
          "character": 21,
          "line": 4
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 14,
          "line": 5
        },
        "start": {
          "character": 10,
          "line": 5
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 13,
          "line": 6
        },
        "start": {
          "character": 9,
          "line": 6
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 16,
          "line": 9
        },
        "start": {
          "character": 12,
          "line": 9
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 16,
          "line": 11
        },
        "start": {
          "character": 12,
          "line": 11
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 16,
          "line": 13
        },
        "start": {
          "character": 12,
          "line": 13
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 16,
          "line": 15
        },
        "start": {
          "character": 12,
          "line": 15
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 16,
          "line": 17
        },
        "start": {
          "character": 12,
          "line": 17
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 62,
          "line": 21
        },
        "start": {
          "character": 58,
          "line": 21
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 88,
          "line": 21
        },
        "start": {
          "character": 84,
          "line": 21
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 11,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 25,
          "line": 25
        },
        "start": {
          "character": 21,
          "line": 25
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 1,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": [
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 20,
          "line": 25
        },
        "start": {
          "character": 11,
          "line": 25
        }
      }
    },
    {
      "kind": 1,
      "range": {
        "end": {
          "character": 49,
          "line": 25
        },
        "start": {
          "character": 40,
          "line": 25
        }
      }
    }
  ]
}
```

### Resolved highlights

```json
{
  "highlightCount": 2,
  "highlights": [
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item-card"
    },
    {
      "anomaly": null,
      "kind": "text",
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
      "rangeText": "item-card"
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

### documentHighlight

```json
{
  "outcome": "result",
  "result": null
}
```

### Resolved highlights

```json
{
  "highlightCount": 0,
  "highlights": []
}
```
