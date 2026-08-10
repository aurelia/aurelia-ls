# app-pattern-routed-catalog-storefront hover lane snapshot

Fixture: `packages/semantic-runtime/fixtures/pressure/app-pattern-routed-catalog-storefront`
Probe file: `packages/lane-harness/probes/app-pattern-routed-catalog-storefront.probes.json`
Lane: `hover`

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

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 28,
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
}
```

### Hover markdown

````markdown
```ts
searchText: string
```
````

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

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 30,
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
}
```

### Hover markdown

````markdown
```ts
onlyInStock: boolean
```
````

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

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 39,
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
}
```

### Hover markdown

````markdown
```ts
visibleItems: readonly Item[]
```
````

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

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 35,
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
  }
}
```

### Hover markdown

````markdown
```ts
item: Item
```

Repeat local.
````

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

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 39,
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
  }
}
```

### Hover markdown

````markdown
```ts
item: Item | null
```

Let local.
````

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

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 32,
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
  }
}
```

### Hover markdown

````markdown
```ts
item: Item
```

Let local.
````

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

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 62,
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
}
```

### Hover markdown

````markdown
```ts
(bindable) item: Item | null
```

Default mode: to view.
````

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

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 49,
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
    "rangeText": "badge"
  }
}
```

### Hover markdown

````markdown
```ts
badge: ItemBadge | "all"
```

Repeat local.
````

## router-path-item-detail

### Probe

```json
{
  "anchor": "load=\"items/item-1?ref=featured#details\"",
  "at": "item-1",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:15:22",
  "file": "src/app.html",
  "lspPosition": {
    "character": 21,
    "line": 14
  },
  "occurrence": 1
}
```

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCodePoints": 76,
    "range": {
      "end": {
        "character": 27,
        "line": 14
      },
      "start": {
        "character": 15,
        "line": 14
      }
    },
    "rangeText": "items/item-1"
  }
}
```

### Hover markdown

````markdown
```text
(route path) "items/item-1"
```

Configured route id: `item-detail`.
````

## router-query-no-hover

### Probe

```json
{
  "anchor": "load=\"items/item-1?ref=featured#details\"",
  "at": "ref",
  "atOccurrence": 1,
  "displayPosition": "src/app.html:15:29",
  "file": "src/app.html",
  "lspPosition": {
    "character": 28,
    "line": 14
  },
  "occurrence": 1
}
```

### hover

```json
{
  "outcome": "result",
  "result": null
}
```

### Hover markdown

_No hover markdown._

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

### hover

```json
{
  "outcome": "result",
  "result": null
}
```

### Hover markdown

_No hover markdown._
