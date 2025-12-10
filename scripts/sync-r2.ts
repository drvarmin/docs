import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

// ------------ config / env ------------

const {
  R2_ACCOUNT_ID,
  R2_BUCKET,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
} = process.env;

const DRY_RUN = false;

if (!R2_ACCOUNT_ID) throw new Error("R2_ACCOUNT_ID is required");
if (!R2_BUCKET) throw new Error("R2_BUCKET is required");
if (!R2_ACCESS_KEY_ID) throw new Error("R2_ACCESS_KEY_ID is required");
if (!R2_SECRET_ACCESS_KEY) throw new Error("R2_SECRET_ACCESS_KEY is required");

// ------------ assemble files ------------

async function assembleFiles(targetDir: string): Promise<number> {
  const sourceRoot = path.resolve("public");

  // Collect every .md (case-insensitive) file under public/
  const collectMdFiles = async (root: string): Promise<string[]> => {
    const stack: Array<{ dir: string; rel: string }> = [
      { dir: root, rel: "" },
    ];
    const results: string[] = [];

    while (stack.length) {
      const { dir, rel } = stack.pop()!;
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const absPath = path.join(dir, entry.name);
        const relPath = path.join(rel, entry.name);

        if (entry.isDirectory()) {
          stack.push({ dir: absPath, rel: relPath });
          continue;
        }

        if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") {
          results.push(relPath);
        }
      }
    }

    return results;
  };

  const mdFiles = await collectMdFiles(sourceRoot);

  if (mdFiles.length === 0) {
    throw new Error(
      `No .md files found under ${sourceRoot}. Did you run bun run generate:md?`
    );
  }

  let copiedCount = 0;

  for (const relPath of mdFiles) {
    const segments = relPath.split(path.sep);

    // Expect at least <root>/<...>/file.md
    if (segments.length < 2) {
      console.warn(
        `(assembleFiles) Skipping ${relPath} because it is not under a root folder`
      );
      continue;
    }

    const rootFolder = segments[0];
    const rest = segments.slice(1);
    const flattenedName = rest.join("__");

    const destinationDir = path.join(targetDir, rootFolder);
    const destinationPath = path.join(destinationDir, flattenedName);
    const sourcePath = path.join(sourceRoot, relPath);

    await fs.promises.mkdir(destinationDir, { recursive: true });
    await fs.promises.copyFile(sourcePath, destinationPath);
    copiedCount += 1;
  }

  if (copiedCount === 0) {
    throw new Error(
      `Found ${mdFiles.length} .md files but none were prepared for upload. Aborting sync to avoid deleting remote contents.`
    );
  }

  return copiedCount;
}

// ------------ aws s3 sync wrapper ------------

function runAwsSync(
  localDir: string,
  options: {
    accountId: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    dryRun?: boolean;
  }
): Promise<void> {
  const { accountId, bucket, accessKeyId, secretAccessKey, dryRun } =
    options;

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  const destination = `s3://${bucket}`;

  const args = [
    "s3",
    "sync",
    localDir,
    destination,
    "--delete",
    "--endpoint-url",
    endpoint,
    "--size-only", // 👈 only re-upload when size changes to approximate only syncing when content changes
  ];

  if (dryRun) {
    args.push("--dryrun");
  }

  console.log(`Running: aws ${args.join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn("aws", args, {
      stdio: "inherit", // pipe aws stdout/stderr to this process
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: accessKeyId,
        AWS_SECRET_ACCESS_KEY: secretAccessKey,
        AWS_REGION: "auto",
        AWS_EC2_METADATA_DISABLED: "true",
      },
    });

    child.on("error", (err) => {
      reject(
        new Error(
          `Failed to start aws CLI (is it installed and on PATH?): ${err.message}`
        )
      );
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`aws s3 sync exited with code ${code}`));
      }
    });
  });
}

// ------------ main ------------

async function main() {
  // Make a temp dir for this run
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "r2-sync-"));
  console.log(`Using temp dir: ${tmpDir}`);

  try {
    // 1. assemble files into tmpDir
    const copiedCount = await assembleFiles(tmpDir);
    console.log(`Prepared ${copiedCount} .md files for sync`);

    // 2. run aws s3 sync
    await runAwsSync(tmpDir, {
      accountId: R2_ACCOUNT_ID!,
      bucket: R2_BUCKET!,
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
      dryRun: DRY_RUN,
    });

    console.log("✅ Sync completed");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log(`Cleaned up temp dir: ${tmpDir}`);
  }
}

main().catch((err) => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});
