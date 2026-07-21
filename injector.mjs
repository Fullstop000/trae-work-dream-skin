#!/usr/bin/env node
// TRAE Work Dream Skin — CDP 注入器
// 通过本机回环 CDP (127.0.0.1) 把 skin.js 注入运行中的 Electron 页面。
// 用法:
//   node injector.mjs --once --port 19527            一次性注入所有页面 target
//   node injector.mjs --watch --port 19527           常驻守护:新 target/导航/被清除时自动重注
//   node injector.mjs --list --port 19527            列出 CDP target
//   node injector.mjs --eval '<js>' --port 19527     在第一个页面 target 里执行表达式并打印结果
//   node injector.mjs --shot out.png --port 19527    对第一个页面 target 截图
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const VERSION = "0.3.6";

function parseArgs(argv) {
  const args = {
    mode: "once",
    port: 0,
    themesDir: path.join(ROOT, "themes"),
    defaultTheme: null,
    applyId: null,
    evalExpr: null,
    shotPath: null,
    timeoutMs: 8000,
  };
  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case "--watch": args.mode = "watch"; break;
      case "--once": args.mode = "once"; break;
      case "--list": args.mode = "list"; break;
      case "--current": args.mode = "current"; break;
      case "--apply": args.mode = "apply"; args.applyId = argv[++i]; break;
      case "--eval": args.mode = "eval"; args.evalExpr = argv[++i]; break;
      case "--shot": args.mode = "shot"; args.shotPath = argv[++i]; break;
      case "--port": args.port = Number(argv[++i]); break;
      case "--themes": args.themesDir = argv[++i]; break;
      case "--default-theme": args.defaultTheme = argv[++i]; break;
      case "--timeout-ms": args.timeoutMs = Number(argv[++i]); break;
      default: throw new Error(`unknown argument: ${argv[i]}`);
    }
  }
  if (!Number.isInteger(args.port) || args.port < 1024 || args.port > 65535) {
    throw new Error("--port is required (1024-65535)");
  }
  return args;
}

function log(...parts) {
  console.log(`${new Date().toISOString()}`, ...parts);
}

const THEME_CONF = path.join(ROOT, "run", "theme.conf");
const PID_FILE = path.join(ROOT, "run", "injector.pid");

function buildCatalog(themesDir) {
  const catalog = [];
  const dataUri = (file) => {
    const ext = path.extname(file).toLowerCase();
    const mime = ext === ".svg" ? "image/svg+xml" : ext === ".png" ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
  };
  for (const entry of fs.readdirSync(themesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(themesDir, entry.name);
    let meta = { id: entry.name, name: entry.name, desc: "" };
    try {
      meta = { ...meta, ...JSON.parse(fs.readFileSync(path.join(dir, "theme.json"), "utf8")) };
    } catch {}
    const bgFile = ["background.svg", "background.png", "background.jpg", "background.jpeg"]
      .map((f) => path.join(dir, f))
      .find((f) => fs.existsSync(f));
    if (!bgFile) continue;
    const assets = {};
    for (const [name, filenames] of Object.entries({
      leftSidebar: ["left-sidebar.png", "left-sidebar.jpg", "left-sidebar.jpeg"],
      rightPanel: ["right-panel.png", "right-panel.jpg", "right-panel.jpeg"],
    })) {
      const file = filenames.map((filename) => path.join(dir, filename))
        .find((candidate) => fs.existsSync(candidate));
      if (file) assets[name] = dataUri(file);
    }
    const optionalNumber = (value, min, max) => {
      const number = Number(value);
      return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : null;
    };
    const settings = {};
    for (const key of [
      "schemaVersion",
      "appearance",
      "background",
      "layout",
      "colors",
      "typography",
      "shape",
      "elevation",
      "scrollbar",
      "components",
      "workbench",
      "extensions",
      "tokens",
      "surfaces",
      "effects",
      "icons",
      "decorations",
    ]) {
      if (meta[key] != null) settings[key] = meta[key];
    }
    // icons.overrides: 解析 icons/ 目录下的素材文件为 data URL
    if (settings.icons?.overrides && typeof settings.icons.overrides === "object") {
      const assets = {};
      for (const [key, spec] of Object.entries(settings.icons.overrides)) {
        const file = typeof spec === "string" ? spec : spec?.src;
        if (!file || !/\.(svg|png|jpe?g)$/i.test(file)) continue;
        const full = path.join(dir, "icons", file);
        if (fs.existsSync(full)) assets[key] = dataUri(full);
      }
      if (Object.keys(assets).length) {
        settings.icons = { ...settings.icons, assets };
      }
    }
    catalog.push({
      id: String(meta.id),
      name: String(meta.name),
      desc: String(meta.desc || ""),
      surfaceLight: optionalNumber(meta.surfaceLight, 0, 1),
      surfaceDark: optionalNumber(meta.surfaceDark, 0, 1),
      blurPx: optionalNumber(meta.blurPx, 0, 40),
      settings,
      art: dataUri(bgFile),
      assets,
    });
  }
  return catalog;
}

function readThemeConf() {
  try { return fs.readFileSync(THEME_CONF, "utf8").trim() || null; } catch { return null; }
}

function resolveDefaultTheme(catalog, requested) {
  for (const id of [requested, readThemeConf(), "aurora", catalog[0]?.id]) {
    if (id && catalog.some((t) => t.id === id)) return id;
  }
  return catalog[0]?.id ?? "";
}

function buildPayload(args) {
  const skin = fs.readFileSync(path.join(ROOT, "skin.js"), "utf8");
  const tokenMap = fs.readFileSync(path.join(ROOT, "token-map.mjs"), "utf8");
  const catalog = buildCatalog(args.themesDir);
  if (catalog.length === 0) throw new Error(`no themes found in ${args.themesDir}`);
  // 函数式替换，避免替换文本里的 $ 序列被当成特殊模式
  return skin
    .replaceAll("__TOKEN_MAP__", () => tokenMap)
    .replaceAll("__CATALOG__", () => JSON.stringify(catalog))
    .replaceAll("__DEFAULT_THEME__", () => JSON.stringify(resolveDefaultTheme(catalog, args.defaultTheme)))
    .replaceAll("__VERSION__", () => JSON.stringify(VERSION));
}

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    this.closed = false;
  }

  static async connect(wsUrl, timeoutMs) {
    const ws = new WebSocket(wsUrl);
    const session = new CdpSession(ws);
    ws.addEventListener("message", (ev) => {
      let msg;
      try {
        msg = JSON.parse(typeof ev.data === "string" ? ev.data : String(ev.data));
      } catch { return; }
      if (msg.id) {
        const p = session.pending.get(msg.id);
        if (p) {
          session.pending.delete(msg.id);
          clearTimeout(p.timer);
          msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
        }
      } else if (msg.method) {
        session.handlers.get(msg.method)?.(msg.params ?? {});
      }
    });
    ws.addEventListener("close", () => {
      session.closed = true;
      for (const p of session.pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error("websocket closed"));
      }
      session.pending.clear();
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("websocket connect timeout")), timeoutMs);
      ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("websocket connect error")); }, { once: true });
    });
    return session;
  }

  send(method, params = {}, timeoutMs = 10000) {
    if (this.closed) return Promise.reject(new Error("websocket closed"));
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`cdp timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) { this.handlers.set(method, handler); }

  close() { try { this.ws.close(); } catch {} }
}

async function listPageTargets(port, timeoutMs) {
  const res = await fetch(`http://127.0.0.1:${port}/json/list`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`/json/list http ${res.status}`);
  const list = await res.json();
  return list.filter((t) => t.type === "page" && !String(t.url).startsWith("devtools://"));
}

async function injectInto(session, payload) {
  const result = await session.send("Runtime.evaluate", {
    expression: payload,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const desc = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
    throw new Error(`payload exception: ${desc}`);
  }
  return result.result?.value;
}

async function getStamp(session) {
  try {
    const r = await session.send(
      "Runtime.evaluate",
      { expression: "window.__TRAE_DREAM_SKIN__ || null", returnByValue: true },
      4000,
    );
    return r.result?.value ?? null;
  } catch {
    return null;
  }
}

async function cmdList(args) {
  const targets = await listPageTargets(args.port, args.timeoutMs);
  for (const t of targets) {
    console.log(`[${t.type}] ${t.id}\n  title: ${t.title}\n  url:   ${t.url}`);
  }
  if (targets.length === 0) console.log("(no page targets)");
}

async function cmdEval(args) {
  const targets = await listPageTargets(args.port, args.timeoutMs);
  if (targets.length === 0) throw new Error("no page targets");
  const session = await CdpSession.connect(targets[0].webSocketDebuggerUrl, args.timeoutMs);
  try {
    const r = await session.send("Runtime.evaluate", {
      expression: args.evalExpr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      console.error("exception:", r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(r.result?.value, null, 2));
  } finally {
    session.close();
  }
}

async function cmdShot(args) {
  const targets = await listPageTargets(args.port, args.timeoutMs);
  if (targets.length === 0) throw new Error("no page targets");
  const session = await CdpSession.connect(targets[0].webSocketDebuggerUrl, args.timeoutMs);
  try {
    await session.send("Page.enable");
    const shot = await session.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
    }, 20000);
    fs.writeFileSync(args.shotPath, Buffer.from(shot.data, "base64"));
    console.log(args.shotPath);
  } finally {
    session.close();
  }
}

const LS_EXPR = 'localStorage.getItem("trae-dream-skin:theme")';
const ENABLE_EXPR = 'localStorage.removeItem("trae-dream-skin:disabled")';

function writeThemeConf(id) {
  fs.mkdirSync(path.dirname(THEME_CONF), { recursive: true });
  fs.writeFileSync(THEME_CONF, `${id}\n`, { mode: 0o600 });
}

async function readPageTheme(session) {
  try {
    const r = await session.send("Runtime.evaluate", { expression: LS_EXPR, returnByValue: true }, 4000);
    return r.result?.value ?? null;
  } catch { return null; }
}

async function cmdApply(args, payload) {
  const targets = await listPageTargets(args.port, args.timeoutMs);
  if (targets.length === 0) throw new Error("no page targets");
  const session = await CdpSession.connect(targets[0].webSocketDebuggerUrl, args.timeoutMs);
  try {
    await session.send("Runtime.evaluate", {
      expression: ENABLE_EXPR,
      returnByValue: true,
    });
    await injectInto(session, payload);
    const expr = `window.__TRAE_DREAM_SKIN_GALLERY__
      ? window.__TRAE_DREAM_SKIN_GALLERY__.apply(${JSON.stringify(args.applyId)})
      : { ok: false, error: "gallery not ready (run --once first)" }`;
    const r = await session.send("Runtime.evaluate", { expression: expr, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    const value = r.result?.value;
    console.log(JSON.stringify(value));
    if (!value?.ok) { process.exitCode = 1; return; }
    writeThemeConf(args.applyId);
  } finally {
    session.close();
  }
}

async function cmdCurrent(args) {
  const targets = await listPageTargets(args.port, args.timeoutMs);
  if (targets.length === 0) throw new Error("no page targets");
  const session = await CdpSession.connect(targets[0].webSocketDebuggerUrl, args.timeoutMs);
  try {
    console.log((await readPageTheme(session)) ?? "(none)");
  } finally {
    session.close();
  }
}

async function cmdOnce(args, payload) {
  const targets = await listPageTargets(args.port, args.timeoutMs);
  if (targets.length === 0) throw new Error("no page targets");
  let ok = 0;
  for (const t of targets) {
    try {
      const session = await CdpSession.connect(t.webSocketDebuggerUrl, args.timeoutMs);
      await session.send("Runtime.evaluate", {
        expression: ENABLE_EXPR,
        returnByValue: true,
      });
      const r = await injectInto(session, payload);
      session.close();
      ok += 1;
      log(`injected into ${t.id} -> ${JSON.stringify(r)}`);
    } catch (error) {
      log(`skip ${t.id}: ${error.message}`);
    }
  }
  log(`injected ${ok}/${targets.length} target(s)`);
}

async function cmdWatch(args, payload) {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, `${process.pid}\n`, { mode: 0o600 });
  process.on("exit", () => {
    try {
      if (fs.readFileSync(PID_FILE, "utf8").trim() === String(process.pid)) {
        fs.unlinkSync(PID_FILE);
      }
    } catch {}
  });

  const sessions = new Map(); // targetId -> { session, target }
  let cdpFailures = 0;
  let enableOnStartup = true;
  let lastReloadRequest = null;
  let reloadPrimed = false;

  const injectTarget = async (target) => {
    const session = await CdpSession.connect(target.webSocketDebuggerUrl, args.timeoutMs);
    if (enableOnStartup) {
      await session.send("Runtime.evaluate", {
        expression: ENABLE_EXPR,
        returnByValue: true,
      });
    }
    await session.send("Page.enable").catch(() => {});
    let navTimer = null;
    session.on("Page.frameNavigated", () => {
      clearTimeout(navTimer);
      navTimer = setTimeout(() => {
        injectInto(session, payload)
          .then((r) => log(`re-injected after navigation ${target.id} -> ${JSON.stringify(r)}`))
          .catch((e) => log(`re-inject failed ${target.id}: ${e.message}`));
      }, 400);
    });
    const r = await injectInto(session, payload);
    sessions.set(target.id, { session, target });
    log(`injected into ${target.id} (${target.url}) -> ${JSON.stringify(r)}`);
  };

  const tick = async () => {
    // 单实例约定：pid 文件被其它注入器接管时自动退出，
    // 避免多个守护进程同时注入、互相覆盖（后者启动者胜）
    try {
      const recorded = fs.readFileSync(PID_FILE, "utf8").trim();
      if (recorded && recorded !== String(process.pid)) {
        log(`injector pid ${recorded} took over per pid file; exiting`);
        process.exit(0);
      }
    } catch {}
    let targets;
    try {
      targets = await listPageTargets(args.port, args.timeoutMs);
      cdpFailures = 0;
    } catch (error) {
      cdpFailures += 1;
      if (cdpFailures % 15 === 0) log(`cdp unreachable (${cdpFailures}): ${error.message}`);
      if (cdpFailures >= 60) {
        log("cdp gone for ~2 minutes, watcher exits");
        process.exit(0);
      }
      return;
    }

    const liveIds = new Set(targets.map((t) => t.id));
    for (const [id, entry] of sessions) {
      if (!liveIds.has(id) || entry.session.closed) {
        entry.session.close();
        sessions.delete(id);
      }
    }

    for (const target of targets) {
      const entry = sessions.get(target.id);
      if (!entry) {
        try {
          await injectTarget(target);
        } catch (error) {
          log(`connect/inject failed ${target.id}: ${error.message}`);
        }
        continue;
      }
      const stamp = await getStamp(entry.session);
      if (stamp !== VERSION) {
        try {
          const r = await injectInto(entry.session, payload);
          log(`re-injected (stale stamp) ${target.id} -> ${JSON.stringify(r)}`);
        } catch (error) {
          log(`re-inject failed ${target.id}: ${error.message}`);
          entry.session.close();
          sessions.delete(target.id);
        }
      }
      // 画廊面板里的选择同步回 theme.conf（CLI 与 App 内选择保持一致）
      const selected = await readPageTheme(entry.session);
      if (selected && selected !== readThemeConf()) {
        writeThemeConf(selected);
        log(`theme selection synced: ${selected}`);
      }
    }

    // 页面画廊请求重载主题目录（新主题热加载）
    const firstEntry = sessions.values().next().value;
    if (firstEntry && !firstEntry.session.closed) {
      let request = null;
      try {
        const r = await firstEntry.session.send("Runtime.evaluate", {
          expression: "window.__TRAE_DREAM_SKIN_RELOAD_REQUEST__ || null",
          returnByValue: true,
        }, 4000);
        request = r.result?.value ?? null;
      } catch {}
      if (!reloadPrimed) {
        // 守护进程启动时不触发重载，只记录页面里可能存在的旧请求
        reloadPrimed = true;
        lastReloadRequest = request;
      } else if (request && request !== lastReloadRequest) {
        lastReloadRequest = request;
        try {
          payload = buildPayload(args);
          for (const entry of sessions.values()) {
            if (entry.session.closed) continue;
            try {
              await injectInto(entry.session, payload);
            } catch (error) {
              log(`reload re-inject failed ${entry.target.id}: ${error.message}`);
            }
          }
          await firstEntry.session.send("Runtime.evaluate", {
            expression: "window.__TRAE_DREAM_SKIN_GALLERY__?.open?.()",
            returnByValue: true,
          }, 4000).catch(() => {});
          log("theme catalog reloaded on page request");
        } catch (error) {
          log(`theme reload failed: ${error.message}`);
        }
      }
    }
  };

  log(`watching port ${args.port}, skin version ${VERSION}`);
  await tick();
  enableOnStartup = false;
  setInterval(tick, 2000);
}

const args = parseArgs(process.argv.slice(2));
switch (args.mode) {
  case "list": await cmdList(args); break;
  case "eval": await cmdEval(args); break;
  case "shot": await cmdShot(args); break;
  case "apply": await cmdApply(args, buildPayload(args)); break;
  case "current": await cmdCurrent(args); break;
  case "once": await cmdOnce(args, buildPayload(args)); break;
  case "watch": await cmdWatch(args, buildPayload(args)); break;
}
