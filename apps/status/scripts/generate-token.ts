const bytes = crypto.getRandomValues(new Uint8Array(32))
const token = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
const tokenHash = [...new Uint8Array(digest)]
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('')

console.log(`token: ${token}`)
console.log(`sha256: ${tokenHash}`)

export {}
