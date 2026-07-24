import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLI = path.join(PACKAGE_ROOT, "dist/bin/twskin.js");
const FIXTURE = fs.mkdtempSync(path.join(os.tmpdir(), "twskin-lifecycle-"));
const RUNTIME = path.join(FIXTURE, "runtime");
const DATA = path.join(FIXTURE, "data");
const APP = path.join(FIXTURE, "TRAE Test.app");
let watcherPid = null;
let fakeAppPid = null;

function writeExecutable(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  fs.chmodSync(file, 0o755);
}

before(() => {
  fs.mkdirSync(path.join(RUNTIME, "themes/aurora"), { recursive: true });
  fs.mkdirSync(APP, { recursive: true });
  fs.writeFileSync(path.join(RUNTIME, "themes/aurora/theme.json"), JSON.stringify({ id: "aurora", name: "Aurora" }));
  fs.writeFileSync(path.join(RUNTIME, "themes/aurora/background.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>");
  fs.writeFileSync(path.join(RUNTIME, "injector.mjs"), `
    if (process.argv.includes("--manager-status")) console.log(JSON.stringify({ ready: true, version: "0.5.2" }));
    else if (process.argv.includes("--stop")) console.log(JSON.stringify({ ok: true, targets: 1, restoredTargets: 1 }));
    else if (process.argv.includes("--watch")) setInterval(() => {}, 1000);
  `);
  writeExecutable(path.join(RUNTIME, "restore.sh"), `#!/bin/bash
set -e
mkdir -p "$TWSKIN_STATE_DIR"
printf 'restored\n' > "$TWSKIN_STATE_DIR/restore.marker"
`);
  writeExecutable(path.join(RUNTIME, "start.sh"), "#!/bin/bash\nexit 99\n");
});

after(() => {
  if (watcherPid) try { process.kill(watcherPid, "SIGTERM"); } catch {}
  if (fakeAppPid) try { process.kill(fakeAppPid, "SIGTERM"); } catch {}
  fs.rmSync(FIXTURE, { recursive: true, force: true });
});

function runAsync(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd: PACKAGE_ROOT,
      env: {
        ...process.env,
        TWSKIN_RUNTIME_ROOT: RUNTIME,
        TWSKIN_DATA_DIR: DATA,
        TWSKIN_THEMES_DIR: path.join(RUNTIME, "themes"),
        TWSKIN_DISTRIBUTION: "development",
        APP_BUNDLE: APP,
        APP_BUNDLE_ID: "test.twskin.app",
        APP_PROC_MATCH: "TRAE Test",
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status, signal) => resolve({ status, signal, stdout, stderr }));
  });
}

test("theme selection while stopped persists without launching the App", async () => {
  const result = await runAsync(["theme", "aurora", "--json"], { PORT: "19529" });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.applied, false);
  assert.equal(fs.readFileSync(path.join(DATA, "run/theme.conf"), "utf8"), "aurora\n");
});

test("start requires confirmation before restarting a running App without CDP", async () => {
  const fakeExecutable = path.join(APP, "Contents/MacOS/TRAE Test");
  const fakeApp = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)", fakeExecutable], {
    stdio: "ignore",
  });
  fakeAppPid = fakeApp.pid;
  await new Promise((resolve, reject) => {
    fakeApp.once("spawn", resolve);
    fakeApp.once("error", reject);
  });
  try {
    const result = await runAsync(["start", "--json"], { PORT: "19531" });
    assert.equal(result.status, 2, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.error.code, "APP_RESTART_CONFIRMATION_REQUIRED");
    process.kill(fakeAppPid, 0);
  } finally {
    try { process.kill(fakeAppPid, "SIGTERM"); } catch {}
    fakeAppPid = null;
  }
});

test("start repairs the manager once, then reports it as already running", async () => {
  const server = http.createServer((request, response) => {
    if (request.url === "/json/version") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ Browser: "Chrome/Test" }));
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    const result = await runAsync(["start", "--json"], { PORT: String(port) });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.mode, "refresh");
    watcherPid = Number(fs.readFileSync(path.join(DATA, "run/injector.pid"), "utf8").trim());
    assert.ok(Number.isInteger(watcherPid) && watcherPid > 0);
    process.kill(watcherPid, 0);
    const repeated = await runAsync(["start", "--json"], { PORT: String(port) });
    assert.equal(repeated.status, 0, repeated.stderr);
    const repeatedOutput = JSON.parse(repeated.stdout);
    assert.equal(repeatedOutput.state, "already_running");
    assert.equal(repeatedOutput.mode, "already-running");
    assert.equal(repeatedOutput.watcherPid, watcherPid);
    assert.equal(Number(fs.readFileSync(path.join(DATA, "run/injector.pid"), "utf8")), watcherPid);
    process.kill(watcherPid, 0);

    const stopped = await runAsync(["stop", "--json"], { PORT: String(port) });
    assert.equal(stopped.status, 0, stopped.stderr);
    const stoppedOutput = JSON.parse(stopped.stdout);
    assert.equal(stoppedOutput.command, "stop");
    assert.equal(stoppedOutput.watcherStopped, true);
    assert.equal(stoppedOutput.cdpReachable, true);
    assert.equal(stoppedOutput.targets, 1);
    assert.equal(stoppedOutput.restoredTargets, 1);
    assert.equal(fs.existsSync(path.join(DATA, "run/injector.pid")), false);
    watcherPid = null;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("restore delegates state through TWSKIN_STATE_DIR instead of writing into node_modules", async () => {
  if (watcherPid) {
    try { process.kill(watcherPid, "SIGTERM"); } catch {}
    watcherPid = null;
  }
  const result = await runAsync(["restore", "--json"], { PORT: "19529" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(DATA, "run/restore.marker"), "utf8"), "restored\n");
  assert.equal(fs.existsSync(path.join(RUNTIME, "run")), false);
});
