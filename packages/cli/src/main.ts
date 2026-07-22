import process from "node:process";
import {
  doctorCommand,
  downloadThemeCommand,
  helpText,
  loadThemeCommand,
  startCommand,
  statusCommand,
  themeCommand,
  themesCommand,
  restoreCommand,
  uninstallCommand,
} from "./commands.js";
import { createContext } from "./context.js";
import { asCliError, CliError } from "./errors.js";
import { emit, emitError } from "./output.js";
import type { CliOptions } from "./types.js";

export interface ParsedArguments {
  command: string;
  args: string[];
  options: CliOptions;
}

export function parseArgs(argv: readonly string[]): ParsedArguments {
  const options = { json: false, yes: false, help: false };
  const positional: string[] = [];
  for (const argument of argv) {
    if (argument === "--json") options.json = true;
    else if (argument === "--yes" || argument === "-y") options.yes = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument.startsWith("-")) throw new CliError("UNKNOWN_OPTION", 2, `未知选项：${argument}`, "运行 twskin help 查看用法。");
    else positional.push(argument);
  }
  return { command: positional[0] || "help", args: positional.slice(1), options };
}

export async function run(argv: readonly string[] = process.argv.slice(2), environment: NodeJS.ProcessEnv = process.env): Promise<void> {
  const context = createContext(environment);
  let parsed;
  try {
    parsed = parseArgs(argv);
    if (parsed.options.help) parsed.command = "help";
    const knownCommands = new Set(["start", "status", "themes", "theme", "doctor", "restore", "uninstall", "unisntall", "version", "help"]);
    if (!knownCommands.has(parsed.command)) throw new CliError("UNKNOWN_COMMAND", 2, `未知命令：${parsed.command}`, "运行 twskin help 查看用法。");
    const [first, ...rest] = parsed.args;
    if (parsed.command !== "theme" && parsed.command !== "help" && parsed.args.length) {
      throw new CliError("TOO_MANY_ARGUMENTS", 2, "参数过多。", "运行 twskin help 查看用法。");
    }
    switch (parsed.command) {
      case "start": await startCommand(context, parsed.options); break;
      case "status": await statusCommand(context, parsed.options); break;
      case "themes": themesCommand(context, parsed.options); break;
      case "theme":
        if (first === "download") {
          if (rest.length > 1) throw new CliError("TOO_MANY_ARGUMENTS", 2, "参数过多。", "用法：twskin theme download [id]");
          await downloadThemeCommand(context, rest[0], parsed.options);
        } else if (first === "load") {
          if (rest.length !== 1) throw new CliError(rest.length ? "TOO_MANY_ARGUMENTS" : "THEME_SOURCE_REQUIRED", 2, rest.length ? "参数过多。" : "缺少本地主题目录。", "用法：twskin theme load <directory>");
          await loadThemeCommand(context, rest[0], parsed.options);
        } else {
          if (rest.length) throw new CliError("TOO_MANY_ARGUMENTS", 2, "参数过多。", "用法：twskin theme <id>");
          await themeCommand(context, first, parsed.options);
        }
        break;
      case "doctor": await doctorCommand(context, parsed.options); break;
      case "restore": await restoreCommand(context, parsed.options); break;
      case "uninstall":
      case "unisntall": await uninstallCommand(context, parsed.options); break;
      case "version": emit({ command: "version", version: context.packageVersion }, `twskin ${context.packageVersion}`, parsed.options.json); break;
      case "help": console.log(helpText(context).trimEnd()); break;
    }
  } catch (error) {
    const cliError = asCliError(error);
    const json = parsed?.options?.json ?? false;
    if (!(cliError.code === "CANCELLED" && !json && process.stdout.isTTY)) emitError(cliError, json);
    process.exitCode = cliError.exitCode;
  }
}
