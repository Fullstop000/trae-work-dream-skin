export type Distribution = "development" | "npm" | "standalone" | string;

export interface CliPaths {
  themeConf: string;
  pidFile: string;
  portFile: string;
  lockFile: string;
  logFile: string;
  runtimeManifest: string;
}

export interface AppContext {
  bundle: string;
  bundleId: string;
  processMatch: string;
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
}

export interface ThemeManifest extends Record<string, unknown> {
  id?: string;
  name?: string;
  desc?: string;
}

export interface ThemeDirectory {
  id: string;
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
  name: string;
  desc: string;
  invalid?: boolean;
}
