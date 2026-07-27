import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.dirname(SCRIPT_DIR);
const RUNTIME_DIR = path.join(PACKAGE_ROOT, "runtime");
const manifestFile = path.join(RUNTIME_DIR, "manifest.json");
const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"));

function fail(message) {
  console.error(`package check failed: ${message}`);
  process.exitCode = 1;
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.isFile()) files.push(absolute);
    else if (entry.isSymbolicLink()) fail(`symlink is not allowed in package payload: ${absolute}`);
  }
  return files;
}

if (pkg.name !== "@byted-relic/twskin") fail("unexpected package name");
if (pkg.bin?.twskin !== "dist/bin/twskin.js") fail("twskin bin mapping is missing");
if (!pkg.dependencies?.["@clack/prompts"]) fail("@clack/prompts runtime dependency is missing");
if (!pkg.dependencies?.["jsonc-parser"]) fail("jsonc-parser runtime dependency is missing");
if (pkg.files?.includes("src/") || pkg.files?.includes("bin/")) fail("TypeScript source or legacy bin directory leaked into the publish payload");
if (pkg.engines?.node !== ">=22.0.0") fail("Node engine must track supported LTS releases");
if (!pkg.os?.includes("darwin")) fail("macOS platform constraint is missing");
if (!fs.existsSync(manifestFile)) fail("runtime manifest is missing; run npm run prepare:runtime");

for (const directory of ["dist", "scripts", "test"]) {
  const root = path.join(PACKAGE_ROOT, directory);
  if (!fs.existsSync(root)) { fail(`missing directory: ${directory}`); continue; }
  for (const file of walk(root).filter((candidate) => candidate.endsWith(".mjs") || candidate.endsWith(".js"))) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) fail(`syntax error in ${path.relative(PACKAGE_ROOT, file)}\n${result.stderr}`);
  }
}

if (fs.existsSync(manifestFile)) {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest.schemaVersion !== 1) fail("unsupported runtime manifest schema");
  if (manifest.packageVersion !== pkg.version) fail("runtime/package version mismatch");
  if (manifest.themesBundled !== false) fail("CLI runtime must not bundle themes");
  if (fs.existsSync(path.join(RUNTIME_DIR, "themes"))) fail("themes leaked into the CLI runtime");
  for (const entry of manifest.files || []) {
    const file = path.join(RUNTIME_DIR, entry.path);
    if (!fs.existsSync(file)) { fail(`manifest file is missing: ${entry.path}`); continue; }
    const content = fs.readFileSync(file);
    const digest = crypto.createHash("sha256").update(content).digest("hex");
    if (content.byteLength !== entry.size || digest !== entry.sha256) fail(`integrity mismatch: ${entry.path}`);
    if (/(^|\/).*(?:-source|background-(?:v\d+|action|handgun))/i.test(entry.path)) {
      fail(`source or alternative artwork leaked into package: ${entry.path}`);
    }
  }
  const declared = new Set((manifest.files || []).map((entry) => entry.path));
  const actual = walk(RUNTIME_DIR)
    .map((file) => path.relative(RUNTIME_DIR, file).split(path.sep).join("/"))
    .filter((file) => file !== "manifest.json");
  for (const file of actual) if (!declared.has(file)) fail(`runtime file is missing from manifest: ${file}`);
}

if (!process.exitCode) console.log(`package check passed: ${pkg.name}@${pkg.version}`);
