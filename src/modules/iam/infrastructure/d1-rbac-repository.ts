import {
  RbacRepositoryPort,
  RoleDetail,
  GrantMatrixItem,
  PrivilegeDiagnosis,
  UserRoleAssignment,
} from '../ports/rbac-repository';
import { Privilege, Role, Grant } from '../domain/types';
import { InheritanceRule } from '../domain/rbac-engine';

export class D1RbacRepository implements RbacRepositoryPort {
  constructor(private db: D1Database) {}

  async createRole(role: Role): Promise<void> {
    await this.db
      .prepare('INSERT INTO roles (id, name, description, is_system, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(role.id, role.name, role.description || null, role.isSystem ? 1 : 0, role.createdAt)
      .run();
  }

  async assignRoleToUser(userId: string, roleId: string, grantedBy: string): Promise<void> {
    await this.db
      .prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id, granted_by, granted_at) VALUES (?, ?, ?, ?)')
      .bind(userId, roleId, grantedBy, Date.now())
      .run();
  }

  async revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?')
      .bind(userId, roleId)
      .run();
  }

  async getAllUserRoleAssignments(): Promise<UserRoleAssignment[]> {
    const { results } = await this.db
      .prepare(`
        SELECT ur.user_id, u.username, ur.role_id, r.name as role_name,
               ur.granted_by, gb.username as granted_by_name, ur.granted_at
        FROM user_roles ur
        JOIN users u ON ur.user_id = u.id
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN users gb ON ur.granted_by = gb.id
        ORDER BY ur.granted_at DESC
      `)
      .all<{
        user_id: string;
        username: string;
        role_id: string;
        role_name: string;
        granted_by: string;
        granted_by_name: string | null;
        granted_at: number;
      }>();

    return results.map(r => ({
      userId: r.user_id,
      username: r.username,
      roleId: r.role_id,
      roleName: r.role_name,
      grantedBy: r.granted_by,
      grantedByName: r.granted_by_name || 'System',
      grantedAt: r.granted_at,
    }));
  }

  async getUserRoleIds(userId: string): Promise<string[]> {
    const { results } = await this.db
      .prepare('SELECT role_id FROM user_roles WHERE user_id = ?')
      .bind(userId)
      .all<{ role_id: string }>();

    return results.map(r => r.role_id);
  }

  async getInheritanceRules(): Promise<InheritanceRule[]> {
    const { results } = await this.db
      .prepare('SELECT parent_role_id, child_role_id FROM role_inheritance')
      .all<{ parent_role_id: string; child_role_id: string }>();

    return results.map(r => ({
      parentRoleId: r.parent_role_id,
      childRoleId: r.child_role_id,
    }));
  }

  async grantPrivilege(roleId: string, objectId: string, privilege: Privilege, grantedBy: string): Promise<void> {
    const grantId = `grt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await this.db
      .prepare('INSERT INTO grants (id, role_id, object_id, privilege, granted_by, granted_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(grantId, roleId, objectId, privilege, grantedBy, Date.now())
      .run();
  }

  async revokePrivilege(roleId: string, objectId: string, privilege: Privilege): Promise<void> {
    await this.db
      .prepare('DELETE FROM grants WHERE role_id = ? AND object_id = ? AND privilege = ?')
      .bind(roleId, objectId, privilege)
      .run();
  }

  async listGrantsForObject(objectId: string): Promise<Grant[]> {
    const { results } = await this.db
      .prepare('SELECT role_id, object_id, privilege FROM grants WHERE object_id = ?')
      .bind(objectId)
      .all<{ role_id: string; object_id: string; privilege: Privilege }>();

    return results.map(r => ({
      roleId: r.role_id,
      objectId: r.object_id,
      privilege: r.privilege,
    }));
  }

  /**
   * 使用高效递归 CTE 直接在 D1 中执行 Snowflake 权限推导：
   * 1. 递归展开用户拥有的全部角色（直接 + 继承）
   * 2. 判定是否存在目标对象的所需权限或 OWNERSHIP
   * 3. 或目标对象是否设置了 is_public = 1 允许公开只读
   */
  async hasPrivilege(userId: string, objectId: string, requiredPrivilege: Privilege): Promise<boolean> {
    const query = `
      WITH RECURSIVE user_effective_roles AS (
        SELECT role_id FROM user_roles WHERE user_id = ?
        UNION
        SELECT ri.child_role_id
        FROM role_inheritance ri
        JOIN user_effective_roles uer ON ri.parent_role_id = uer.role_id
      )
      SELECT 1 AS allowed
      FROM grants g
      WHERE g.object_id = ?
        AND (g.privilege = ? OR g.privilege = 'OWNERSHIP')
        AND g.role_id IN (SELECT role_id FROM user_effective_roles)
      UNION
      SELECT 1 AS allowed
      FROM files f
      WHERE f.id = ? AND f.is_public = 1 AND ? = 'READ'
      LIMIT 1;
    `;

    const row = await this.db
      .prepare(query)
      .bind(userId, objectId, requiredPrivilege, objectId, requiredPrivilege)
      .first<{ allowed: number }>();

    return !!row;
  }

  async revokeGrantById(grantId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM grants WHERE id = ?')
      .bind(grantId)
      .run();
  }

  async getAllRolesWithUsers(): Promise<RoleDetail[]> {
    const { results } = await this.db
      .prepare(`
        SELECT r.id, r.name, r.description, r.is_system, 
               GROUP_CONCAT(u.username, ', ') as usernames,
               COUNT(ur.user_id) as user_count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id
        LEFT JOIN users u ON ur.user_id = u.id
        GROUP BY r.id
        ORDER BY r.is_system DESC, r.created_at ASC
      `)
      .all<{
        id: string;
        name: string;
        description: string | null;
        is_system: number;
        usernames: string | null;
        user_count: number;
      }>();

    return results.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.is_system === 1,
      userCount: r.user_count,
      usernames: r.usernames ? r.usernames.split(', ') : [],
    }));
  }

  async getAllGrantsMatrix(): Promise<GrantMatrixItem[]> {
    const { results } = await this.db
      .prepare(`
        SELECT g.id, g.role_id, r.name as role_name, g.object_id,
               f.name as file_name, f.title as file_title,
               g.privilege, g.granted_by, u.username as granted_by_name, g.granted_at
        FROM grants g
        JOIN roles r ON g.role_id = r.id
        JOIN files f ON g.object_id = f.id
        LEFT JOIN users u ON g.granted_by = u.id
        ORDER BY g.granted_at DESC
      `)
      .all<{
        id: string;
        role_id: string;
        role_name: string;
        object_id: string;
        file_name: string;
        file_title: string;
        privilege: string;
        granted_by: string;
        granted_by_name: string | null;
        granted_at: number;
      }>();

    return results.map(r => ({
      id: r.id,
      roleId: r.role_id,
      roleName: r.role_name,
      objectId: r.object_id,
      fileName: r.file_name,
      fileTitle: r.file_title,
      privilege: r.privilege as Privilege,
      grantedBy: r.granted_by,
      grantedByName: r.granted_by_name || 'System',
      grantedAt: r.granted_at,
    }));
  }

  async diagnosePrivileges(userId: string, objectId: string): Promise<PrivilegeDiagnosis> {
    // 1. 查询直接分配的角色
    const directRoleRows = await this.db
      .prepare('SELECT r.id, r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?')
      .bind(userId)
      .all<{ id: string; name: string }>();

    const directRoleNames = directRoleRows.results.map(r => r.name);

    // 2. 递归查询继承获得的所有有效角色
    const effectiveRows = await this.db
      .prepare(`
        WITH RECURSIVE user_effective_roles AS (
          SELECT role_id FROM user_roles WHERE user_id = ?
          UNION
          SELECT ri.child_role_id
          FROM role_inheritance ri
          JOIN user_effective_roles uer ON ri.parent_role_id = uer.role_id
        )
        SELECT r.id, r.name FROM user_effective_roles uer JOIN roles r ON uer.role_id = r.id;
      `)
      .bind(userId)
      .all<{ id: string; name: string }>();

    const allRoleNames = effectiveRows.results.map(r => r.name);
    const inheritedRoleNames = allRoleNames.filter(n => !directRoleNames.includes(n));

    // 3. 查询对象上的显式授权
    const grantRows = await this.db
      .prepare(`
        WITH RECURSIVE user_effective_roles AS (
          SELECT role_id FROM user_roles WHERE user_id = ?
          UNION
          SELECT ri.child_role_id
          FROM role_inheritance ri
          JOIN user_effective_roles uer ON ri.parent_role_id = uer.role_id
        )
        SELECT privilege FROM grants
        WHERE object_id = ? AND role_id IN (SELECT role_id FROM user_effective_roles)
      `)
      .bind(userId, objectId)
      .all<{ privilege: string }>();

    const grantedPrivileges = grantRows.results.map(g => g.privilege);

    // 4. 查询文件公开状态
    const fileRow = await this.db
      .prepare('SELECT is_public FROM files WHERE id = ?')
      .bind(objectId)
      .first<{ is_public: number }>();

    const isPublic = fileRow?.is_public === 1;
    const isOwner = grantedPrivileges.includes('OWNERSHIP');
    const canRead = isOwner || grantedPrivileges.includes('READ') || isPublic;
    const canWrite = isOwner || grantedPrivileges.includes('WRITE');
    const canDelete = isOwner || grantedPrivileges.includes('DELETE');

    return {
      directRoleNames,
      inheritedRoleNames,
      grantedPrivileges,
      isPublic,
      canRead,
      canWrite,
      canDelete,
      isOwner,
    };
  }
}
