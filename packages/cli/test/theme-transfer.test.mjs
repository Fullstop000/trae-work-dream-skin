import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLI = path.join(PACKAGE_ROOT, "dist/bin/twskin.js");
const FIXTURE = fs.mkdtempSync(path.join(os.tmpdir(), "twskin-theme-transfer-"));
const DATA = path.join(FIXTURE, "data");
const TARGET = path.join(DATA, "themes");
const SOURCE = path.join(FIXTURE, "source");
const PACK_STAGE = path.join(FIXTURE, "pack");
const ARCHIVE = path.join(FIXTURE, "themes.tar.gz");
const BOOTSTRAP_DATA = path.join(FIXTURE, "bootstrap-data");
const BOOTSTRAP_THEMES = path.join(BOOTSTRAP_DATA, "themes");
const RUNTIME = path.join(FIXTURE, "runtime");
const APP = path.join(FIXTURE, "TRAE Test.app");
let bootstrapWatcherPid = null;

function writeTheme(directory, id, extra = true) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "theme.json"), JSON.stringify({ id, name: `Theme ${id}` }));
  fs.writeFileSync(path.join(directory, "theme.css"), `body.trae-skin-theme-${id} { --fixture-theme: ${id}; }\n`);
  fs.writeFileSync(path.join(directory, "background.svg"), `<svg xmlns="http://www.w3.org/2000/svg"><title>${id}</title></svg>`);
  if (extra) fs.writeFileSync(path.join(directory, "design-exploration.png"), "must not be installed");
}

function runAsync(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd: PACKAGE_ROOT,
      env: {
        ...process.env,
        TWSKIN_DATA_DIR: DATA,
        TWSKIN_THEMES_DIR: TARGET,
        TWSKIN_DISTRIBUTION: "development",
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

before(() => {
  writeTheme(path.join(SOURCE, "local-one"), "local-one");
  writeTheme(path.join(SOURCE, "local-two"), "local-two");
  writeTheme(path.join(PACK_STAGE, "themes/release-one"), "release-one", false);
  fs.writeFileSync(path.join(PACK_STAGE, "theme-pack.json"), JSON.stringify({
    schemaVersion: 1,
    packVersion: "0.4.0",
    releaseTag: "v0.4.0",
    compatibleCli: ">=0.4.0 <1.0.0",
    themes: [{ id: "release-one", name: "Theme release-one", files: [] }],
  }));
  const tar = spawnSync("/usr/bin/tar", ["-czf", ARCHIVE, "-C", PACK_STAGE, "theme-pack.json", "themes"], { encoding: "utf8" });
  assert.equal(tar.status, 0, tar.stderr);
  fs.mkdirSync(RUNTIME, { recursive: true });
  fs.mkdirSync(APP, { recursive: true });
  fs.writeFileSync(path.join(RUNTIME, "injector.mjs"), "if (process.argv.includes('--watch')) setInterval(() => {}, 1000);\n");
});

after(() => {
  if (bootstrapWatcherPid) try { process.kill(bootstrapWatcherPid, "SIGTERM"); } catch {}
  fs.rmSync(FIXTURE, { recursive: true, force: true });
});

test("theme load installs one or many local themes with the canonical payload only", async () => {
  const result = await runAsync(["theme", "load", SOURCE, "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.installed, ["local-one", "local-two"]);
  assert.ok(fs.existsSync(path.join(TARGET, "local-one/background.svg")));
  assert.match(fs.readFileSync(path.join(TARGET, "local-one/theme.css"), "utf8"), /--fixture-theme: local-one/);
  assert.equal(fs.existsSync(path.join(TARGET, "local-one/design-exploration.png")), false);
});

test("theme load rejects an oversized theme.css", async () => {
  const oversized = path.join(FIXTURE, "oversized-css");
  writeTheme(oversized, "oversized-css", false);
  fs.writeFileSync(path.join(oversized, "theme.css"), Buffer.alloc(1024 * 1024 + 1, 32));
  const result = await runAsync(["theme", "load", oversized, "--json"]);
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).error.code, "THEME_CSS_TOO_LARGE");
});

test("theme download uses fixed latest-release assets without the GitHub API", async () => {
  const archive = fs.readFileSync(ARCHIVE);
  const digest = crypto.createHash("sha256").update(archive).digest("hex");
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    if (request.url === "/twskin-themes.tar.gz") response.end(archive);
    else if (request.url === "/twskin-themes.sha256") response.end(`${digest}  twskin-themes.tar.gz\n`);
    else response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const result = await runAsync(["theme", "download", "release-one", "--json"], {
      TWSKIN_RELEASE_API_URL: "",
      TWSKIN_RELEASE_ASSET_BASE_URL: origin,
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.release, "v0.4.0");
    assert.deepEqual(output.installed, ["release-one"]);
    assert.deepEqual(requests.sort(), ["/twskin-themes.sha256", "/twskin-themes.tar.gz"]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("theme download verifies and installs an official GitHub Release asset", async () => {
  const archive = fs.readFileSync(ARCHIVE);
  const digest = crypto.createHash("sha256").update(archive).digest("hex");
  let origin = "";
  const server = http.createServer((request, response) => {
    if (request.url === "/latest") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        tag_name: "v0.4.0",
        assets: [
          { name: "twskin-themes-v0.4.0.tar.gz", browser_download_url: `${origin}/archive` },
          { name: "twskin-themes-v0.4.0.sha256", browser_download_url: `${origin}/checksum` },
        ],
      }));
    } else if (request.url === "/archive") response.end(archive);
    else if (request.url === "/checksum") response.end(`${digest}  twskin-themes-v0.4.0.tar.gz\n`);
    else response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const result = await runAsync(["theme", "download", "release-one", "--json"], { TWSKIN_RELEASE_API_URL: `${origin}/latest` });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.release, "v0.4.0");
    assert.deepEqual(output.installed, ["release-one"]);
    assert.ok(fs.existsSync(path.join(TARGET, "release-one/theme.json")));
    assert.ok(fs.existsSync(path.join(TARGET, "release-one/theme.css")));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("theme download refuses an asset whose SHA-256 does not match", async () => {
  const archive = fs.readFileSync(ARCHIVE);
  let origin = "";
  const server = http.createServer((request, response) => {
    if (request.url === "/latest") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        tag_name: "v0.4.0",
        assets: [
          { name: "twskin-themes-v0.4.0.tar.gz", browser_download_url: `${origin}/archive` },
          { name: "twskin-themes-v0.4.0.sha256", browser_download_url: `${origin}/checksum` },
        ],
      }));
    } else if (request.url === "/archive") response.end(archive);
    else if (request.url === "/checksum") response.end(`${"0".repeat(64)}  twskin-themes-v0.4.0.tar.gz\n`);
    else response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const result = await runAsync(["theme", "download", "--json"], { TWSKIN_RELEASE_API_URL: `${origin}/latest` });
    assert.equal(result.status, 4);
    assert.equal(JSON.parse(result.stdout).error.code, "CHECKSUM_MISMATCH");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("first start bootstraps an empty theme directory and starts the manager", async () => {
  const archive = fs.readFileSync(ARCHIVE);
  const digest = crypto.createHash("sha256").update(archive).digest("hex");
  let origin = "";
  const server = http.createServer((request, response) => {
    if (request.url === "/json/version") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ Browser: "Chrome/Test" }));
    } else if (request.url === "/latest") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        tag_name: "v0.4.0",
        assets: [
          { name: "twskin-themes-v0.4.0.tar.gz", browser_download_url: `${origin}/archive` },
          { name: "twskin-themes-v0.4.0.sha256", browser_download_url: `${origin}/checksum` },
        ],
      }));
    } else if (request.url === "/archive") response.end(archive);
    else if (request.url === "/checksum") response.end(`${digest}  twskin-themes-v0.4.0.tar.gz\n`);
    else response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const result = await runAsync(["start", "--yes", "--json"], {
      TWSKIN_DATA_DIR: BOOTSTRAP_DATA,
      TWSKIN_THEMES_DIR: BOOTSTRAP_THEMES,
      TWSKIN_RUNTIME_ROOT: RUNTIME,
      TWSKIN_RELEASE_API_URL: `${origin}/latest`,
      APP_BUNDLE: APP,
      APP_BUNDLE_ID: "test.twskin.bootstrap",
      APP_PROC_MATCH: "TRAE Test",
      PORT: String(server.address().port),
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.mode, "refresh");
    assert.deepEqual(output.bootstrappedThemes, ["release-one"]);
    assert.ok(fs.existsSync(path.join(BOOTSTRAP_THEMES, "release-one/theme.json")));
    bootstrapWatcherPid = Number(fs.readFileSync(path.join(BOOTSTRAP_DATA, "run/injector.pid"), "utf8"));
    process.kill(bootstrapWatcherPid, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("non-interactive first start requires explicit download consent", async () => {
  const emptyData = path.join(FIXTURE, "consent-data");
  const result = await runAsync(["start", "--json"], {
    TWSKIN_DATA_DIR: emptyData,
    TWSKIN_THEMES_DIR: path.join(emptyData, "themes"),
  });
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).error.code, "THEME_DOWNLOAD_CONFIRMATION_REQUIRED");
  assert.equal(fs.existsSync(path.join(emptyData, "themes")), false);
});

test("misspelled thme remains an unknown command", async () => {
  const result = await runAsync(["thme", "load", SOURCE, "--json"]);
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).error.code, "UNKNOWN_COMMAND");
});
