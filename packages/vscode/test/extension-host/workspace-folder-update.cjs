const assert = require("assert");

async function applyWorkspaceFolderUpdate(
  start,
  deleteCount,
  additions,
  message,
  { workspace, wait },
) {
  const changes = [];
  const subscription = workspace.onDidChangeWorkspaceFolders((event) => {
    changes.push(event);
  });
  try {
    assert.strictEqual(
      workspace.updateWorkspaceFolders(start, deleteCount, ...additions),
      true,
      `${message} should be admitted by VS Code`,
    );
    await wait(
      () => changes.length > 0,
      `${message} should settle through onDidChangeWorkspaceFolders`,
      60_000,
    );
    assert.strictEqual(changes.length, 1, `${message} must correlate exactly one workspace-folder change event.`);
    return changes[0];
  } finally {
    subscription.dispose();
  }
}

module.exports = { applyWorkspaceFolderUpdate };
