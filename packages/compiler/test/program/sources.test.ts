import { test, expect } from "vitest";

import { InMemorySourceStore } from "../../out/index.js";

test("InMemorySourceStore auto-increments versions and overwrites snapshots", () => {
  const store = new InMemorySourceStore();
  const uri = "/app/example.html";

  const first = store.set(uri, "<template>one</template>");
  expect(first.version).toBe(1);

  const second = store.set(uri, "<template>two</template>");
  expect(second.version).toBe(2);
  expect(store.get(uri)?.text).toBe("<template>two</template>");

  const explicit = store.set(uri, "<template>ten</template>", 10);
  expect(explicit.version).toBe(10);

  const implicit = store.set(uri, "<template>eleven</template>");
  expect(implicit.version).toBe(11);
});

test("InMemorySourceStore enumerates and deletes snapshots", () => {
  const store = new InMemorySourceStore();
  const uris = ["/a.html", "/b.html", "/c.html"];

  for (const uri of uris) store.set(uri, `<template>${uri}</template>`);

  const snapshots = Array.from(store.all());
  expect(snapshots.length).toBe(uris.length);
  expect(snapshots.some((snap) => snap.uri === "/b.html")).toBeTruthy();

  store.delete("/b.html");
  expect(store.get("/b.html")).toBeNull();
  expect(Array.from(store.all()).length).toBe(uris.length - 1);

  store.delete("/a.html");
  store.delete("/c.html");
  expect(Array.from(store.all()).length).toBe(0);
});
