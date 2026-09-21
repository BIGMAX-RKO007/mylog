import { StoragePort } from '../ports/storage-port';

export class R2StorageAdapter implements StoragePort {
  constructor(private bucket: R2Bucket) {}

  async put(key: string, content: string): Promise<void> {
    await this.bucket.put(key, content, {
      httpMetadata: {
        contentType: 'text/markdown; charset=utf-8',
      },
    });
  }

  async get(key: string): Promise<string | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;
    return await object.text();
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
