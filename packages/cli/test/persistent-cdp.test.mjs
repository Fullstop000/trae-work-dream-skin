import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyEdits, modify, parse } from "jsonc-parser";
import { createContext } from "../dist/context.js";
import {
  disablePersistentCdp,
  enablePersistentCdp,
} from "../dist/persistent-cdp.js";

const fixtures = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

function setup(content) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "twskin-persistent-cdp-"));
  fixtures.push(fixture);
  const argvFile = path.join(fixture, "argv.json");
  fs.writeFileSync(argvFile, content);
  const context = createContext({
    ...process.env,
    TWSKIN_DATA_DIR: path.join(fixture, "data"),
    TWSKIN_APP_ARGV_FILE: argvFile,
  });
  return { fixture, argvFile, context };
}

function readArgv(file) {
  return parse(fs.readFileSync(file, "utf8"), [], { allowTrailingComma: true });
}

test("persistent CDP edits JSONC without losing comments and removes only its own value", () => {
  const original = `{
  // Keep the user's locale.
  "locale": "en",
  "enable-crash-reporter": true,
}
`;
  const { argvFile, context } = setup(original);

  const enabled = enablePersistentCdp(context, "/Applications/TRAE Test.app", 19527);
  assert.equal(enabled.managed, true);
  assert.equal(enabled.changed, true);
  assert.equal(readArgv(argvFile)["remote-debugging-port"], "19527");
  assert.match(fs.readFileSync(argvFile, "utf8"), /Keep the user's locale/);
  assert.ok(fs.existsSync(context.paths.cdpConfigState));

  const active = fs.readFileSync(argvFile, "utf8");
  fs.writeFileSync(argvFile, applyEdits(active, modify(active, ["locale"], "zh-cn", {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: "\n" },
  })));
  const disabled = disablePersistentCdp(context);
  assert.equal(disabled.changed, true);
  assert.equal(readArgv(argvFile)["remote-debugging-port"], undefined);
  assert.equal(readArgv(argvFile).locale, "zh-cn");
  assert.match(fs.readFileSync(argvFile, "utf8"), /Keep the user's locale/);
  assert.equal(fs.existsSync(context.paths.cdpConfigState), false);
});

test("persistent CDP restores a pre-existing user port", () => {
  const { argvFile, context } = setup(`{
  "locale": "en",
  "remote-debugging-port": "9333"
}
`);

  enablePersistentCdp(context, "/Applications/TRAE Test.app", 19527);
  assert.equal(readArgv(argvFile)["remote-debugging-port"], "19527");
  disablePersistentCdp(context);
  assert.equal(readArgv(argvFile)["remote-debugging-port"], "9333");
});

test("persistent CDP preserves a user change made while twskin is active", () => {
  const { argvFile, context } = setup("{}\n");
  enablePersistentCdp(context, "/Applications/TRAE Test.app", 19527);

  const changedByUser = fs.readFileSync(argvFile, "utf8").replace("19527", "9444");
  fs.writeFileSync(argvFile, changedByUser);
  const disabled = disablePersistentCdp(context);

  assert.equal(disabled.changed, false);
  assert.equal(readArgv(argvFile)["remote-debugging-port"], "9444");
  assert.equal(fs.existsSync(context.paths.cdpConfigState), false);
});

test("an existing matching user port is not claimed by twskin", () => {
  const { argvFile, context } = setup(`{ "remote-debugging-port": "19527" }\n`);
  const enabled = enablePersistentCdp(context, "/Applications/TRAE Test.app", 19527);

  assert.equal(enabled.managed, false);
  assert.equal(enabled.changed, false);
  assert.equal(fs.existsSync(context.paths.cdpConfigState), false);
  disablePersistentCdp(context);
  assert.equal(readArgv(argvFile)["remote-debugging-port"], "19527");
});
