/**
 * PDF → plain text.
 * Используется только на сервере (Node.js), не импортировать в клиентский код.
 */

export async function parsePdfToText(buffer: Buffer): Promise<string> {
  // Динамический импорт чтобы не попасть в клиентский бандл
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import('pdf-parse') as any
  const pdfParse = mod.default ?? mod
  const result = await pdfParse(buffer)
  return result.text ?? ''
}
