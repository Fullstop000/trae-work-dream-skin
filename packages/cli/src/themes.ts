import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { CliError } from "./errors.js";
import { isCompatibleRange, isVersion } from "./semver.js";
import { atomicWrite, readText } from "./system.js";
import type { CliContext, InstalledTheme, ThemeDirectory, ThemeManifest, ThemeSummary } from "./types.js";

const THEME_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const MAX_THEME_BYTES = 64 * 1024 * 1024;
const MANIFEST_BYTES = 1024 * 1024;
const CANONICAL_ASSETS = [
  "theme.css",
  "background.svg",
  "background.png",
  "background.jpg",
  "background.jpeg",
  "left-sidebar.png",
  "left-sidebar.jpg",
  "left-sidebar.jpeg",
  "right-panel.png",
  "right-panel.jpg",
  "right-panel.jpeg",
];

export function readTheme(context: CliContext): string {
  return readText(context.paths.themeConf, "aurora");
}

export function writeTheme(context: CliContext, id: string): void {
  atomicWrite(context.paths.themeConf, `${id}\n`);
}

function assertNoSymlinks(directory: string): void {
  let totalBytes = 0;
  const visit = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new CliError("THEME_SYMLINK", 2, `主题中不允许符号链接：${file}`);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) totalBytes += fs.statSync(file).size;
    }
  };
  visit(directory);
  if (totalBytes > MAX_THEME_BYTES) {
    throw new CliError("THEME_TOO_LARGE", 2, `主题目录超过 ${MAX_THEME_BYTES / 1024 / 1024} MB：${directory}`);
  }
}

export function validateThemeDirectory(directory: string): ThemeDirectory {
  const source = path.resolve(directory);
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    throw new CliError("THEME_SOURCE_NOT_FOUND", 2, `主题目录不存在：${source}`);
  }
  assertNoSymlinks(source);
  const manifestFile = path.join(source, "theme.json");
  if (!fs.existsSync(manifestFile)) throw new CliError("THEME_MANIFEST_MISSING", 2, `缺少 theme.json：${source}`);
  if (fs.statSync(manifestFile).size > MANIFEST_BYTES) throw new CliError("THEME_MANIFEST_TOO_LARGE", 2, `theme.json 超过 1 MB：${source}`);
  const themeCssFile = path.join(source, "theme.css");
  if (fs.existsSync(themeCssFile) && fs.statSync(themeCssFile).size > MANIFEST_BYTES) {
    throw new CliError("THEME_CSS_TOO_LARGE", 2, `theme.css 超过 1 MB：${source}`);
  }

  let manifest: ThemeManifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); }
  catch (error) { throw new CliError("THEME_MANIFEST_INVALID", 2, `theme.json 无法解析：${source}`, "修复 JSON 后重试。", error instanceof Error ? error.message : String(error)); }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new CliError("THEME_MANIFEST_INVALID", 2, `theme.json 必须是对象：${source}`);
  }
  if (manifest.schemaVersion != null && (!Number.isInteger(manifest.schemaVersion) || Number(manifest.schemaVersion) < 1)) {
    throw new CliError("THEME_MANIFEST_INVALID", 2, `schemaVersion 必须是正整数：${source}`);
  }
  const id = typeof manifest.id === "string" && manifest.id ? manifest.id : path.basename(source);
  if (!THEME_ID.test(id)) throw new CliError("THEME_ID_INVALID", 2, `主题 ID 不合法：${id}`, "仅允许小写字母、数字、点、横线和下划线，最长 64 字符。");
  const version = manifest.version == null ? "0.0.0" : manifest.version;
  if (!isVersion(version)) throw new CliError("THEME_VERSION_INVALID", 2, `主题版本不合法：${String(version)}`, "使用 SemVer，例如 1.0.0。");
  let compatibleCli: string | null = null;
  if (manifest.engines != null) {
    if (!manifest.engines || typeof manifest.engines !== "object" || Array.isArray(manifest.engines)) {
      throw new CliError("THEME_MANIFEST_INVALID", 2, `engines 必须是对象：${source}`);
    }
    const declared = (manifest.engines as { twskin?: unknown }).twskin;
    if (declared != null) {
      if (!isCompatibleRange(declared)) {
        throw new CliError("THEME_ENGINE_RANGE_INVALID", 2, `主题兼容范围不合法：${String(declared)}`, "使用形如 >=0.5.4 <1.0.0 的范围。");
      }
      compatibleCli = declared;
    }
  }
  const background = CANONICAL_ASSETS
    .filter((filename) => filename.startsWith("background."))
    .find((filename) => fs.existsSync(path.join(source, filename)));
  if (!background) throw new CliError("THEME_BACKGROUND_MISSING", 2, `主题缺少 canonical background：${source}`);
  return {
    id,
    version,
    compatibleCli,
    name: typeof manifest.name === "string" && manifest.name ? manifest.name : id,
    desc: typeof manifest.desc === "string" ? manifest.desc : "",
    manifest,
    background,
    source,
  };
}

export function discoverThemeDirectories(sourceDirectory: string): ThemeDirectory[] {
  const source = path.resolve(sourceDirectory);
  if (fs.existsSync(path.join(source, "theme.json"))) return [validateThemeDirectory(source)];
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    throw new CliError("THEME_SOURCE_NOT_FOUND", 2, `主题目录不存在：${source}`);
  }
  const themes: ThemeDirectory[] = [];
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const directory = path.join(source, entry.name);
    if (!fs.existsSync(path.join(directory, "theme.json"))) continue;
    themes.push(validateThemeDirectory(directory));
  }
  if (themes.length === 0) throw new CliError("NO_THEMES_FOUND", 2, `目录中没有有效主题：${source}`);
  return themes.sort((left, right) => left.id.localeCompare(right.id));
}

export function copyThemePayload(sourceDirectory: string, destinationDirectory: string): ThemeDirectory {
  const theme = validateThemeDirectory(sourceDirectory);
  fs.mkdirSync(destinationDirectory, { recursive: true });
  fs.copyFileSync(path.join(theme.source, "theme.json"), path.join(destinationDirectory, "theme.json"));
  for (const filename of CANONICAL_ASSETS) {
    const source = path.join(theme.source, filename);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(destinationDirectory, filename));
  }
  const icons = path.join(theme.source, "icons");
  if (fs.existsSync(icons)) {
    const destinationIcons = path.join(destinationDirectory, "icons");
    fs.mkdirSync(destinationIcons, { recursive: true });
    for (const entry of fs.readdirSync(icons, { withFileTypes: true })) {
      if (!entry.isFile() || !/\.(svg|png|jpe?g)$/i.test(entry.name)) continue;
      fs.copyFileSync(path.join(icons, entry.name), path.join(destinationIcons, entry.name));
    }
  }
  return theme;
}

export function installThemeDirectory(context: CliContext, sourceDirectory: string): InstalledTheme {
  const theme = validateThemeDirectory(sourceDirectory);
  const target = path.join(context.themesDir, theme.id);
  if (path.resolve(theme.source) === path.resolve(target)) return { ...theme, installed: false, target };

  fs.mkdirSync(context.themesDir, { recursive: true });
  const suffix = `${process.pid}-${randomUUID()}`;
  const incoming = path.join(context.themesDir, `.twskin-incoming-${theme.id}-${suffix}`);
  const backup = path.join(context.themesDir, `.twskin-backup-${theme.id}-${suffix}`);
  let movedExisting = false;
  try {
    copyThemePayload(theme.source, incoming);
    validateThemeDirectory(incoming);
    if (fs.existsSync(target)) {
      fs.renameSync(target, backup);
      movedExisting = true;
    }
    fs.renameSync(incoming, target);
    if (movedExisting) fs.rmSync(backup, { recursive: true, force: true });
    return { ...theme, installed: true, target };
  } catch (error) {
    try { fs.rmSync(incoming, { recursive: true, force: true }); } catch {}
    if (movedExisting && !fs.existsSync(target)) {
      try { fs.renameSync(backup, target); } catch {}
    }
    throw error;
  }
}

export function listThemes(context: CliContext): ThemeSummary[] {
  if (!fs.existsSync(context.themesDir)) return [];
  const themes: ThemeSummary[] = [];
  for (const entry of fs.readdirSync(context.themesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const directory = path.join(context.themesDir, entry.name);
    if (!fs.existsSync(path.join(directory, "theme.json"))) continue;
    try {
      const theme = validateThemeDirectory(directory);
      themes.push({ id: theme.id, version: theme.version, name: theme.name, desc: theme.desc });
    } catch (error) {
      themes.push({ id: entry.name, version: "?", name: entry.name, desc: error instanceof Error ? error.message : String(error), invalid: true });
    }
  }
  return themes.sort((left, right) => left.id.localeCompare(right.id));
}
