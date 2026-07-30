import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error("Usage: node scripts/next-with-system-ca.mjs <dev|start> [...args]");
  process.exit(1);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const currentNodeOptions = process.env.NODE_OPTIONS ?? "";
const nodeOptions = currentNodeOptions.includes("--use-system-ca")
  ? currentNodeOptions
  : `${currentNodeOptions} --use-system-ca`.trim();

function normalizedEnv() {
  const env = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (process.platform === "win32") {
      const existingKey = Object.keys(env).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
      if (existingKey) {
        if (existingKey === "Path" || existingKey === "PATH") continue;
        delete env[existingKey];
      }
    }

    env[key] = value;
  }

  env.NODE_OPTIONS = nodeOptions;
  return env;
}

const child = spawn(process.execPath, [nextCli, command, ...args], {
  cwd: projectRoot,
  env: normalizedEnv(),
  shell: false,
  stdio: "inherit"
});

child.on("error", (error) => {
  console.error(`Failed to start Next.js: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
