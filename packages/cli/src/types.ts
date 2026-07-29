export type Distribution = "development" | "npm" | "standalone" | string;

export interface CliPaths {
  themeConf: string;
  pidFile: string;
  portFile: string;
  cdpConfigState: string;
  lockFile: string;
  logFile: string;
  runtimeManifest: string;
  catalogCache: string;
  catalogState: string;
  themeUpdateSettings: string;
  themeSyncState: string;
}

export interface AppContext {
  bundle: string;
  bundleId: string;
  processMatch: string;
  argvFile?: string;
}

export interface CliContext {
  env: NodeJS.ProcessEnv;
  packageName: string;
  packageVersion: string;
  packageRoot: string;
  runtimeRoot: string;
  dataDir: string;
  stateDir: string;
  themesDir: string;
  distribution: Distribution;
  paths: Readonly<CliPaths>;
  app: Readonly<AppContext>;
}

export interface CliOptions {
  json: boolean;
  yes: boolean;
  help: boolean;
  dryRun: boolean;
}

export interface ThemeManifest extends Record<string, unknown> {
  schemaVersion?: number;
  id?: string;
  version?: string;
  engines?: { twskin?: string };
  name?: string;
  desc?: string;
}

export interface ThemeDirectory {
  id: string;
  version: string;
  compatibleCli: string | null;
  name: string;
  desc: string;
  manifest: ThemeManifest;
  background: string;
  source: string;
}

export interface InstalledTheme extends ThemeDirectory {
  installed: boolean;
  target: string;
}

export interface ThemeSummary {
  id: string;
  version: string;
  name: string;
  desc: string;
  invalid?: boolean;
}
