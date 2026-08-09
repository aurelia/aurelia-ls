"use strict";

function activate(context) {
  return Object.freeze({
    extensionPath: context.extensionPath,
    extensionMode: context.extensionMode,
  });
}

function deactivate() {}

module.exports = { activate, deactivate };
