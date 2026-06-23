import { execFileSync } from "node:child_process";

const runNode = (args) => {
  execFileSync(process.execPath, args, { stdio: "inherit" });
};

const runNpm = (args) => {
  if (!process.env.npm_execpath) {
    throw new Error("npm_execpath is required to run npm scripts.");
  }

  runNode([process.env.npm_execpath, ...args]);
};

if (process.env.VERCEL_ENV === "production") {
  runNpm(["run", "db:migrate:deploy"]);
}

runNode(["node_modules/next/dist/bin/next", "build"]);
