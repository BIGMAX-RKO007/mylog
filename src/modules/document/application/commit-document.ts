import { StoragePort } from '../ports/storage-port';
import { DocumentRepositoryPort } from '../ports/document-repository';
import { DocumentMetadata } from '../domain/types';
import { PreviewDocumentUseCase } from './preview-document';
import { Result, ok, err } from '../../../core/result';
import { EventBus, DocumentCommittedEvent } from '../../../core/event-bus';
import { MetadataExtractor } from '../domain/metadata-extractor';
import { TagNormalizer } from '../domain/tag-normalizer';

export class CommitDocumentUseCase {
  constructor(
    private storage: StoragePort,
    private docRepo: DocumentRepositoryPort,
    private eventBus: EventBus,
    private aiBinding?: any,
    private vectorizeBinding?: any
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

    const { name, title: initialTitle, rawMarkdown, sha256, size } = unpackResult.data;
    const fileId = `file_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const r2Key = `files/${ownerRoleId}/${fileId}.md`;
    const now = Date.now();
    const finalCategoryId = categoryId && categoryId.trim() ? categoryId.trim() : 'cat_uncategorized';

    // 1. 双轨制元数据提取 (优先 YAML Frontmatter, 兜底 Workers AI)
    const extracted = await MetadataExtractor.extract(rawMarkdown, this.aiBinding);
    const finalTitle = extracted.title && extracted.title.trim() ? extracted.title.trim() : initialTitle;

    // 2. 标签规范化与收敛
    const existingTags = (await this.docRepo.listPopularTags(50)).map((t) => t.name);
    const normalizedTags: string[] = [];
    for (const rawTag of extracted.tags) {
      const res = await TagNormalizer.normalize(
        rawTag,
        existingTags,
        this.aiBinding,
        this.vectorizeBinding
      );
      if (res.normalizedName && !normalizedTags.includes(res.normalizedName)) {
        normalizedTags.push(res.normalizedName);
      }
    }

    // 3. 写入 Cloudflare D1 存储适配器
    await this.storage.put(r2Key, rawMarkdown);

    // 4. 写入 Cloudflare D1 元数据与初始 OWNERSHIP 授权
    const docMeta: DocumentMetadata = {
      id: fileId,
      name,
      title: finalTitle,
      size,
      r2Key,
      sha256,
      isPublic,
      ownerRoleId,
      categoryId: finalCategoryId,
      views: 0,
      aiSummary: extracted.summary,
      tags: normalizedTags,
      createdAt: now,
      updatedAt: now,
    };

    await this.docRepo.create(docMeta, ownerRoleId, creatorUserId);

    // 5. 绑定标签
    if (normalizedTags.length > 0) {
      await this.docRepo.attachTags(fileId, normalizedTags);
    }

    // 6. 发布领域事件
    await this.eventBus.publish(
      new DocumentCommittedEvent(fileId, name, finalTitle, rawMarkdown, ownerRoleId, size)
    );

    return ok(docMeta);
  }
}

