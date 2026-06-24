import { spawnSync } from "node:child_process";

const runNode = (args) => {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runNpm = (args, options = {}) => {
  if (!process.env.npm_execpath) {
    throw new Error("npm_execpath is required to run npm scripts.");
  }

  const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
    env: { ...process.env, ...options.env },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

if (process.env.VERCEL_ENV === "production" && process.env.MIGRATE_DATABASE_URL) {
  runNpm(["run", "db:migrate:deploy"], {
    env: { DATABASE_URL: process.env.MIGRATE_DATABASE_URL },
  });
}

runNode(["node_modules/next/dist/bin/next", "build"]);
