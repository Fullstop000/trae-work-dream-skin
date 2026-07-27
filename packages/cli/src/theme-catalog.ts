import fs from "node:fs";
import path from "node:path";
import { CliError } from "./errors.js";
import { withLock } from "./lock.js";
import { compareVersionStrings, isCompatibleRange, isVersion, satisfiesRange } from "./semver.js";
import { atomicWrite } from "./system.js";
import { downloadThemes } from "./theme-download.js";
import { listThemes } from "./themes.js";
import type { CliContext } from "./types.js";

const DEFAULT_RELEASE_ASSET_BASE_URL = "https://github.com/Fullstop000/trae-work-dream-skin/releases/latest/download";
const DEFAULT_RELEASE_DOWNLOAD_BASE_URL = "https://github.com/Fullstop000/trae-work-dream-skin/releases/download";
const CATALOG_MAX_BYTES = 512 * 1024;
const CATALOG_TIMEOUT_MS = 10_000;
const DEFAULT_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const RETRY_INTERVAL_MS = 15 * 60 * 1000;
const THEME_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SHA256 = /^[a-f0-9]{64}$/i;

export type ThemeSyncPhase = "idle" | "checking" | "update-available" | "downloading" | "installing" | "success" | "fresh" | "error";

export interface ThemeCatalogEntry {
  id: string;
  version: string;
  schemaVersion: number;
  engines: { twskin: string };
  name: string;
  desc: string;
  category: string;
}

export interface ThemeCatalog {
  schemaVersion: 1;
  catalogVersion: string;
  releaseTag: string;
  compatibleCli: string;
  generatedAt: string;
  pack: { asset: string; checksumAsset: string; size: number; sha256: string };
  themes: ThemeCatalogEntry[];
}

export interface ThemeUpdate {
  id: string;
  name: string;
  version: string;
  kind: "new" | "update";
}

export interface ThemeCheckResult {
  catalog: ThemeCatalog;
  updates: ThemeUpdate[];
  newThemes: number;
  updatedThemes: number;
  incompatibleThemes: number;
  checkedFrom: "network" | "cache";
  lastCheckedAt?: string;
}

export interface ThemeSyncState {
  schemaVersion: 1;
  phase: ThemeSyncPhase;
  autoUpdateThemes: boolean;
  catalogVersion?: string;
  lastCheckedAt?: string;
  lastSuccessfulSyncAt?: string;
  updateCount: number;
  newThemes: number;
  updatedThemes: number;
  incompatibleThemes: number;
  installed?: string[];
  message?: string;
}

interface CatalogState {
  schemaVersion: 1;
  etag?: string;
  lastCheckedAt?: string;
  lastAttemptAt?: string;
  lastError?: string;
  catalogVersion?: string;
}

interface UpdateSettings {
  schemaVersion: 1;
  autoUpdateThemes: boolean;
}

interface FetchedCatalog {
  catalog: ThemeCatalog;
  source: "network" | "cache";
  lastCheckedAt?: string;
}

function assetBaseUrl(context: CliContext): string {
  return (context.env.TWSKIN_RELEASE_ASSET_BASE_URL || DEFAULT_RELEASE_ASSET_BASE_URL).replace(/\/+$/, "");
}

function catalogUrl(context: CliContext): string {
  return context.env.TWSKIN_THEME_CATALOG_URL || `${assetBaseUrl(context)}/twskin-catalog-v1.json`;
}

function catalogAssetUrl(context: CliContext, catalog: ThemeCatalog, asset: string): string {
  const configuredBase = context.env.TWSKIN_RELEASE_ASSET_BASE_URL;
  if (configuredBase) return `${configuredBase.replace(/\/+$/, "")}/${asset}`;
  return `${DEFAULT_RELEASE_DOWNLOAD_BASE_URL}/${encodeURIComponent(catalog.releaseTag)}/${asset}`;
}

function downloadHeaders(context: CliContext, url: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "twskin-cli" };
  const token = context.env.TWSKIN_GITHUB_TOKEN || context.env.GH_TOKEN || context.env.GITHUB_TOKEN;
  try {
    const parsed = new URL(url);
    if (token && parsed.protocol === "https:" && (parsed.hostname === "api.github.com" || parsed.hostname === "github.com")) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

function readJson<T>(file: string): T | null {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) as T; } catch { return null; }
}

function readCatalogState(context: CliContext): CatalogState {
  const value = readJson<Partial<CatalogState>>(context.paths.catalogState);
  return value?.schemaVersion === 1 ? { ...value, schemaVersion: 1 } : { schemaVersion: 1 };
}

function writeCatalogState(context: CliContext, state: CatalogState): void {
  atomicWrite(context.paths.catalogState, `${JSON.stringify(state, null, 2)}\n`);
}

export function readThemeUpdateSettings(context: CliContext): UpdateSettings {
  const value = readJson<Partial<UpdateSettings>>(context.paths.themeUpdateSettings);
  return {
    schemaVersion: 1,
    autoUpdateThemes: typeof value?.autoUpdateThemes === "boolean" ? value.autoUpdateThemes : true,
  };
}

export function setThemeAutoUpdate(context: CliContext, autoUpdateThemes: boolean): UpdateSettings {
  const settings = { schemaVersion: 1 as const, autoUpdateThemes };
  atomicWrite(context.paths.themeUpdateSettings, `${JSON.stringify(settings, null, 2)}\n`);
  const state = readThemeSyncState(context);
  writeThemeSyncState(context, { ...state, autoUpdateThemes });
  return settings;
}

export function readThemeSyncState(context: CliContext): ThemeSyncState {
  const value = readJson<Partial<ThemeSyncState>>(context.paths.themeSyncState);
  const settings = readThemeUpdateSettings(context);
  if (value?.schemaVersion === 1 && typeof value.phase === "string") {
    return {
      schemaVersion: 1,
      phase: value.phase as ThemeSyncPhase,
      autoUpdateThemes: settings.autoUpdateThemes,
      updateCount: Number(value.updateCount || 0),
      newThemes: Number(value.newThemes || 0),
      updatedThemes: Number(value.updatedThemes || 0),
      incompatibleThemes: Number(value.incompatibleThemes || 0),
      ...(typeof value.catalogVersion === "string" ? { catalogVersion: value.catalogVersion } : {}),
      ...(typeof value.lastCheckedAt === "string" ? { lastCheckedAt: value.lastCheckedAt } : {}),
      ...(typeof value.lastSuccessfulSyncAt === "string" ? { lastSuccessfulSyncAt: value.lastSuccessfulSyncAt } : {}),
      ...(Array.isArray(value.installed) ? { installed: value.installed.filter((id): id is string => typeof id === "string") } : {}),
      ...(typeof value.message === "string" ? { message: value.message } : {}),
    };
  }
  return { schemaVersion: 1, phase: "idle", autoUpdateThemes: settings.autoUpdateThemes, updateCount: 0, newThemes: 0, updatedThemes: 0, incompatibleThemes: 0 };
}

function writeThemeSyncState(context: CliContext, state: ThemeSyncState): void {
  atomicWrite(context.paths.themeSyncState, `${JSON.stringify(state, null, 2)}\n`);
}

function validateCatalog(value: unknown): ThemeCatalog {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CliError("CATALOG_INVALID", 4, "主题 Catalog 不是有效对象。");
  const catalog = value as Partial<ThemeCatalog>;
  if (catalog.schemaVersion !== 1 || !isVersion(catalog.catalogVersion) || typeof catalog.releaseTag !== "string" || !isCompatibleRange(catalog.compatibleCli)) {
    throw new CliError("CATALOG_INVALID", 4, "主题 Catalog 的版本字段不完整或不支持。");
  }
  if (!catalog.pack || typeof catalog.pack !== "object" || !Array.isArray(catalog.themes)) {
    throw new CliError("CATALOG_INVALID", 4, "主题 Catalog 缺少主题包或主题列表。");
  }
  const pack = catalog.pack as Partial<ThemeCatalog["pack"]>;
  const packSize = Number(pack.size);
  if (
    typeof pack.asset !== "string" || !/^[A-Za-z0-9._-]+\.tar\.gz$/.test(pack.asset)
    || typeof pack.checksumAsset !== "string" || !/^[A-Za-z0-9._-]+\.sha256$/.test(pack.checksumAsset)
    || !Number.isInteger(packSize) || packSize < 1 || packSize > 128 * 1024 * 1024
    || typeof pack.sha256 !== "string" || !SHA256.test(pack.sha256)
  ) throw new CliError("CATALOG_INVALID", 4, "主题 Catalog 的主题包信息无效。");

  const ids = new Set<string>();
  for (const theme of catalog.themes) {
    if (!theme || typeof theme !== "object") throw new CliError("CATALOG_INVALID", 4, "主题 Catalog 包含无效主题。");
    const entry = theme as Partial<ThemeCatalogEntry>;
    if (
      typeof entry.id !== "string" || !THEME_ID.test(entry.id) || ids.has(entry.id)
      || !isVersion(entry.version) || !Number.isInteger(entry.schemaVersion) || Number(entry.schemaVersion) < 1
      || !entry.engines || typeof entry.engines !== "object" || !isCompatibleRange(entry.engines.twskin)
      || typeof entry.name !== "string" || typeof entry.desc !== "string" || typeof entry.category !== "string"
    ) throw new CliError("CATALOG_INVALID", 4, "主题 Catalog 包含无效主题元数据。");
    ids.add(entry.id);
  }
  return catalog as ThemeCatalog;
}

function cachedCatalog(context: CliContext): ThemeCatalog | null {
  const catalog = readJson<unknown>(context.paths.catalogCache);
  try { return validateCatalog(catalog); } catch { return null; }
}

function checkInterval(context: CliContext): number {
  const configured = Number(context.env.TWSKIN_CATALOG_CHECK_INTERVAL_MS || DEFAULT_CHECK_INTERVAL_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_CHECK_INTERVAL_MS;
}

function canUseCache(context: CliContext, state: CatalogState, cached: ThemeCatalog | null, force: boolean): boolean {
  if (force || !cached) return false;
  const now = Date.now();
  const successful = Date.parse(state.lastCheckedAt || "");
  if (Number.isFinite(successful) && now - successful < checkInterval(context)) return true;
  const attempted = Date.parse(state.lastAttemptAt || "");
  return Boolean(state.lastError && Number.isFinite(attempted) && now - attempted < RETRY_INTERVAL_MS);
}

async function fetchCatalog(context: CliContext, force = false): Promise<FetchedCatalog> {
  const state = readCatalogState(context);
  const cached = cachedCatalog(context);
  if (canUseCache(context, state, cached, force)) {
    return { catalog: cached!, source: "cache", ...(state.lastCheckedAt ? { lastCheckedAt: state.lastCheckedAt } : {}) };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS);
  const url = catalogUrl(context);
  try {
    const headers = downloadHeaders(context, url);
    if (state.etag) headers["If-None-Match"] = state.etag;
    let response = await fetch(url, { headers, redirect: "follow", signal: controller.signal });
    if (response.status === 304 && !cached) {
      // An ETag without a valid cache can survive manual cleanup or a stricter
      // validator after a CLI upgrade. Refetch without it to self-heal.
      delete state.etag;
      response = await fetch(url, { headers: downloadHeaders(context, url), redirect: "follow", signal: controller.signal });
    }
    if (response.status === 304 && cached) {
      const checkedAt = new Date().toISOString();
      const nextState = { ...state, lastAttemptAt: checkedAt, lastCheckedAt: checkedAt };
      delete nextState.lastError;
      writeCatalogState(context, nextState);
      return { catalog: cached, source: "cache", lastCheckedAt: checkedAt };
    }
    if (!response.ok) throw new CliError("CATALOG_DOWNLOAD_FAILED", 4, `下载主题 Catalog 失败：HTTP ${response.status}`, "稍后重试，或检查 GitHub 网络连接。");
    const length = Number(response.headers.get("content-length") || 0);
    if (length > CATALOG_MAX_BYTES) throw new CliError("CATALOG_TOO_LARGE", 4, "主题 Catalog 超过安全大小限制。");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > CATALOG_MAX_BYTES) throw new CliError("CATALOG_TOO_LARGE", 4, "主题 Catalog 超过安全大小限制。");
    let catalog: ThemeCatalog;
    try { catalog = validateCatalog(JSON.parse(Buffer.from(bytes).toString("utf8"))); }
    catch (error) {
      if (error instanceof CliError) throw error;
      throw new CliError("CATALOG_INVALID", 4, "主题 Catalog 无法解析。", "稍后重试。", error instanceof Error ? error.message : String(error));
    }
    const checkedAt = new Date().toISOString();
    atomicWrite(context.paths.catalogCache, `${JSON.stringify(catalog, null, 2)}\n`);
    writeCatalogState(context, {
      schemaVersion: 1,
      ...(response.headers.get("etag") ? { etag: response.headers.get("etag")! } : {}),
      lastAttemptAt: checkedAt,
      lastCheckedAt: checkedAt,
      catalogVersion: catalog.catalogVersion,
    });
    return { catalog, source: "network", lastCheckedAt: checkedAt };
  } catch (error) {
    const message = error instanceof CliError ? error.message : error instanceof Error && error.name === "AbortError" ? "下载主题 Catalog 超时。" : `下载主题 Catalog 失败：${error instanceof Error ? error.message : String(error)}`;
    writeCatalogState(context, { ...state, lastAttemptAt: new Date().toISOString(), lastError: message });
    throw error instanceof CliError ? error : new CliError("CATALOG_DOWNLOAD_FAILED", 4, message, "稍后重试，或检查 GitHub 网络连接。");
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkThemeUpdates(context: CliContext, { force = false }: { force?: boolean } = {}): Promise<ThemeCheckResult> {
  const fetched = await fetchCatalog(context, force);
  if (!satisfiesRange(fetched.catalog.compatibleCli, context.packageVersion)) {
    throw new CliError("CATALOG_INCOMPATIBLE", 4, `主题 Catalog ${fetched.catalog.catalogVersion} 不兼容当前 CLI ${context.packageVersion}。`, `需要 CLI ${fetched.catalog.compatibleCli}。`);
  }
  const installed = new Map(listThemes(context).filter((theme) => !theme.invalid).map((theme) => [theme.id, theme]));
  const updates: ThemeUpdate[] = [];
  let newThemes = 0;
  let updatedThemes = 0;
  let incompatibleThemes = 0;
  for (const theme of fetched.catalog.themes) {
    if (!satisfiesRange(theme.engines.twskin, context.packageVersion)) {
      incompatibleThemes += 1;
      continue;
    }
    const local = installed.get(theme.id);
    if (!local) {
      updates.push({ id: theme.id, name: theme.name, version: theme.version, kind: "new" });
      newThemes += 1;
      continue;
    }
    const comparison = compareVersionStrings(theme.version, local.version);
    if (comparison === null) throw new CliError("THEME_VERSION_INVALID", 4, `本地主题版本无效：${theme.id}`);
    if (comparison > 0) {
      updates.push({ id: theme.id, name: theme.name, version: theme.version, kind: "update" });
      updatedThemes += 1;
    }
  }
  return {
    catalog: fetched.catalog,
    updates,
    newThemes,
    updatedThemes,
    incompatibleThemes,
    checkedFrom: fetched.source,
    ...(fetched.lastCheckedAt ? { lastCheckedAt: fetched.lastCheckedAt } : {}),
  };
}

function stateForCheck(context: CliContext, phase: ThemeSyncPhase, check: ThemeCheckResult, extra: Partial<ThemeSyncState> = {}): ThemeSyncState {
  const previous = readThemeSyncState(context);
  return {
    schemaVersion: 1,
    phase,
    autoUpdateThemes: readThemeUpdateSettings(context).autoUpdateThemes,
    catalogVersion: check.catalog.catalogVersion,
    ...(check.lastCheckedAt ? { lastCheckedAt: check.lastCheckedAt } : previous.lastCheckedAt ? { lastCheckedAt: previous.lastCheckedAt } : {}),
    ...(previous.lastSuccessfulSyncAt ? { lastSuccessfulSyncAt: previous.lastSuccessfulSyncAt } : {}),
    ...(previous.installed ? { installed: previous.installed } : {}),
    updateCount: check.updates.length,
    newThemes: check.newThemes,
    updatedThemes: check.updatedThemes,
    incompatibleThemes: check.incompatibleThemes,
    ...extra,
  };
}

export async function checkThemesAndRecordState(context: CliContext, { force = false }: { force?: boolean } = {}): Promise<ThemeCheckResult> {
  writeThemeSyncState(context, { ...readThemeSyncState(context), phase: "checking", message: "正在检查主题更新" });
  try {
    const check = await checkThemeUpdates(context, { force });
    writeThemeSyncState(context, stateForCheck(context, check.updates.length ? "update-available" : "fresh", check));
    return check;
  } catch (error) {
    writeThemeSyncState(context, { ...readThemeSyncState(context), phase: "error", message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function syncThemes(context: CliContext, { force = false, install }: { force?: boolean; install?: boolean } = {}): Promise<ThemeSyncState> {
  const check = await checkThemesAndRecordState(context, { force });
  const settings = readThemeUpdateSettings(context);
  const shouldInstall = install ?? settings.autoUpdateThemes;
  if (!check.updates.length || !shouldInstall) return readThemeSyncState(context);

  const downloading = stateForCheck(context, "downloading", check, { message: "正在下载并校验主题包" });
  writeThemeSyncState(context, downloading);
  try {
    const result = await downloadThemes(context, undefined, {
      archiveUrl: catalogAssetUrl(context, check.catalog, check.catalog.pack.asset),
      checksumUrl: catalogAssetUrl(context, check.catalog, check.catalog.pack.checksumAsset),
      expectedDigest: check.catalog.pack.sha256,
      tag: check.catalog.releaseTag,
      themeIds: check.updates.map((theme) => theme.id),
      themeVersions: Object.fromEntries(check.updates.map((theme) => [theme.id, theme.version])),
    });
    const installed = result.installed.map((theme) => theme.id);
    const next = stateForCheck(context, "success", check, {
      installed,
      lastSuccessfulSyncAt: new Date().toISOString(),
      updateCount: 0,
      newThemes: 0,
      updatedThemes: 0,
      message: installed.length ? `已更新 ${installed.length} 套主题` : "主题已是最新",
    });
    writeThemeSyncState(context, next);
    return next;
  } catch (error) {
    const failed = stateForCheck(context, "error", check, { message: error instanceof Error ? error.message : String(error) });
    writeThemeSyncState(context, failed);
    throw error;
  }
}

export async function checkThemesCommandState(context: CliContext, force = false): Promise<ThemeCheckResult> {
  return withLock(context, "theme-check", () => checkThemesAndRecordState(context, { force }));
}

export async function syncThemesCommandState(context: CliContext, force = false): Promise<ThemeSyncState> {
  return withLock(context, "theme-sync", () => syncThemes(context, { force, install: true }));
}

export async function autoSyncThemesCommandState(context: CliContext, force = false): Promise<ThemeSyncState> {
  return withLock(context, "theme-auto-sync", () => syncThemes(context, { force }));
}
