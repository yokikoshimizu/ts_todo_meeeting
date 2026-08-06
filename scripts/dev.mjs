import { spawn } from "node:child_process";

const children = [
  spawn(process.execPath, ["server/index.mjs"], {
    stdio: "inherit",
  }),
  spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
    { stdio: "inherit" },
  ),
];

let isShuttingDown = false;

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  for (const child of children) {
    child.kill();
  }
  process.exit(exitCode);
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (!isShuttingDown && code !== 0 && signal !== "SIGTERM") {
      shutdown(code ?? 1);
    }
  });
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
