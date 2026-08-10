import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function runCommand(args, options = {}) {
  const result = spawnSync(process.execPath, args, {
    env: options.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${options.label ?? "Command"} failed with exit code ${result.status ?? 1}.`);
  }
}

export function runVercelBuild(env = process.env) {
  let buildEnv = env;

  if (env.VERCEL_ENV === "production") {
    const migrateDatabaseUrl = env.MIGRATE_DATABASE_URL?.trim();
    if (!migrateDatabaseUrl) {
      throw new Error("MIGRATE_DATABASE_URL is required for production builds.");
    }
    if (!env.npm_execpath) {
      throw new Error("npm_execpath is required to run production migrations.");
    }

    const privilegedEnv = {
      ...env,
      DATABASE_URL: migrateDatabaseUrl,
    };
    buildEnv = { ...env };
    delete buildEnv.MIGRATE_DATABASE_URL;

    runCommand([env.npm_execpath, "run", "db:migrate:deploy"], {
      env: privilegedEnv,
      label: "Production migration",
    });
    runCommand(["scripts/verify-production-schema.mjs"], {
      env: privilegedEnv,
      label: "Production schema smoke",
    });
  }

  runCommand(["node_modules/next/dist/bin/next", "build"], {
    env: buildEnv,
    label: "Next build",
  });
}

const isMainModule = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMainModule) {
  try {
    runVercelBuild();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Build pipeline failed.");
    process.exitCode = 1;
  }
}
