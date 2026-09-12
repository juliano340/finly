import type { ZodError } from "zod"

export function mapZodErrors(error: ZodError, fieldMap: Record<string, string>) {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = fieldMap[String(issue.path[0])]
    if (key && !errors[key]) errors[key] = issue.message
  }
  return errors
}
