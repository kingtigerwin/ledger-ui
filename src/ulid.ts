const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** A client-made ID, so saving the same transaction twice records it once. */
export function newUlid(now = Date.now()): string {
  let time = ''
  for (let rest = now, i = 0; i < 10; i++) {
    time = ALPHABET[rest % 32] + time
    rest = Math.floor(rest / 32)
  }
  // 256 is a multiple of 32, so taking the remainder keeps every character equally likely.
  const random = Array.from(crypto.getRandomValues(new Uint8Array(16)))
  return time + random.map((byte) => ALPHABET[byte % 32]).join('')
}
