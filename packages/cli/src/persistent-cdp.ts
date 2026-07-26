import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyEdits,
  modify,
  parse,
  printParseErrorCode,
} from "jsonc-parser";
import type { FormattingOptions, ParseError } from "jsonc-parser";
import { CliError } from "./errors.js";
import { atomicWrite } from "./system.js";
import type { CliContext } from "./types.js";

const CDP_KEY = "remote-debugging-port";

interface PersistentCdpState {
  schemaVersion: 1;
  argvFile: string;
  managedPort: number;
  previousExists: boolean;
  previousValue?: unknown;
}

export interface PersistentCdpResult {
  argvFile: string;
  managed: boolean;
  changed: boolean;
  port: number;
}

interface JsoncDocument {
  text: string;
  value: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formattingOptions(text: string): FormattingOptions {
  const tabIndented = /(?:^|\r?\n)\t+"/.test(text);
  return {
    insertSpaces: !tabIndented,
    tabSize: 2,
    eol: text.includes("\r\n") ? "\r\n" : "\n",
  };
}

function readJsonc(file: string): JsoncDocument {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "{}\n";
  const errors: ParseError[] = [];
  const value = parse(text, errors, { allowTrailingComma: true });
  if (errors.length || !isRecord(value)) {
    const detail = errors[0]
      ? `${printParseErrorCode(errors[0].error)} at offset ${errors[0].offset}`
      : "root value must be an object";
    throw new CliError(
      "APP_ARGV_INVALID",
      5,
      `TRAE 启动参数文件格式无效：${file}`,
      "请修复 argv.json 后重试。",
      detail,
    );
  }
  return { text, value };
}

function updateProperty(document: JsoncDocument, value: unknown): string {
  const edits = modify(document.text, [CDP_KEY], value, {
    formattingOptions: formattingOptions(document.text),
  });
  return applyEdits(document.text, edits);
}

function readState(context: CliContext): PersistentCdpState | null {
  if (!fs.existsSync(context.paths.cdpConfigState)) return null;
  try {
    const value = JSON.parse(fs.readFileSync(context.paths.cdpConfigState, "utf8")) as unknown;
    if (
      !isRecord(value)
      || value.schemaVersion !== 1
      || typeof value.argvFile !== "string"
      || !Number.isInteger(value.managedPort)
      || typeof value.previousExists !== "boolean"
    ) {
      throw new Error("invalid state shape");
    }
    return value as unknown as PersistentCdpState;
  } catch (error) {
    throw new CliError(
      "CDP_STATE_INVALID",
      5,
      `持久 CDP 状态文件无效：${context.paths.cdpConfigState}`,
      "删除该状态文件后重新运行 twskin start。",
      error instanceof Error ? error.message : String(error),
    );
  }
}

function writeState(context: CliContext, state: PersistentCdpState): void {
  atomicWrite(context.paths.cdpConfigState, `${JSON.stringify(state, null, 2)}\n`);
}

export function resolveAppArgvFile(context: CliContext, appBundle: string): string {
  if (context.app.argvFile) return context.app.argvFile;
  const productFile = path.join(appBundle, "Contents/Resources/app/product.json");
  try {
    const product = JSON.parse(fs.readFileSync(productFile, "utf8")) as { dataFolderName?: unknown };
    const folder = product.dataFolderName;
    if (
      typeof folder !== "string"
      || !folder
      || path.isAbsolute(folder)
      || path.basename(folder) !== folder
      || folder === "."
      || folder === ".."
    ) {
      throw new Error("product.json has no safe dataFolderName");
    }
    return path.join(os.homedir(), folder, "argv.json");
  } catch (error) {
    throw new CliError(
      "APP_ARGV_UNAVAILABLE",
      5,
      "无法定位 TRAE 的持久启动参数文件。",
      "确认 TRAE 安装完整后重试。",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function enablePersistentCdp(
  context: CliContext,
  appBundle: string,
  port: number,
): PersistentCdpResult {
  const argvFile = resolveAppArgvFile(context, appBundle);
  let state = readState(context);
  if (state && state.argvFile !== argvFile) {
    disablePersistentCdp(context);
    state = null;
  }

  const document = readJsonc(argvFile);
  const currentExists = Object.prototype.hasOwnProperty.call(document.value, CDP_KEY);
  const currentValue = document.value[CDP_KEY];
  if (!state && currentValue === String(port)) {
    return { argvFile, managed: false, changed: false, port };
  }

  const nextState: PersistentCdpState = state && currentValue === String(state.managedPort)
    ? { ...state, managedPort: port }
    : {
        schemaVersion: 1,
        argvFile,
        managedPort: port,
        previousExists: currentExists,
        ...(currentExists ? { previousValue: currentValue } : {}),
      };

  const updated = updateProperty(document, String(port));
  if (updated !== document.text) atomicWrite(argvFile, updated);
  try {
    writeState(context, nextState);
  } catch (error) {
    if (updated !== document.text) atomicWrite(argvFile, document.text);
    throw error;
  }
  return {
    argvFile,
    managed: true,
    changed: updated !== document.text,
    port,
  };
}

export function disablePersistentCdp(context: CliContext): { changed: boolean; argvFile: string | null } {
  const state = readState(context);
  if (!state) return { changed: false, argvFile: null };

  if (!fs.existsSync(state.argvFile)) {
    fs.unlinkSync(context.paths.cdpConfigState);
    return { changed: false, argvFile: state.argvFile };
  }

  const document = readJsonc(state.argvFile);
  const currentValue = document.value[CDP_KEY];
  let changed = false;
  if (currentValue === String(state.managedPort)) {
    const restored = updateProperty(
      document,
      state.previousExists ? state.previousValue : undefined,
    );
    if (restored !== document.text) {
      atomicWrite(state.argvFile, restored);
      changed = true;
    }
  }
  fs.unlinkSync(context.paths.cdpConfigState);
  return { changed, argvFile: state.argvFile };
}
