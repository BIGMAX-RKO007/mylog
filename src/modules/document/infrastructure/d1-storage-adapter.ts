import { StoragePort } from '../ports/storage-port';

/**
 * 基于 Cloudflare D1 关系型数据库的内容存储适配器
 * 替代需要信用卡激活的 Cloudflare R2 对象存储，完全免费且无需绑定信用卡。
 */
export class D1StorageAdapter implements StoragePort {
  constructor(private db: D1Database) {}

  async put(key: string, content: string): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO file_contents (key, content, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
      `)
      .bind(key, content, Date.now())
      .run();
  }

  async get(key: string): Promise<string | null> {
    const row = await this.db
      .prepare('SELECT content FROM file_contents WHERE key = ?')
      .bind(key)
      .first<{ content: string }>();

    return row ? row.content : null;
  }

  async delete(key: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM file_contents WHERE key = ?')
      .bind(key)
      .run();
  }
}
