export const MAX_PDF_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_CSV_UPLOAD_BYTES = 5 * 1024 * 1024

const PDF_MAGIC_BYTES = "%PDF-"

export async function validatePdfUpload(file: File): Promise<string | null> {
  if (file.type !== "application/pdf") return "Arquivo não é um PDF"
  if (file.size === 0) return "Arquivo vazio"
  if (file.size > MAX_PDF_UPLOAD_BYTES) return "Arquivo excede o limite de 10 MB"
  const header = await file.slice(0, 5).text()
  if (!header.startsWith(PDF_MAGIC_BYTES)) return "Arquivo corrompido ou inválido"
  return null
}

export function validateCsvUpload(file: File): string | null {
  if (file.size === 0) return "Arquivo vazio"
  if (file.size > MAX_CSV_UPLOAD_BYTES) return "Arquivo excede o limite de 5 MB"
  return null
}
