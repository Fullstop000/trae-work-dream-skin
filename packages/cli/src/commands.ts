import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import * as p from "@clack/prompts";
import { CliError } from "./errors.js";
import { withLock } from "./lock.js";
import { emit } from "./output.js";
import {
  appRunning,
  cdpVersion,
  commandResult,
  commandText,
  managerStatus,
  portOwner,
  readPort,
  resolveAppBundle,
  runInjector,
  runScript,
  startWatcher,
  stopWatcher,
  verifyRuntimeIntegrity,
  watcherStatus,
} from "./system.js";
import { discoverThemeDirectories, installThemeDirectory, listThemes, readTheme, writeTheme } from "./themes.js";
import { MIN_NODE_MAJOR } from "./context.js";
import { downloadThemes } from "./theme-download.js";
import type { ThemeDownloadResult } from "./theme-download.js";
import { autoSyncThemesCommandState, checkThemesCommandState, readThemeSyncState, setThemeAutoUpdate, syncThemesCommandState } from "./theme-catalog.js";
import { disablePersistentCdp, enablePersistentCdp } from "./persistent-cdp.js";
import type { CliContext, CliOptions } from "./types.js";

interface DoctorCheck {
  id: string;
  level: "pass" | "warn" | "fail";
  message: string;
  detail: string;
}

function interactive(options: CliOptions): boolean {
  return !options.json && !options.dryRun && Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function emitDryRun(payload: Record<string, unknown>, human: string, options: CliOptions): void {
  emit({ ...payload, dryRun: true }, `演练模式：${human}`, options.json);
}

function emitStartResult(
  payload: Record<string, unknown>,
  title: string,
  message: string,
  outro: string,
  options: CliOptions,
): void {
  if (options.json || !interactive(options)) {
    emit(payload, `${title}\n\n${message}`, options.json);
    return;
  }
  p.note(message, title);
  p.outro(outro);
}

function emitStartProgress(
  options: CliOptions,
  level: "info" | "success" | "warning",
  message: string,
): void {
  if (options.json || options.dryRun) return;
  const marker = level === "success" ? "✓" : level === "warning" ? "!" : "→";
  process.stderr.write(`${marker} ${message}\n`);
}

function injectedTargets(output: string): string {
  const match = output.match(/injected\s+(\d+)\/(\d+)\s+target\(s\)/);
  return match ? `${match[1]}/${match[2]} 个页面` : "已完成";
}

function persistentCdpMessage(result: { managed: boolean; changed: boolean; port: number }): string {
  if (!result.managed) return `持久 CDP 已由现有用户配置提供 · 端口 ${result.port}`;
  return result.changed
    ? `持久 CDP 已写入 · 端口 ${result.port}`
    : `持久 CDP 配置已确认 · 端口 ${result.port}`;
}

function startSummary(context: CliContext): { theme: string; autoUpdateThemes: boolean; message: string } {
  const theme = readTheme(context);
  const autoUpdateThemes = readThemeSyncState(context).autoUpdateThemes;
  return {
    theme,
    autoUpdateThemes,
    message: `当前主题：${theme}`,
  };
}

async function downloadWithProgress(context: CliContext, requestedId: string | undefined, options: CliOptions): Promise<ThemeDownloadResult> {
  if (!interactive(options)) return downloadThemes(context, requestedId);
  const progress = p.spinner();
  progress.start("正在下载并校验官方主题包");
  try {
    const result = await downloadThemes(context, requestedId);
    progress.stop(`主题包 ${result.tag} 已校验并安装`);
    return result;
  } catch (error) {
    progress.stop("主题下载失败");
    throw error;
  }
}

export function helpText(context: CliContext): string {
  return `TRAE Work Skin ${context.packageVersion}

Usage:
  twskin start [--yes]         初始化并启动 Theme Manager 与守护进程
  twskin stop                  停止 Skin 并恢复原生外观（不退出 TRAE）
  twskin status [--json]       查看 App、CDP、守护进程和当前主题
  twskin themes [--json]       列出本地主题
  twskin theme <id>            切换主题
  twskin theme download [id]   从最新 GitHub Release 下载全部或指定主题
  twskin theme check           检查官方主题 Catalog
  twskin theme sync            下载并安装所有可用主题更新
  twskin theme auto-update <on|off> 设置官方主题自动更新
  twskin theme load <directory> 从本地目录加载一个或多个主题
  twskin doctor [--json]       检查 Node、TRAE、端口和文件完整性
  twskin restore               恢复 TRAE 原生外观
  twskin uninstall [--yes]     恢复外观并卸载 TRAE Work Skin
  twskin version, -V, --version 显示版本
  twskin help                  显示帮助

Global options:
  --json                       输出 JSON
  --dry-run, --dryrun          仅显示执行计划，不修改系统
`;
}

export async function getStatus(context: CliContext) {
  const port = readPort(context);
  const appBundle = resolveAppBundle(context);
  const cdp = await cdpVersion(port);
  const owner = portOwner(context, port);
  const watcher = watcherStatus(context);
  const theme = readTheme(context);
  return {
    app: { installed: fs.existsSync(appBundle), running: appRunning(context, appBundle), bundle: appBundle },
    cdp: {
      reachable: Boolean(cdp),
      port,
      browser: cdp?.Browser || null,
      owner: owner ? { ...owner, expected: owner.command.includes(context.app.processMatch) } : null,
    },
    watcher: { pid: watcher.pid, running: watcher.alive && watcher.expected, pidAlive: watcher.alive },
    theme: { id: theme, valid: listThemes(context).some((item) => item.id === theme) },
    themeUpdates: readThemeSyncState(context),
    version: context.packageVersion,
    distribution: context.distribution,
  };
}

export async function startCommand(context: CliContext, options: CliOptions): Promise<void> {
  if (options.dryRun) {
    const themesInstalled = listThemes(context).some((theme) => !theme.invalid);
    const port = readPort(context);
    const cdpReachable = Boolean(await cdpVersion(port));
    const appBundle = resolveAppBundle(context);
    const owner = cdpReachable ? null : portOwner(context, port);
    const actions = [
      ...(themesInstalled ? [] : ["download_official_themes"]),
      cdpReachable ? "refresh_theme_manager" : "launch_trae_with_cdp",
      "start_watcher",
      "enable_persistent_cdp",
    ];
    emitDryRun(
      { command: "start", plan: { actions, mode: cdpReachable ? "refresh" : "launch", port, appBundle, themesInstalled, portOwner: owner } },
      `不会下载主题、启动 TRAE 或写入配置；将以 ${cdpReachable ? "刷新" : "启动"} 模式执行 ${actions.join("、")}。`,
      options,
    );
    return;
  }
  await withLock(context, "start", async () => {
    let bootstrap = null;
    const validThemes = listThemes(context).filter((theme) => !theme.invalid);
    if (validThemes.length === 0) {
      emitStartProgress(options, "info", "未检测到有效本地主题 · 准备下载官方主题包");
      await confirmThemeDownload(options, context.themesDir);
      bootstrap = await downloadWithProgress(context, undefined, options);
      emitStartProgress(options, "success", `官方主题已安装 · ${bootstrap.installed.length} 套`);
    } else {
      emitStartProgress(options, "success", `主题目录已就绪 · ${validThemes.length} 个有效主题`);
    }
    const port = readPort(context);
    const appBundle = resolveAppBundle(context);
    const cdp = await cdpVersion(port);
    if (cdp) {
      emitStartProgress(options, "success", `CDP 可用 · 127.0.0.1:${port}`);
      const watcherBefore = watcherStatus(context);
      const watcherMatchesConfiguration = watcherBefore.command.includes(`--port ${port}`)
        && watcherBefore.command.includes(`--themes ${context.themesDir}`)
        && watcherBefore.command.includes(path.join(context.runtimeRoot, "injector.mjs"));
      const managerBefore = !bootstrap && watcherBefore.alive && watcherBefore.expected && watcherMatchesConfiguration
        ? managerStatus(context, port)
        : { ready: false, version: null };
      if (managerBefore.ready && managerBefore.version === context.packageVersion) {
        emitStartProgress(options, "info", "启动模式 · already-running");
        emitStartProgress(options, "success", `Theme Manager 已就绪 · runtime ${managerBefore.version}`);
        emitStartProgress(options, "success", `watcher 正在运行 · PID ${watcherBefore.pid}`);
        const persistentCdp = enablePersistentCdp(context, appBundle, port);
        emitStartProgress(options, "success", persistentCdpMessage(persistentCdp));
        const summary = startSummary(context);
        emitStartProgress(options, "success", `主题自动更新 · ${summary.autoUpdateThemes ? "已开启" : "已关闭"}`);
        emitStartResult(
          {
            command: "start",
            state: "already_running",
            mode: "already-running",
            port,
            watcherPid: watcherBefore.pid,
            theme: summary.theme,
            autoUpdateThemes: summary.autoUpdateThemes,
            persistentCdp,
          },
          "TRAE Work Skin 已经在运行",
          summary.message,
          "无需重复启动",
          options,
        );
        return;
      }
      emitStartProgress(options, "info", "启动模式 · refresh");
      const injectionOutput = runInjector(context, ["--once", "--port", String(port)]);
      const managerAfter = managerStatus(context, port);
      emitStartProgress(
        options,
        managerAfter.ready ? "success" : "warning",
        managerAfter.ready
          ? `Theme Manager 已重新注入 · ${injectedTargets(injectionOutput)} · runtime ${managerAfter.version || "unknown"}`
          : `Theme Manager 注入已执行 · ${injectedTargets(injectionOutput)} · 页面仍在初始化`,
      );
      const pid = startWatcher(context, port);
      emitStartProgress(options, "success", `watcher 已启动 · PID ${pid}`);
      const persistentCdp = enablePersistentCdp(context, appBundle, port);
      emitStartProgress(options, "success", persistentCdpMessage(persistentCdp));
      const summary = startSummary(context);
      emitStartProgress(options, "success", `主题自动更新 · ${summary.autoUpdateThemes ? "已开启" : "已关闭"}`);
      const state = bootstrap ? "ready" : "recovered";
      const headline = bootstrap
        ? `首次启动完成，已安装 ${bootstrap.installed.length} 套官方主题。`
        : "TRAE Work Skin 已恢复并可以使用。";
      emitStartResult(
        {
          command: "start",
          state,
          mode: "refresh",
          port,
          watcherPid: pid,
          persistentCdp,
          theme: summary.theme,
          autoUpdateThemes: summary.autoUpdateThemes,
          bootstrappedThemes: bootstrap?.installed.map((theme) => theme.id) || [],
        },
        headline,
        summary.message,
        "Theme Manager 已就绪",
        options,
      );
      return;
    }

    emitStartProgress(options, "warning", `CDP 不可用 · 127.0.0.1:${port}`);
    emitStartProgress(options, "info", "启动模式 · launch");
    const owner = portOwner(context, port);
    if (owner && !owner.command.includes(context.app.processMatch)) {
      throw new CliError("PORT_IN_USE", 4, `端口 ${port} 被其他进程占用：${owner.command}`, "请退出占用端口的程序后重试。");
    }
    const wasRunning = appRunning(context, appBundle);
    if (wasRunning) emitStartProgress(options, "info", "TRAE Work 正在运行 · 需要重启以启用 CDP");
    await confirmAppRestart(context, appBundle, options);
    emitStartProgress(options, "info", `${wasRunning ? "正在重启" : "正在启动"} TRAE Work 并等待 CDP`);
    const launchOutput = runScript(context, "start.sh", {
      PORT: String(port),
      NODE_BIN: process.execPath,
      APP_BUNDLE: appBundle,
      APP_BUNDLE_ID: context.app.bundleId,
      APP_PROC_MATCH: context.app.processMatch,
    }, { inherit: false });
    if (launchOutput.includes("falling back to direct exec")) {
      emitStartProgress(options, "warning", "open 启动未建立 CDP · 已使用应用二进制兜底");
    }
    emitStartProgress(options, "success", `TRAE Work 与 CDP 已就绪 · 127.0.0.1:${port}`);
    const watcher = watcherStatus(context);
    emitStartProgress(
      options,
      watcher.alive && watcher.expected ? "success" : "warning",
      watcher.alive && watcher.expected
        ? `watcher 已启动 · PID ${watcher.pid}`
        : "watcher 启动状态尚未确认",
    );
    const manager = managerStatus(context, port);
    emitStartProgress(
      options,
      manager.ready ? "success" : "warning",
      manager.ready
        ? `Theme Manager 已注入 · runtime ${manager.version || "unknown"}`
        : "Theme Manager 正在由 watcher 注入",
    );
    const persistentCdp = enablePersistentCdp(context, appBundle, port);
    emitStartProgress(options, "success", persistentCdpMessage(persistentCdp));
    const summary = startSummary(context);
    emitStartProgress(options, "success", `主题自动更新 · ${summary.autoUpdateThemes ? "已开启" : "已关闭"}`);
    const headline = bootstrap
      ? `首次启动完成，已安装 ${bootstrap.installed.length} 套官方主题。`
      : "TRAE Work Skin 已启动。";
    emitStartResult(
      {
        command: "start",
        state: "ready",
        mode: "launch",
        port,
        watcherPid: watcher.pid,
        persistentCdp,
        theme: summary.theme,
        autoUpdateThemes: summary.autoUpdateThemes,
        bootstrappedThemes: bootstrap?.installed.map((theme) => theme.id) || [],
      },
      headline,
      summary.message,
      "TRAE Work Skin 已启动",
      options,
    );
  });
}

async function confirmAppRestart(context: CliContext, appBundle: string, options: CliOptions): Promise<void> {
  if (!appRunning(context, appBundle) || options.yes) return;
  if (!interactive(options)) {
    throw new CliError(
      "APP_RESTART_CONFIRMATION_REQUIRED",
      2,
      "TRAE Work 正在运行；启用 Theme Manager 需要退出并重新打开应用。",
      "请先保存未完成的工作，然后交互式运行 twskin start 确认重启，或使用 twskin start --yes。",
    );
  }
  const answer = await p.confirm({
    message: "TRAE Work 正在运行。请先保存未完成的工作，是否现在退出并重新打开 TRAE Work？",
    initialValue: false,
  });
  if (p.isCancel(answer) || !answer) {
    p.cancel("已取消启动；TRAE Work 保持运行");
    throw new CliError("CANCELLED", 2, "已取消启动；TRAE Work 保持运行。");
  }
}

async function confirmThemeDownload(options: CliOptions, themesDirectory: string): Promise<void> {
  if (options.yes) return;
  if (options.json || !process.stdin.isTTY) {
    throw new CliError(
      "THEME_DOWNLOAD_CONFIRMATION_REQUIRED",
      2,
      `主题目录为空：${themesDirectory}`,
      "交互式运行 twskin start，或使用 twskin start --yes；也可以先用 twskin theme load <directory> 加载本地主题。",
    );
  }
  p.intro("TRAE Work Skin · 首次启动");
  const answer = await p.confirm({
    message: "未检测到本地主题，是否下载官方主题包？",
    initialValue: true,
  });
  if (p.isCancel(answer) || !answer) {
    p.cancel("已取消首次启动");
    throw new CliError("CANCELLED", 2, "已取消首次启动。", "可运行 twskin theme load <directory> 加载本地主题。");
  }
}

export async function statusCommand(context: CliContext, options: CliOptions): Promise<void> {
  const status = await getStatus(context);
  const ownerText = status.cdp.owner
    ? `${status.cdp.owner.expected ? "TRAE" : "其他进程"} (PID ${status.cdp.owner.pid})`
    : "无监听";
  const human = [
    `App      ${status.app.installed ? (status.app.running ? "运行中" : "已安装，未运行") : "未找到"}`,
    `CDP      ${status.cdp.reachable ? "可用" : "不可用"} · 127.0.0.1:${status.cdp.port} · ${ownerText}`,
    `守护进程 ${status.watcher.running ? `运行中 (PID ${status.watcher.pid})` : "未运行"}`,
    `当前主题 ${status.theme.id}${status.theme.valid ? "" : "（主题不存在）"}`,
  ].join("\n");
  emit({ command: "status", status, ...(options.dryRun ? { dryRun: true } : {}) }, options.dryRun ? `演练模式（只读）：\n${human}` : human, options.json);
}

export async function stopCommand(context: CliContext, options: CliOptions): Promise<void> {
  if (options.dryRun) {
    const port = readPort(context);
    const cdpReachable = Boolean(await cdpVersion(port));
    const watcher = watcherStatus(context);
    const persistentCdpConfigured = fs.existsSync(context.paths.cdpConfigState);
    const actions = [
      ...(watcher.alive && watcher.expected ? ["stop_watcher"] : []),
      ...(cdpReachable ? ["restore_injected_targets"] : []),
      ...(persistentCdpConfigured ? ["disable_persistent_cdp"] : []),
    ];
    emitDryRun(
      { command: "stop", plan: { actions, port, cdpReachable, watcher: { running: watcher.alive && watcher.expected, pid: watcher.pid }, persistentCdpConfigured } },
      actions.length ? `不会停止进程或修改配置；将执行 ${actions.join("、")}。` : "当前没有需要停止或恢复的组件。",
      options,
    );
    return;
  }
  await withLock(context, "stop", async () => {
    const port = readPort(context);
    const cdpReachable = Boolean(await cdpVersion(port));
    const watcherStopped = stopWatcher(context);
    let persistentCdpRemoved = false;
    let targets = 0;
    let restoredTargets = 0;

    try {
      if (cdpReachable) {
        const output = runInjector(context, ["--stop", "--port", String(port)]);
        try {
          const result = JSON.parse(output) as { targets?: unknown; restoredTargets?: unknown };
          if (typeof result.targets === "number") targets = result.targets;
          if (typeof result.restoredTargets === "number") restoredTargets = result.restoredTargets;
        } catch {}
      }
    } finally {
      persistentCdpRemoved = disablePersistentCdp(context).changed;
    }

    const human = cdpReachable
      ? "TRAE Work Skin 已停止，TRAE Work 已恢复原生外观。"
      : watcherStopped || persistentCdpRemoved
        ? "TRAE Work Skin 守护进程已停止；TRAE Work 当前未启用 CDP。"
        : "TRAE Work Skin 已经处于停止状态。";
    emit(
      { command: "stop", watcherStopped, cdpReachable, targets, restoredTargets, persistentCdpRemoved },
      human,
      options.json,
    );
  });
}

export function themesCommand(context: CliContext, options: CliOptions): void {
  const themes = listThemes(context);
  const current = readTheme(context);
  const width = Math.max(8, ...themes.map((theme) => theme.id.length));
  const human = themes.length
    ? themes.map((theme) => `${theme.id === current ? "●" : " "} ${theme.id.padEnd(width)}  ${theme.name} · v${theme.version}${theme.desc ? ` · ${theme.desc}` : ""}`).join("\n")
    : "没有找到可用主题。";
  const output = `${human}\n\n主题目录：${context.themesDir}`;
  emit({ command: "themes", directory: context.themesDir, current, themes, ...(options.dryRun ? { dryRun: true } : {}) }, options.dryRun ? `演练模式（只读）：\n${output}` : output, options.json);
}

export async function themeCommand(context: CliContext, id: string | undefined, options: CliOptions): Promise<void> {
  if (!id) throw new CliError("THEME_REQUIRED", 2, "缺少主题 ID。", "先运行 twskin themes 查看可用主题。");
  if (options.dryRun) {
    const theme = listThemes(context).find((item) => item.id === id && !item.invalid);
    if (!theme) throw new CliError("THEME_NOT_FOUND", 2, `找不到主题：${id}`, "运行 twskin themes 查看可用主题。");
    const port = readPort(context);
    const applied = Boolean(await cdpVersion(port));
    emitDryRun(
      { command: "theme", theme, plan: { action: applied ? "apply_theme" : "set_selected_theme", id, port, applied } },
      `不会切换主题；将${applied ? "热更新应用" : "保存下次启动时应用"}主题 ${id}。`,
      options,
    );
    return;
  }
  await withLock(context, "theme", async () => {
    const theme = listThemes(context).find((item) => item.id === id && !item.invalid);
    if (!theme) throw new CliError("THEME_NOT_FOUND", 2, `找不到主题：${id}`, "运行 twskin themes 查看可用主题。");
    const port = readPort(context);
    const cdp = await cdpVersion(port);
    if (cdp) {
      runInjector(context, ["--apply", id, "--port", String(port)]);
      emit({ command: "theme", theme, applied: true }, `已切换到主题 ${id}（热更新）。`, options.json);
    } else {
      writeTheme(context, id);
      emit({ command: "theme", theme, applied: false }, `已选择主题 ${id}；下次运行 twskin start 时生效。`, options.json);
    }
  });
}

export async function loadThemeCommand(context: CliContext, sourceDirectory: string | undefined, options: CliOptions): Promise<void> {
  if (!sourceDirectory) throw new CliError("THEME_SOURCE_REQUIRED", 2, "缺少本地主题目录。", "用法：twskin theme load <directory>");
  if (options.dryRun) {
    const themes = discoverThemeDirectories(sourceDirectory);
    const ids = themes.map((theme) => theme.id);
    emitDryRun(
      { command: "theme load", plan: { action: "install_themes", sourceDirectory, directory: context.themesDir, themes: ids } },
      `不会复制文件；将安装 ${ids.length} 套主题：${ids.join("、")}。`,
      options,
    );
    return;
  }
  await withLock(context, "theme-load", async () => {
    const themes = discoverThemeDirectories(sourceDirectory);
    const installed = themes.map((theme) => installThemeDirectory(context, theme.source));
    const ids = installed.map((theme) => theme.id);
    emit(
      { command: "theme load", installed: ids, directory: context.themesDir },
      `已加载 ${ids.length} 套主题：${ids.join("、")}\n主题目录：${context.themesDir}`,
      options.json,
    );
  });
}

export async function downloadThemeCommand(context: CliContext, id: string | undefined, options: CliOptions): Promise<void> {
  if (options.dryRun) {
    emitDryRun(
      { command: "theme download", plan: { action: "download_official_themes", requestedId: id || null, directory: context.themesDir } },
      `不会访问 GitHub 或写入文件；将下载${id ? `主题 ${id}` : "全部官方主题"}。`,
      options,
    );
    return;
  }
  await withLock(context, "theme-download", async () => {
    const result = await downloadWithProgress(context, id, options);
    const ids = result.installed.map((theme) => theme.id);
    emit(
      { command: "theme download", release: result.tag, digest: result.digest, installed: ids, directory: result.directory },
      `已从 GitHub Release ${result.tag} 下载 ${ids.length} 套主题：${ids.join("、")}\n主题目录：${result.directory}`,
      options.json,
    );
  });
}

export async function checkThemeCommand(context: CliContext, options: CliOptions): Promise<void> {
  if (options.dryRun) {
    emitDryRun(
      { command: "theme check", plan: { action: "fetch_theme_catalog", cache: context.paths.catalogCache } },
      "不会请求 Catalog 或更新缓存；将检查官方主题是否有更新。",
      options,
    );
    return;
  }
  const result = await checkThemesCommandState(context, true);
  const human = result.updates.length
    ? `发现 ${result.newThemes} 套新主题、${result.updatedThemes} 套可更新主题。\n运行 twskin theme sync 下载并安装。`
    : "官方主题已是最新。";
  emit({
    command: "theme check",
    catalogVersion: result.catalog.catalogVersion,
    release: result.catalog.releaseTag,
    updates: result.updates,
    newThemes: result.newThemes,
    updatedThemes: result.updatedThemes,
    incompatibleThemes: result.incompatibleThemes,
    checkedFrom: result.checkedFrom,
  }, human, options.json);
}

export async function syncThemeCommand(context: CliContext, options: CliOptions): Promise<void> {
  if (options.dryRun) {
    emitDryRun(
      { command: "theme sync", plan: { actions: ["fetch_theme_catalog", "download_and_install_compatible_updates"], directory: context.themesDir } },
      "不会请求网络或安装主题；将检查并同步兼容的主题更新。",
      options,
    );
    return;
  }
  const result = await syncThemesCommandState(context, true);
  const installed = result.installed || [];
  const human = installed.length
    ? `已同步 ${installed.length} 套官方主题：${installed.join("、")}`
    : result.updateCount ? "发现主题更新；自动更新已关闭。" : "官方主题已是最新。";
  emit({ command: "theme sync", ...result }, human, options.json);
}

export async function autoSyncThemeCommand(context: CliContext, options: CliOptions): Promise<void> {
  if (options.dryRun) {
    emitDryRun(
      { command: "theme auto-sync", plan: { action: "sync_themes_when_auto_update_enabled", directory: context.themesDir } },
      "不会请求网络或安装主题；将按自动更新设置同步主题。",
      options,
    );
    return;
  }
  const result = await autoSyncThemesCommandState(context, false);
  emit({ command: "theme auto-sync", ...result }, "", options.json);
}

export function autoUpdateThemeCommand(context: CliContext, value: string | undefined, options: CliOptions): void {
  if (value !== "on" && value !== "off") {
    throw new CliError("AUTO_UPDATE_VALUE_INVALID", 2, "自动更新选项只能是 on 或 off。", "用法：twskin theme auto-update <on|off>");
  }
  if (options.dryRun) {
    emitDryRun(
      { command: "theme auto-update", plan: { action: "set_auto_update", enabled: value === "on", settingsFile: context.paths.themeUpdateSettings } },
      `不会写入设置；将${value === "on" ? "开启" : "关闭"}官方主题自动更新。`,
      options,
    );
    return;
  }
  const settings = setThemeAutoUpdate(context, value === "on");
  const state = readThemeSyncState(context);
  emit({ command: "theme auto-update", ...settings, state }, `官方主题自动更新已${settings.autoUpdateThemes ? "开启" : "关闭"}。`, options.json);
}

export async function doctorCommand(context: CliContext, options: CliOptions): Promise<void> {
  const status = await getStatus(context);
  const required = [
    "injector.mjs",
    "skin.js",
    "token-map.mjs",
    "component-map.mjs",
    "styles/base.css",
    "styles/manager.css",
    "start.sh",
    "restore.sh",
  ];
  const checks: DoctorCheck[] = [];
  const add = (id: string, level: DoctorCheck["level"], message: string, detail = ""): void => { checks.push({ id, level, message, detail }); };
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  add("node", nodeMajor >= MIN_NODE_MAJOR ? "pass" : "fail", `Node.js ${process.version}`, `${process.execPath}（需要 v${MIN_NODE_MAJOR}+）`);
  add("app", status.app.installed ? "pass" : "fail", status.app.installed ? "已找到 TRAE" : "未找到 TRAE", status.app.bundle);

  const missing = required.filter((file) => !fs.existsSync(path.join(context.runtimeRoot, file)));
  add("files", missing.length ? "fail" : "pass", missing.length ? `缺少 ${missing.length} 个运行文件` : "运行文件完整", missing.join(", "));
  const integrity = verifyRuntimeIntegrity(context);
  if (!integrity.available) add("integrity", "warn", "当前开发/独立安装未提供 SHA-256 发布清单");
  else add("integrity", integrity.valid ? "pass" : "fail", integrity.valid ? `SHA-256 完整性通过（${integrity.checked} 个文件）` : `运行时完整性失败（${integrity.failures.length} 项）`, integrity.failures.map((item) => `${item.path}: ${item.reason}`).join(", "));

  const themes = listThemes(context);
  const validThemes = themes.filter((theme) => !theme.invalid);
  add(
    "themes",
    validThemes.length ? (validThemes.length === themes.length ? "pass" : "warn") : "fail",
    validThemes.length ? `发现 ${validThemes.length} 套有效主题` : "主题目录为空或没有有效主题",
    context.themesDir,
  );
  add("theme", status.theme.valid ? "pass" : "fail", status.theme.valid ? `当前主题 ${status.theme.id}` : `当前主题不存在：${status.theme.id}`);
  if (status.cdp.owner && !status.cdp.owner.expected) add("port", "fail", `端口 ${status.cdp.port} 被其他进程占用`, status.cdp.owner.command);
  else add("port", "pass", `端口 ${status.cdp.port} ${status.cdp.owner ? "属于 TRAE" : "空闲"}`);
  add("cdp", status.cdp.reachable ? "pass" : "warn", status.cdp.reachable ? "CDP 可用" : "CDP 未启动；运行 twskin start 可启用");
  add("watcher", status.watcher.running ? "pass" : "warn", status.watcher.running ? `守护进程运行中（PID ${status.watcher.pid}）` : "守护进程未运行");

  const failures = checks.filter((check) => check.level === "fail");
  const human = checks.map((check) => `${check.level === "pass" ? "✓" : check.level === "warn" ? "!" : "✗"} ${check.message}${check.detail ? `\n  ${check.detail}` : ""}`).join("\n");
  if (failures.length) {
    const message = `检查发现 ${failures.length} 个必须修复的问题。`;
    if (options.json) {
      console.log(JSON.stringify({ schemaVersion: 1, ok: false, command: "doctor", healthy: false, checks, ...(options.dryRun ? { dryRun: true } : {}), error: { code: "DOCTOR_FAILED", message } }, null, 2));
    } else {
      console.log(options.dryRun ? `演练模式（只读）：\n${human}` : human);
      console.error(`twskin: ${message}`);
    }
    process.exitCode = 3;
    return;
  }
  emit({ command: "doctor", healthy: true, checks, ...(options.dryRun ? { dryRun: true } : {}) }, options.dryRun ? `演练模式（只读）：\n${human}` : human, options.json);
}

export async function restoreCommand(context: CliContext, options: CliOptions): Promise<void> {
  if (options.dryRun) {
    emitDryRun(
      { command: "restore", plan: { actions: ["disable_persistent_cdp", "run_restore_script"], appBundle: resolveAppBundle(context) } },
      "不会修改 TRAE 或配置；将恢复原生外观。",
      options,
    );
    return;
  }
  await withLock(context, "restore", async () => {
    disablePersistentCdp(context);
    runScript(context, "restore.sh", { APP_BUNDLE: resolveAppBundle(context), APP_BUNDLE_ID: context.app.bundleId });
    emit({ command: "restore" }, "已恢复 TRAE 原生外观。", options.json);
  });
}

function managedPath(file: string, installDirectory: string): boolean {
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) return fs.realpathSync(file).startsWith(`${installDirectory}${path.sep}`);
    if (stat.isFile()) return fs.readFileSync(file, "utf8").includes(installDirectory);
  } catch {}
  return false;
}

async function confirmUninstall(yes: boolean): Promise<void> {
  if (yes) return;
  if (!process.stdin.isTTY) throw new CliError("CONFIRMATION_REQUIRED", 2, "卸载需要确认。", "重新运行 twskin uninstall --yes。");
  const answer = await p.confirm({
    message: "确定卸载 TRAE Work Skin？这会恢复原生外观并删除本地主题状态。",
    initialValue: false,
  });
  if (p.isCancel(answer) || !answer) {
    p.cancel("已取消卸载");
    throw new CliError("CANCELLED", 2, "已取消卸载。");
  }
}

function removeStandaloneEntrypoints(context: CliContext): void {
  const candidates = [
    "/usr/local/bin/twskin",
    "/opt/homebrew/bin/twskin",
    path.join(os.homedir(), ".local/bin/twskin"),
    path.join(os.homedir(), "Desktop/TRAE Work Skin.command"),
  ];
  for (const file of candidates) if (managedPath(file, context.dataDir)) try { fs.unlinkSync(file); } catch {}
}

function removeGlobalNpmPackage(context: CliContext): { attempted: boolean; removed: boolean } {
  const globalRoot = commandText(context, "/usr/bin/env", ["npm", "root", "--global"]);
  if (!globalRoot) return { attempted: false, removed: false };
  let packageRoot = context.packageRoot;
  try { packageRoot = fs.realpathSync(packageRoot); } catch {}
  let normalizedGlobalRoot = globalRoot;
  try { normalizedGlobalRoot = fs.realpathSync(globalRoot); } catch {}
  if (!packageRoot.startsWith(`${normalizedGlobalRoot}${path.sep}`)) return { attempted: false, removed: false };
  const result = commandResult(context, "/usr/bin/env", ["npm", "uninstall", "--global", context.packageName], { inherit: true, cwd: os.homedir() });
  if (result.status !== 0) throw new CliError("NPM_UNINSTALL_FAILED", 5, "npm 全局包卸载失败。", `请手动运行 npm uninstall --global ${context.packageName}。`);
  return { attempted: true, removed: true };
}

export async function uninstallCommand(context: CliContext, options: CliOptions): Promise<void> {
  if (options.dryRun) {
    const executable = context.distribution !== "development";
    emitDryRun(
      {
        command: "uninstall",
        plan: {
          actions: ["disable_persistent_cdp", "restore_or_stop_watcher", "remove_managed_entrypoints", "remove_package_when_globally_installed", "remove_data_directory"],
          dataDir: context.dataDir,
          distribution: context.distribution,
          executable,
          ...(executable ? {} : { blocker: "DEVELOPMENT_INSTALL" }),
        },
      },
      executable ? "不会删除文件或卸载软件；将恢复外观并移除受管理的文件。" : "不会删除文件；实际卸载会被拒绝，因为当前是源码工作区。",
      options,
    );
    return;
  }
  await confirmUninstall(options.yes);
  if (context.distribution === "development") {
    throw new CliError("DEVELOPMENT_INSTALL", 2, "不能从源码工作区执行卸载。", "请使用已经安装的 twskin uninstall。");
  }
  await withLock(context, "uninstall", async () => {
    disablePersistentCdp(context);
    const port = readPort(context);
    if (await cdpVersion(port)) {
      runScript(context, "restore.sh", { APP_BUNDLE: resolveAppBundle(context), APP_BUNDLE_ID: context.app.bundleId });
    } else {
      stopWatcher(context);
    }

    removeStandaloneEntrypoints(context);
    let npm = { attempted: false, removed: false };
    if (context.distribution === "npm") npm = removeGlobalNpmPackage(context);

    fs.rmSync(context.dataDir, { recursive: true, force: true });
    const suffix = context.distribution === "npm" && !npm.removed
      ? `\n当前不是全局 npm 安装；请在对应项目中移除 ${context.packageName}。`
      : "";
    emit({ command: "uninstall", dataDir: context.dataDir, packageRemoved: npm.removed || context.distribution === "standalone" }, `TRAE Work Skin 已卸载。${suffix}`, options.json);
  });
}
