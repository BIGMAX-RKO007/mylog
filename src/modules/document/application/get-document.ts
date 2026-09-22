import { StoragePort } from '../ports/storage-port';
import { DocumentRepositoryPort } from '../ports/document-repository';
import { CheckPermissionUseCase } from '../../iam/application/check-permission';
import { MarkdownParser } from '../domain/markdown-parser';
import { DocumentMetadata, ParsedDocument } from '../domain/types';
import { Result, ok, err } from '../../../core/result';

export interface DocumentViewData {
  metadata: DocumentMetadata;
  parsed: ParsedDocument;
  isOwner: boolean;
}

export class GetDocumentUseCase {
  constructor(
    private storage: StoragePort,
    private docRepo: DocumentRepositoryPort,
    private checkPermission: CheckPermissionUseCase
  ) {}

  async execute(fileId: string, userId?: string): Promise<Result<DocumentViewData>> {
    // 1. 获取元数据
    const metadata = await this.docRepo.findById(fileId);
    if (!metadata) {
      return err(new Error('文档不存在或已被删除'));
    }

    // 2. Snowflake 权限判定
    const canRead = await this.checkPermission.canAccess(userId, fileId, 'READ');
    if (!canRead) {
      return err(new Error('您没有权限查看该文档 (403 Forbidden)'));
    }

    // 3. 从 R2 拉取原始 Markdown 内容
    const rawMarkdown = await this.storage.get(metadata.r2Key);
    if (rawMarkdown === null) {
      return err(new Error('未在存储桶中找到物理文件内容'));
    }

    // 4. 解析为带样式的 HTML 片段
    const parsed = MarkdownParser.parse(rawMarkdown, metadata.name);

    // 5. 判定当前用户是否拥有管理与删除权 (OWNERSHIP 特权或管理员 DELETE 特权)
    const isOwner = userId ? await this.checkPermission.canAccess(userId, fileId, 'DELETE') : false;

    return ok({
      metadata,
      parsed,
      isOwner,
    });
  }
}
