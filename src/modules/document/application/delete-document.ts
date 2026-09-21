import { StoragePort } from '../ports/storage-port';
import { DocumentRepositoryPort } from '../ports/document-repository';
import { CheckPermissionUseCase } from '../../iam/application/check-permission';
import { Result, ok, err } from '../../../core/result';

export class DeleteDocumentUseCase {
  constructor(
    private storage: StoragePort,
    private docRepo: DocumentRepositoryPort,
    private checkPermissionUseCase: CheckPermissionUseCase
  ) {}

  async execute(userId: string | undefined, fileId: string): Promise<Result<boolean, string>> {
    // 1. RBAC 特权鉴权: 检查当前用户/角色对该文件是否拥有 DELETE 特权 (OWNERSHIP 自动具备)
    const hasDeletePermission = await this.checkPermissionUseCase.canAccess(userId, fileId, 'DELETE');
    if (!hasDeletePermission) {
      return err('无权删除该文档：仅文档所有者或管理员可执行删除操作');
    }

    // 2. 查询元数据获取 R2 存储 Key
    const doc = await this.docRepo.findById(fileId);
    if (!doc) {
      return err('文档不存在或已被删除');
    }

    // 3. 从 Cloudflare R2 删除原始 .md 对象
    await this.storage.delete(doc.r2Key);

    // 4. 从 Cloudflare D1 级联清理可安全对象与授权记录
    await this.docRepo.delete(fileId);

    return ok(true);
  }
}
