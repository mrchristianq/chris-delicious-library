import { existsSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const apiDir = path.join(root, "app", "api");
const hiddenApiDir = path.join(root, ".native-build-api-disabled");

if (existsSync(hiddenApiDir)) {
  throw new Error(`Refusing to build: temporary API backup already exists at ${hiddenApiDir}`);
}

let moved = false;

try {
  if (existsSync(apiDir)) {
    renameSync(apiDir, hiddenApiDir);
    moved = true;
  }

  const result = spawnSync("npx", ["next", "build"], {
    cwd: root,
    env: {
      ...process.env,
      NEXT_PUBLIC_NATIVE_APP: "true",
      STATIC_EXPORT: "true",
    },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
} finally {
  if (moved && existsSync(hiddenApiDir)) {
    renameSync(hiddenApiDir, apiDir);
  }
}
