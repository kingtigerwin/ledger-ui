import { shrinkImage } from './shrinkImage'

// ledger-agent refuses more than 4 million base64 characters of PDF: about 3 MB.
const MAX_PDF_BASE64_LENGTH = 4_000_000

/** A PDF the agent would refuse as too large; caught here so it isn't uploaded first. */
export class PdfTooLargeError extends Error {}

const isPdf = (file: File) =>
  file.type === 'application/pdf' || /\.pdf$/i.test(file.name)

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * What to send ledger-agent: a photo shrunk to a small JPEG, or a PDF as it is, since a browser
 * can't redraw one. ledger-agent checks its pages.
 */
export async function toUpload(file: File) {
  if (!isPdf(file)) return shrinkImage(file)
  const base64 = await readAsBase64(file)
  if (base64.length > MAX_PDF_BASE64_LENGTH) throw new PdfTooLargeError()
  return { base64, mediaType: 'application/pdf' }
}
