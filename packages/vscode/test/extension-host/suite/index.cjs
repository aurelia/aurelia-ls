const path = require("path");
const Mocha = require("mocha");

function run() {
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
    // Scenario assertions own their deadlines; this ceiling only covers the sum
    // of several intentional cold compiler and editor lifecycle cycles.
    timeout: 300000,
  });
  if (process.env.AURELIA_LS_EXTENSION_HOST_GREP) {
    mocha.grep(process.env.AURELIA_LS_EXTENSION_HOST_GREP);
  }

  if (process.env.AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT === "worker") {
    mocha.addFile(path.join(__dirname, "worker-languageclient-restart.test.cjs"));
  }
  mocha.addFile(path.join(__dirname, "rename-undo-redo.test.cjs"));
  mocha.addFile(path.join(__dirname, "product-surface.test.cjs"));

  return new Promise((resolve, reject) => {
    try {
      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} extension-host test(s) failed.`));
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { run };
