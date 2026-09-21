import { StoragePort } from '../ports/storage-port';
import { DocumentRepositoryPort } from '../ports/document-repository';
import { DocumentMetadata } from '../domain/types';
import { PreviewDocumentUseCase } from './preview-document';
import { Result, ok, err } from '../../../core/result';
import { EventBus, DocumentCommittedEvent } from '../../../core/event-bus';

export class CommitDocumentUseCase {
  constructor(
    private storage: StoragePort,
    private docRepo: DocumentRepositoryPort,
    private eventBus: EventBus
  ) {}

  async execute(
    uploadToken: string,
    ownerRoleId: string,
    creatorUserId: string,
    isPublic: boolean = false,
    categoryId?: string
  ): Promise<Result<DocumentMetadata>> {
    const unpackResult = PreviewDocumentUseCase.unpackToken(uploadToken);
    if (!unpackResult.success) {
      return err(unpackResult.error);
    }

    const { name, title, rawMarkdown, sha256, size } = unpackResult.data;
    const fileId = `file_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const r2Key = `files/${ownerRoleId}/${fileId}.md`;
    const now = Date.now();
    const finalCategoryId = categoryId && categoryId.trim() ? categoryId.trim() : 'cat_uncategorized';

    // 1. 写入 Cloudflare R2 对象存储
    await this.storage.put(r2Key, rawMarkdown);

    // 2. 写入 Cloudflare D1 元数据与所有权特权 (OWNERSHIP)
    const docMeta: DocumentMetadata = {
      id: fileId,
      name,
      title,
      size,
      r2Key,
      sha256,
      isPublic,
      ownerRoleId,
      categoryId: finalCategoryId,
      views: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.docRepo.create(docMeta, ownerRoleId, creatorUserId);

    // 3. 发布领域事件，供后续向量切片 (Phase 2) 与 AI 智能体 (Phase 3) 异步监听
    await this.eventBus.publish(
      new DocumentCommittedEvent(fileId, name, title, rawMarkdown, ownerRoleId, size)
    );

    return ok(docMeta);
  }
}
