import { rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const port = process.env.PORT || "3000";

function run(command, args) {
  return spawnSync(command, args, {
    stdio: "ignore",
    shell: false,
  });
}

function killPort(portNumber) {
  if (process.platform === "win32") {
    spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${portNumber} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`,
      ],
      { stdio: "ignore" }
    );
    return;
  }

  const result = spawnSync("lsof", ["-ti", `tcp:${portNumber}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const pids = result.stdout
    .split(/\s+/)
    .map((pid) => pid.trim())
    .filter(Boolean);

  for (const pid of pids) {
    run("kill", ["-9", pid]);
  }
}

killPort(port);
rmSync(".next", { recursive: true, force: true });

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(npmCommand, ["run", "dev"], {
  stdio: "inherit",
  shell: false,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
