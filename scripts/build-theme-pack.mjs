import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copyThemePayload, discoverThemeDirectories } from "../packages/cli/dist/themes.js";

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PACKAGE = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "packages/cli/package.json"), "utf8"));
const DIST = path.join(REPO_ROOT, "dist");
const STAGE = path.join(DIST, ".theme-pack-stage");
const TAG = `v${PACKAGE.version}`;
const BASENAME = `twskin-themes-${TAG}`;
const LATEST_BASENAME = "twskin-themes";

function digest(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function filesBelow(directory) {
  const files = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) files.push(file);
    }
  };
  visit(directory);
  return files.sort();
}

fs.mkdirSync(DIST, { recursive: true });
fs.rmSync(STAGE, { recursive: true, force: true });
try {
  const themes = discoverThemeDirectories(path.join(REPO_ROOT, "themes"));
  const records = [];
  for (const theme of themes) {
    const target = path.join(STAGE, "themes", theme.id);
    copyThemePayload(theme.source, target);
    records.push({
      id: theme.id,
      name: theme.name,
      files: filesBelow(target).map((file) => ({
        path: path.relative(target, file).split(path.sep).join("/"),
        size: fs.statSync(file).size,
        sha256: digest(file),
      })),
    });
  }
  const manifest = {
    schemaVersion: 1,
    packVersion: PACKAGE.version,
    releaseTag: TAG,
    compatibleCli: `>=${PACKAGE.version} <1.0.0`,
    themes: records,
  };
  fs.writeFileSync(path.join(STAGE, "theme-pack.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const archive = path.join(DIST, `${BASENAME}.tar.gz`);
  const checksum = path.join(DIST, `${BASENAME}.sha256`);
  const latestArchive = path.join(DIST, `${LATEST_BASENAME}.tar.gz`);
  const latestChecksum = path.join(DIST, `${LATEST_BASENAME}.sha256`);
  fs.rmSync(archive, { force: true });
  fs.rmSync(checksum, { force: true });
  fs.rmSync(latestArchive, { force: true });
  fs.rmSync(latestChecksum, { force: true });
  fs.rmSync(path.join(DIST, `trae-work-dream-skin-themes-${TAG}.tar.gz`), { force: true });
  fs.rmSync(path.join(DIST, `trae-work-dream-skin-themes-${TAG}.sha256`), { force: true });
  const tar = spawnSync("/usr/bin/tar", ["-czf", archive, "-C", STAGE, "theme-pack.json", "themes"], { encoding: "utf8" });
  if (tar.status !== 0) throw new Error(tar.stderr || "tar failed");
  const sha256 = digest(archive);
  fs.writeFileSync(checksum, `${sha256}  ${path.basename(archive)}\n`);
  fs.copyFileSync(archive, latestArchive);
  fs.writeFileSync(latestChecksum, `${sha256}  ${path.basename(latestArchive)}\n`);
  process.stdout.write(`${archive}\n${checksum}\n${latestArchive}\n${latestChecksum}\n${themes.length} themes · ${fs.statSync(archive).size} bytes · sha256 ${sha256}\n`);
} finally {
  fs.rmSync(STAGE, { recursive: true, force: true });
}
