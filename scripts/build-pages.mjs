import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = process.cwd();
const apiDir = path.join(repoRoot, "app", "api");
const parkedApiDir = path.join(repoRoot, "app", "__pages_api_disabled__");
const outDir = path.join(repoRoot, "out");
const pagesBasePath = "/chris-delicious-library";

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function runBuild() {
  await new Promise((resolve, reject) => {
    const child = spawn("npx", ["next", "build"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        STATIC_EXPORT: "true",
        NEXT_PUBLIC_STATIC_SITE: "true",
        PAGES_BASE_PATH: pagesBasePath,
      },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(
        new Error(
          signal
            ? `Pages build terminated with signal ${signal}.`
            : `Pages build failed with exit code ${code}.`
        )
      );
    });
  });
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

async function rewriteExportedPaths() {
  if (!(await exists(outDir))) return;

  const textFilePattern = /\.(?:html|js|css|json|txt|xml|webmanifest)$/i;
  const files = await walk(outDir);
  const prefixPattern = /([("'=,:])\/(?!chris-delicious-library\/)(?=[A-Za-z0-9_])/g;

  for (const file of files) {
    if (!textFilePattern.test(file)) continue;

    const original = await fs.readFile(file, "utf8");
    const rewritten = original.replace(prefixPattern, `$1${pagesBasePath}/`);
    if (rewritten === original) continue;
    await fs.writeFile(file, rewritten);
  }
}

async function main() {
  const apiExists = await exists(apiDir);
  if (await exists(parkedApiDir)) {
    throw new Error("Found stale app/__pages_api_disabled__ directory. Restore it before running the Pages build.");
  }

  if (apiExists) {
    await fs.rename(apiDir, parkedApiDir);
  }

  try {
    await runBuild();
    await rewriteExportedPaths();
  } finally {
    if (await exists(parkedApiDir)) {
      await fs.rename(parkedApiDir, apiDir);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
