// @vitest-environment node
import { spawnSync } from "node:child_process"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { runVercelBuild } from "../../scripts/vercel-build.mjs"

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}))

const mockedSpawnSync = vi.mocked(spawnSync)
const successfulRun = { error: undefined, status: 0 } as ReturnType<typeof spawnSync>

function productionEnv(migrateUrl?: string): NodeJS.ProcessEnv {
  return {
    VERCEL_ENV: "production",
    MIGRATE_DATABASE_URL: arguments.length === 0 ? "postgresql://secret" : migrateUrl,
    npm_execpath: "C:/npm/npm-cli.js",
  } as unknown as NodeJS.ProcessEnv
}

describe("Vercel production build", () => {
  beforeEach(() => {
    mockedSpawnSync.mockReset()
    mockedSpawnSync.mockReturnValue(successfulRun)
  })

  it.each([undefined, "", "   "])(
    "fails closed when MIGRATE_DATABASE_URL is %j",
    (migrateUrl) => {
      expect(() => runVercelBuild(productionEnv(migrateUrl))).toThrow(
        "MIGRATE_DATABASE_URL is required",
      )
      expect(mockedSpawnSync).not.toHaveBeenCalled()
    },
  )

  it("runs migrate, schema smoke, and Next build in order", () => {
    runVercelBuild(productionEnv())

    expect(mockedSpawnSync.mock.calls.map((call) => call[1])).toEqual([
      ["C:/npm/npm-cli.js", "run", "db:migrate:deploy"],
      ["scripts/verify-production-schema.mjs"],
      ["node_modules/next/dist/bin/next", "build"],
    ])

    const migrateEnv = mockedSpawnSync.mock.calls[0]?.[2]?.env
    const smokeEnv = mockedSpawnSync.mock.calls[1]?.[2]?.env
    expect(migrateEnv?.DATABASE_URL).toBe("postgresql://secret")
    expect(smokeEnv?.DATABASE_URL).toBe("postgresql://secret")
    expect(mockedSpawnSync.mock.calls[2]?.[2]?.env?.MIGRATE_DATABASE_URL).toBeUndefined()
  })

  it.each([0, 1])("stops when production step %i fails", (failedStep) => {
    const failure = { error: undefined, status: 17 + failedStep } as ReturnType<
      typeof spawnSync
    >
    if (failedStep === 0) mockedSpawnSync.mockImplementationOnce(() => failure)
    else {
      mockedSpawnSync.mockImplementationOnce(() => successfulRun)
      mockedSpawnSync.mockImplementationOnce(() => failure)
    }

    expect(() => runVercelBuild(productionEnv())).toThrow(/failed with exit code/)
    expect(mockedSpawnSync).toHaveBeenCalledTimes(failedStep + 1)
  })

  it("keeps non-production builds migration-free", () => {
    runVercelBuild({ VERCEL_ENV: "preview" } as unknown as NodeJS.ProcessEnv)

    expect(mockedSpawnSync).toHaveBeenCalledOnce()
    expect(mockedSpawnSync.mock.calls[0]?.[1]).toEqual([
      "node_modules/next/dist/bin/next",
      "build",
    ])
  })
})
