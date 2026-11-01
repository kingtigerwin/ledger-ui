// Claude doesn't read more detail than this, and a phone's 5 MB photo would pass Lambda's request limit.
const MAX_EDGE = 1568
// ledger-agent refuses more than 1.5 million base64 characters.
const MAX_BASE64_LENGTH = 1_400_000
const QUALITIES = [0.85, 0.7, 0.5]

export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

/**
 * Re-encodes a photo as a small JPEG. Drawing it onto a canvas also drops its metadata, so the
 * location a phone stores in a photo never leaves the device. Rejects if the browser can't open
 * the format, as desktop Chrome can't with an iPhone's HEIC.
 */
export async function shrinkImage(file: File) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  Object.assign(canvas, fitWithin(bitmap.width, bitmap.height, MAX_EDGE))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No canvas')
  context.fillStyle = 'white'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  let base64 = ''
  for (const quality of QUALITIES) {
    base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1]
    if (base64.length <= MAX_BASE64_LENGTH) break
  }
  return { base64, mediaType: 'image/jpeg' }
}
