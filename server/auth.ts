// Parámetros del hash de contraseñas. Deben coincidir exactamente con scripts/create-admin.mjs.
// 100000 iteraciones es el máximo que acepta Web Crypto en Workers.
export const PBKDF2_ITERATIONS = 100000;
export const HASH_BYTES = 32;
export const SALT_BYTES = 16;

// Convierte bytes a texto hexadecimal.
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Convierte texto hexadecimal a bytes.
export function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Genera una sal aleatoria en hexadecimal.
export function generateSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

// Calcula el hash PBKDF2-SHA256 de una contraseña con la sal indicada y lo devuelve en hexadecimal.
export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS },
    key,
    HASH_BYTES * 8,
  );
  return toHex(new Uint8Array(bits));
}

// Compara dos textos en tiempo constante: recorre siempre todos los caracteres,
// de modo que la duración no revela en qué posición difieren.
export function timingSafeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

// Comprueba si una contraseña corresponde al hash y la sal guardados.
export async function verifyPassword(
  password: string,
  saltHex: string,
  expectedHash: string,
): Promise<boolean> {
  const hash = await hashPassword(password, saltHex);
  return timingSafeEqual(hash, expectedHash);
}
