import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import fg from "fast-glob";
import fs from "fs-extra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const directoriesToRemove = ["public/content", "public/images"];
const filePatterns = ["public/llm*.txt", "public/**/*.md"];

async function getIgnoredPaths(paths: string[]): Promise<Set<string>> {
  if (paths.length === 0) return new Set();

  return new Promise((resolve, reject) => {
    const child = spawn("git", ["check-ignore", "--stdin"], { cwd: rootDir });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      // git returns 0 when at least one path is ignored, 1 when none are ignored.
      if (code === 0 || code === 1) {
        const ignored = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        resolve(new Set(ignored));
        return;
      }

      reject(
        new Error(
          `git check-ignore failed with code ${code}${
            stderr ? `: ${stderr}` : ""
          }`,
        ),
      );
    });

    child.stdin.write(paths.join("\n"));
    child.stdin.end();
  });
}

async function removeDirectories(): Promise<void> {
  for (const relativeDir of directoriesToRemove) {
    const target = path.join(rootDir, relativeDir);

    if (await fs.pathExists(target)) {
      await fs.remove(target);
    //   console.log(`Removed directory: ${relativeDir}`);
    } else {
      console.log(`Skipped directory (not found): ${relativeDir}`);
    }
  }
}

async function removeFiles(): Promise<void> {
  for (const pattern of filePatterns) {
    const matches = await fg(pattern, {
      cwd: rootDir,
      onlyFiles: true,
      dot: true,
      absolute: false,
    });

    if (matches.length === 0) {
      console.log(`No files matched pattern: ${pattern}`);
      continue;
    }

    try {
      const ignored = await getIgnoredPaths(matches);
      const filesToRemove = matches.filter((relativePath) =>
        ignored.has(relativePath),
      );
      const keptCount = matches.length - filesToRemove.length;

      if (filesToRemove.length === 0) {
        console.log(
          `No git-ignored files matched pattern: ${pattern}. Kept ${keptCount} tracked/negated files.`,
        );
        continue;
      }

      const total = filesToRemove.length;
      let removed = 0;
      process.stdout.write(
        `Removing ${total} git-ignored files for pattern: ${pattern} (keeping ${keptCount} tracked/negated)...\r`,
      );

      for (const relativePath of filesToRemove) {
        const target = path.join(rootDir, relativePath);
        await fs.remove(target);
        removed += 1;
        process.stdout.write(
          `Removing ${removed}/${total} git-ignored files for pattern: ${pattern} (keeping ${keptCount})\r`,
        );
      }
      process.stdout.write(
        `Removed ${total}/${total} git-ignored files for pattern: ${pattern} (kept ${keptCount} tracked/negated)\n`,
      );
    } catch (error) {
      console.warn(
        `Unable to read git ignore rules. Skipping removal for pattern: ${pattern}.`,
      );
      console.warn(String(error));
    }
  }
}

async function main(): Promise<void> {
  await removeDirectories();
  await removeFiles();
  console.log("Cache clear complete.");
}

main().catch((error) => {
  console.error("Failed to clear generated public assets.");
  console.error(error);
  process.exit(1);
});


