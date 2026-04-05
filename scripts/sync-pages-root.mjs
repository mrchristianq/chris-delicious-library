import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, "out");
const manifestPath = path.join(repoRoot, ".pages-generated.json");

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, prefix = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (/^screen ?shot/i.test(entry.name)) {
      continue;
    }

    const relativePath = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath, relativePath)));
      continue;
    }

    files.push(relativePath);
  }

  return files.sort();
}

async function removeIfPresent(relativePath) {
  const target = path.join(repoRoot, relativePath);
  if (!(await exists(target))) return;

  await fs.rm(target, { recursive: true, force: true });
}

async function copyOutToRoot(files) {
  for (const relativePath of files) {
    const source = path.join(outDir, relativePath);
    const target = path.join(repoRoot, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }
}

async function main() {
  if (!(await exists(outDir))) {
    throw new Error("Missing ./out. Run the GitHub Pages export build first.");
  }

  const previousManifest = (await exists(manifestPath))
    ? JSON.parse(await fs.readFile(manifestPath, "utf8"))
    : { generatedFiles: [] };

  const previousFiles = Array.isArray(previousManifest.generatedFiles)
    ? [...previousManifest.generatedFiles].sort((a, b) => b.length - a.length)
    : [];

  for (const relativePath of previousFiles) {
    await removeIfPresent(relativePath);
  }

  const generatedFiles = await walk(outDir);
  await copyOutToRoot(generatedFiles);

  await fs.writeFile(path.join(repoRoot, ".nojekyll"), "");

  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        generatedFiles: [...generatedFiles, ".nojekyll"],
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
