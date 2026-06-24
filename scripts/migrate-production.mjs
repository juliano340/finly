import { spawnSync } from "node:child_process";
import { spawn } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });
const tunnelPort = "15432";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  const password = await rl.question("Senha do finly_migrator: ");
  const encodedPassword = encodeURIComponent(password);
  const databaseUrl = `postgresql://finly_migrator:${encodedPassword}@127.0.0.1:${tunnelPort}/finly_production?schema=public`;

  console.log("Abrindo tunel SSH para o Postgres da VPS...");
  const tunnel = spawn("ssh", [
    "-N",
    "-L",
    `${tunnelPort}:127.0.0.1:5432`,
    "root@api.juliano340.com",
  ], {
    stdio: "ignore",
    windowsHide: true,
  });

  let tunnelError;
  tunnel.on("error", (error) => {
    tunnelError = error;
  });

  await wait(1500);

  if (tunnelError) {
    throw tunnelError;
  }

  try {
    const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });

    if (result.error) {
      throw result.error;
    }

    process.exit(result.status ?? 0);
  } finally {
    tunnel.kill();
  }
} finally {
  rl.close();
}
