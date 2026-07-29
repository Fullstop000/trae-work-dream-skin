import process from "node:process";
import { Command, CommanderError } from "commander";
import {
  doctorCommand,
  checkThemeCommand,
  downloadThemeCommand,
  helpText,
  loadThemeCommand,
  autoUpdateThemeCommand,
  autoSyncThemeCommand,
  startCommand,
  statusCommand,
  stopCommand,
  themeCommand,
  syncThemeCommand,
  themesCommand,
  restoreCommand,
  uninstallCommand,
} from "./commands.js";
import { createContext } from "./context.js";
import { asCliError, CliError } from "./errors.js";
import { emit, emitError } from "./output.js";
import type { CliContext, CliOptions } from "./types.js";

interface CommanderOptions {
  json?: boolean;
  yes?: boolean;
  help?: boolean;
  version?: boolean;
  dryRun?: boolean;
  dryrun?: boolean;
}

const COMMANDS = new Set(["start", "stop", "status", "themes", "theme", "doctor", "restore", "uninstall", "version", "help"]);

class MetaOutput extends Error {}

function cliOptions(command: Command): CliOptions {
  const options = command.optsWithGlobals<CommanderOptions>();
  return { json: Boolean(options.json), yes: Boolean(options.yes), help: Boolean(options.help), dryRun: Boolean(options.dryRun || options.dryrun) };
}

function optionName(error: CommanderError): string {
  return error.message.match(/'([^']+)'/)?.[1] || "";
}

function emitRequestedMeta(context: CliContext, command: Command): void {
  const options = cliOptions(command);
  if (options.help) {
    console.log(helpText(context).trimEnd());
    throw new MetaOutput();
  }
  if (command.optsWithGlobals<CommanderOptions>().version) {
    emit({ command: "version", version: context.packageVersion, ...(options.dryRun ? { dryRun: true } : {}) }, `twskin ${context.packageVersion}`, options.json);
    throw new MetaOutput();
  }
}

function tooManyArguments(usage: string): never {
  throw new CliError("TOO_MANY_ARGUMENTS", 2, "参数过多。", usage);
}

async function runThemeCommand(context: CliContext, args: string[], options: CliOptions): Promise<void> {
  const [first, ...rest] = args;
  const subcommands = new Map<string, (commandArgs: string[]) => Promise<void>>([
    ["download", async (commandArgs) => {
      if (commandArgs.length > 1) tooManyArguments("用法：twskin theme download [id]");
      await downloadThemeCommand(context, commandArgs[0], options);
    }],
    ["check", async (commandArgs) => {
      if (commandArgs.length) tooManyArguments("用法：twskin theme check");
      await checkThemeCommand(context, options);
    }],
    ["sync", async (commandArgs) => {
      if (commandArgs.length) tooManyArguments("用法：twskin theme sync");
      await syncThemeCommand(context, options);
    }],
    ["auto-sync", async (commandArgs) => {
      if (commandArgs.length) tooManyArguments("用法：twskin theme auto-sync");
      await autoSyncThemeCommand(context, options);
    }],
    ["auto-update", async (commandArgs) => {
      if (commandArgs.length !== 1) {
        if (commandArgs.length) tooManyArguments("用法：twskin theme auto-update <on|off>");
        throw new CliError("AUTO_UPDATE_VALUE_INVALID", 2, "缺少 on 或 off。", "用法：twskin theme auto-update <on|off>");
      }
      autoUpdateThemeCommand(context, commandArgs[0], options);
    }],
    ["load", async (commandArgs) => {
      if (commandArgs.length !== 1) {
        if (commandArgs.length) tooManyArguments("用法：twskin theme load <directory>");
        throw new CliError("THEME_SOURCE_REQUIRED", 2, "缺少本地主题目录。", "用法：twskin theme load <directory>");
      }
      await loadThemeCommand(context, commandArgs[0], options);
    }],
  ]);
  const subcommand = first ? subcommands.get(first) : undefined;
  if (subcommand) {
    await subcommand(rest);
    return;
  }
  if (rest.length) tooManyArguments("用法：twskin theme <id>");
  await themeCommand(context, first, options);
}

function createProgram(context: CliContext): Command {
  const program = new Command()
    .name("twskin")
    .option("--json")
    .option("-y, --yes")
    .option("-h, --help")
    .option("-V, --version")
    .option("--dry-run")
    .option("--dryrun")
    .exitOverride()
    .configureOutput({ writeOut: () => undefined, writeErr: () => undefined })
    .hook("preAction", (_thisCommand, actionCommand) => emitRequestedMeta(context, actionCommand))
    .action(() => console.log(helpText(context).trimEnd()));

  program.command("start").action(async (_options, command) => startCommand(context, cliOptions(command)));
  program.command("stop").action(async (_options, command) => stopCommand(context, cliOptions(command)));
  program.command("status").action(async (_options, command) => statusCommand(context, cliOptions(command)));
  program.command("themes").action((_options, command) => themesCommand(context, cliOptions(command)));
  program.command("theme [args...]").action(async (args: string[], _options, command) => runThemeCommand(context, args, cliOptions(command)));
  program.command("doctor").action(async (_options, command) => doctorCommand(context, cliOptions(command)));
  program.command("restore").action(async (_options, command) => restoreCommand(context, cliOptions(command)));
  program.command("uninstall").action(async (_options, command) => uninstallCommand(context, cliOptions(command)));
  program.command("version").action((_options, command) => {
    const options = cliOptions(command);
    emit({ command: "version", version: context.packageVersion, ...(options.dryRun ? { dryRun: true } : {}) }, `twskin ${context.packageVersion}`, options.json);
  });
  program.command("help [args...]").action(() => console.log(helpText(context).trimEnd()));

  return program;
}

function commanderError(error: CommanderError, program: Command): CliError {
  if (error.code === "commander.unknownOption") {
    return new CliError("UNKNOWN_OPTION", 2, `未知选项：${optionName(error)}`, "运行 twskin help 查看用法。");
  }
  const command = program.args[0];
  if (error.code === "commander.unknownCommand" || (error.code === "commander.excessArguments" && typeof command === "string" && !COMMANDS.has(command))) {
    return new CliError("UNKNOWN_COMMAND", 2, `未知命令：${optionName(error) || command}`, "运行 twskin help 查看用法。");
  }
  return new CliError("TOO_MANY_ARGUMENTS", 2, "参数过多。", "运行 twskin help 查看用法。");
}

export async function run(argv: readonly string[] = process.argv.slice(2), environment: NodeJS.ProcessEnv = process.env): Promise<void> {
  const context = createContext(environment);
  const program = createProgram(context);
  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (error) {
    if (error instanceof MetaOutput) return;
    const cliError = asCliError(error instanceof CommanderError ? commanderError(error, program) : error);
    const json = Boolean(program.opts<CommanderOptions>().json);
    if (!(cliError.code === "CANCELLED" && !json && process.stdout.isTTY)) emitError(cliError, json);
    process.exitCode = cliError.exitCode;
  }
}
