export function generateRuntimeUuid(): string {
  const runtimeCrypto = globalThis.crypto;

  if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function') {
    return runtimeCrypto.randomUUID();
  }

  if (runtimeCrypto && typeof runtimeCrypto.getRandomValues === 'function') {
    const bytes = runtimeCrypto.getRandomValues(new Uint8Array(16));
    // Set UUID v4 version and variant bits.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Last-resort fallback for constrained runtimes.
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}
