/**
 * 使用 Web Crypto API 实现安全的密码哈希 (PBKDF2-SHA256)
 * 纯原生标准 API，在 Cloudflare Workers 和 Node/Bun 中无缝执行，零外部依赖
 */
export class PasswordHasher {
  private static ITERATIONS = 100000;
  private static KEY_LEN = 32; // 256 bits

  static async hash(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      this.KEY_LEN * 8
    );

    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    return `${saltHex}:${hashHex}`;
  }

  static async verify(password: string, storedHash: string): Promise<boolean> {
    const [saltHex, expectedHashHex] = storedHash.split(':');
    if (!saltHex || !expectedHashHex) return false;

    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      this.KEY_LEN * 8
    );

    const actualHashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return actualHashHex === expectedHashHex;
  }
}
