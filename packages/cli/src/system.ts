import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import type { SpawnSyncOptionsWithStringEncoding, SpawnSyncReturns } from "node:child_process";
import { DEFAULT_PORT } from "./context.js";
import { CliError } from "./errors.js";
import type { CliContext } from "./types.js";

interface CommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  inherit?: boolean;
}

export interface WatcherStatus {
  pid: number | null;
  alive: boolean;
  expected: boolean;
  command: string;
}

export interface CdpVersion {
  Browser?: string;
  [key: string]: unknown;
}

export interface IntegrityFailure {
  path: string;
  reason: string;
}

interface RuntimeManifestEntry {
  path: string;
  size: number;
  sha256: string;
}

interface RuntimeManifest {
  packageVersion?: string;
  files?: RuntimeManifestEntry[];
}

export function readText(file: string, fallback = ""): string {
  try { return fs.readFileSync(file, "utf8").trim(); } catch { return fallback; }
}

export function atomicWrite(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  let mode = 0o600;
  try { mode = fs.statSync(file).mode & 0o777; } catch {}
  fs.writeFileSync(temporary, content, { mode });
  fs.renameSync(temporary, file);
}

export function commandResult(context: CliContext, command: string, args: readonly string[], options: CommandOptions = {}): SpawnSyncReturns<string> {
  return spawnSync(command, args, {
    cwd: options.cwd || context.runtimeRoot,
    env: { ...context.env, ...options.env },
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  } satisfies SpawnSyncOptionsWithStringEncoding);
}

export function commandText(context: CliContext, command: string, args: readonly string[]): string {
  const result = commandResult(context, command, args);
  return result.status === 0 ? result.stdout.trim() : "";
}

export function readPort(context: CliContext): number {
  const raw = context.env.PORT || readText(context.paths.portFile, String(DEFAULT_PORT));
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new CliError("INVALID_PORT", 3, `端口配置无效：${raw}`, `删除 ${context.paths.portFile} 后重试。`);
  }
  return port;
}

export function pidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export function pidCommand(context: CliContext, pid: number): string {
  return commandText(context, "/bin/ps", ["-p", String(pid), "-o", "command="]);
}

export function watcherStatus(context: CliContext): WatcherStatus {
  const pid = Number(readText(context.paths.pidFile, "0"));
  const alive = pidAlive(pid);
  const command = alive ? pidCommand(context, pid) : "";
  const expected = alive && command.includes("injector.mjs") && command.includes("--watch");
  return { pid: pid || null, alive, expected, command };
}

export function resolveAppBundle(context: CliContext): string {
  if (fs.existsSync(context.app.bundle)) return context.app.bundle;
  const found = commandText(context, "/usr/bin/mdfind", [
    `kMDItemCFBundleIdentifier == '${context.app.bundleId}'`,
  ]).split("\n").find(Boolean);
  return found || context.app.bundle;
}

export function appRunning(context: CliContext, appBundle: string): boolean {
  if (!fs.existsSync(appBundle)) return false;
  return commandResult(context, "/usr/bin/pgrep", ["-f", `${appBundle}/Contents/MacOS/`]).status === 0;
}

export function portOwner(context: CliContext, port: number): { pid: number; command: string } | null {
  const pidText = commandText(context, "/usr/sbin/lsof", [
    "-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t",
  ]).split("\n").find(Boolean);
  const pid = Number(pidText || 0);
  if (!pid) return null;
  return { pid, command: pidCommand(context, pid) };
}

export function cdpVersion(port: number, timeoutMs = 800): Promise<CdpVersion | null> {
  return new Promise<CdpVersion | null>((resolve) => {
    const request = http.get({
      hostname: "127.0.0.1",
      port,
      path: "/json/version",
      timeout: timeoutMs,
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        if (response.statusCode !== 200) return resolve(null);
        try { resolve(JSON.parse(body) as CdpVersion); } catch { resolve(null); }
      });
    });
    request.on("timeout", () => request.destroy());
    request.on("error", () => resolve(null));
  });
}

function runtimeEnvironment(context: CliContext, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    TWSKIN_STATE_DIR: context.stateDir,
    TWSKIN_THEMES_DIR: context.themesDir,
    TWSKIN_RUNTIME_VERSION: context.packageVersion,
    ...extra,
  };
}

export function runInjector(context: CliContext, args: readonly string[]): string {
  const result = commandResult(context, process.execPath, [
    path.join(context.runtimeRoot, "injector.mjs"),
    ...args,
    "--themes", context.themesDir,
  ], { env: runtimeEnvironment(context) });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "injector failed").trim();
    throw new CliError("INJECT_FAILED", 5, "主题注入失败。", "运行 twskin doctor 检查环境。", detail);
  }
  return result.stdout.trim();
}

export function managerStatus(context: CliContext, port: number): { ready: boolean; version: string | null } {
  const result = commandResult(context, process.execPath, [
    path.join(context.runtimeRoot, "injector.mjs"),
    "--manager-status", "--port", String(port), "--themes", context.themesDir,
  ], { env: runtimeEnvironment(context) });
  if (result.status !== 0) return { ready: false, version: null };
  try {
    const status = JSON.parse(result.stdout.trim()) as { ready?: boolean; version?: unknown };
    return { ready: status.ready === true, version: typeof status.version === "string" ? status.version : null };
  } catch {
    return { ready: false, version: null };
  }
}

export function stopWatcher(context: CliContext, { strict = false }: { strict?: boolean } = {}): boolean {
  const watcher = watcherStatus(context);
  if (!watcher.alive) {
    try { fs.unlinkSync(context.paths.pidFile); } catch {}
    return false;
  }
  if (!watcher.expected) {
    if (strict) {
      throw new CliError("WATCHER_PID_MISMATCH", 5, `PID 文件指向了非 TRAE Work Skin 进程：${watcher.pid}`, "运行 twskin doctor 查看详情。");
    }
    return false;
  }
  try { process.kill(watcher.pid!, "SIGTERM"); } catch {}
  try { fs.unlinkSync(context.paths.pidFile); } catch {}
  return true;
}

export function startWatcher(context: CliContext, port: number): number {
  stopWatcher(context, { strict: true });
  fs.mkdirSync(context.stateDir, { recursive: true });
  const logFd = fs.openSync(context.paths.logFile, "a", 0o600);
  const child = spawn(process.execPath, [
    path.join(context.runtimeRoot, "injector.mjs"),
    "--watch", "--port", String(port), "--themes", context.themesDir,
  ], {
    cwd: context.runtimeRoot,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: {
      ...context.env,
      ...runtimeEnvironment(context),
      TWSKIN_CLI_ENTRY: path.join(context.packageRoot, "dist", "bin", "twskin.js"),
    },
  });
  child.unref();
  fs.closeSync(logFd);
  if (!child.pid) throw new CliError("WATCHER_START_FAILED", 5, "守护进程启动失败。", "运行 twskin doctor 检查环境。");
  atomicWrite(context.paths.pidFile, `${child.pid}\n`);
  atomicWrite(context.paths.portFile, `${port}\n`);
  return child.pid;
}

export function runScript(
  context: CliContext,
  script: string,
  extraEnv: NodeJS.ProcessEnv = {},
  options: { inherit?: boolean } = {},
): string {
  const file = path.join(context.runtimeRoot, script);
  const result = commandResult(context, file, [], {
    inherit: options.inherit ?? true,
    env: runtimeEnvironment(context, extraEnv),
  });
  if (result.status !== 0) {
    throw new CliError(
      "SCRIPT_FAILED",
      5,
      `${script} 执行失败。`,
      "运行 twskin doctor 检查环境。",
      { status: result.status, output: `${result.stdout || ""}${result.stderr || ""}`.trim() },
    );
  }
  return `${result.stdout || ""}${result.stderr || ""}`.trim();
}

export function verifyRuntimeIntegrity(context: CliContext): {
  available: boolean;
  valid: boolean | null;
  checked: number;
  failures: IntegrityFailure[];
  manifest?: RuntimeManifest;
} {
  if (!fs.existsSync(context.paths.runtimeManifest)) {
    return { available: false, valid: null, checked: 0, failures: [] };
  }
  try {
    const manifest = JSON.parse(fs.readFileSync(context.paths.runtimeManifest, "utf8")) as RuntimeManifest;
    const failures: IntegrityFailure[] = [];
    for (const entry of manifest.files || []) {
      const file = path.resolve(context.runtimeRoot, entry.path);
      if (!file.startsWith(`${context.runtimeRoot}${path.sep}`) || !fs.existsSync(file)) {
        failures.push({ path: entry.path, reason: "missing" });
        continue;
      }
      const content = fs.readFileSync(file);
      const digest = crypto.createHash("sha256").update(content).digest("hex");
      if (content.byteLength !== entry.size || digest !== entry.sha256) {
        failures.push({ path: entry.path, reason: "digest" });
      }
    }
    if (manifest.packageVersion !== context.packageVersion) failures.push({ path: "manifest.json", reason: "version" });
    return { available: true, valid: failures.length === 0, checked: manifest.files?.length || 0, failures, manifest };
  } catch (error) {
    return { available: true, valid: false, checked: 0, failures: [{ path: "manifest.json", reason: error instanceof Error ? error.message : String(error) }] };
  }
}
