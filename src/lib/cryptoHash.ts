/** SHA-256 hex digest of a string or ArrayBuffer (Web Crypto). */
export async function sha256Hex(input: string | ArrayBuffer): Promise<string> {
  const data = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function sha256Blob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  return sha256Hex(buf)
}
