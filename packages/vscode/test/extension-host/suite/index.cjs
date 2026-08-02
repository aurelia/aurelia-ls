const path = require("path");
const Mocha = require("mocha");

function run() {
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
    timeout: 120000,
  });
  if (process.env.AURELIA_LS_EXTENSION_HOST_GREP) {
    mocha.grep(process.env.AURELIA_LS_EXTENSION_HOST_GREP);
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
