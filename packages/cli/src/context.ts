import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CliContext } from "./types.js";

const SOURCE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = path.dirname(SOURCE_DIR);
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");
export const PACKAGE_METADATA = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8")) as { name: string; version: string };

export const DEFAULT_PORT = 19527;
export const DEFAULT_APP_BUNDLE = "/Applications/TRAE SOLO CN.app";
export const DEFAULT_APP_BUNDLE_ID = "cn.trae.solo.app";
export const DEFAULT_APP_PROC_MATCH = "TRAE SOLO CN";
export const MIN_NODE_MAJOR = 22;

export function createContext(env: NodeJS.ProcessEnv = process.env): Readonly<CliContext> {
  const packagedRuntime = path.join(PACKAGE_ROOT, "runtime");
  const sourceCheckout = fs.existsSync(path.join(PACKAGE_ROOT, "src"));
  const runtimeRoot = path.resolve(env.TWSKIN_RUNTIME_ROOT || packagedRuntime);
  const dataDir = path.resolve(env.TWSKIN_DATA_DIR || path.join(os.homedir(), ".trae-work-skin"));
  const stateDir = path.resolve(env.TWSKIN_STATE_DIR || path.join(dataDir, "run"));
  const distribution = env.TWSKIN_DISTRIBUTION || (
    sourceCheckout ? "development" : runtimeRoot === dataDir ? "standalone" : "npm"
  );
  const defaultThemesDir = distribution === "development"
    ? path.join(REPO_ROOT, "themes")
    : path.join(dataDir, "themes");

  return Object.freeze({
    env,
    packageName: PACKAGE_METADATA.name,
    packageVersion: PACKAGE_METADATA.version,
    packageRoot: PACKAGE_ROOT,
    runtimeRoot,
    dataDir,
    stateDir,
    themesDir: path.resolve(env.TWSKIN_THEMES_DIR || defaultThemesDir),
    distribution,
    paths: Object.freeze({
      themeConf: path.join(stateDir, "theme.conf"),
      pidFile: path.join(stateDir, "injector.pid"),
      portFile: path.join(stateDir, "port"),
      cdpConfigState: path.join(stateDir, "cdp-config.json"),
      lockFile: path.join(stateDir, "cli.lock"),
      logFile: path.join(stateDir, "injector.log"),
      runtimeManifest: path.join(runtimeRoot, "manifest.json"),
    }),
    app: Object.freeze({
      bundle: env.APP_BUNDLE || DEFAULT_APP_BUNDLE,
      bundleId: env.APP_BUNDLE_ID || DEFAULT_APP_BUNDLE_ID,
      processMatch: env.APP_PROC_MATCH || DEFAULT_APP_PROC_MATCH,
      ...(env.TWSKIN_APP_ARGV_FILE ? { argvFile: path.resolve(env.TWSKIN_APP_ARGV_FILE) } : {}),
    }),
  });
}
