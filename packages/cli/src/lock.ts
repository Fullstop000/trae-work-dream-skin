import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { CliError } from "./errors.js";
import { pidAlive } from "./system.js";
import type { CliContext } from "./types.js";

interface LockOwner {
  pid?: number;
}

function acquireLock(context: CliContext, command: string): () => void {
  fs.mkdirSync(path.dirname(context.paths.lockFile), { recursive: true });
  const attempt = () => {
    const descriptor = fs.openSync(context.paths.lockFile, "wx", 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, command, createdAt: new Date().toISOString() })}\n`);
    fs.closeSync(descriptor);
  };

  try {
    attempt();
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
    let owner: LockOwner | null = null;
    try { owner = JSON.parse(fs.readFileSync(context.paths.lockFile, "utf8")) as LockOwner; } catch {}
    if (owner?.pid && pidAlive(Number(owner.pid))) {
      throw new CliError("LOCKED", 6, `另一个 twskin 命令正在执行（PID ${owner.pid}）。`, "请等待它完成后重试。");
    }
    try { fs.unlinkSync(context.paths.lockFile); } catch {}
    try { attempt(); } catch {
      throw new CliError("LOCKED", 6, "另一个 twskin 命令正在执行。", "请稍后重试。");
    }
  }
  return () => { try { fs.unlinkSync(context.paths.lockFile); } catch {} };
}

export async function withLock<T>(context: CliContext, command: string, operation: () => Promise<T> | T): Promise<T> {
  const release = acquireLock(context, command);
  try { return await operation(); } finally { release(); }
}
