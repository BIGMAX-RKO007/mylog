import { RbacRepositoryPort } from '../ports/rbac-repository';
import { Privilege } from '../domain/types';

export class CheckPermissionUseCase {
  constructor(private rbacRepo: RbacRepositoryPort) {}

  async canAccess(userId: string | undefined, objectId: string, privilege: Privilege): Promise<boolean> {
    if (!userId) {
      // 匿名用户仅能通过 PUBLIC 角色检测 READ
      if (privilege !== 'READ') return false;
      return this.rbacRepo.hasPrivilege('anonymous', objectId, 'READ');
    }

    return this.rbacRepo.hasPrivilege(userId, objectId, privilege);
  }

  async grant(operatorUserId: string, roleId: string, objectId: string, privilege: Privilege): Promise<boolean> {
    // 只有拥有该对象的 OWNERSHIP 特权，才能向其他角色授权 (Snowflake DAC 规则)
    const isOwner = await this.canAccess(operatorUserId, objectId, 'OWNERSHIP');
    if (!isOwner) return false;

    await this.rbacRepo.grantPrivilege(roleId, objectId, privilege, operatorUserId);
    return true;
  }
}
