import { describe, test, expect } from "vitest";
import { JSDOM } from "jsdom";

import { compileAndRenderAot } from "@aurelia-ls/ssr";
import { createComponent, countElements, getTexts } from "./_helpers/test-utils.js";

describe("AOT SSR: Template Controller Composition", () => {
  test("repeat + if on same element filters rows", async () => {
    const App = createComponent("test-app", `
      <div repeat.for="item of items" if.bind="item.active" class="row">
        ${"${item.name}"}
      </div>
    `, {
      items: [
        { name: "Alpha", active: true },
        { name: "Beta", active: false },
        { name: "Gamma", active: true },
      ],
    });

    const result = await compileAndRenderAot(App);
    const dom = new JSDOM(result.html);
    const body = dom.window.document.body;

    expect(countElements(body, "div.row")).toBe(2);
    expect(getTexts(body, "div.row")).toEqual(["Alpha", "Gamma"]);
  });

  test("if + repeat on same element gates iteration", async () => {
    const App = createComponent("test-app", `
      <div if.bind="show" repeat.for="item of items" class="row">
        ${"${item}"}
      </div>
    `, {
      show: true,
      items: ["One", "Two", "Three"],
    });

    const result = await compileAndRenderAot(App);
    const dom = new JSDOM(result.html);
    const body = dom.window.document.body;

    expect(countElements(body, "div.row")).toBe(3);
    expect(getTexts(body, "div.row")).toEqual(["One", "Two", "Three"]);
  });

  test("repeat + if + with stacked keeps inner scope", async () => {
    const App = createComponent("test-app", `
      <div repeat.for="item of items" if.bind="item.active" with.bind="item">
        <span class="name">${"${name}"}</span>
      </div>
    `, {
      items: [
        { name: "Echo", active: true },
        { name: "Foxtrot", active: false },
        { name: "Golf", active: true },
      ],
    });

    const result = await compileAndRenderAot(App);
    const dom = new JSDOM(result.html);
    const body = dom.window.document.body;

    expect(countElements(body, "span.name")).toBe(2);
    expect(getTexts(body, "span.name")).toEqual(["Echo", "Golf"]);
  });

  test("template repeat + if composes correctly", async () => {
    const App = createComponent("test-app", `
      <template repeat.for="item of items" if.bind="item.active">
        <span class="cell">${"${item.name}"}</span>
      </template>
    `, {
      items: [
        { name: "Red", active: true },
        { name: "Blue", active: false },
        { name: "Green", active: true },
      ],
    });

    const result = await compileAndRenderAot(App);
    const dom = new JSDOM(result.html);
    const body = dom.window.document.body;

    expect(countElements(body, "span.cell")).toBe(2);
    expect(getTexts(body, "span.cell")).toEqual(["Red", "Green"]);
  });
});
