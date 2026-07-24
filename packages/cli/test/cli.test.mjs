import { after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createContext } from "../dist/context.js";

const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");
const RUNTIME_ROOT = path.join(PACKAGE_ROOT, "runtime");
const CLI = path.join(PACKAGE_ROOT, "dist/bin/twskin.js");
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "twskin-cli-test-"));
const THEME_CONF = path.join(DATA_DIR, "run/theme.conf");

after(() => fs.rmSync(DATA_DIR, { recursive: true, force: true }));

function run(args, env = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: PACKAGE_ROOT,
    env: {
      ...process.env,
      TWSKIN_RUNTIME_ROOT: RUNTIME_ROOT,
      TWSKIN_DATA_DIR: DATA_DIR,
      TWSKIN_THEMES_DIR: path.join(REPO_ROOT, "themes"),
      TWSKIN_DISTRIBUTION: "development",
      ...env,
    },
    encoding: "utf8",
  });
}

test("package metadata defines a public macOS CLI with an explicit payload", () => {
  const metadata = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"));
  assert.equal(metadata.name, "twskin");
  assert.equal(metadata.bin.twskin, "dist/bin/twskin.js");
  assert.deepEqual(Object.keys(metadata.bin), ["twskin"]);
  assert.equal(fs.existsSync(path.join(PACKAGE_ROOT, "dist/bin/twds.js")), false);
  assert.equal(metadata.engines.node, ">=22.0.0");
  assert.deepEqual(metadata.os, ["darwin"]);
  assert.equal(metadata.publishConfig.access, "public");
  assert.equal(metadata.publishConfig.provenance, undefined);
  assert.ok(metadata.files.includes("runtime/"));
  const context = createContext({
    ...process.env,
    TWSKIN_RUNTIME_ROOT: RUNTIME_ROOT,
    TWSKIN_DATA_DIR: DATA_DIR,
  });
  assert.equal(context.themesDir, path.join(REPO_ROOT, "themes"));
});

test("help and version expose the stable public command surface", () => {
  const help = run(["help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /twskin start \[--yes\]/);
  assert.match(help.stdout, /twskin uninstall/);
  assert.match(help.stdout, /twskin theme download \[id\]/);
  assert.match(help.stdout, /twskin theme load <directory>/);

  const version = run(["version"]);
  assert.equal(version.status, 0);
  assert.match(version.stdout, /^twskin 0\.5\.0/);
});

test("themes --json returns the official catalog", () => {
  const result = run(["themes", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.schemaVersion, 1);
  assert.equal(output.ok, true);
  assert.ok(output.themes.some((theme) => theme.id === "eva-01"));
  assert.ok(output.themes.some((theme) => theme.id === "eva-01-light"));
  assert.ok(output.themes.length >= 10);
});

test("status --json is read-only and covers the four core states", () => {
  const before = fs.existsSync(THEME_CONF) ? fs.readFileSync(THEME_CONF, "utf8") : null;
  const result = run(["status", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.equal(typeof output.status.app.installed, "boolean");
  assert.equal(typeof output.status.cdp.reachable, "boolean");
  assert.equal(typeof output.status.watcher.running, "boolean");
  assert.equal(typeof output.status.theme.id, "string");
  assert.equal(output.status.distribution, "development");
  const afterValue = fs.existsSync(THEME_CONF) ? fs.readFileSync(THEME_CONF, "utf8") : null;
  assert.equal(afterValue, before);
});

test("an invalid theme is atomic and returns a stable machine error", () => {
  const before = fs.existsSync(THEME_CONF) ? fs.readFileSync(THEME_CONF, "utf8") : null;
  const result = run(["theme", "definitely-not-a-theme", "--json"]);
  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.equal(output.error.code, "THEME_NOT_FOUND");
  const afterValue = fs.existsSync(THEME_CONF) ? fs.readFileSync(THEME_CONF, "utf8") : null;
  assert.equal(afterValue, before);
});

test("unknown commands, extra arguments and typo compatibility follow the contract", () => {
  const unknown = run(["wat"]);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /未知命令/);

  const extra = run(["start", "extra"]);
  assert.equal(extra.status, 2);
  assert.match(extra.stderr, /参数过多/);

  const typoHelp = run(["unisntall", "--help"]);
  assert.equal(typoHelp.status, 0);
  assert.match(typoHelp.stdout, /twskin uninstall/);
});

test("doctor --json emits one valid error document when TRAE is missing", () => {
  const result = run(["doctor", "--json"], {
    APP_BUNDLE: "/tmp/TRAE-does-not-exist.app",
    APP_BUNDLE_ID: "invalid.twskin.test.bundle",
    APP_PROC_MATCH: "invalid-twskin-test-process",
    PORT: "19528",
  });
  assert.equal(result.status, 3);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.equal(output.error.code, "DOCTOR_FAILED");
  assert.ok(output.checks.some((check) => check.id === "app" && check.level === "fail"));
});

test("source check never allows uninstall to delete a development workspace", () => {
  const result = run(["uninstall", "--yes", "--json"]);
  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.error.code, "DEVELOPMENT_INSTALL");
  assert.ok(fs.existsSync(REPO_ROOT));
});
