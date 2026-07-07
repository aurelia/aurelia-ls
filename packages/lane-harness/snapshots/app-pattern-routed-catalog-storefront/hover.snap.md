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
    "markdownCharacters": 116,
    "range": null
  }
}
```

### Hover markdown

````markdown
**searchText**

```ts
searchText: string
```

kind: `property`  
owner: `ItemCollectionState`  
owner shape: `class`
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
    "markdownCharacters": 119,
    "range": null
  }
}
```

### Hover markdown

````markdown
**onlyInStock**

```ts
onlyInStock: boolean
```

kind: `property`  
owner: `ItemCollectionState`  
owner shape: `class`
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
    "markdownCharacters": 242,
    "range": null
  }
}
```

### Hover markdown

````markdown
**visibleItems**

```ts
visibleItems: readonly Item[]
```

kind: `accessor`  
owner: `ItemCollectionState`  
owner shape: `class`

---

**Bindable** `items`

name: `items`  
mode: `toView`

---

**Resource** `repeat`

kind: `custom-attribute`
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
    "markdownCharacters": 161,
    "range": null
  }
}
```

### Hover markdown

````markdown
**item**

```ts
item: Item
```

kind: `property`

---

**Bindable** `items`

name: `items`  
mode: `toView`

---

**Resource** `repeat`

kind: `custom-attribute`
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
    "markdownCharacters": 55,
    "range": null
  }
}
```

### Hover markdown

````markdown
**item**

```ts
item: Item | null
```

kind: `property`
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
    "markdownCharacters": 48,
    "range": null
  }
}
```

### Hover markdown

````markdown
**item**

```ts
item: Item
```

kind: `property`
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
    "markdownCharacters": 105,
    "range": null
  }
}
```

### Hover markdown

```markdown
**Bindable** `item`

name: `item`  
mode: `toView`

---

**Resource** `item-card`

kind: `custom-element`
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

### hover

```json
{
  "outcome": "result",
  "result": {
    "contentsKind": "markdown",
    "markdownCharacters": 176,
    "range": null
  }
}
```

### Hover markdown

````markdown
**badge**

```ts
badge: ItemBadge | "all"
```

kind: `property`

---

**Bindable** `items`

name: `items`  
mode: `toView`

---

**Resource** `repeat`

kind: `custom-attribute`
````

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
