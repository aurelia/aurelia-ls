import type { BindingMode } from "@aurelia/runtime-html";

export class PulseDot {
  static $au = {
    type: "custom-element" as const,
    name: "pulse-dot",
    template: `<template>
      <span class="pulse-dot \${active ? 'on' : 'off'}"></span>
    </template>`,
    bindables: [
      { name: "active", mode: 1 satisfies BindingMode },
      { name: "tone" },
    ],
    aliases: ["pulse"],
  };

  active = false;
  tone = "neutral";
}
