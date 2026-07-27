import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { CliError } from "./errors.js";
import { discoverThemeDirectories, installThemeDirectory } from "./themes.js";
import { satisfiesRange } from "./semver.js";
import type { CliContext, InstalledTheme } from "./types.js";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name: string;
  assets: ReleaseAsset[];
}

interface ThemePackManifest {
  schemaVersion: number;
  packVersion: string;
  releaseTag?: string;
  compatibleCli: string;
  themes: Array<{ id: string }>;
}

interface DownloadBufferOptions {
  maxBytes: number;
  accept: string;
  notFoundCode?: string;
}

export interface ThemeDownloadResult {
  tag: string;
  digest: string;
  installed: InstalledTheme[];
  directory: string;
}

export interface ThemeDownloadSource {
  archiveUrl: string;
  checksumUrl?: string;
  expectedDigest?: string;
  tag?: string;
  themeIds?: readonly string[];
  themeVersions?: Readonly<Record<string, string>>;
}

const DEFAULT_RELEASE_API = "https://api.github.com/repos/Fullstop000/trae-work-dream-skin/releases/latest";
const DEFAULT_RELEASE_ASSET_BASE_URL = "https://github.com/Fullstop000/trae-work-dream-skin/releases/latest/download";
const LATEST_ASSET_BASENAME = "twskin-themes";
const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
const MAX_CHECKSUM_BYTES = 4096;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const THEME_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;

function downloadHeaders(context: CliContext, url: string, accept: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "twskin-cli",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = context.env.TWSKIN_GITHUB_TOKEN || context.env.GH_TOKEN || context.env.GITHUB_TOKEN;
  try {
    const parsed = new URL(url);
    if (token && parsed.protocol === "https:" && (parsed.hostname === "api.github.com" || parsed.hostname === "github.com")) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // fetch reports malformed URLs using the standard download error path.
  }
  return headers;
}

async function downloadBuffer(context: CliContext, url: string, { maxBytes, accept, notFoundCode = "DOWNLOAD_FAILED" }: DownloadBufferOptions): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: downloadHeaders(context, url, accept),
      redirect: "follow",
      signal: controller.signal,
    });
    if (response.status === 404) throw new CliError(notFoundCode, 4, "GitHub Release 或主题资产不存在。", "确认仓库已发布包含主题包的 Release。");
    if (!response.ok) throw new CliError("DOWNLOAD_FAILED", 4, `下载失败：HTTP ${response.status}`, "稍后重试，或检查 GitHub 网络连接。");
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > maxBytes) throw new CliError("DOWNLOAD_TOO_LARGE", 4, `下载内容超过 ${Math.floor(maxBytes / 1024 / 1024) || 1} MB 限制。`);

    if (!response.body) throw new CliError("DOWNLOAD_FAILED", 4, "下载响应没有内容。", "稍后重试。");
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of response.body) {
      total += chunk.byteLength;
      if (total > maxBytes) throw new CliError("DOWNLOAD_TOO_LARGE", 4, "下载内容超过安全大小限制。");
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks, total);
  } catch (error) {
    if (error instanceof CliError) throw error;
    const message = error instanceof Error && error.name === "AbortError"
      ? "下载超时。"
      : `下载失败：${error instanceof Error ? error.message : String(error)}`;
    throw new CliError("DOWNLOAD_FAILED", 4, message, "检查 GitHub 网络连接后重试。");
  } finally {
    clearTimeout(timeout);
  }
}

function releaseAsset(release: GithubRelease, filename: string): ReleaseAsset | undefined {
  return release.assets?.find((asset) => asset?.name === filename && typeof asset.browser_download_url === "string");
}

async function readLatestRelease(context: CliContext): Promise<GithubRelease> {
  const apiUrl = context.env.TWSKIN_RELEASE_API_URL || DEFAULT_RELEASE_API;
  const content = await downloadBuffer(context, apiUrl, {
    maxBytes: 2 * 1024 * 1024,
    accept: "application/vnd.github+json",
    notFoundCode: "RELEASE_NOT_FOUND",
  });
  let release: unknown;
  try { release = JSON.parse(content.toString("utf8")); }
  catch (error) { throw new CliError("RELEASE_INVALID", 4, "GitHub Release 元数据无法解析。", "稍后重试。", error instanceof Error ? error.message : String(error)); }
  if (!release || typeof release !== "object" || !("tag_name" in release) || typeof release.tag_name !== "string" || !("assets" in release) || !Array.isArray(release.assets)) {
    throw new CliError("RELEASE_INVALID", 4, "GitHub Release 元数据不完整。");
  }
  return release as GithubRelease;
}

interface SelectedAssets {
  tag?: string;
  base: string;
  archive: ReleaseAsset;
  checksum: ReleaseAsset;
}

function selectReleaseAssets(release: GithubRelease): SelectedAssets {
  const tag = release.tag_name;
  const base = `twskin-themes-${tag}`;
  const archive = releaseAsset(release, `${base}.tar.gz`);
  const checksum = releaseAsset(release, `${base}.sha256`);
  if (!archive || !checksum) {
    throw new CliError(
      "RELEASE_ASSET_MISSING",
      4,
      `Release ${tag} 缺少官方主题包或 SHA-256 文件。`,
      `需要 ${base}.tar.gz 和 ${base}.sha256。`,
    );
  }
  return { tag, base, archive, checksum };
}

async function selectAssets(context: CliContext): Promise<SelectedAssets> {
  if (context.env.TWSKIN_RELEASE_API_URL) {
    return selectReleaseAssets(await readLatestRelease(context));
  }
  const baseUrl = (context.env.TWSKIN_RELEASE_ASSET_BASE_URL || DEFAULT_RELEASE_ASSET_BASE_URL).replace(/\/+$/, "");
  return {
    base: LATEST_ASSET_BASENAME,
    archive: {
      name: `${LATEST_ASSET_BASENAME}.tar.gz`,
      browser_download_url: `${baseUrl}/${LATEST_ASSET_BASENAME}.tar.gz`,
    },
    checksum: {
      name: `${LATEST_ASSET_BASENAME}.sha256`,
      browser_download_url: `${baseUrl}/${LATEST_ASSET_BASENAME}.sha256`,
    },
  };
}

function archiveEntries(context: CliContext, archiveFile: string, verbose = false): string[] {
  const result = spawnSync("/usr/bin/tar", [verbose ? "-tvzf" : "-tzf", archiveFile], {
    cwd: path.dirname(archiveFile),
    env: context.env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new CliError("ARCHIVE_INVALID", 4, "主题包不是有效的 tar.gz 文件。", "重新下载官方 Release 资产。", result.stderr.trim());
  }
  return result.stdout.split("\n").filter(Boolean);
}

function validateArchive(context: CliContext, archiveFile: string): void {
  const entries = archiveEntries(context, archiveFile);
  if (!entries.includes("theme-pack.json")) throw new CliError("ARCHIVE_INVALID", 4, "主题包缺少 theme-pack.json。");
  for (const raw of entries) {
    const entry = raw.replace(/\/$/, "");
    if (!entry || entry.includes("\\") || entry.startsWith("/") || entry.split("/").includes("..")) {
      throw new CliError("ARCHIVE_UNSAFE", 4, `主题包包含不安全路径：${raw}`);
    }
    if (entry === "theme-pack.json" || entry === "themes") continue;
    const parts = entry.split("/");
    if (parts[0] !== "themes" || parts.length < 2 || !THEME_ID.test(parts[1]!)) {
      throw new CliError("ARCHIVE_UNSAFE", 4, `主题包包含协议外路径：${raw}`);
    }
  }
  for (const line of archiveEntries(context, archiveFile, true)) {
    if (line[0] !== "-" && line[0] !== "d") {
      throw new CliError("ARCHIVE_UNSAFE", 4, "主题包中不允许符号链接、硬链接或特殊文件。");
    }
  }
}

function compatibleCli(range: string, currentVersion: string): boolean {
  return satisfiesRange(range, currentVersion);
}

function parsePackManifest(directory: string, expectedTag: string | undefined, cliVersion: string): ThemePackManifest {
  const file = path.join(directory, "theme-pack.json");
  let manifest: unknown;
  try { manifest = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { throw new CliError("THEME_PACK_INVALID", 4, "theme-pack.json 无法解析。", "重新下载官方主题包。", error instanceof Error ? error.message : String(error)); }
  if (!manifest || typeof manifest !== "object" || !("schemaVersion" in manifest) || manifest.schemaVersion !== 1 || !("themes" in manifest) || !Array.isArray(manifest.themes)) {
    throw new CliError("THEME_PACK_INVALID", 4, "不支持的主题包协议。", "升级 CLI 或下载兼容的主题包。");
  }
  const pack = manifest as Partial<ThemePackManifest>;
  if (!pack.packVersion || !pack.compatibleCli || !pack.themes || pack.themes.some((theme) => !theme || !THEME_ID.test(theme.id || ""))) {
    throw new CliError("THEME_PACK_INVALID", 4, "主题包清单字段不完整。");
  }
  if (expectedTag && pack.releaseTag && pack.releaseTag !== expectedTag) {
    throw new CliError("THEME_PACK_INVALID", 4, `主题包版本与 Release 标签不一致：${pack.releaseTag} / ${expectedTag}`);
  }
  if (!compatibleCli(pack.compatibleCli, cliVersion)) {
    throw new CliError(
      "THEME_PACK_INCOMPATIBLE",
      4,
      `主题包 ${pack.packVersion} 不兼容当前 CLI ${cliVersion}。`,
      `需要 CLI ${pack.compatibleCli}。`,
    );
  }
  return pack as ThemePackManifest;
}

function extractArchive(context: CliContext, archiveFile: string, directory: string): void {
  const result = spawnSync("/usr/bin/tar", ["-xzf", archiveFile, "-C", directory], {
    cwd: path.dirname(archiveFile),
    env: context.env,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new CliError("ARCHIVE_INVALID", 4, "主题包解压失败。", "重新下载官方 Release 资产。", result.stderr.trim());
}

export async function downloadThemes(context: CliContext, requestedId?: string, source?: ThemeDownloadSource): Promise<ThemeDownloadResult> {
  if (requestedId && !THEME_ID.test(requestedId)) throw new CliError("THEME_ID_INVALID", 2, `主题 ID 不合法：${requestedId}`);
  if (source?.themeIds?.some((id) => !THEME_ID.test(id))) throw new CliError("THEME_ID_INVALID", 2, "Catalog 中包含不合法的主题 ID。");
  const selected = source
    ? {
      tag: source.tag,
      base: "twskin-catalog",
      archive: { name: "theme-pack.tar.gz", browser_download_url: source.archiveUrl },
      checksum: source.checksumUrl ? { name: "theme-pack.sha256", browser_download_url: source.checksumUrl } : undefined,
    }
    : await selectAssets(context);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "twskin-theme-download-"));
  try {
    const [archiveContent, checksumContent] = await Promise.all([
      downloadBuffer(context, selected.archive.browser_download_url, { maxBytes: MAX_ARCHIVE_BYTES, accept: "application/octet-stream" }),
      selected.checksum
        ? downloadBuffer(context, selected.checksum.browser_download_url, { maxBytes: MAX_CHECKSUM_BYTES, accept: "text/plain" })
        : Promise.resolve(null),
    ]);
    const checksumDigest = checksumContent?.toString("utf8").match(/\b([a-f0-9]{64})\b/i)?.[1]?.toLowerCase();
    const expectedDigest = source?.expectedDigest?.toLowerCase() || checksumDigest;
    if (!expectedDigest) throw new CliError("CHECKSUM_INVALID", 4, "主题包 SHA-256 文件格式无效。");
    if (source?.expectedDigest && !/^[a-f0-9]{64}$/i.test(source.expectedDigest)) {
      throw new CliError("CHECKSUM_INVALID", 4, "Catalog 中的主题包 SHA-256 无效。");
    }
    if (source?.expectedDigest && checksumDigest && source.expectedDigest.toLowerCase() !== checksumDigest) {
      throw new CliError("CHECKSUM_MISMATCH", 4, "Catalog 与主题包 SHA-256 文件不一致。", "请稍后重试；不要安装该主题包。");
    }
    const actualDigest = crypto.createHash("sha256").update(archiveContent).digest("hex");
    if (actualDigest !== expectedDigest) throw new CliError("CHECKSUM_MISMATCH", 4, "主题包 SHA-256 校验失败。", "请勿使用该文件；稍后重新下载。");

    const archiveFile = path.join(temporary, `${selected.base}.tar.gz`);
    fs.writeFileSync(archiveFile, archiveContent, { mode: 0o600 });
    validateArchive(context, archiveFile);
    const extracted = path.join(temporary, "extracted");
    fs.mkdirSync(extracted);
    extractArchive(context, archiveFile, extracted);
    const pack = parsePackManifest(extracted, selected.tag, context.packageVersion);
    const releaseTag = selected.tag || pack.releaseTag;
    if (!releaseTag) throw new CliError("THEME_PACK_INVALID", 4, "主题包清单缺少 releaseTag。");
    const discovered = discoverThemeDirectories(path.join(extracted, "themes"));
    const declared = new Set(pack.themes.map((theme) => theme.id));
    const found = new Set(discovered.map((theme) => theme.id));
    if (declared.size !== pack.themes.length || declared.size !== found.size || discovered.some((theme) => !declared.has(theme.id))) {
      throw new CliError("THEME_PACK_INVALID", 4, "主题包内容与 theme-pack.json 不一致。");
    }
    const allowed = source?.themeIds ? new Set(source.themeIds) : null;
    const chosen = requestedId
      ? discovered.filter((theme) => theme.id === requestedId)
      : allowed ? discovered.filter((theme) => allowed.has(theme.id)) : discovered;
    if (chosen.length === 0) throw new CliError("THEME_NOT_FOUND", 2, `Release ${releaseTag} 中找不到主题：${requestedId}`);
    if (source?.themeVersions) {
      for (const theme of chosen) {
        const expectedVersion = source.themeVersions[theme.id];
        if (!expectedVersion || theme.version !== expectedVersion) {
          throw new CliError("CATALOG_THEME_MISMATCH", 4, `主题 ${theme.id} 的版本与 Catalog 不一致。`, "请稍后重试；不要安装该主题包。");
        }
      }
    }
    const installed = chosen.map((theme) => installThemeDirectory(context, theme.source));
    return { tag: releaseTag, digest: actualDigest, installed, directory: context.themesDir };
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
