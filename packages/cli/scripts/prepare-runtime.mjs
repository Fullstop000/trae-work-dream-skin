import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.dirname(SCRIPT_DIR);
const RUNTIME_DIR = path.join(PACKAGE_ROOT, "runtime");
const PACKAGE = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"));

const RUNTIME_FILES = [
  "injector.mjs",
  "skin.js",
  "token-map.mjs",
  "component-map.mjs",
  "styles/base.css",
  "styles/manager.css",
  "start.sh",
  "restore.sh",
];

function walkFiles(directory, prefix = "") {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute, relative));
    else if (entry.isFile() && relative !== "manifest.json") files.push(relative);
    else if (entry.isSymbolicLink()) throw new Error(`runtime must not contain symlinks: ${relative}`);
  }
  return files.sort();
}

function createManifest() {
  const files = walkFiles(RUNTIME_DIR).map((relativePath) => {
    const content = fs.readFileSync(path.join(RUNTIME_DIR, relativePath));
    return {
      path: relativePath,
      size: content.byteLength,
      sha256: crypto.createHash("sha256").update(content).digest("hex"),
    };
  });
  const manifest = {
    schemaVersion: 1,
    packageVersion: PACKAGE.version,
    themesBundled: false,
    files,
  };
  fs.writeFileSync(path.join(RUNTIME_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
  return manifest;
}

for (const file of RUNTIME_FILES) {
  if (!fs.existsSync(path.join(RUNTIME_DIR, file))) throw new Error(`missing runtime file: ${file}`);
}
const manifest = createManifest();
console.log(`prepared runtime ${PACKAGE.version}: ${manifest.files.length} files, themes external`);
